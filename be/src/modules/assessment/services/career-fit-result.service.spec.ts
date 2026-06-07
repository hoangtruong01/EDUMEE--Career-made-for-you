import { Types } from 'mongoose';
import { AIService } from '../../../common/services/ai.service';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';
import { UsersService } from '../../users/users.service';
import { AssessmentAnswerService } from './assessment-answer.service';
import { CareerFitResultService } from './career-fit-result.service';

describe('CareerFitResultService', () => {
  let service: CareerFitResultService;
  let careerFitResultModel: any;
  let assessmentSessionModel: any;
  let careerInsightModel: any;
  let aiService: jest.Mocked<
    Pick<AIService, 'analyzePersonalityAndCareers' | 'generateDetailedCareerAnalysis'>
  >;
  let aiQuotaService: jest.Mocked<Pick<AiQuotaService, 'checkQuota' | 'consumeQuota' | 'getPlanLimits'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'updateMe'>>;

  beforeEach(() => {
    careerFitResultModel = jest.fn().mockImplementation(function createCareerFitResult(
      this: any,
      payload: Record<string, unknown>,
    ) {
      Object.assign(this, payload);
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    });
    careerFitResultModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });

    assessmentSessionModel = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) }),
    };

    careerInsightModel = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    aiService = {
      analyzePersonalityAndCareers: jest.fn().mockResolvedValue(createAnalysisResult()),
      generateDetailedCareerAnalysis: jest.fn().mockResolvedValue(createDetailedAnalysis()),
    };
    aiQuotaService = {
      checkQuota: jest.fn().mockResolvedValue(undefined),
      consumeQuota: jest.fn().mockResolvedValue(undefined),
      getPlanLimits: jest.fn().mockResolvedValue({ limits: {} }),
    };
    usersService = {
      updateMe: jest.fn().mockResolvedValue({}),
    };

    service = new CareerFitResultService(
      careerFitResultModel,
      assessmentSessionModel,
      {} as any,
      careerInsightModel,
      aiService as any,
      {} as AssessmentAnswerService,
      aiQuotaService as any,
      usersService as any,
    );
  });

  it('saves max recommendations and locks results beyond visibleCareerRecommendationsPerRun', async () => {
    aiQuotaService.getPlanLimits.mockResolvedValue({
      limits: { maxCareerRecommendationsPerRun: 5, visibleCareerRecommendationsPerRun: 3 },
    } as any);

    const results = await service.generateAIAnalysis(
      '507f1f77bcf86cd799439011',
      [],
      [],
    );

    expect(results).toHaveLength(5);
    expect(results[0].careerTitle).toBe('Product Manager');
    expect(results[0].isLocked).toBe(false);
    expect(results[0].recommendationRank).toBe(1);
    expect(results[3].isLocked).toBe(true);
    expect(results[3].rank).toBe(4);
    expect(results[3].recommendationRank).toBe(4);
    expect(results[3].lockedReason).toBe('plan_limit');
    expect(results[3].requiredPlan).toBe('Plus');
    expect(results[3]).not.toHaveProperty('userId');
    expect(results[3]).not.toHaveProperty('careerId');
    expect(results[3]).not.toHaveProperty('careerTitle');
    expect(results[3]).not.toHaveProperty('overallFitScore');
    expect(results[3]).not.toHaveProperty('strengths');
    expect(results[3]).not.toHaveProperty('developmentAreas');
    expect(results[3]).not.toHaveProperty('improvementSuggestions');
    expect(results[3]).not.toHaveProperty('dimensionScores');
    expect(results[3]).not.toHaveProperty('personalityMatch');
    expect(results[3]).not.toHaveProperty('aiExplanation');
    expect(results[3]).not.toHaveProperty('confidence');
    expect(results[3]).not.toHaveProperty('personalityProfile');
    expect(careerFitResultModel.mock.calls[3][0]).toMatchObject({
      careerTitle: 'Marketing Strategist',
      overallFitScore: 82,
      strengths: ['Strong communication fit'],
      aiExplanation: 'analysis',
    });
    expect(careerFitResultModel).toHaveBeenCalledTimes(5);
    expect(careerFitResultModel.deleteMany).not.toHaveBeenCalled();
    expect(careerInsightModel.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  it('pads AI career recommendations to 5 when the model returns fewer', async () => {
    const partialAnalysis = createAnalysisResult();
    partialAnalysis.careerRecommendations = partialAnalysis.careerRecommendations.slice(0, 4);
    aiService.analyzePersonalityAndCareers.mockResolvedValueOnce(partialAnalysis);

    const results = await service.generateAIAnalysis(
      '507f1f77bcf86cd799439011',
      [],
      [],
    );

    expect(results).toHaveLength(5);
    expect(careerFitResultModel).toHaveBeenCalledTimes(5);
    expect(results[4].careerTitle).toBeTruthy();
  });

  it('shows all saved recommendations when the visible limit allows them', async () => {
    aiQuotaService.getPlanLimits.mockResolvedValue({
      limits: { maxCareerRecommendationsPerRun: 5, visibleCareerRecommendationsPerRun: 5 },
    } as any);

    const results = await service.generateAIAnalysis(
      '507f1f77bcf86cd799439011',
      [],
      [],
    );

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.isLocked === false)).toBe(true);
    expect(results[4].careerTitle).toBe('Data Analyst');
    expect(careerFitResultModel).toHaveBeenCalledTimes(5);
  });

  it('falls back visible recommendations to maxCareerRecommendationsPerRun', async () => {
    aiQuotaService.getPlanLimits.mockResolvedValue({
      limits: { maxCareerRecommendationsPerRun: 5 },
    } as any);

    const results = await service.generateAIAnalysis(
      '507f1f77bcf86cd799439011',
      [],
      [],
    );

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.isLocked === false)).toBe(true);
  });

  it('treats maxCareerRecommendationsPerRun 0 as zero results instead of unlimited', async () => {
    aiQuotaService.getPlanLimits.mockResolvedValue({
      limits: { maxCareerRecommendationsPerRun: 0 },
    } as any);

    const results = await service.generateAIAnalysis(
      '507f1f77bcf86cd799439011',
      [],
      [],
    );

    expect(results).toEqual([]);
    expect(careerFitResultModel).not.toHaveBeenCalled();
    expect(careerInsightModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns existing session results without calling AI or consuming quota', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const sessionId = new Types.ObjectId();
    const existingResult = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      assessmentSessionId: sessionId,
      careerTitle: 'Existing Career',
      overallFitScore: 91,
      recommendationRank: 1,
      toJSON(this: any) {
        return {
          id: this._id.toString(),
          userId: this.userId,
          assessmentSessionId: this.assessmentSessionId,
          careerTitle: this.careerTitle,
          overallFitScore: this.overallFitScore,
          recommendationRank: this.recommendationRank,
        };
      },
    };

    assessmentSessionModel.findOne.mockReturnValue({
      lean: () => ({
        exec: jest.fn().mockResolvedValue({
          _id: sessionId,
          userId: new Types.ObjectId(userId),
        }),
      }),
    });

    const findQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([existingResult]),
    };
    careerFitResultModel.find = jest.fn().mockReturnValue(findQuery);

    const results = await service.generateAIAnalysis(userId, [], [], sessionId);

    expect(results).toHaveLength(1);
    expect(results[0].careerTitle).toBe('Existing Career');
    expect(results[0].isLocked).toBe(false);
    expect(aiService.analyzePersonalityAndCareers).not.toHaveBeenCalled();
    expect(aiQuotaService.checkQuota).not.toHaveBeenCalled();
    expect(aiQuotaService.consumeQuota).not.toHaveBeenCalled();
    expect(careerFitResultModel).not.toHaveBeenCalled();
    expect(assessmentSessionModel.updateOne).toHaveBeenCalledWith(
      {
        _id: sessionId,
        userId: expect.any(Types.ObjectId),
        status: { $ne: 'completed' },
      },
      {
        $set: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      },
    );
  });

  it('marks the session completed after generating new session results', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const sessionId = new Types.ObjectId();

    assessmentSessionModel.findOne.mockReturnValue({
      lean: () => ({
        exec: jest.fn().mockResolvedValue({
          _id: sessionId,
          userId: new Types.ObjectId(userId),
        }),
      }),
    });

    careerFitResultModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    await service.generateAIAnalysis(userId, [], [], sessionId);

    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(userId, AiFeature.ASSESSMENT);
    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(userId, AiFeature.CAREER_RECOMMENDATION);
    expect(assessmentSessionModel.updateOne).toHaveBeenCalledWith(
      {
        _id: sessionId,
        userId: expect.any(Types.ObjectId),
        status: { $ne: 'completed' },
      },
      {
        $set: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      },
    );
  });

  it('dedupes concurrent detailed analysis generation for the same career title', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const careerTitle = 'Data Scientist';
    jest.spyOn(service, 'findLatestByUser').mockResolvedValue([
      {
        personalityProfile: {
          primaryTraits: ['Phân tích', 'Logic'],
        },
      },
    ] as any);

    let resolveAnalysis: ((value: ReturnType<typeof createDetailedAnalysis>) => void) | undefined;
    aiService.generateDetailedCareerAnalysis.mockReturnValue(
      new Promise((resolve) => {
        resolveAnalysis = resolve;
      }) as any,
    );

    const first = service.getDetailedAnalysis(userId, careerTitle);
    const second = service.getDetailedAnalysis(userId, careerTitle.toLowerCase());

    await Promise.resolve();
    await Promise.resolve();
    expect(resolveAnalysis).toBeDefined();
    resolveAnalysis?.(createDetailedAnalysis(careerTitle));

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(aiService.generateDetailedCareerAnalysis).toHaveBeenCalledTimes(1);
    expect(careerInsightModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(secondResult);
    expect(firstResult.careerTitle).toBe(careerTitle);
  });
});

function createAnalysisResult() {
  return {
    careerRecommendations: [
      {
        careerTitle: 'Product Manager',
        fitScore: 92,
        reasons: ['Strong planning fit'],
        potentialChallenges: ['Needs domain depth'],
        developmentSuggestions: ['Build product portfolio'],
        personalityMatch: {
          bigFiveAlignment: 90,
          riasecAlignment: 85,
          overallFit: 88,
        },
      },
      {
        careerTitle: 'UX Researcher',
        fitScore: 88,
        reasons: ['Strong empathy fit'],
        potentialChallenges: [],
        developmentSuggestions: [],
        personalityMatch: {
          bigFiveAlignment: 86,
          riasecAlignment: 82,
          overallFit: 84,
        },
      },
      {
        careerTitle: 'Software Engineer',
        fitScore: 86,
        reasons: ['Strong logic fit'],
        potentialChallenges: [],
        developmentSuggestions: [],
        personalityMatch: {
          bigFiveAlignment: 84,
          riasecAlignment: 88,
          overallFit: 86,
        },
      },
      {
        careerTitle: 'Marketing Strategist',
        fitScore: 82,
        reasons: ['Strong communication fit'],
        potentialChallenges: [],
        developmentSuggestions: [],
        personalityMatch: {
          bigFiveAlignment: 80,
          riasecAlignment: 83,
          overallFit: 82,
        },
      },
      {
        careerTitle: 'Data Analyst',
        fitScore: 80,
        reasons: ['Strong analysis fit'],
        potentialChallenges: [],
        developmentSuggestions: [],
        personalityMatch: {
          bigFiveAlignment: 78,
          riasecAlignment: 82,
          overallFit: 80,
        },
      },
    ],
    personalityAnalysis: {
      bigFiveScores: {},
      riasecScores: {},
      personalityProfile: {},
    },
    explanation: 'analysis',
    confidence: 0.9,
  };
}

function createDetailedAnalysis(careerTitle = 'Data Scientist') {
  return {
    careerTitle,
    overview: 'Tổng quan nghề nghiệp',
    pros: ['Nhu cầu cao'],
    cons: ['Cần học liên tục'],
    trends: [{ year: '2026', description: 'Tăng trưởng ổn định' }],
    salaryRange: '20-60 triệu/tháng',
    demandLevel: 'Cao',
    keySkills: ['SQL', 'Python'],
    topCompanies: ['Edumee'],
  };
}
