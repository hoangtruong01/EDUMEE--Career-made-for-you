import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CareerFitResult, CareerFitResultDocument } from '../schemas/career-fit-result.schema';
import { CreateCareerFitResultDto, UpdateCareerFitResultDto } from '../dto';
import { AIService } from '../../../common/services/ai.service';
import { AssessmentAnswerData, AIAnalysisResult } from '../../../common/interfaces/ai-analysis.interface';
import { AssessmentAnswerService } from './assessment-answer.service';

interface QuestionData {
  _id?: Types.ObjectId | string;
  questionText?: string;
  dimension?: string;
}

interface Career {
  _id?: string;
  title: string;
  category?: string;
  industry?: string;
}

@Injectable()
export class CareerFitResultService {
  private readonly logger = new Logger(CareerFitResultService.name);

  constructor(
    @InjectModel(CareerFitResult.name)
    private readonly careerFitResultModel: Model<CareerFitResultDocument>,
    private readonly aiService: AIService,
    private readonly assessmentAnswerService: AssessmentAnswerService,
  ) { }

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
        .sort({ overallFitScore: -1, createdAt: -1 })
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
      .sort({ overallFitScore: -1, createdAt: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
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

  async getTopCareerMatches(userId: string, limit = 10): Promise<CareerFitResult[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.careerFitResultModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('careerId', 'title category industry description')
      .sort({ overallFitScore: -1 })
      .limit(limit)
      .exec();
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

  async generateComparisonReport(userId: string, careerIds: string[]): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const objectIdCareerIds = careerIds.map(id => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid career ID: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const results = await this.careerFitResultModel
      .find({
        userId: new Types.ObjectId(userId),
        careerId: { $in: objectIdCareerIds }
      })
      .populate('careerId', 'title category industry')
      .sort({ overallFitScore: -1 })
      .exec();

    return {
      userId,
      careerComparisons: results.map(result => ({
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
  ): Promise<CareerFitResult[]> {
    try {
      this.logger.log(`Generating AI analysis for user ${userId}`);

      // Delete old results for this user before creating new ones
      const deleteResult = await this.careerFitResultModel.deleteMany({
        userId: new Types.ObjectId(userId)
      });
      this.logger.log(`Deleted ${deleteResult.deletedCount} old career fit results for user ${userId}`);

      // Get AI analysis
      const analysis: AIAnalysisResult = await this.aiService.analyzePersonalityAndCareers(
        assessmentAnswers,
        availableCareers
      );

      // Convert AI recommendations to CareerFitResult documents
      const careerFitResults: CareerFitResult[] = [];

      for (const recommendation of analysis.careerRecommendations) {
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
          assessmentSessionId: assessmentSessionId ? new Types.ObjectId(assessmentSessionId) : undefined,
        };

        // Save to database
        const result = new this.careerFitResultModel(careerFitData);
        const savedResult = await result.save();
        careerFitResults.push(savedResult);
      }

      this.logger.log(`Generated ${careerFitResults.length} career recommendations for user ${userId}`);
      return careerFitResults;

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
    availableCareers: Career[] = []
  ): Promise<CareerFitResult[]> {
    try {
      this.logger.log(`Fetching assessment answers for user ${userId}`);

      // Fetch user's answers from database
      const userAnswers = await this.assessmentAnswerService.findByUser(userId);

      if (!userAnswers || userAnswers.length === 0) {
        throw new BadRequestException('No assessment answers found for this user. Please complete the assessment first.');
      }

      this.logger.log(`Found ${userAnswers.length} answers for user ${userId}`);

      // Infer sessionId from user's answers (choose the most frequent sessionId)
      let inferredSessionId: string | undefined;
      try {
        const counts: Record<string, number> = {};
        for (const a of userAnswers) {
          const sid = (a as any).sessionId?.toString();
          if (sid) counts[sid] = (counts[sid] || 0) + 1;
        }
        const entries = Object.entries(counts);
        if (entries.length > 0) {
          entries.sort(([, a], [, b]) => b - a);
          inferredSessionId = entries[0][0];
        }
      } catch (e) {
        inferredSessionId = undefined;
      }

      // Transform answers to AssessmentAnswerData format
      const assessmentAnswers: AssessmentAnswerData[] = userAnswers.map(answer => {
        const question = answer.questionId as QuestionData; // Populated question data
        return {
          questionId: typeof question === 'object' ? (question._id?.toString() ?? '') : (answer.questionId?.toString() ?? ''),
          answer: answer.answer,
          questionText: question?.questionText ?? '',
          dimension: question?.dimension ?? '',
        };
      });

      // Use the existing generateAIAnalysis method and pass inferred session id if any
      return this.generateAIAnalysis(userId, assessmentAnswers, availableCareers, inferredSessionId);

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
  async getCareerInsight(careerTitle: string, personalityTraits: string[]): Promise<string> {
    try {
      return await this.aiService.generateCareerInsight(careerTitle, personalityTraits);
    } catch (error) {
      this.logger.error('Failed to get career insight:', error);
      return `${careerTitle} aligns well with your personality profile. Consider exploring this career path further.`;
    }
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
              $cond: [{ $gte: ['$overallFitScore', 80] }, 1, 0]
            }
          },
          mediumFitCount: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$overallFitScore', 60] }, { $lt: ['$overallFitScore', 80] }] },
                1,
                0
              ]
            }
          },
          lowFitCount: {
            $sum: {
              $cond: [{ $lt: ['$overallFitScore', 60] }, 1, 0]
            }
          },
        }
      }
    ]);

    return stats[0] || {
      totalResults: 0,
      averageFitScore: 0,
      highFitCount: 0,
      mediumFitCount: 0,
      lowFitCount: 0,
    };
  }

  private generateRecommendations(results: CareerFitResult[]): Record<string, unknown> {
    if (results.length === 0) return {};

    const topResult = results[0];

    return {
      topRecommendation: topResult.careerId,
      reasonsForRecommendation: topResult.strengths?.slice(0, 3) || [],
      developmentSuggestions: topResult.developmentAreas?.slice(0, 3) || [],
      alternativeOptions: results.slice(1, 4).map(r => r.careerId),
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