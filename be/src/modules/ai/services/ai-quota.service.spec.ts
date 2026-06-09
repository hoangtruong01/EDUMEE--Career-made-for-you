import { HttpException, HttpStatus } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AssessmentSession } from '../../assessment/schemas/assessment-sesions.schema';
import { CareerFitResult } from '../../assessment/schemas/career-fit-result.schema';
import { UserSubscription } from '../../users/schemas/user-subscriptions';
import { AiPlan } from '../schema/ai-plan.schema';
import { AiFeature, AiUsageLog } from '../schema/ai-usage-logs.schema';
import { AiQuotaService } from './ai-quota.service';

describe('AiQuotaService', () => {
  let service: AiQuotaService;

  const userSubscriptionModel = {
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
    findOne: jest.fn(),
  };
  const aiPlanModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };
  const aiUsageLogModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const careerFitResultModel = {
    distinct: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaService,
        { provide: getModelToken(UserSubscription.name), useValue: userSubscriptionModel },
        { provide: getModelToken(AiPlan.name), useValue: aiPlanModel },
        { provide: getModelToken(AiUsageLog.name), useValue: aiUsageLogModel },
        { provide: getModelToken(CareerFitResult.name), useValue: careerFitResultModel },
        {
          provide: getModelToken(AssessmentSession.name),
          useValue: { findOne: jest.fn(), updateOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AiQuotaService);
  });

  it('blocks Free assessment after the lifetime limit is reached', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        limits: {
          assessmentsLifetimeLimit: 1,
        },
        features: {},
      }),
    );
    careerFitResultModel.distinct.mockReturnValue(createQuery([new Types.ObjectId()]));

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

  it('allows monthly assessment quota to override a stale lifetime limit', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        limits: {
          assessmentsPerMonth: 1,
          assessmentsLifetimeLimit: 1,
        },
        features: {},
      }),
    );
    careerFitResultModel.distinct
      .mockReturnValue(createQuery([new Types.ObjectId()]))
      .mockReturnValueOnce(createQuery([]));

    await expect(
      service.checkQuota(
        '507f1f77bcf86cd799439011',
        AiFeature.ASSESSMENT,
        new Date('2026-05-20T00:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();

    expect(careerFitResultModel.distinct).toHaveBeenCalledTimes(1);
  });

  it('counts monthly assessment usage from distinct result sessions and ignores usage logs', async () => {
    const sessionId = new Types.ObjectId();
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        limits: {
          assessmentsPerMonth: 3,
        },
        features: {},
      }),
    );
    careerFitResultModel.distinct.mockReturnValue(createQuery([sessionId]));
    aiUsageLogModel.findOne.mockReturnValue(createQuery({ requestCount: 3 }));

    const quota = await service.getRemainingQuota(
      '507f1f77bcf86cd799439011',
      AiFeature.ASSESSMENT,
      new Date('2026-05-20T00:00:00.000Z'),
    );

    expect(quota.used).toBe(1);
    expect(quota.remaining).toBe(2);
    expect(quota.resetPolicy).toBe('periodic');
    expect(careerFitResultModel.distinct).toHaveBeenCalledWith('assessmentSessionId', {
      userId: expect.any(Types.ObjectId),
      assessmentSessionId: { $exists: true, $ne: null },
      $or: expect.any(Array),
    });
    expect(aiUsageLogModel.findOne).not.toHaveBeenCalled();
  });

  it('blocks monthly assessment quota from result sessions before reading usage logs', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        limits: {
          assessmentsPerMonth: 1,
          assessmentsLifetimeLimit: 1,
        },
        features: {},
      }),
    );
    careerFitResultModel.distinct.mockReturnValue(createQuery([new Types.ObjectId()]));
    aiUsageLogModel.findOne.mockReturnValue(createQuery({ requestCount: 0 }));

    await expect(
      service.checkQuota(
        '507f1f77bcf86cd799439011',
        AiFeature.ASSESSMENT,
        new Date('2026-05-20T00:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(aiUsageLogModel.findOne).not.toHaveBeenCalled();
    expect(careerFitResultModel.distinct).toHaveBeenCalledTimes(1);
  });

  it('reports unlimited assessment quota from result sessions without usage logs', async () => {
    const sessionId = new Types.ObjectId();
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        limits: {},
        features: {},
      }),
    );
    careerFitResultModel.distinct.mockReturnValue(createQuery([sessionId]));
    aiUsageLogModel.findOne.mockReturnValue(createQuery({ requestCount: 99 }));

    const quota = await service.getRemainingQuota(
      '507f1f77bcf86cd799439011',
      AiFeature.ASSESSMENT,
      new Date('2026-05-20T00:00:00.000Z'),
    );

    expect(quota.used).toBe(1);
    expect(quota.unlimited).toBe(true);
    expect(quota.resetPolicy).toBe('unlimited');
    expect(aiUsageLogModel.findOne).not.toHaveBeenCalled();
  });

  it('blocks career comparison when the plan disables it', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        limits: {
          careerComparisonsPerMonth: 0,
        },
        features: {
          careerComparison: false,
        },
      }),
    );

    await expect(
      service.checkQuota('507f1f77bcf86cd799439011', AiFeature.CAREER_COMPARISON),
    ).rejects.toThrow('AI feature is not available in your plan');
  });

  it('returns standardized metadata when the plan disables a feature', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Free',
        price: 0,
        isDefaultPlan: true,
        limits: {
          careerComparisonsPerMonth: 0,
        },
        features: {
          careerComparison: false,
        },
      }),
    );

    try {
      await service.checkQuota('507f1f77bcf86cd799439011', AiFeature.CAREER_COMPARISON);
      throw new Error('Expected quota check to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'PLAN_FEATURE_DISABLED',
        feature: AiFeature.CAREER_COMPARISON,
        currentPlan: 'free',
        recommendedAction: 'upgrade_plan',
      });
    }
  });

  it('treats a zero finite limit as exhausted quota', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Plus',
        price: 129000,
        limits: {
          careerComparisonsPerMonth: 0,
        },
        features: {
          careerComparison: true,
        },
      }),
    );
    aiUsageLogModel.findOne.mockReturnValue(createQuery(null));

    try {
      await service.checkQuota('507f1f77bcf86cd799439011', AiFeature.CAREER_COMPARISON);
      throw new Error('Expected quota check to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'PLAN_QUOTA_EXCEEDED',
        feature: AiFeature.CAREER_COMPARISON,
        currentPlan: 'plus',
        quota: {
          used: 0,
          limit: 0,
          remaining: 0,
          resetPolicy: 'periodic',
        },
      });
    }
  });

  it('gates career comparison availability without reading usage logs', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Plus',
        limits: {
          careerComparisonsPerMonth: 0,
        },
        features: {
          careerComparison: true,
        },
      }),
    );
    aiUsageLogModel.findOne.mockReturnValue(createQuery({ requestCount: 99 }));

    await expect(
      service.assertFeatureAvailable('507f1f77bcf86cd799439011', AiFeature.CAREER_COMPARISON),
    ).resolves.toBeUndefined();

    expect(aiUsageLogModel.findOne).not.toHaveBeenCalled();
  });

  it('blocks usage when the current subscription quota period is exhausted', async () => {
    const subscription = createSubscriptionDocument({
      quotaPeriodStart: new Date('2026-05-16T00:00:00.000Z'),
      quotaPeriodEnd: new Date('2026-06-16T00:00:00.000Z'),
      nextQuotaResetAt: new Date('2026-06-16T00:00:00.000Z'),
      endDate: new Date('2026-07-16T00:00:00.000Z'),
    });
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(subscription));
    aiPlanModel.findById.mockReturnValue(
      createQuery({
        name: 'Plus',
        limits: { chatMessagesPerMonth: 1 },
        features: { aiChatbot: true },
      }),
    );
    aiUsageLogModel.findOne.mockReturnValue(createQuery({ requestCount: 1 }));

    await expect(
      service.checkQuota(
        '507f1f77bcf86cd799439011',
        AiFeature.CHATBOT,
        new Date('2026-05-20T00:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(subscription.save).not.toHaveBeenCalled();
  });

  it('does not consume quota when the protected action fails', async () => {
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(null));
    aiPlanModel.findOne.mockReturnValue(
      createQuery({
        name: 'Plus',
        price: 129000,
        limits: { chatMessagesPerMonth: 5 },
        features: { aiChatbot: true },
      }),
    );
    aiUsageLogModel.findOne.mockReturnValue(createQuery(null));
    aiUsageLogModel.updateOne.mockReturnValue(createQuery({ modifiedCount: 1 }));

    await expect(
      service.runWithQuota('507f1f77bcf86cd799439011', AiFeature.CHATBOT, async () => {
        throw new Error('AI provider failed');
      }),
    ).rejects.toThrow('AI provider failed');

    expect(aiUsageLogModel.updateOne).not.toHaveBeenCalled();
  });

  it('rolls quota period lazily when nextQuotaResetAt is reached', async () => {
    const subscription = createSubscriptionDocument({
      quotaPeriodStart: new Date('2026-05-16T00:00:00.000Z'),
      quotaPeriodEnd: new Date('2026-06-16T00:00:00.000Z'),
      nextQuotaResetAt: new Date('2026-06-16T00:00:00.000Z'),
      endDate: new Date('2026-07-16T00:00:00.000Z'),
    });
    userSubscriptionModel.findOne.mockReturnValue(createSortableQuery(subscription));
    aiPlanModel.findById.mockReturnValue(
      createQuery({
        name: 'Plus',
        limits: { chatMessagesPerMonth: 1 },
        features: { aiChatbot: true },
      }),
    );
    aiUsageLogModel.findOne.mockReturnValue(createQuery(null));

    await expect(
      service.checkQuota(
        '507f1f77bcf86cd799439011',
        AiFeature.CHATBOT,
        new Date('2026-06-16T00:00:00.000Z'),
      ),
    ).resolves.toBeUndefined();

    expect(subscription.quotaPeriodStart?.toISOString()).toBe('2026-06-16T00:00:00.000Z');
    expect(subscription.quotaPeriodEnd?.toISOString()).toBe('2026-07-16T00:00:00.000Z');
    expect(subscription.nextQuotaResetAt?.toISOString()).toBe('2026-07-16T00:00:00.000Z');
    expect(subscription.save).toHaveBeenCalledTimes(1);
  });
});

function createQuery<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
    lean: jest.fn().mockReturnThis(),
  };
}

function createSortableQuery<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function createSubscriptionDocument(params: {
  quotaPeriodStart: Date;
  quotaPeriodEnd: Date;
  nextQuotaResetAt: Date;
  endDate: Date;
}) {
  const subscription = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    startDate: new Date('2026-05-16T00:00:00.000Z'),
    endDate: params.endDate,
    quotaPeriodStart: params.quotaPeriodStart,
    quotaPeriodEnd: params.quotaPeriodEnd,
    nextQuotaResetAt: params.nextQuotaResetAt,
    save: jest.fn(),
  };
  subscription.save.mockResolvedValue(subscription);
  return subscription;
}
