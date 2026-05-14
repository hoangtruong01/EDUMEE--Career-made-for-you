import { Test, TestingModule } from '@nestjs/testing';
import { BillingCycle, SubscriptionStatus } from '../../users/schemas/user-subscriptions';
import { AiFeature } from '../schema/ai-usage-logs.schema';
import { AiSubscriptionController } from './ai-subscription.controller';
import { AiQuotaService } from '../services/ai-quota.service';
import { AiSubscriptionService } from '../services/ai-subscription.service';

describe('AiSubscriptionController', () => {
  let controller: AiSubscriptionController;

  const aiSubscriptionService = {
    getActiveSubscriptionForUser: jest.fn(),
  };

  const aiQuotaService = {
    getPlanForUserOrFree: jest.fn(),
    getRemainingQuota: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiSubscriptionController],
      providers: [
        { provide: AiSubscriptionService, useValue: aiSubscriptionService },
        { provide: AiQuotaService, useValue: aiQuotaService },
      ],
    }).compile();

    controller = module.get(AiSubscriptionController);
  });

  it('returns the new entitlement payload for a Business subscriber', async () => {
    aiSubscriptionService.getActiveSubscriptionForUser.mockResolvedValue({
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    aiQuotaService.getPlanForUserOrFree.mockResolvedValue({
      name: 'Business',
      seatLimit: 200,
      allowedBillingCycles: [BillingCycle.MONTHLY],
      features: {
        careerComparison: true,
        personalizedRoadmap: true,
        jobSimulation: true,
        mentorBooking: true,
        teamDashboard: true,
        reportExport: true,
        multiUserManagement: true,
      },
    });
    aiQuotaService.getRemainingQuota.mockImplementation(async (_userId: string, feature: AiFeature) => ({
      feature,
      month: 5,
      year: 2026,
      used: 1,
      limit: 5,
      remaining: 4,
      unlimited: false,
    }));

    const result = await controller.me({ userId: '507f1f77bcf86cd799439011' } as never);

    expect(result.currentPlan).toBe('business');
    expect(result.source).toBe('business_subscription');
    expect(result.seatLimit).toBe(200);
    expect(result.quotas).toHaveProperty('assessment');
    expect(result.quotas).toHaveProperty('mentorBooking');
    expect(result.quotas).not.toHaveProperty('careerRecommendation');
    expect(result.features.teamDashboard).toBe(true);
  });
});
