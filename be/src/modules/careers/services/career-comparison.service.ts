import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CareerComparison, CareerComparisonDocument } from '../schemas/career-comparison.schema';
import { CreateCareerComparisonDto, UpdateCareerComparisonDto } from '../dto';
import { CareerService } from './career.service';
import { AIService } from '../../../common/services/ai.service';
import { CareerFitResultService } from '../../assessment/services/career-fit-result.service';
import { Career } from '../schemas/career.schema';
import { CareerInsightDocument } from '../schemas/career-insight.schema';

interface ComparisonQuery {
  userId?: Types.ObjectId;
}

interface AIAnalysisResult {
  detailedAnalysis: {
    skillsAlignment: {
      overlapPercentage: number;
      transferableSkills: string[];
      gapAnalysis: { careerId: string; missingSkills: string[] }[];
    };
    careerProgression: {
      careerId: string;
      progressionPath: any;
      timeToAdvancement: string;
      seniorityLevels: string[];
    }[];
    marketDemand: {
      careerId: string;
      demandLevel: string;
      jobGrowthRate: string;
      competitionLevel: string;
    }[];
    compatibility: {
      personalityFit: string;
      skillsCompatibility: string;
      lifestyleAlignment: string;
      longTermViability: string;
    };
  };
  recommendations: {
    bestMatch: string;
    reasonsForRecommendation: string[];
    alternativeOptions: string[];
    developmentSuggestions: string[];
  };
  scoreBreakdown: {
    careerId: string;
    careerTitle: string;
    overallScore: number;
    criteriaScores: {
      skillMatch: number;
      salaryPotential: number;
      workLifeBalance: number;
      growthPotential: number;
    };
  }[];
}

@Injectable()
export class CareerComparisonService {
  constructor(
    @InjectModel(CareerComparison.name)
    private readonly careerComparisonModel: Model<CareerComparisonDocument>,
    private readonly careerService: CareerService,
    private readonly aiService: AIService,
    private readonly careerFitResultService: CareerFitResultService,
  ) {}

  async create(createDto: CreateCareerComparisonDto): Promise<CareerComparison> {
    const careerObjectIds = await this.validateCareerIds(createDto.careerIds);
    
    const comparison = new this.careerComparisonModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      careerIds: careerObjectIds,
    });
    
    return comparison.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<CareerComparison> = {},
  ): Promise<{ data: CareerComparison[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query: ComparisonQuery = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.careerComparisonModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('careerIds', 'title category industry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec() as Promise<CareerComparison[]>,
      this.careerComparisonModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<CareerComparison> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison ID');
    }

    const comparison = await this.careerComparisonModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('careerIds', 'title category industry description requiredSkills')
      .exec();

    if (!comparison) {
      throw new NotFoundException('Career comparison not found');
    }

    return comparison;
  }

  async findByUser(userId: string): Promise<CareerComparison[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.careerComparisonModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('careerIds', 'title category industry')
      .sort({ createdAt: -1 })
      .exec();
  }

  async compareCareersSideBySide(careerIds: string[]): Promise<any> {
    const careerObjectIds = await this.validateCareerIds(careerIds);
    
    const careers = await Promise.all(
      careerObjectIds.map(async (id) => {
        try {
          return await this.careerService.findOne(id.toString());
        } catch {
          const insights = await this.careerFitResultService.findAllInsights();
          const insight = insights.find(i => (i as CareerInsightDocument)._id.toString() === id.toString());
          if (!insight) {
            console.error(`compareCareersSideBySide: Insight not found for ID ${id.toString()} after failing to find in static careers.`);
            throw new BadRequestException(`Career insight not found for ID: ${id.toString()}`);
          }
          // Map Insight to Career-like object
          return {
            _id: (insight as CareerInsightDocument)._id,
            title: insight.careerTitle,
            category: 'Công nghệ',
            description: insight.analysis?.overview || '',
            requiredSkills: insight.analysis?.keySkills || [],
            marketInfo: { demandLevel: insight.analysis?.demandLevel || 'Cao' },
          } as unknown as Career;
        }
      })
    );

    return {
      careers,
      comparison: this.generateSideBySideComparison(careers),
      summary: this.generateComparisonSummary(careers),
    };
  }

  async generateDetailedComparison(
    userId: string,
    careerIds: string[],
    criteria?: Record<string, unknown>,
  ): Promise<any> {
    const careerObjectIds = await this.validateCareerIds(careerIds);

    const careers = await Promise.all(
      careerObjectIds.map(async (id) => {
        try {
          return await this.careerService.findOne(id.toString());
        } catch {
          const insights = await this.careerFitResultService.findAllInsights();
          const insight = insights.find(i => (i as CareerInsightDocument)._id.toString() === id.toString());
          if (!insight) {
            console.error(`generateDetailedComparison: Insight not found for ID ${id.toString()} after failing to find in static careers.`);
            throw new BadRequestException(`Career insight not found for ID: ${id.toString()}`);
          }
          return {
            _id: (insight as CareerInsightDocument)._id,
            title: insight.careerTitle,
            category: 'Công nghệ',
            description: insight.analysis?.overview || '',
            requiredSkills: insight.analysis?.keySkills || [],
            marketInfo: { demandLevel: insight.analysis?.demandLevel || 'Cao' },
          } as unknown as Career;
        }
      }),
    );

    const userFitResults = await this.careerFitResultService.findByUser(userId, 1);
    const userFit = userFitResults[0];
    const personalityTraits = userFit?.personalityProfile?.primaryTraits || [];

    const quantitativeComparison = this.generateSideBySideComparison(careers);

    const careersInfo = careers.map(c => `- ID: ${c._id?.toString() || ''}, Tên: ${c.title}, Kỹ năng yêu cầu: ${c.requiredSkills?.join(', ') || ''}`).join('\n');
    
    const aiPrompt = `
      Bạn là một chuyên gia hướng nghiệp. Hãy so sánh chi tiết các nghề nghiệp sau đây cho một người có tính cách: ${personalityTraits.join(', ')}.
      
      Danh sách nghề nghiệp:
      ${careersInfo}
      
      Hãy cung cấp phân tích sâu về:
      1. Sự phù hợp kỹ năng.
      2. Lộ trình thăng tiến.
      3. Nhu cầu thị trường.
      4. Độ tương thích cá nhân.
      
      QUAN TRỌNG: Hãy chắc chắn đưa ra các đánh giá (điểm số từ 0-100, mức độ, lý do) KHÁC NHAU phản ánh đúng đặc điểm riêng biệt của từng nghề nghiệp. Không trả về dữ liệu giống nhau cho các nghề.
      
      Trả về JSON ĐÚNG cấu trúc sau (chỉ trả về JSON, KHÔNG thêm Markdown hay giải thích):
      {
        "detailedAnalysis": {
          "skillsAlignment": { 
             "overlapPercentage": number, 
             "transferableSkills": ["skill1"], 
             "gapAnalysis": [{ "careerId": "ID tương ứng từ danh sách trên", "missingSkills": ["skill1"] }] 
          },
          "careerProgression": [{ "careerId": "ID tương ứng", "progressionPath": ["bước 1"], "timeToAdvancement": "số năm", "seniorityLevels": ["level 1"] }],
          "marketDemand": [{ "careerId": "ID tương ứng", "demandLevel": "Cao/Trung bình/Thấp", "jobGrowthRate": "Tăng trưởng x%", "competitionLevel": "Cao/Trung bình/Thấp" }],
          "compatibility": { "personalityFit": "Mức độ", "skillsCompatibility": "Mức độ", "lifestyleAlignment": "Mức độ", "longTermViability": "Mức độ" }
        },
        "recommendations": {
          "bestMatch": "ID nghề nghiệp phù hợp nhất",
          "reasonsForRecommendation": ["lý do 1"],
          "alternativeOptions": ["ID nghề nghiệp thay thế"],
          "developmentSuggestions": ["lời khuyên 1"]
        },
        "scoreBreakdown": [{
          "careerId": "ID tương ứng",
          "careerTitle": "Tên nghề nghiệp",
          "overallScore": number,
          "criteriaScores": { "skillMatch": number, "salaryPotential": number, "workLifeBalance": number, "growthPotential": number }
        }]
      }
    `;

    let aiResults: AIAnalysisResult;
    try {
      const response = await this.aiService.callGeminiAPI(aiPrompt);
      let clean = response.trim();
      if (clean.startsWith('```json')) clean = clean.replace(/```json\n?/, '').replace(/```$/, '');
      if (clean.startsWith('```')) clean = clean.replace(/```\n?/, '').replace(/```$/, '');
      aiResults = JSON.parse(clean) as AIAnalysisResult;
    } catch {
      aiResults = {
        detailedAnalysis: this.performDetailedAnalysis(careers),
        recommendations: this.generateRecommendations(careers),
        scoreBreakdown: this.calculateScoreBreakdown(careers),
      };
    }

    const comparisonResults = {
      userId,
      careerIds,
      careers,
      quantitativeComparison,
      ...aiResults,
    };

    const savedComparison = await this.create({
      userId,
      careerIds,
      comparisonName: 'Detailed Career Analysis',
      purpose: 'detailed_comparison',
      comparisonCriteria: criteria,
      results: comparisonResults,
      insights: aiResults.recommendations?.reasonsForRecommendation || [],
    });

    return {
      ...comparisonResults,
      comparisonId: savedComparison._id,
    };
  }

  async update(id: string, updateDto: UpdateCareerComparisonDto): Promise<CareerComparison> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison ID');
    }

    if (updateDto.careerIds) {
      updateDto.careerIds = (await this.validateCareerIds(updateDto.careerIds)).map(id => id.toString());
    }

    const comparison = await this.careerComparisonModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .populate('userId', 'email firstName lastName')
      .populate('careerIds', 'title category industry')
      .exec();

    if (!comparison) {
      throw new NotFoundException('Career comparison not found');
    }

    return comparison;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison ID');
    }

    const result = await this.careerComparisonModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Career comparison not found');
    }
  }

  async getComparisonStatistics(): Promise<any> {
    const stats = await this.careerComparisonModel.aggregate([
      {
        $group: {
          _id: null,
          totalComparisons: { $sum: 1 },
          avgCareersPerComparison: { $avg: { $size: '$careerIds' } },
          mostComparedCareers: { $push: '$careerIds' },
        },
      },
    ]);

    return stats[0] || {
      totalComparisons: 0,
      avgCareersPerComparison: 0,
      mostComparedCareers: [],
    };
  }

  private async validateCareerIds(careerIds: string[]): Promise<Types.ObjectId[]> {
    const objectIds: Types.ObjectId[] = [];
    
    for (const careerId of careerIds) {
      if (!Types.ObjectId.isValid(careerId)) {
        throw new BadRequestException(`Invalid career ID: ${careerId}`);
      }
      
      const id = new Types.ObjectId(careerId);
      
      // Try to find in static careers first
      try {
        await this.careerService.findOne(careerId);
      } catch {
        // If not in static careers, it MUST be in career insights (Discovery repo)
        const insight = await this.careerFitResultService.findAllInsights();
        const exists = insight.some(i => (i as CareerInsightDocument)._id.toString() === careerId);
        if (!exists) {
          throw new BadRequestException(`Career not found: ${careerId}`);
        }
      }
      
      objectIds.push(id);
    }
    
    return objectIds;
  }

  private generateSideBySideComparison(careers: Career[]): Record<string, unknown> {
    const comparisonFields = [
      { key: 'title', label: 'Tên nghề nghiệp' },
      { key: 'category', label: 'Lĩnh vực' },
      { key: 'industry', label: 'Ngành công nghiệp' },
      { key: 'requiredSkills', label: 'Kỹ năng cần thiết' },
      { key: 'marketInfo', label: 'Thông tin thị trường' },
      { key: 'workEnvironment', label: 'Môi trường làm việc' },
    ];

    const comparison: Record<string, unknown> = {};
    
    comparisonFields.forEach(field => {
      comparison[field.key] = careers.map(career => {
        let value: unknown = '';
        const key = field.key;
        
        if (key === 'title') value = career.title;
        else if (key === 'category') value = career.category;
        else if (key === 'industry') value = career.industry;
        else if (key === 'requiredSkills') value = career.requiredSkills;
        else if (key === 'marketInfo') value = career.marketInfo;
        else if (key === 'workEnvironment') value = career.workEnvironment;

        return {
          careerId: career._id,
          careerTitle: career.title,
          value,
        };
      });
    });

    return comparison;
  }

  private generateComparisonSummary(careers: Career[]): Record<string, unknown> {
    return {
      totalCareers: careers.length,
      categories: [...new Set(careers.map(c => c.category))],
      industries: [...new Set(careers.map(c => c.industries || []))],
      commonSkills: this.findCommonSkills(careers),
      uniqueAspects: this.findUniqueAspects(careers),
    };
  }

  private performDetailedAnalysis(careers: Career[]): AIAnalysisResult['detailedAnalysis'] {
    return {
      skillsAlignment: this.analyzeSkillsAlignment(careers),
      careerProgression: this.analyzeCareerProgression(careers),
      marketDemand: this.analyzeMarketDemand(careers),
      compatibility: this.analyzeCompatibility(),
    };
  }

  private generateRecommendations(careers: Career[]): AIAnalysisResult['recommendations'] {
    return {
      bestMatch: careers[0]?._id?.toString() || '',
      reasonsForRecommendation: ['Sự phù hợp kỹ năng cao', 'Nhu cầu thị trường mạnh'],
      alternativeOptions: careers.slice(1, 3).map(c => c._id?.toString() || ''),
      developmentSuggestions: ['Tập trung vào kỹ năng chuyên môn', 'Cân nhắc chứng chỉ bổ sung'],
    };
  }

  private calculateScoreBreakdown(careers: Career[]): AIAnalysisResult['scoreBreakdown'] {
    return careers.map((career, index) => {
      // Create variation based on index so fallback data is distinguishable
      const modifier = index * 5;
      return {
        careerId: career._id?.toString() || '',
        careerTitle: career.title,
        overallScore: Math.min(100, Math.max(0, 85 - modifier)),
        criteriaScores: {
          skillMatch: Math.min(100, Math.max(0, 90 - modifier)),
          salaryPotential: Math.min(100, Math.max(0, 80 + modifier)),
          workLifeBalance: Math.min(100, Math.max(0, 85 - (index * 2))),
          growthPotential: Math.min(100, Math.max(0, 88 + (index * 2))),
        },
      };
    });
  }

  private findCommonSkills(careers: Career[]): string[] {
    const allSkills = careers.flatMap(career => career.requiredSkills || []);
    
    const skillCounts = allSkills.reduce((acc: Record<string, number>, skill: string) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(skillCounts)
      .filter(([, count]) => count > 1)
      .map(([skill]) => skill);
  }

  private findUniqueAspects(careers: Career[]): Record<string, unknown>[] {
    return careers.map(career => ({
      careerId: career._id,
      uniqueSkills: career.requiredSkills?.filter((skill: string) =>
        !this.isCommonSkillAcrossCareers(skill, careers)
      ) || [],
      uniqueFeatures: this.extractUniqueFeatures(),
    }));
  }

  private isCommonSkillAcrossCareers(skill: string, careers: Career[]): boolean {
    return careers.filter(career =>
      career.requiredSkills?.includes(skill)
    ).length > 1;
  }

  private extractUniqueFeatures(): string[] {
    return ['Cơ hội làm việc từ xa', 'Tự do sáng tạo'];
  }

  private analyzeSkillsAlignment(careers: Career[]): AIAnalysisResult['detailedAnalysis']['skillsAlignment'] {
    return {
      overlapPercentage: 75,
      transferableSkills: ['Giao tiếp', 'Giải quyết vấn đề'],
      gapAnalysis: careers.map((c, index) => ({
        careerId: c._id?.toString() || '',
        missingSkills: index === 0 ? ['Lãnh đạo', 'Quản lý dự án'] : ['Kỹ năng chuyên sâu', 'Tư duy chiến lược'],
      })),
    };
  }

  private analyzeCareerProgression(careers: Career[]): AIAnalysisResult['detailedAnalysis']['careerProgression'] {
    return careers.map((career, index) => ({
      careerId: career._id?.toString() || '',
      progressionPath: career.careerLevels || [],
      timeToAdvancement: index === 0 ? '2-3 năm' : (index === 1 ? '3-5 năm' : '4-6 năm'),
      seniorityLevels: ['Junior', 'Mid-level', 'Senior', 'Lead'],
    }));
  }

  private analyzeMarketDemand(careers: Career[]): AIAnalysisResult['detailedAnalysis']['marketDemand'] {
    const demandLevels = ['Cao', 'Rất cao', 'Trung bình'];
    const growths = ['15%', '25%', '10%'];
    const competitions = ['Trung bình', 'Cao', 'Thấp'];
    
    return careers.map((career, index) => ({
      careerId: career._id?.toString() || '',
      demandLevel: career.marketInfo?.demandLevel || demandLevels[index % 3],
      jobGrowthRate: career.marketInfo?.growthProjection || growths[index % 3],
      competitionLevel: career.marketInfo?.competitionLevel || competitions[index % 3],
    }));
  }

  private analyzeCompatibility(): AIAnalysisResult['detailedAnalysis']['compatibility'] {
    return {
      personalityFit: 'Cao',
      skillsCompatibility: 'Trung bình',
      lifestyleAlignment: 'Cao',
      longTermViability: 'Bền vững',
    };
  }

  private buildQuery(filters: Partial<CareerComparison>): ComparisonQuery {
    const query: ComparisonQuery = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId as unknown as string);
    }

    return query;
  }
}