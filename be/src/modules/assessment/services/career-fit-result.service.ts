import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AIAnalysisResult,
  AssessmentAnswerData,
  CareerRecommendation,
} from '../../../common/interfaces/ai-analysis.interface';
import { AIService } from '../../../common/services/ai.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { CareerInsight, CareerInsightDocument } from '../../careers/schemas/career-insight.schema';
import { Career, CareerDocument } from '../../careers/schemas/career.schema';
import { UsersService } from '../../users/users.service';
import { CreateCareerFitResultDto, UpdateCareerFitResultDto } from '../dto';
import { SessionStatus } from '../enums/assessment.enum';
import { AssessmentSession, AssessmentSessionDocument } from '../schemas/assessment-sesions.schema';
import { CareerFitResult, CareerFitResultDocument } from '../schemas/career-fit-result.schema';
import { AssessmentAnswerService } from './assessment-answer.service';

interface QuestionData {
  _id?: Types.ObjectId | string;
  questionText?: string;
  dimension?: string;
  options?: { value: string; label: string }[];
}

interface AnswerWithSessionId {
  sessionId?: Types.ObjectId | string;
}

export interface CareerFitResultVisibilityView extends Record<string, unknown> {
  id?: unknown;
  generatedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  assessmentSessionId?: unknown;
  recommendationRank: number;
  rank: number;
  isLocked: boolean;
  lockedReason?: 'plan_limit';
  requiredPlan?: 'Plus';
}

interface CareerRecommendationEntitlements {
  maxPerRun?: number;
  visiblePerRun?: number;
}

export interface CareerFitResultHistoryItem {
  sessionId: string;
  attemptNumber?: number;
  status?: string;
  completedAt?: Date;
  generatedAt?: Date;
  topCareerTitle?: string;
  topFitScore?: number;
  resultCount: number;
  isLatest: boolean;
}

@Injectable()
export class CareerFitResultService {
  private readonly logger = new Logger(CareerFitResultService.name);
  private readonly detailedAnalysisInFlight = new Map<string, Promise<Record<string, unknown>>>();

  constructor(
    @InjectModel(CareerFitResult.name)
    private readonly careerFitResultModel: Model<CareerFitResultDocument>,
    @InjectModel(AssessmentSession.name)
    private readonly assessmentSessionModel: Model<AssessmentSessionDocument>,
    @InjectModel(Career.name)
    private readonly careerModel: Model<CareerDocument>,
    @InjectModel(CareerInsight.name)
    private readonly careerInsightModel: Model<CareerInsightDocument>,
    private readonly aiService: AIService,
    private readonly assessmentAnswerService: AssessmentAnswerService,
    private readonly aiQuotaService: AiQuotaService,
    private readonly usersService: UsersService,
  ) {}

  async create(createDto: CreateCareerFitResultDto): Promise<CareerFitResult> {
    const result = new this.careerFitResultModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      careerId: new Types.ObjectId(createDto.careerId),
    });
    return result.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<CareerFitResult> = {},
  ): Promise<{ data: CareerFitResult[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const query = this.buildQuery(filters);

    const [data, total] = await Promise.all([
      this.careerFitResultModel
        .find(query)
        .populate('userId', 'email firstName lastName')
        .populate('careerId', 'title category industry')
        .sort({ recommendationRank: 1, overallFitScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.careerFitResultModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<CareerFitResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career fit result ID');
    }

    const result = await this.careerFitResultModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .exec();

    if (!result) {
      throw new NotFoundException('Career fit result not found');
    }

    return result;
  }

  // Deprecated: Sessions are removed from the system
  // async findBySession(sessionId: string): Promise<CareerFitResult[]> {
  //   if (!Types.ObjectId.isValid(sessionId)) {
  //     throw new BadRequestException('Invalid session ID');
  //   }

  //   return this.careerFitResultModel
  //     .find({ sessionId: new Types.ObjectId(sessionId) })
  //     .populate('careerId', 'title category industry')
  //     .sort({ overallFitScore: -1 })
  //     .exec();
  // }

  async findByUser(userId: string, limit?: number): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    let query = this.careerFitResultModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .sort({ recommendationRank: 1, overallFitScore: -1, createdAt: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
  }

  async findByUserVisible(
    userId: string,
    limit?: number,
    sessionId?: string,
  ): Promise<CareerFitResultVisibilityView[]> {
    const results = sessionId
      ? await this.findByUserSession(userId, sessionId, limit)
      : await this.findLatestByUser(userId, limit);
    return this.applyCareerRecommendationVisibility(userId, results);
  }

  async findByUserSession(
    userId: string,
    sessionId: string | Types.ObjectId,
    limit?: number,
  ): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const sessionObjectId = await this.resolveOwnedSessionObjectId(userId, sessionId);

    let query = this.careerFitResultModel
      .find({
        userId: new Types.ObjectId(userId),
        assessmentSessionId: sessionObjectId,
      })
      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .sort({ recommendationRank: 1, overallFitScore: -1, createdAt: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
  }

  async findLatestByUser(userId: string, limit?: number): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const latestSessionId = await this.findLatestResultSessionId(userId);
    if (latestSessionId) {
      return this.findByUserSession(userId, latestSessionId, limit);
    }

    return this.findByUser(userId, limit);
  }

  async findMyHistory(userId: string): Promise<CareerFitResultHistoryItem[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);
    const rows = await this.careerFitResultModel.aggregate<{
      _id: Types.ObjectId;
      generatedAt?: Date;
      resultCreatedAt?: Date;
      topCareerTitle?: string;
      topFitScore?: number;
      resultCount: number;
    }>([
      {
        $match: {
          userId: userObjectId,
          assessmentSessionId: { $exists: true, $ne: null },
        },
      },
      {
        $sort: {
          recommendationRank: 1,
          overallFitScore: -1,
          generatedAt: -1,
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: '$assessmentSessionId',
          generatedAt: { $max: '$generatedAt' },
          resultCreatedAt: { $max: '$createdAt' },
          topCareerTitle: { $first: '$careerTitle' },
          topFitScore: { $first: '$overallFitScore' },
          resultCount: { $sum: 1 },
        },
      },
      { $sort: { generatedAt: -1, resultCreatedAt: -1 } },
    ]).exec();

    if (rows.length === 0) {
      return [];
    }

    const sessionIds = rows.map((row) => row._id);
    const sessions = await this.assessmentSessionModel
      .find({ _id: { $in: sessionIds }, userId: userObjectId })
      .lean()
      .exec();
    const sessionMap = new Map(sessions.map((session) => [String(session._id), session]));

    return rows.map((row, index) => {
      const session = sessionMap.get(String(row._id));
      return {
        sessionId: row._id.toString(),
        attemptNumber: session?.attemptNumber,
        status: session?.status,
        completedAt: session?.completedAt,
        generatedAt: row.generatedAt || row.resultCreatedAt,
        topCareerTitle: row.topCareerTitle,
        topFitScore: row.topFitScore,
        resultCount: row.resultCount,
        isLatest: index === 0,
      };
    });
  }

  async findByCareer(careerId: string): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(careerId)) {
      throw new BadRequestException('Invalid career ID');
    }

    return this.careerFitResultModel
      .find({ careerId: new Types.ObjectId(careerId) })
      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .sort({ overallFitScore: -1 })
      .exec();
  }

  async findAllInsights(): Promise<Record<string, any>[]> {
    const [insights, curated] = await Promise.all([
      this.careerInsightModel.find().exec(),
      this.careerModel.find({ isActive: true }).exec(),
    ]);

    interface CareerInsightItem {
      careerTitle: string;
      category?: string;
      updatedAt?: Date;
      lastAIUpdate?: Date | string | number;
      analysis?: any;
      _id?: any;
    }

    const curatedMap = new Map(curated.map((career) => [career.title.toLowerCase(), career]));

    const result: CareerInsightItem[] = (insights as unknown as CareerInsightDocument[]).map(
      (doc) => {
        const base = doc.toObject() as CareerInsightItem;
        const match = base.careerTitle ? curatedMap.get(base.careerTitle.toLowerCase()) : undefined;
        return {
          ...base,
          category: match?.category || 'other',
        };
      },
    );

    // Add curated careers that aren't in insights yet
    for (const c of curated) {
      const exists = result.some((i) => i.careerTitle.toLowerCase() === c.title.toLowerCase());
      if (!exists) {
        result.push({
          _id: c._id,
          careerTitle: c.title,
          category: c.category,
          analysis: {
            overview: c.description,
            pros: [],
            cons: [],
            trends: [],
            salaryRange: c.careerLevels?.[0]?.salary?.[0]
              ? `${c.careerLevels[0].salary[0].min}-${c.careerLevels[0].salary[0].max}`
              : 'N/A',
            demandLevel: c.marketInfo?.demandLevel || 'medium',
            keySkills: c.skillRequirements?.technical?.map((s) => s.skillName) || [],
            topCompanies: [],
          },
          lastAIUpdate: (c as unknown as { updatedAt?: Date }).updatedAt || new Date(),
        });
      }
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.lastAIUpdate || 0).getTime();
      const dateB = new Date(b.updatedAt || b.lastAIUpdate || 0).getTime();
      return dateB - dateA;
    }) as unknown as Record<string, any>[];
  }

  async getTopCareerMatches(userId: string, limit = 10): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.careerFitResultModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('careerId', 'title category industry description')
      .sort({ recommendationRank: 1, overallFitScore: -1 })
      .limit(limit)
      .exec();
  }

  async getTopCareerMatchesVisible(
    userId: string,
    limit = 10,
  ): Promise<CareerFitResultVisibilityView[]> {
    const results = await this.findLatestByUser(userId, limit);
    return this.applyCareerRecommendationVisibility(userId, results);
  }

  async update(id: string, updateDto: UpdateCareerFitResultDto): Promise<CareerFitResult> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career fit result ID');
    }

    const result = await this.careerFitResultModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })

      .populate('userId', 'email firstName lastName')
      .populate('careerId', 'title category industry')
      .exec();

    if (!result) {
      throw new NotFoundException('Career fit result not found');
    }

    return result;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career fit result ID');
    }

    const result = await this.careerFitResultModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Career fit result not found');
    }
  }

  async generateComparisonReport(
    userId: string,
    careerIds: string[],
  ): Promise<Record<string, any>> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const objectIdCareerIds = careerIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid career ID: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const results = await this.careerFitResultModel
      .find({
        userId: new Types.ObjectId(userId),
        careerId: { $in: objectIdCareerIds },
      })
      .populate('careerId', 'title category industry')
      .sort({ overallFitScore: -1 })
      .exec();

    return {
      userId,
      careerComparisons: results.map((result) => ({
        career: result.careerId,
        fitScore: result.overallFitScore,
        strengths: result.strengths,
        developmentAreas: result.developmentAreas,
        dimensionScores: result.dimensionScores,
      })),
      recommendations: this.generateRecommendations(results),
    };
  }

  /**
   * Generate AI-powered career fit analysis from assessment answers
   */
  async generateAIAnalysis(
    userId: string,
    assessmentAnswers: AssessmentAnswerData[],
    availableCareers: Career[] = [],
    assessmentSessionId?: string | Types.ObjectId,
  ): Promise<CareerFitResultVisibilityView[]> {
    try {
      this.logger.log(`Generating AI analysis for user ${userId}`);

      const sessionObjectId = assessmentSessionId
        ? await this.resolveOwnedSessionObjectId(userId, assessmentSessionId)
        : undefined;

      if (sessionObjectId) {
        const existingResults = await this.findByUserSession(userId, sessionObjectId);
        if (existingResults.length > 0) {
          this.logger.log(
            `Returning existing career recommendations for session ${sessionObjectId.toString()}`,
          );
          await this.markSessionCompletedIfItHasResults(userId, sessionObjectId);
          return this.applyCareerRecommendationVisibility(userId, existingResults);
        }
      }

      await this.aiQuotaService.checkQuota(userId, AiFeature.ASSESSMENT);
      await this.aiQuotaService.checkQuota(userId, AiFeature.CAREER_RECOMMENDATION);

      // Get AI analysis
      const analysis: AIAnalysisResult = await this.aiService.analyzePersonalityAndCareers(
        assessmentAnswers,
        availableCareers,
      );
      await this.aiQuotaService.consumeQuota(userId, AiFeature.CAREER_RECOMMENDATION, {
        requestCount: 1,
        tokensUsed: 0,
      });

      const entitlements = await this.resolveCareerRecommendationEntitlements(userId);
      const recommendations = this.ensureRecommendationCount(
        analysis.careerRecommendations,
        entitlements.maxPerRun ?? 5,
        availableCareers,
      );

      // Seed Discovery Repository with new careers found by AI
      const visibleRecommendations = recommendations.filter(
        (_rec, index) => !this.isLockedByVisibleLimit(index + 1, entitlements.visiblePerRun),
      );
      for (const rec of visibleRecommendations) {
        const title = rec.careerTitle;
        try {
          await this.careerInsightModel.findOneAndUpdate(
            { careerTitle: { $regex: new RegExp(`^${this.escapeRegExp(title)}$`, 'i') } },
            {
              $setOnInsert: {
                careerTitle: title,
                lastAIUpdate: new Date(0), // Set to epoch so it's considered "stale" and will be fully analyzed on first click
                analysis: {
                  overview: rec.reasons?.join('. ') || 'Đang cập nhật thông tin...',
                  pros: [],
                  cons: [],
                  trends: [],
                  salaryRange: 'Đang cập nhật...',
                  demandLevel: 'Đang cập nhật...',
                  keySkills: [],
                  topCompanies: [],
                },
              },
            },
            { upsert: true },
          );
        } catch (e: unknown) {
          const mongoError = e as { code?: number; message?: string };
          if (mongoError.code !== 11000 && !mongoError.message?.includes('E11000')) {
            this.logger.error(`Failed to seed discovery repository for ${title}:`, e);
          }
        }
      }

      // Convert AI recommendations to CareerFitResult documents
      const careerFitResults: CareerFitResult[] = [];

      for (const [index, recommendation] of recommendations.entries()) {
        // Validate careerId - only convert if it's a valid ObjectId string
        let careerId = null;
        if (recommendation.careerId && Types.ObjectId.isValid(recommendation.careerId)) {
          careerId = new Types.ObjectId(recommendation.careerId);
        }

        const careerFitData = {
          userId: new Types.ObjectId(userId),
          careerId,
          careerTitle: recommendation.careerTitle,
          overallFitScore: recommendation.fitScore,
          recommendationRank: index + 1,

          // Personality match scores
          personalityMatch: {
            big5Score: recommendation.personalityMatch?.bigFiveAlignment,
            riasecScore: recommendation.personalityMatch?.riasecAlignment,
            overallPersonalityFit: recommendation.personalityMatch?.overallFit,
          },

          // Dimension scores from AI analysis
          dimensionScores: {
            ...analysis.personalityAnalysis.bigFiveScores,
            ...analysis.personalityAnalysis.riasecScores,
          },

          // Strengths and development areas
          strengths: recommendation.reasons,
          developmentAreas: recommendation.potentialChallenges,
          improvementSuggestions: recommendation.developmentSuggestions,

          // AI insights
          aiExplanation: analysis.explanation,
          confidence: analysis.confidence,

          // Personality profile
          personalityProfile: analysis.personalityAnalysis.personalityProfile,
          assessmentSessionId: sessionObjectId,
        };

        // Save to database
        const result = new this.careerFitResultModel(careerFitData);
        const savedResult = await result.save();
        careerFitResults.push(savedResult);
      }

      this.logger.log(
        `Generated ${careerFitResults.length} career recommendations for user ${userId}`,
      );

      if (careerFitResults.length > 0) {
        await this.markSessionCompletedIfItHasResults(userId, sessionObjectId);
      }

      // Update user's onboarding status
      await this.usersService.updateMe(userId, { onboarding_completed: true });

      return this.applyCareerRecommendationVisibility(userId, careerFitResults);
    } catch (error) {
      this.logger.error('Failed to generate AI analysis:', error);
      throw new BadRequestException('Failed to generate career analysis');
    }
  }

  /**
   * Generate AI-powered career fit analysis by auto-fetching user's answers from database
   */
  async generateAnalysisFromUserAnswers(
    userId: string,
    availableCareers: Career[] = [],
    assessmentSessionId?: string | Types.ObjectId,
  ): Promise<CareerFitResultVisibilityView[]> {
    try {
      this.logger.log(`Fetching assessment answers for user ${userId}`);

      const targetSessionObjectId = assessmentSessionId
        ? await this.resolveOwnedSessionObjectId(userId, assessmentSessionId)
        : await this.findLatestAssessmentSessionIdForGeneration(userId);
      const targetSessionId = targetSessionObjectId?.toString();

      if (targetSessionId) {
        const existingResults = await this.findByUserSession(userId, targetSessionId);
        if (existingResults.length > 0) {
          await this.markSessionCompletedIfItHasResults(userId, targetSessionObjectId);
          return this.applyCareerRecommendationVisibility(userId, existingResults);
        }
      }

      // Fetch user's answers from database
      const userAnswers = targetSessionId
        ? await this.assessmentAnswerService.findByUserAndSession(userId, targetSessionId)
        : await this.assessmentAnswerService.findByUser(userId);

      if (!userAnswers || userAnswers.length === 0) {
        throw new BadRequestException(
          'No assessment answers found for this user. Please complete the assessment first.',
        );
      }

      this.logger.log(`Found ${userAnswers.length} answers for user ${userId}`);

      // Infer sessionId from user's answers (choose the most frequent sessionId)
      let inferredSessionId: string | undefined = targetSessionId;
      try {
        if (!inferredSessionId) {
          const counts: Record<string, number> = {};
          for (const a of userAnswers as AnswerWithSessionId[]) {
            const sid = a.sessionId?.toString();
            if (sid) counts[sid] = (counts[sid] || 0) + 1;
          }
          const entries = Object.entries(counts);
          if (entries.length > 0) {
            entries.sort(([, a], [, b]) => b - a);
            inferredSessionId = entries[0][0];
          }
        }
      } catch {
        inferredSessionId = undefined;
      }

      // Transform answers to AssessmentAnswerData format
      const assessmentAnswers: AssessmentAnswerData[] = userAnswers.map((answer) => {
        const question = answer.questionId as QuestionData; // Populated question data
        return {
          questionId:
            typeof question === 'object'
              ? (question._id?.toString() ?? '')
              : (answer.questionId?.toString() ?? ''),
          answer: answer.answer,
          questionText: question?.questionText ?? '',
          dimension: question?.dimension ?? '',
          options: question?.options ?? [],
        };
      });

      // Use the existing generateAIAnalysis method and pass inferred session id if any
      return this.generateAIAnalysis(
        userId,
        assessmentAnswers,
        availableCareers,
        inferredSessionId,
      );
    } catch (error) {
      this.logger.error('Failed to generate analysis from user answers:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to generate career analysis from user answers');
    }
  }

  /**
   * Get enhanced career insights using AI
   */
  async getCareerInsight(
    userId: string,
    careerTitle: string,
    personalityTraits: string[],
  ): Promise<string> {
    try {
      await this.aiQuotaService.checkQuota(userId, AiFeature.CHATBOT);
      const res = await this.aiService.generateCareerInsight(careerTitle, personalityTraits);
      await this.aiQuotaService.consumeQuota(userId, AiFeature.CHATBOT, {
        requestCount: 1,
        tokensUsed: 0,
      });
      return res;
    } catch (error) {
      this.logger.error('Failed to get career insight:', error);
      return `${careerTitle} aligns well with your personality profile. Consider exploring this career path further.`;
    }
  }

  async getDetailedAnalysis(userId: string, careerTitle: string): Promise<Record<string, unknown>> {
    const cacheKey = careerTitle.trim().toLowerCase();
    const inFlight = this.detailedAnalysisInFlight.get(cacheKey);
    if (inFlight) {
      this.logger.log(`Waiting for in-flight analysis for career: ${careerTitle}`);
      return inFlight;
    }

    const request = this.getOrGenerateDetailedAnalysis(userId, careerTitle);
    this.detailedAnalysisInFlight.set(cacheKey, request);
    try {
      return await request;
    } finally {
      this.detailedAnalysisInFlight.delete(cacheKey);
    }
  }

  private async getOrGenerateDetailedAnalysis(
    userId: string,
    careerTitle: string,
  ): Promise<Record<string, unknown>> {
    // 1. Check shared cache first
    const cachedInsight = await this.careerInsightModel.findOne({
      careerTitle: { $regex: new RegExp(`^${this.escapeRegExp(careerTitle)}$`, 'i') },
    });

    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const isExpired =
      cachedInsight && Date.now() - cachedInsight.lastAIUpdate.getTime() > ONE_MONTH_MS;

    if (cachedInsight && !isExpired) {
      this.logger.log(`Using cached analysis for career: ${careerTitle}`);
      return { ...cachedInsight.analysis, careerTitle: cachedInsight.careerTitle };
    }

    // 2. Not found or expired: Call AI
    this.logger.log(
      `Generating NEW analysis for career: ${careerTitle} (Personalized for user: ${userId})`,
    );

    // Get personality traits to make the AI prompt more relevant (as per current design)
    const results = await this.findLatestByUser(userId, 5);
    const personalityTraits: string[] = [];
    for (const r of results) {
      const profile = r.personalityProfile;
      if (profile?.primaryTraits) {
        personalityTraits.push(...profile.primaryTraits);
      }
    }

    const analysis = await this.aiService.generateDetailedCareerAnalysis(careerTitle, [
      ...new Set(personalityTraits),
    ]);

    // 3. Save to shared cache for other users
    try {
      await this.careerInsightModel.findOneAndUpdate(
        { careerTitle: { $regex: new RegExp(`^${this.escapeRegExp(careerTitle)}$`, 'i') } },
        {
          careerTitle, // Normalize title
          analysis,
          lastAIUpdate: new Date(),
        },
        { upsert: true, new: true },
      );
    } catch (error: unknown) {
      const mongoError = error as { code?: number; message?: string };
      if (mongoError.code === 11000 || mongoError.message?.includes('E11000')) {
        await this.careerInsightModel.findOneAndUpdate(
          { careerTitle: { $regex: new RegExp(`^${this.escapeRegExp(careerTitle)}$`, 'i') } },
          {
            analysis,
            lastAIUpdate: new Date(),
          },
          { new: true },
        );
      } else {
        throw error;
      }
    }

    return { ...analysis, careerTitle };
  }

  private async resolveOwnedSessionObjectId(
    userId: string,
    sessionId: string | Types.ObjectId,
  ): Promise<Types.ObjectId> {
    const sessionIdString = sessionId.toString();
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    if (!Types.ObjectId.isValid(sessionIdString)) {
      throw new BadRequestException('Invalid assessment session ID');
    }

    const sessionObjectId = new Types.ObjectId(sessionIdString);
    const session = await this.assessmentSessionModel
      .findOne({
        _id: sessionObjectId,
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();

    if (!session) {
      throw new BadRequestException('Assessment session does not belong to user');
    }

    return sessionObjectId;
  }

  private async findLatestResultSessionId(userId: string): Promise<Types.ObjectId | undefined> {
    const latest = await this.careerFitResultModel
      .findOne({
        userId: new Types.ObjectId(userId),
        assessmentSessionId: { $exists: true, $ne: null },
      })
      .select('assessmentSessionId')
      .sort({ generatedAt: -1, createdAt: -1 })
      .lean()
      .exec();

    const sessionId = latest?.assessmentSessionId;
    if (!sessionId) {
      return undefined;
    }

    const sessionObjectId =
      sessionId instanceof Types.ObjectId ? sessionId : new Types.ObjectId(String(sessionId));
    const sessionExists = await this.assessmentSessionModel.exists({
      _id: sessionObjectId,
      userId: new Types.ObjectId(userId),
    });

    return sessionExists ? sessionObjectId : undefined;
  }

  private async findLatestAssessmentSessionIdForGeneration(
    userId: string,
  ): Promise<Types.ObjectId | undefined> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);
    const activeSession = await this.assessmentSessionModel
      .findOne({ userId: userObjectId, status: SessionStatus.IN_PROGRESS })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (activeSession?._id) {
      return new Types.ObjectId(String(activeSession._id));
    }

    const completedSession = await this.assessmentSessionModel
      .findOne({ userId: userObjectId, status: SessionStatus.COMPLETED })
      .sort({ completedAt: -1, createdAt: -1 })
      .lean()
      .exec();
    if (completedSession?._id) {
      return new Types.ObjectId(String(completedSession._id));
    }

    return undefined;
  }

  private async markSessionCompletedIfItHasResults(
    userId: string,
    sessionObjectId?: Types.ObjectId,
  ): Promise<void> {
    if (!sessionObjectId || !Types.ObjectId.isValid(userId)) {
      return;
    }

    await this.assessmentSessionModel
      .updateOne(
        {
          _id: sessionObjectId,
          userId: new Types.ObjectId(userId),
          status: { $ne: SessionStatus.COMPLETED },
        },
        {
          $set: {
            status: SessionStatus.COMPLETED,
            completedAt: new Date(),
          },
        },
      )
      .exec();
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async applyCareerRecommendationVisibility(
    userId: string,
    results: CareerFitResult[],
  ): Promise<CareerFitResultVisibilityView[]> {
    const { visiblePerRun } = await this.resolveCareerRecommendationEntitlements(userId);

    return results.map((result, index) => {
      const rank = this.resolveRecommendationRank(result, index);
      if (this.isLockedByVisibleLimit(rank, visiblePerRun)) {
        return this.redactLockedCareerFitResult(result, rank);
      }

      return {
        ...this.toPlainCareerFitResult(result),
        recommendationRank: rank,
        rank,
        isLocked: false,
      };
    });
  }

  private ensureRecommendationCount(
    recommendations: CareerRecommendation[] = [],
    targetCount: number,
    availableCareers: Career[] = [],
  ): CareerRecommendation[] {
    const target = Math.max(0, Math.floor(targetCount));
    if (target === 0) {
      return [];
    }

    const normalized: CareerRecommendation[] = [];
    const seenTitles = new Set<string>();
    for (const recommendation of recommendations) {
      const title = recommendation?.careerTitle?.trim();
      if (!title) continue;
      const key = title.toLowerCase();
      if (seenTitles.has(key)) continue;

      normalized.push({
        ...recommendation,
        careerTitle: title,
      });
      seenTitles.add(key);
      if (normalized.length >= target) {
        return normalized;
      }
    }

    const candidates = this.getSupplementalCareerCandidates(availableCareers);
    for (const candidate of candidates) {
      const key = candidate.title.toLowerCase();
      if (seenTitles.has(key)) continue;

      normalized.push(
        this.createSupplementalRecommendation(candidate.title, normalized.length + 1, candidate.careerId),
      );
      seenTitles.add(key);
      if (normalized.length >= target) {
        break;
      }
    }

    return normalized;
  }

  private getSupplementalCareerCandidates(
    availableCareers: Career[] = [],
  ): Array<{ title: string; careerId: string | null }> {
    const curatedCandidates = availableCareers
      .map((career) => ({
        title: career.title?.trim(),
        careerId: this.extractCareerId(career),
      }))
      .filter((career): career is { title: string; careerId: string | null } => Boolean(career.title));

    return [
      ...curatedCandidates,
      { title: 'Chuyên viên phân tích dữ liệu', careerId: null },
      { title: 'Kỹ sư phần mềm', careerId: null },
      { title: 'Quản lý sản phẩm', careerId: null },
      { title: 'UX/UI Designer', careerId: null },
      { title: 'Chuyên viên marketing số', careerId: null },
      { title: 'Chuyên viên phân tích kinh doanh', careerId: null },
      { title: 'Chuyên viên tư vấn giải pháp', careerId: null },
    ];
  }

  private extractCareerId(career: Career): string | null {
    const rawId = (career as { id?: unknown; _id?: unknown }).id ?? (career as { _id?: unknown })._id;
    const stringId = this.stringifyId(rawId);
    return typeof stringId === 'string' && Types.ObjectId.isValid(stringId) ? stringId : null;
  }

  private createSupplementalRecommendation(
    careerTitle: string,
    rank: number,
    careerId: string | null,
  ): CareerRecommendation {
    const fitScore = Math.max(60, 78 - rank * 3);
    return {
      careerId,
      careerTitle,
      fitScore,
      personalityMatch: {
        bigFiveAlignment: fitScore,
        riasecAlignment: Math.max(60, fitScore - 2),
        overallFit: fitScore,
      },
      reasons: [
        'Bổ sung để đảm bảo đủ 5 gợi ý nghề nghiệp cho lượt đánh giá.',
        'Có nền tảng phù hợp với một phần hồ sơ tính cách và sở thích của bạn.',
      ],
      potentialChallenges: ['Cần tìm hiểu thêm yêu cầu kỹ năng cụ thể của nghề này.'],
      developmentSuggestions: [
        'Khám phá mô tả công việc, kỹ năng chính và thử một dự án nhỏ liên quan.',
      ],
    };
  }

  private async resolveCareerRecommendationEntitlements(
    userId: string,
  ): Promise<CareerRecommendationEntitlements> {
    const { limits } = await this.aiQuotaService.getPlanLimits(userId);
    const maxPerRun = this.toOptionalNonNegativeInteger(limits.maxCareerRecommendationsPerRun);
    const visiblePerRun =
      this.toOptionalNonNegativeInteger(limits.visibleCareerRecommendationsPerRun) ?? maxPerRun;

    return { maxPerRun, visiblePerRun };
  }

  private toOptionalNonNegativeInteger(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Math.max(0, Math.floor(value));
  }

  private resolveRecommendationRank(result: CareerFitResult, index: number): number {
    const rank = this.toOptionalNonNegativeInteger(
      (result as { recommendationRank?: unknown }).recommendationRank,
    );
    return rank && rank > 0 ? rank : index + 1;
  }

  private isLockedByVisibleLimit(rank: number, visiblePerRun?: number): boolean {
    return typeof visiblePerRun === 'number' && rank > visiblePerRun;
  }

  private redactLockedCareerFitResult(
    result: CareerFitResult,
    rank: number,
  ): CareerFitResultVisibilityView {
    const plain = this.toPlainCareerFitResult(result);

    return {
      id: plain.id,
      generatedAt: plain.generatedAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      assessmentSessionId: plain.assessmentSessionId,
      recommendationRank: rank,
      rank,
      isLocked: true,
      lockedReason: 'plan_limit',
      requiredPlan: 'Plus',
    };
  }

  private toPlainCareerFitResult(result: CareerFitResult): Record<string, unknown> {
    const serializable = result as {
      toJSON?: () => Record<string, unknown>;
      toObject?: () => Record<string, unknown>;
    };
    const plain =
      typeof serializable.toJSON === 'function'
        ? serializable.toJSON()
        : typeof serializable.toObject === 'function'
          ? serializable.toObject()
          : ({ ...result } as Record<string, unknown>);

    if (!plain.id && plain._id) {
      plain.id = this.stringifyId(plain._id);
    }

    return plain;
  }

  private stringifyId(value: unknown): unknown {
    if (value instanceof Types.ObjectId) return value.toHexString();
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      return this.stringifyId(record.id) || this.stringifyId(record._id) || value;
    }
    return value;
  }

  async getStatistics(): Promise<any> {
    const stats = await this.careerFitResultModel.aggregate([
      {
        $group: {
          _id: null,
          totalResults: { $sum: 1 },
          averageFitScore: { $avg: '$overallFitScore' },
          highFitCount: {
            $sum: {
              $cond: [{ $gte: ['$overallFitScore', 80] }, 1, 0],
            },
          },
          mediumFitCount: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$overallFitScore', 60] }, { $lt: ['$overallFitScore', 80] }] },
                1,
                0,
              ],
            },
          },
          lowFitCount: {
            $sum: {
              $cond: [{ $lt: ['$overallFitScore', 60] }, 1, 0],
            },
          },
        },
      },
    ]);

    return (
      stats[0] || {
        totalResults: 0,
        averageFitScore: 0,
        highFitCount: 0,
        mediumFitCount: 0,
        lowFitCount: 0,
      }
    );
  }

  private generateRecommendations(results: CareerFitResult[]): Record<string, unknown> {
    if (results.length === 0) return {};

    const topResult = results[0];

    return {
      topRecommendation: topResult.careerId,
      reasonsForRecommendation: topResult.strengths?.slice(0, 3) || [],
      developmentSuggestions: topResult.developmentAreas?.slice(0, 3) || [],
      alternativeOptions: results.slice(1, 4).map((r) => r.careerId),
    };
  }

  private buildQuery(filters: Partial<CareerFitResult>): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.userId) {
      const userId = filters.userId as unknown as string;
      query.userId = Types.ObjectId.createFromHexString(userId);
    }

    if (filters.careerId) {
      const careerId = filters.careerId as unknown as string;
      query.careerId = Types.ObjectId.createFromHexString(careerId);
    }

    if (filters.overallFitScore) {
      query.overallFitScore = { $gte: filters.overallFitScore };
    }

    return query;
  }
}
