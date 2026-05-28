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

const MAX_CAREERS_PER_COMPARISON = 3;

interface ComparisonQuery {
  userId?: Types.ObjectId;
}

export interface AllowedCareerComparisonItem {
  id: string;
  source: 'career' | 'career_insight' | 'career_fit_result';
  careerFitResultId: string;
  careerId?: string;
  careerInsightId?: string;
  title: string;
  description?: string;
  category?: string;
  match?: number;
  rank?: number;
  skills: string[];
  salaryRange?: string;
  demandLevel?: string;
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
  comparisonInsights?: ComparisonInsights;
}

interface ComparisonInsights {
  criteriaGuide: { key: string; label: string; description: string }[];
  perCareer: {
    careerId: string;
    careerTitle: string;
    personFit: {
      workEnvironment: string;
      workRhythm: string;
      autonomyLevel: string;
      communicationLoad: string;
      stressProfile: string;
    };
    personalityFit: {
      bestTraits: string[];
      potentialFriction: string[];
      teamStyle: string;
      decisionStyle: string;
    };
    compensation: {
      entryRange: string;
      midRange: string;
      seniorRange: string;
      growthCeiling: string;
      stability: string;
    };
    market: {
      demand: string;
      growthTrend: string;
      competition: string;
      remoteAvailability: string;
      aiAutomationRisk: string;
    };
    skillsAndPath: {
      mustHaveSkills: string[];
      skillGaps: string[];
      rampUpTime: string;
      portfolioSignals: string[];
    };
    longTerm: {
      advancementPotential: string;
      workLifeBalance: string;
      burnoutRisk: string;
      transferability: string;
    };
  }[];
  tradeOffSummary: {
    bestPersonalityFit: string;
    bestSalaryUpside: string;
    bestMarketOutlook: string;
    safestLongTermChoice: string;
    notes: string[];
  };
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

  async getAllowedCareersForUser(userId: string): Promise<AllowedCareerComparisonItem[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const visibleResults = await this.careerFitResultService.findByUserVisible(userId);
    const insights = await this.careerFitResultService.findAllInsights();

    return visibleResults
      .filter((result) => result.isLocked !== true)
      .map((result) => this.toAllowedCareerComparisonItem(result, insights))
      .filter((item): item is AllowedCareerComparisonItem => Boolean(item));
  }

  async normalizeAllowedCareerIdsForUser(
    userId: string,
    careerIds: string[],
  ): Promise<string[]> {
    const requestedIds = this.assertCareerComparisonCount(careerIds);
    const allowedCareers = await this.getAllowedCareersForUser(userId);
    const allowedByAlias = this.buildAllowedCareerLookup(allowedCareers);

    return requestedIds.map((careerId) => {
      const allowed = allowedByAlias.get(careerId);
      if (!allowed) {
        throw new BadRequestException(`Career is not available for comparison: ${careerId}`);
      }
      return allowed.id;
    });
  }

  async compareAllowedCareersSideBySide(userId: string, careerIds: string[]): Promise<any> {
    const { careers } = await this.resolveAllowedCareerSelection(userId, careerIds);

    return {
      careers,
      comparison: this.generateSideBySideComparison(careers),
      summary: this.generateComparisonSummary(careers),
    };
  }

  async generateAllowedDetailedComparison(
    userId: string,
    careerIds: string[],
    criteria?: Record<string, unknown>,
  ): Promise<any> {
    const { careerIds: normalizedCareerIds, careers } =
      await this.resolveAllowedCareerSelection(userId, careerIds);
    const userFitResults = await this.careerFitResultService.findLatestByUser(userId, 1);
    const userFit = userFitResults[0];
    const personalityTraits = userFit?.personalityProfile?.primaryTraits || [];
    const quantitativeComparison = this.generateSideBySideComparison(careers);
    const careersInfo = careers
      .map((career) => {
        const skills = career.requiredSkills?.join(', ') || 'Dang cap nhat';
        return `- ID: ${career._id?.toString() || ''}; Ten: ${career.title}; Ky nang: ${skills}`;
      })
      .join('\n');

    const aiPrompt = `
      Ban la mot chuyen gia huong nghiep. Hay so sanh chi tiet cac nghe sau cho mot nguoi co tinh cach: ${personalityTraits.join(', ') || 'chua ro'}.

      Danh sach nghe:
      ${careersInfo}

      Hay phan tich sau ve con nguoi, tinh cach, luong, thi truong, ky nang va dai han.
      Moi nghe phai co danh gia va ly do khac nhau. Chi tra ve JSON, khong them Markdown.

      JSON schema:
      {
        "detailedAnalysis": {
          "skillsAlignment": { "overlapPercentage": 0, "transferableSkills": ["skill"], "gapAnalysis": [{ "careerId": "ID", "missingSkills": ["skill"] }] },
          "careerProgression": [{ "careerId": "ID", "progressionPath": ["step"], "timeToAdvancement": "time", "seniorityLevels": ["level"] }],
          "marketDemand": [{ "careerId": "ID", "demandLevel": "Cao/Trung binh/Thap", "jobGrowthRate": "trend", "competitionLevel": "Cao/Trung binh/Thap" }],
          "compatibility": { "personalityFit": "text", "skillsCompatibility": "text", "lifestyleAlignment": "text", "longTermViability": "text" }
        },
        "recommendations": {
          "bestMatch": "ID",
          "reasonsForRecommendation": ["reason"],
          "alternativeOptions": ["ID"],
          "developmentSuggestions": ["suggestion"]
        },
        "scoreBreakdown": [{
          "careerId": "ID",
          "careerTitle": "Ten nghe",
          "overallScore": 0,
          "criteriaScores": { "skillMatch": 0, "salaryPotential": 0, "workLifeBalance": 0, "growthPotential": 0 }
        }],
        "comparisonInsights": {
          "criteriaGuide": [{ "key": "personFit", "label": "Con nguoi", "description": "Moi truong, nhip lam viec, giao tiep, ap luc, tu chu va lifestyle." }],
          "perCareer": [{
            "careerId": "ID",
            "careerTitle": "Ten nghe",
            "personFit": { "workEnvironment": "text", "workRhythm": "text", "autonomyLevel": "text", "communicationLoad": "text", "stressProfile": "text" },
            "personalityFit": { "bestTraits": ["trait"], "potentialFriction": ["risk"], "teamStyle": "text", "decisionStyle": "text" },
            "compensation": { "entryRange": "text", "midRange": "text", "seniorRange": "text", "growthCeiling": "text", "stability": "text" },
            "market": { "demand": "text", "growthTrend": "text", "competition": "text", "remoteAvailability": "text", "aiAutomationRisk": "text" },
            "skillsAndPath": { "mustHaveSkills": ["skill"], "skillGaps": ["gap"], "rampUpTime": "text", "portfolioSignals": ["signal"] },
            "longTerm": { "advancementPotential": "text", "workLifeBalance": "text", "burnoutRisk": "text", "transferability": "text" }
          }],
          "tradeOffSummary": {
            "bestPersonalityFit": "ID",
            "bestSalaryUpside": "ID",
            "bestMarketOutlook": "ID",
            "safestLongTermChoice": "ID",
            "notes": ["note"]
          }
        }
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

    aiResults.comparisonInsights ||= this.generateComparisonInsights(careers);

    const comparisonResults = {
      userId,
      careerIds: normalizedCareerIds,
      careers,
      quantitativeComparison,
      ...aiResults,
    };

    const savedComparison = await this.create({
      userId,
      careerIds: normalizedCareerIds,
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
          const insightData = insight as unknown as CareerInsightDocument;
          return {
            _id: insightData._id,
            title: insightData.careerTitle,
            category: 'Công nghệ',
            description: insightData.analysis?.overview || '',
            requiredSkills: insightData.analysis?.keySkills || [],
            marketInfo: { demandLevel: insightData.analysis?.demandLevel || 'Cao' },
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
          const insightData = insight as unknown as CareerInsightDocument;
          return {
            _id: insightData._id,
            title: insightData.careerTitle,
            category: 'Công nghệ',
            description: insightData.analysis?.overview || '',
            requiredSkills: insightData.analysis?.keySkills || [],
            marketInfo: { demandLevel: insightData.analysis?.demandLevel || 'Cao' },
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

  private async resolveAllowedCareerSelection(
    userId: string,
    careerIds: string[],
  ): Promise<{ careerIds: string[]; careers: Career[]; allowedCareers: AllowedCareerComparisonItem[] }> {
    const requestedIds = this.assertCareerComparisonCount(careerIds);
    const allowedCareers = await this.getAllowedCareersForUser(userId);
    const allowedByAlias = this.buildAllowedCareerLookup(allowedCareers);
    const selectedAllowedCareers = requestedIds.map((careerId) => {
      const allowed = allowedByAlias.get(careerId);
      if (!allowed) {
        throw new BadRequestException(`Career is not available for comparison: ${careerId}`);
      }
      return allowed;
    });
    const normalizedCareerIds = selectedAllowedCareers.map((career) => career.id);
    const careers = await Promise.all(
      selectedAllowedCareers.map((career) => this.resolveAllowedCareerToCareer(career)),
    );

    return { careerIds: normalizedCareerIds, careers, allowedCareers: selectedAllowedCareers };
  }

  private assertCareerComparisonCount(careerIds: string[]): string[] {
    const requestedIds = (Array.isArray(careerIds) ? careerIds : [])
      .map((careerId) => String(careerId || '').trim())
      .filter(Boolean);
    const uniqueIds = [...new Set(requestedIds)];

    if (uniqueIds.length !== requestedIds.length) {
      throw new BadRequestException('Please choose distinct careers for comparison');
    }
    if (uniqueIds.length < 2) {
      throw new BadRequestException('At least 2 career IDs are required for comparison');
    }
    if (uniqueIds.length > MAX_CAREERS_PER_COMPARISON) {
      throw new BadRequestException(`You can compare up to ${MAX_CAREERS_PER_COMPARISON} careers at once`);
    }

    for (const careerId of uniqueIds) {
      if (!Types.ObjectId.isValid(careerId)) {
        throw new BadRequestException(`Invalid career ID: ${careerId}`);
      }
    }

    return uniqueIds;
  }

  private toAllowedCareerComparisonItem(
    result: Record<string, unknown>,
    insights: Record<string, any>[],
  ): AllowedCareerComparisonItem | null {
    const careerValue = result.careerId;
    const careerRecord =
      typeof careerValue === 'object' && careerValue !== null
        ? (careerValue as Record<string, unknown>)
        : {};
    const fitResultId = this.extractId(result.id) || this.extractId(result._id);
    const careerId = this.extractId(careerValue);
    const title = this.firstString(result.careerTitle, careerRecord.title);

    if (!fitResultId || !title) {
      return null;
    }

    const insight = this.findInsightByTitle(title, insights);
    const careerInsightId = this.extractId(insight?._id);
    const analysis = (insight?.analysis || {}) as Record<string, unknown>;
    const skills =
      this.toStringArray(careerRecord.requiredSkills) ||
      this.toStringArray(analysis.keySkills) ||
      this.toStringArray(result.strengths) ||
      [];
    const id = careerId || careerInsightId || fitResultId;

    return {
      id,
      source: careerId ? 'career' : careerInsightId ? 'career_insight' : 'career_fit_result',
      careerFitResultId: fitResultId,
      careerId,
      careerInsightId,
      title,
      description: this.firstString(careerRecord.description, analysis.overview, result.aiExplanation),
      category: this.firstString(careerRecord.category, insight?.category, 'other'),
      match: this.toOptionalNumber(result.overallFitScore),
      rank: this.toOptionalNumber(result.rank || result.recommendationRank),
      skills,
      salaryRange: typeof analysis.salaryRange === 'string' ? analysis.salaryRange : undefined,
      demandLevel: typeof analysis.demandLevel === 'string' ? analysis.demandLevel : undefined,
    };
  }

  private buildAllowedCareerLookup(
    allowedCareers: AllowedCareerComparisonItem[],
  ): Map<string, AllowedCareerComparisonItem> {
    const lookup = new Map<string, AllowedCareerComparisonItem>();
    for (const career of allowedCareers) {
      for (const alias of [career.id, career.careerId, career.careerInsightId, career.careerFitResultId]) {
        if (alias) {
          lookup.set(alias, career);
        }
      }
    }
    return lookup;
  }

  private async resolveAllowedCareerToCareer(
    allowedCareer: AllowedCareerComparisonItem,
  ): Promise<Career> {
    if (allowedCareer.careerId) {
      try {
        return await this.careerService.findOne(allowedCareer.careerId);
      } catch {
        // Fall through to insight/result mapping.
      }
    }

    if (allowedCareer.careerInsightId) {
      const insights = await this.careerFitResultService.findAllInsights();
      const insight = insights.find((item) => this.extractId(item._id) === allowedCareer.careerInsightId);
      if (insight) {
        return this.mapInsightToCareer(insight);
      }
    }

    return this.mapAllowedItemToCareer(allowedCareer);
  }

  private mapInsightToCareer(insight: Record<string, any>): Career {
    const analysis = (insight.analysis || {}) as Record<string, unknown>;
    const id = this.extractId(insight._id) || new Types.ObjectId().toHexString();
    return {
      _id: new Types.ObjectId(id),
      title: this.firstString(insight.careerTitle),
      category: this.firstString(insight.category, 'other'),
      description: this.firstString(analysis.overview),
      requiredSkills: this.toStringArray(analysis.keySkills) || [],
      marketInfo: {
        demandLevel: this.firstString(analysis.demandLevel, 'medium'),
      },
      discoveryData: {
        pros: this.toStringArray(analysis.pros) || [],
        cons: this.toStringArray(analysis.cons) || [],
        trends: Array.isArray(analysis.trends) ? analysis.trends : [],
        topCompanies: this.toStringArray(analysis.topCompanies) || [],
        salarySummary: typeof analysis.salaryRange === 'string' ? analysis.salaryRange : undefined,
      },
    } as unknown as Career;
  }

  private mapAllowedItemToCareer(allowedCareer: AllowedCareerComparisonItem): Career {
    return {
      _id: new Types.ObjectId(allowedCareer.id),
      title: allowedCareer.title,
      category: allowedCareer.category || 'other',
      description: allowedCareer.description || '',
      requiredSkills: allowedCareer.skills,
      marketInfo: {
        demandLevel: allowedCareer.demandLevel || 'medium',
      },
      discoveryData: {
        pros: [],
        cons: [],
        trends: [],
        topCompanies: [],
        salarySummary: allowedCareer.salaryRange,
      },
    } as unknown as Career;
  }

  private generateComparisonInsights(careers: Career[]): ComparisonInsights {
    const firstCareerId = careers[0]?._id?.toString() || '';
    const secondCareerId = careers[1]?._id?.toString() || firstCareerId;

    return {
      criteriaGuide: [
        {
          key: 'personFit',
          label: 'Con nguoi',
          description: 'Moi truong, nhip lam viec, giao tiep, ap luc, tu chu va lifestyle.',
        },
        {
          key: 'personalityFit',
          label: 'Tinh cach',
          description: 'Traits phu hop, diem de met, team style va cach ra quyet dinh.',
        },
        {
          key: 'compensation',
          label: 'Luong',
          description: 'Entry/mid/senior range, tran thu nhap, toc do tang va do on dinh.',
        },
        {
          key: 'market',
          label: 'Thi truong',
          description: 'Nhu cau tuyen dung, tang truong, canh tranh, remote va rui ro AI.',
        },
        {
          key: 'skillsAndPath',
          label: 'Ky nang',
          description: 'Skill can hoc, gap hien tai, portfolio va thoi gian ramp-up.',
        },
        {
          key: 'longTerm',
          label: 'Dai han',
          description: 'Thang tien, work-life balance, burnout va kha nang chuyen nganh.',
        },
      ],
      perCareer: careers.map((career, index) => {
        const skills = career.requiredSkills?.slice(0, 5) || [];
        const market = career.marketInfo;
        return {
          careerId: career._id?.toString() || '',
          careerTitle: career.title,
          personFit: {
            workEnvironment: this.renderWorkEnvironment(career),
            workRhythm: index === 0 ? 'Nhanh, nhieu van de moi' : 'On dinh hon, can do sau',
            autonomyLevel: index === 0 ? 'Cao' : 'Trung binh den cao',
            communicationLoad: index === 0 ? 'Trung binh' : 'Cao khi lam voi stakeholder',
            stressProfile: career.workEnvironment?.stressLevel || 'Trung binh',
          },
          personalityFit: {
            bestTraits: career.personalityFit?.idealTraits?.slice(0, 4) || ['Tu duy hoc hoi', 'Ky luat', 'Giai quyet van de'],
            potentialFriction: career.personalityFit?.challengingTraits?.slice(0, 3) || ['De met neu khong hop nhip lam viec'],
            teamStyle: index === 0 ? 'Hop tac linh hoat' : 'Can phoi hop ro voi team',
            decisionStyle: 'Can bang giua du lieu, trai nghiem va muc tieu dai han',
          },
          compensation: {
            entryRange: this.extractSalaryRange(career, 0) || 'Dang cap nhat',
            midRange: this.extractSalaryRange(career, 1) || 'Tang theo kinh nghiem va portfolio',
            seniorRange: this.extractSalaryRange(career, 2) || 'Phu thuoc cap bac, cong ty va thi truong',
            growthCeiling: index === 0 ? 'Tot neu len senior/lead' : 'Tot neu co chuyen mon sau',
            stability: 'Phu thuoc nang luc cap nhat ky nang va nhu cau nganh',
          },
          market: {
            demand: String(market?.demandLevel || 'Dang cap nhat'),
            growthTrend: String(market?.growthProjection || 'Co tiem nang tang truong'),
            competition: String(market?.competitionLevel || 'Trung binh'),
            remoteAvailability: career.workEnvironment?.workSettings?.includes('remote') ? 'Tot' : 'Tuy cong ty/nganh',
            aiAutomationRisk: String(market?.automationRisk || 'Can theo doi'),
          },
          skillsAndPath: {
            mustHaveSkills: skills,
            skillGaps: skills.slice(0, 3),
            rampUpTime: index === 0 ? '6-12 thang voi lo trinh tap trung' : '9-18 thang de co do sau',
            portfolioSignals: ['Du an thuc te', 'Case study', 'Bang chung ket qua hoc/lam'],
          },
          longTerm: {
            advancementPotential: 'Tot neu lien tuc nang cap ky nang va network',
            workLifeBalance: String(career.workEnvironment?.workSchedule?.join(', ') || 'Tuy moi truong lam viec'),
            burnoutRisk: String(career.workEnvironment?.stressLevel || 'Trung binh'),
            transferability: 'Co the chuyen sang vai tro lien quan neu xay dung skill nen tot',
          },
        };
      }),
      tradeOffSummary: {
        bestPersonalityFit: firstCareerId,
        bestSalaryUpside: secondCareerId,
        bestMarketOutlook: firstCareerId,
        safestLongTermChoice: firstCareerId,
        notes: [
          'Dung nhom Con nguoi/Tinh cach de xem nghe co hop cach lam viec hang ngay khong.',
          'Dung nhom Luong/Thi truong de xem trade-off giua thu nhap, canh tranh va do ben.',
          'Dung nhom Ky nang/Dai han de chon lo trinh it rui ro nhat.',
        ],
      },
    };
  }

  private findInsightByTitle(
    title: string,
    insights: Record<string, any>[],
  ): Record<string, any> | undefined {
    const normalizedTitle = title.trim().toLowerCase();
    return insights.find((insight) => this.firstString(insight.careerTitle).toLowerCase() === normalizedTitle);
  }

  private extractId(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Types.ObjectId) return value.toHexString();
    if (typeof value === 'string') return Types.ObjectId.isValid(value) ? value : undefined;
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const id = record.id || record._id;
      if (id instanceof Types.ObjectId) return id.toHexString();
      if (typeof id === 'string' && Types.ObjectId.isValid(id)) return id;
      if (id) {
        const stringId = this.toStringValue(id);
        return stringId && Types.ObjectId.isValid(stringId) ? stringId : undefined;
      }
    }
    return undefined;
  }

  private toStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.map((item) => this.firstString(item)).filter(Boolean);
  }

  private firstString(...values: unknown[]): string {
    for (const value of values) {
      const stringValue = this.toStringValue(value)?.trim();
      if (stringValue) return stringValue;
    }
    return '';
  }

  private toStringValue(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Types.ObjectId) return value.toHexString();
    return undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private renderWorkEnvironment(career: Career): string {
    const settings = career.workEnvironment?.workSettings || [];
    if (settings.length > 0) return settings.join(', ');
    return career.description ? career.description.slice(0, 120) : 'Dang cap nhat';
  }

  private extractSalaryRange(career: Career, levelIndex: number): string | undefined {
    const salary = career.careerLevels?.[levelIndex]?.salary?.[0];
    if (!salary) {
      return career.discoveryData?.salarySummary;
    }
    const currency = salary.currency || 'VND';
    return `${salary.min}-${salary.max} ${currency}/${salary.location || 'market'}`;
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
        // If not in static careers, it can be a Discovery insight or an allowed fit-result id.
        const insight = await this.careerFitResultService.findAllInsights();
        const exists = insight.some(i => (i as CareerInsightDocument)._id.toString() === careerId);
        if (!exists) {
          try {
            await this.careerFitResultService.findOne(careerId);
          } catch {
            throw new BadRequestException(`Career not found: ${careerId}`);
          }
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
