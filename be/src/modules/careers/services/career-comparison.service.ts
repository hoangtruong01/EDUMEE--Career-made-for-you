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
        .exec(),
      this.careerComparisonModel.countDocuments(query),
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

    const aiPrompt = `
      So sánh chi tiết các nghề nghiệp sau đây cho một người có tính cách: ${personalityTraits.join(', ')}.
      Các nghề nghiệp: ${careers.map((c) => c.title).join(', ')}.
      
      Hãy cung cấp phân tích sâu về:
      1. Sự phù hợp kỹ năng (skills alignment).
      2. Lộ trình thăng tiến (career progression).
      3. Nhu cầu thị trường (market demand).
      4. Độ tương thích cá nhân (compatibility).
      
      Trả về JSON với cấu trúc:
      {
        "detailedAnalysis": {
          "skillsAlignment": { "overlapPercentage": number, "transferableSkills": string[], "gapAnalysis": [{ "careerId": string, "missingSkills": string[] }] },
          "careerProgression": [{ "careerId": string, "progressionPath": any, "timeToAdvancement": string, "seniorityLevels": string[] }],
          "marketDemand": [{ "careerId": string, "demandLevel": string, "jobGrowthRate": string, "competitionLevel": string }],
          "compatibility": { "personalityFit": string, "skillsCompatibility": string, "lifestyleAlignment": string, "longTermViability": string }
        },
        "recommendations": {
          "bestMatch": "career_id",
          "reasonsForRecommendation": string[],
          "alternativeOptions": string[],
          "developmentSuggestions": string[]
        },
        "scoreBreakdown": [{
          "careerId": string,
          "careerTitle": string,
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
    return careers.map(career => ({
      careerId: career._id?.toString() || '',
      careerTitle: career.title,
      overallScore: 85,
      criteriaScores: {
        skillMatch: 90,
        salaryPotential: 80,
        workLifeBalance: 85,
        growthPotential: 88,
      },
    }));
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
      gapAnalysis: careers.map(c => ({
        careerId: c._id?.toString() || '',
        missingSkills: ['Lãnh đạo', 'Quản lý dự án'],
      })),
    };
  }

  private analyzeCareerProgression(careers: Career[]): AIAnalysisResult['detailedAnalysis']['careerProgression'] {
    return careers.map(career => ({
      careerId: career._id?.toString() || '',
      progressionPath: career.careerLevels || [],
      timeToAdvancement: '2-3 năm',
      seniorityLevels: ['Junior', 'Mid-level', 'Senior', 'Lead'],
    }));
  }

  private analyzeMarketDemand(careers: Career[]): AIAnalysisResult['detailedAnalysis']['marketDemand'] {
    return careers.map(career => ({
      careerId: career._id?.toString() || '',
      demandLevel: career.marketInfo?.demandLevel || 'High',
      jobGrowthRate: career.marketInfo?.growthProjection || '15%',
      competitionLevel: career.marketInfo?.competitionLevel || 'Moderate',
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