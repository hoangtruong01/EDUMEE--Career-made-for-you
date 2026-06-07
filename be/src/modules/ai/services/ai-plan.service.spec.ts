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
    deleteMany: jest.fn(),
  };

  const userModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
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
    expect(totalAggregatePipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $lookup: expect.objectContaining({
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          }),
        }),
        { $match: { 'user.0': { $exists: true } } },
      ]),
    );
    expect(totalAggregatePipeline[3]).toEqual({
      $group: { _id: '$planId', userIds: { $addToSet: '$userId' } },
    });
    expect(totalAggregatePipeline[4]).toEqual({ $project: { count: { $size: '$userIds' } } });
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
    const planObjectId = new Types.ObjectId(planId);
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        _id: planObjectId,
        id: planId,
        isDefaultPlan: false,
      }),
    );
    userSubscriptionModel.aggregate
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([{ _id: planObjectId, count: 1 }]));

    await expect(service.remove(planId)).rejects.toThrow('Cannot delete plan with active subscriptions');
    expect(userSubscriptionModel.aggregate.mock.calls[1][0][0].$match).toEqual(
      expect.objectContaining({
        planId: planObjectId,
        status: SubscriptionStatus.ACTIVE,
      }),
    );
    expect(aiPlanModel.deleteOne).not.toHaveBeenCalled();
  });

  it('cleans orphan subscriptions before deleting a plan', async () => {
    const planId = '507f1f77bcf86cd799439011';
    const planObjectId = new Types.ObjectId(planId);
    const orphanSubscriptionId = new Types.ObjectId('507f1f77bcf86cd799439012');
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        _id: planObjectId,
        id: planId,
        isDefaultPlan: false,
      }),
    );
    userSubscriptionModel.aggregate
      .mockReturnValueOnce(createExecMock([{ _id: orphanSubscriptionId }]))
      .mockReturnValueOnce(createExecMock([]));
    userSubscriptionModel.deleteMany.mockReturnValue(createExecMock({ deletedCount: 1 }));
    aiPlanModel.deleteOne.mockReturnValue(createExecMock({ deletedCount: 1 }));

    await service.remove(planId);

    expect(userSubscriptionModel.deleteMany).toHaveBeenCalledWith({
      _id: { $in: [orphanSubscriptionId] },
    });
    expect(aiPlanModel.deleteOne).toHaveBeenCalledWith({ _id: planObjectId });
  });

  it('lists active subscribers for a paid plan', async () => {
    const planId = '507f1f77bcf86cd799439201';
    const userId = new Types.ObjectId('507f1f77bcf86cd799439202');
    const subscriptionId = new Types.ObjectId('507f1f77bcf86cd799439203');
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        _id: new Types.ObjectId(planId),
        name: 'Plus',
        price: 10000,
        isDefaultPlan: false,
      }),
    );
    userModel.countDocuments.mockReturnValue(createExecMock(0));
    userSubscriptionModel.distinct.mockReturnValue(createExecMock([]));
    userSubscriptionModel.aggregate
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(
        createExecMock([
          {
            rows: [
              {
                _id: subscriptionId,
                userId,
                status: SubscriptionStatus.ACTIVE,
                billingCycle: BillingCycle.MONTHLY,
                startDate: new Date('2026-05-01T00:00:00.000Z'),
                endDate: new Date('2099-06-01T00:00:00.000Z'),
                user: {
                  _id: userId,
                  name: 'Subscriber One',
                  email: 'subscriber@example.com',
                  phone_number: '0901234567',
                  role: 'user',
                  verify: 1,
                },
              },
            ],
            total: [{ count: 1 }],
          },
        ]),
      );

    const result = await service.listSubscribers(planId, { status: 'active' });

    expect(result.total).toBe(1);
    expect(result.subscribers[0]).toEqual(
      expect.objectContaining({
        userId: userId.toString(),
        name: 'Subscriber One',
        email: 'subscriber@example.com',
        phone_number: '0901234567',
        subscriptionId: subscriptionId.toString(),
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        isCurrentPlanUser: true,
      }),
    );
    const listPipeline = userSubscriptionModel.aggregate.mock.calls[4][0];
    expect(listPipeline[0].$match).toEqual(
      expect.objectContaining({
        planId: expect.any(Types.ObjectId),
        status: SubscriptionStatus.ACTIVE,
      }),
    );
    expect(listPipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $group: { _id: '$userId', subscription: { $first: '$$ROOT' } },
        }),
      ]),
    );
  });

  it('filters paid plan subscribers by cancelled status and search', async () => {
    const planId = '507f1f77bcf86cd799439211';
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        _id: new Types.ObjectId(planId),
        name: 'Plus',
        price: 10000,
        isDefaultPlan: false,
      }),
    );
    userModel.countDocuments.mockReturnValue(createExecMock(0));
    userSubscriptionModel.distinct.mockReturnValue(createExecMock([]));
    userSubscriptionModel.aggregate
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce(createExecMock([{ rows: [], total: [] }]));

    await service.listSubscribers(planId, {
      status: 'cancelled',
      search: 'subscriber@example.com',
    });

    const listPipeline = userSubscriptionModel.aggregate.mock.calls[4][0];
    expect(listPipeline[0].$match).toEqual(
      expect.objectContaining({ status: SubscriptionStatus.CANCELLED }),
    );
    expect(listPipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({
            $or: expect.arrayContaining([
              expect.objectContaining({ 'user.email': expect.any(RegExp) }),
            ]),
          }),
        }),
      ]),
    );
  });

  it('lists current Free users by excluding users with active paid plans', async () => {
    const planId = '507f1f77bcf86cd799439221';
    const freeUserId = new Types.ObjectId('507f1f77bcf86cd799439222');
    const paidUserId = new Types.ObjectId('507f1f77bcf86cd799439223');
    const paidPlanId = new Types.ObjectId('507f1f77bcf86cd799439224');
    aiPlanModel.findById.mockReturnValue(
      createExecMock({
        _id: new Types.ObjectId(planId),
        name: 'Free',
        price: 0,
        isDefaultPlan: true,
      }),
    );
    userSubscriptionModel.aggregate.mockReturnValue(createExecMock([]));
    userModel.countDocuments
      .mockReturnValueOnce(createExecMock(5))
      .mockReturnValueOnce(createExecMock(1));
    userSubscriptionModel.distinct
      .mockReturnValueOnce(createExecMock([paidUserId]))
      .mockReturnValueOnce(createExecMock([paidUserId]));
    aiPlanModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue(createExecMock([{ _id: paidPlanId }])),
    });
    userModel.find.mockReturnValue(createUserFindQuery([
      {
        _id: freeUserId,
        name: 'Free User',
        email: 'free@example.com',
        phone_number: '',
        role: 'user',
        verify: 1,
      },
    ]));

    const result = await service.listSubscribers(planId, {
      status: 'active',
      search: 'free@example.com',
    });

    expect(result.total).toBe(1);
    expect(result.subscribers[0]).toEqual(
      expect.objectContaining({
        userId: freeUserId.toString(),
        email: 'free@example.com',
        subscriptionStatus: 'active',
        billingCycle: BillingCycle.MONTHLY,
        isCurrentPlanUser: true,
      }),
    );
    const userQuery = userModel.find.mock.calls[0][0];
    expect(userQuery._id.$nin).toEqual([paidUserId]);
    expect(userQuery.$or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: expect.any(RegExp) }),
      ]),
    );
  });

  it('rejects list subscribers for invalid plan ids', async () => {
    await expect(service.listSubscribers('not-a-plan-id')).rejects.toThrow('Invalid plan id');
    expect(aiPlanModel.findById).not.toHaveBeenCalled();
  });
});

function createUserFindQuery<T>(value: T) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}
