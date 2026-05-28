import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AiPlanService } from './ai-plan.service';
import { AiPlan } from '../schema/ai-plan.schema';
import {
  BillingCycle,
  SubscriptionStatus,
  UserSubscription,
} from '../../users/schemas/user-subscriptions';
import { User } from '../../users/schemas/user.schema';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('AiPlanService', () => {
  let service: AiPlanService;

  const aiPlanModel = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    ...data,
    save: jest.fn().mockResolvedValue({
      id: 'plan-created',
      ...data,
    }),
  })) as jest.Mock & Record<string, jest.Mock>;

  aiPlanModel.findOne = jest.fn();
  aiPlanModel.find = jest.fn();
  aiPlanModel.findById = jest.fn();
  aiPlanModel.findByIdAndUpdate = jest.fn();
  aiPlanModel.updateMany = jest.fn();
  aiPlanModel.deleteOne = jest.fn();

  const userSubscriptionModel = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    distinct: jest.fn(),
  };

  const userModel = {
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    aiPlanModel.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPlanService,
        { provide: getModelToken(AiPlan.name), useValue: aiPlanModel },
        { provide: getModelToken(UserSubscription.name), useValue: userSubscriptionModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get(AiPlanService);
  });

  it('returns only active plans in the public catalog query', async () => {
    const plans = [
      {
        toJSON: () => ({
          id: 'plan-plus',
          name: 'Plus',
          price: 129000,
          currency: 'VND',
          isActive: true,
          allowedBillingCycles: [BillingCycle.MONTHLY],
          billingCycleDiscounts: {},
        }),
        price: 129000,
        currency: 'VND',
        allowedBillingCycles: [BillingCycle.MONTHLY],
        billingCycleDiscounts: {},
      },
    ];

    const exec = jest.fn().mockResolvedValue(plans);
    const sort = jest.fn().mockReturnValue({ exec });
    aiPlanModel.find.mockReturnValue({ sort });

    const result = await service.findCatalog();

    expect(aiPlanModel.find).toHaveBeenCalledWith({ isActive: { $ne: false } });
    expect(sort).toHaveBeenCalledWith({ displayOrder: 1, price: 1, createdAt: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].pricingByBillingCycle?.monthly?.total).toBe(129000);
  });

  it('returns subscriber stats for admin plans', async () => {
    const plusPlanId = '507f1f77bcf86cd799439012';
    const freePlanId = '507f1f77bcf86cd799439013';
    const plusObjectId = new Types.ObjectId(plusPlanId);
    const freeObjectId = new Types.ObjectId(freePlanId);
    const plans = [
      {
        _id: plusObjectId,
        name: 'Plus',
        price: 10000,
        isDefaultPlan: false,
        toJSON: () => ({ id: plusPlanId, name: 'Plus', price: 10000, isDefaultPlan: false }),
      },
      {
        _id: freeObjectId,
        name: 'Free',
        price: 0,
        isDefaultPlan: true,
        toJSON: () => ({ id: freePlanId, name: 'Free', price: 0, isDefaultPlan: true }),
      },
    ];
    const exec = jest.fn().mockResolvedValue(plans);
    const sort = jest.fn().mockReturnValue({ exec });
    aiPlanModel.find.mockReturnValue({ sort });
    userSubscriptionModel.aggregate
      .mockReturnValueOnce(createExecMock([{ _id: plusObjectId, count: 2 }]))
      .mockReturnValueOnce(createExecMock([{ _id: plusObjectId, count: 1 }]))
      .mockReturnValueOnce(createExecMock([{ _id: plusObjectId, count: 1 }]))
      .mockReturnValueOnce(createExecMock([{ _id: plusObjectId, count: 1 }]));
    userModel.countDocuments.mockReturnValue(createExecMock(5));
    userSubscriptionModel.distinct.mockReturnValue(
      createExecMock([new Types.ObjectId(), new Types.ObjectId()]),
    );

    const result = await service.findAll();

    expect(result).toHaveLength(2);
    expect(result[0].subscriberStats).toEqual({
      activeSubscribers: 1,
      totalSubscribers: 2,
      cancelledSubscribers: 1,
      expiredSubscribers: 1,
    });
    expect(result[1].subscriberStats.activeSubscribers).toBe(3);
    expect(result[1].subscriberStats.totalSubscribers).toBe(3);
  });

  it('counts active subscribers only when subscription has not expired', async () => {
    const planId = new Types.ObjectId('507f1f77bcf86cd799439012');
    const plans = [
      {
        _id: planId,
        name: 'Plus',
        price: 10000,
        isDefaultPlan: false,
        toJSON: () => ({ id: planId.toString(), name: 'Plus' }),
      },
    ];
    aiPlanModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue(createExecMock(plans)) });
    userSubscriptionModel.aggregate.mockReturnValue(createExecMock([]));
    userModel.countDocuments.mockReturnValue(createExecMock(0));
    userSubscriptionModel.distinct.mockReturnValue(createExecMock([]));

    await service.findAll();

    const activeAggregateMatch = userSubscriptionModel.aggregate.mock.calls[1][0][0].$match;
    expect(activeAggregateMatch.status).toBe(SubscriptionStatus.ACTIVE);
    expect(activeAggregateMatch.$or).toEqual(
      expect.arrayContaining([
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: expect.any(Date) } },
      ]),
    );
  });

  it('uses distinct users for total subscriber counts so renewals are not duplicated', async () => {
    const planId = new Types.ObjectId('507f1f77bcf86cd799439012');
    aiPlanModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue(
        createExecMock([
          {
            _id: planId,
            name: 'Plus',
            price: 10000,
            isDefaultPlan: false,
            toJSON: () => ({ id: planId.toString(), name: 'Plus' }),
          },
        ]),
      ),
    });
    userSubscriptionModel.aggregate.mockReturnValue(createExecMock([]));
    userModel.countDocuments.mockReturnValue(createExecMock(0));
    userSubscriptionModel.distinct.mockReturnValue(createExecMock([]));

    await service.findAll();

    const totalAggregatePipeline = userSubscriptionModel.aggregate.mock.calls[0][0];
    expect(totalAggregatePipeline[1]).toEqual({
      $group: { _id: '$planId', userIds: { $addToSet: '$userId' } },
    });
    expect(totalAggregatePipeline[2]).toEqual({ $project: { count: { $size: '$userIds' } } });
  });

  it('forces default plans to stay active on create', async () => {
    aiPlanModel.findOne.mockReturnValue(createExecMock(null));
    aiPlanModel.updateMany.mockReturnValue(createExecMock(undefined));

    await service.create({
      name: 'Free',
      isDefaultPlan: true,
      isActive: false,
      price: 0,
    });

    expect(aiPlanModel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Free',
        isDefaultPlan: true,
        isActive: true,
      }),
    );
  });

  it('allows career recommendation visibility below the generated recommendation count', async () => {
    aiPlanModel.findOne.mockReturnValue(createExecMock(null));

    await service.create({
      name: 'Free',
      limits: {
        maxCareerRecommendationsPerRun: 5,
        visibleCareerRecommendationsPerRun: 3,
      },
    });

    expect(aiPlanModel).toHaveBeenCalledWith(
      expect.objectContaining({
        limits: expect.objectContaining({
          maxCareerRecommendationsPerRun: 5,
          visibleCareerRecommendationsPerRun: 3,
        }),
      }),
    );
  });

  it('blocks visible career recommendations above generated recommendations', async () => {
    aiPlanModel.findOne.mockReturnValue(createExecMock(null));

    await expect(
      service.create({
        name: 'Bad Plan',
        limits: {
          maxCareerRecommendationsPerRun: 3,
          visibleCareerRecommendationsPerRun: 5,
        },
      }),
    ).rejects.toThrow('visibleCareerRecommendationsPerRun cannot exceed maxCareerRecommendationsPerRun');

    expect(aiPlanModel).not.toHaveBeenCalled();
  });

  it('blocks setting visible career recommendations without an effective generated recommendation count', async () => {
    aiPlanModel.findOne.mockReturnValue(createExecMock(null));

    await expect(
      service.create({
        name: 'Bad Plan',
        limits: {
          visibleCareerRecommendationsPerRun: 3,
        },
      }),
    ).rejects.toThrow('maxCareerRecommendationsPerRun is required');

    expect(aiPlanModel).not.toHaveBeenCalled();
  });

  it('keeps unrelated limits valid without career recommendation visibility settings', async () => {
    aiPlanModel.findOne.mockReturnValue(createExecMock(null));

    await service.create({
      name: 'Chat Only',
      limits: {
        chatMessagesPerMonth: 20,
      },
    });

    expect(aiPlanModel).toHaveBeenCalledWith(
      expect.objectContaining({
        limits: expect.objectContaining({
          chatMessagesPerMonth: 20,
        }),
      }),
    );
  });

  it('validates updated career visibility against existing plan limits', async () => {
    const planId = '507f1f77bcf86cd799439011';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: false,
        limits: {
          maxCareerRecommendationsPerRun: 5,
        },
      }),
    );
    aiPlanModel.findByIdAndUpdate.mockReturnValue(
      createExecMock({
        id: planId,
        limits: {
          maxCareerRecommendationsPerRun: 5,
          visibleCareerRecommendationsPerRun: 3,
        },
      }),
    );

    await service.update(planId, {
      limits: {
        visibleCareerRecommendationsPerRun: 3,
      },
    });

    expect(aiPlanModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('blocks updating career visibility above the effective generated recommendation count', async () => {
    const planId = '507f1f77bcf86cd799439011';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: false,
        limits: {
          maxCareerRecommendationsPerRun: 3,
        },
      }),
    );

    await expect(
      service.update(planId, {
        limits: {
          visibleCareerRecommendationsPerRun: 5,
        },
      }),
    ).rejects.toThrow('visibleCareerRecommendationsPerRun cannot exceed maxCareerRecommendationsPerRun');

    expect(aiPlanModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('forces default plans to stay active on update', async () => {
    const planId = '507f1f77bcf86cd799439011';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: false,
      }),
    );
    aiPlanModel.updateMany.mockReturnValue(createExecMock(undefined));
    aiPlanModel.findByIdAndUpdate.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: true,
        isActive: true,
      }),
    );

    await service.update(planId, {
      isDefaultPlan: true,
      isActive: false,
    });

    expect(aiPlanModel.findByIdAndUpdate).toHaveBeenCalledWith(
      planId,
      expect.objectContaining({
        isDefaultPlan: true,
        isActive: true,
      }),
      { new: true, runValidators: true },
    );
  });

  it('blocks deactivating the current default plan', async () => {
    const planId = '507f1f77bcf86cd799439011';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: true,
      }),
    );

    await expect(
      service.update(planId, {
        isActive: false,
      }),
    ).rejects.toThrow('Default plan must remain active');

    expect(aiPlanModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks deleting the default plan before subscription checks', async () => {
    const planId = '507f1f77bcf86cd799439011';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: true,
      }),
    );

    await expect(service.remove(planId)).rejects.toBeInstanceOf(BadRequestException);
    expect(userSubscriptionModel.countDocuments).not.toHaveBeenCalled();
    expect(aiPlanModel.deleteOne).not.toHaveBeenCalled();
  });

  it('still blocks deleting plans with active subscriptions', async () => {
    const planId = '507f1f77bcf86cd799439011';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        id: planId,
        isDefaultPlan: false,
      }),
    );
    userSubscriptionModel.countDocuments.mockReturnValue(
      createExecMock(1),
    );

    await expect(service.remove(planId)).rejects.toThrow('Cannot delete plan with active subscriptions');
    expect(userSubscriptionModel.countDocuments).toHaveBeenCalledWith({
      planId: expect.anything(),
      status: SubscriptionStatus.ACTIVE,
    });
  });
});
