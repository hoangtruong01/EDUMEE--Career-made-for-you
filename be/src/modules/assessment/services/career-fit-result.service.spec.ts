/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Types } from 'mongoose';
import { AIService } from '../../../common/services/ai.service';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { UsersService } from '../../users/users.service';
import { AssessmentAnswerService } from './assessment-answer.service';
import { CareerFitResultService } from './career-fit-result.service';

describe('CareerFitResultService', () => {
  let service: CareerFitResultService;
  let careerFitResultModel: any;
  let careerInsightModel: any;
  let aiService: jest.Mocked<Pick<AIService, 'analyzePersonalityAndCareers'>>;
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

    careerInsightModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    aiService = {
      analyzePersonalityAndCareers: jest.fn().mockResolvedValue(createAnalysisResult()),
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
      {} as any,
      careerInsightModel,
      aiService as any,
      {} as AssessmentAnswerService,
      aiQuotaService as any,
      usersService as any,
    );
  });

  it('limits AI career recommendations to maxCareerRecommendationsPerRun', async () => {
    aiQuotaService.getPlanLimits.mockResolvedValueOnce({
      limits: { maxCareerRecommendationsPerRun: 1 },
    } as any);

    const results = await service.generateAIAnalysis(
      '507f1f77bcf86cd799439011',
      [],
      [],
    );

    expect(results).toHaveLength(1);
    expect(results[0].careerTitle).toBe('Product Manager');
    expect(careerFitResultModel).toHaveBeenCalledTimes(1);
    expect(careerInsightModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('treats maxCareerRecommendationsPerRun 0 as zero results instead of unlimited', async () => {
    aiQuotaService.getPlanLimits.mockResolvedValueOnce({
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
