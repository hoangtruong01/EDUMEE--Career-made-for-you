import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AiPlanService } from './ai-plan.service';
import { AiPlan } from '../schema/ai-plan.schema';
import {
  BillingCycle,
  SubscriptionStatus,
  UserSubscription,
} from '../../users/schemas/user-subscriptions';

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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    aiPlanModel.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPlanService,
        { provide: getModelToken(AiPlan.name), useValue: aiPlanModel },
        { provide: getModelToken(UserSubscription.name), useValue: userSubscriptionModel },
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
