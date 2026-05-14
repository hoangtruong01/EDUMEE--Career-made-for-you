import { HttpException, HttpStatus } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AiQuotaService } from './ai-quota.service';
import { AiPlan } from '../schema/ai-plan.schema';
import { AiUsageLog, AiFeature } from '../schema/ai-usage-logs.schema';
import { UserSubscription } from '../../users/schemas/user-subscriptions';
import { AssessmentSession } from '../../assessment/schemas/assessment-sesions.schema';

describe('AiQuotaService', () => {
  let service: AiQuotaService;

  const userSubscriptionModel = {
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
  };
  const aiPlanModel = {};
  const aiUsageLogModel = {
    findOne: jest.fn(),
  };
  const assessmentSessionModel = {
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaService,
        { provide: getModelToken(UserSubscription.name), useValue: userSubscriptionModel },
        { provide: getModelToken(AiPlan.name), useValue: aiPlanModel },
        { provide: getModelToken(AiUsageLog.name), useValue: aiUsageLogModel },
        { provide: getModelToken(AssessmentSession.name), useValue: assessmentSessionModel },
      ],
    }).compile();

    service = module.get(AiQuotaService);
  });

  it('blocks Free assessment after the lifetime limit is reached', async () => {
    jest.spyOn(service, 'getPlanForUserOrFree').mockResolvedValue({
      name: 'Free',
      limits: {
        assessmentsPerMonth: 1,
        assessmentsLifetimeLimit: 1,
      },
      features: {},
    } as never);
    assessmentSessionModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    await expect(
      service.checkQuota('507f1f77bcf86cd799439011', AiFeature.ASSESSMENT),
    ).rejects.toBeInstanceOf(HttpException);

    try {
      await service.checkQuota('507f1f77bcf86cd799439011', AiFeature.ASSESSMENT);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('blocks career comparison when the plan disables it', async () => {
    jest.spyOn(service, 'getPlanForUserOrFree').mockResolvedValue({
      name: 'Free',
      limits: {
        careerComparisonsPerMonth: 0,
      },
      features: {
        careerComparison: false,
      },
    } as never);

    await expect(
      service.checkQuota('507f1f77bcf86cd799439011', AiFeature.CAREER_COMPARISON),
    ).rejects.toThrow('AI feature is not available in your plan');
  });
});
