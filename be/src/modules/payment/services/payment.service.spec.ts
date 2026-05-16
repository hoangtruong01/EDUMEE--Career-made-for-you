import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { Payment } from '../schema/payment.schema';
import { PaymentTransaction } from '../schema/payment-transaction.schema';
import { AiPlanService } from '../../ai/services/ai-plan.service';
import { AiSubscriptionService } from '../../ai/services/ai-subscription.service';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { BookingSession } from '../../mentoring/schemas/booking-session.schema';
import { MentorAvailabilitySlot } from '../../mentoring/schemas/mentor-availability-slot.schema';
import { NotificationService } from '../../notifications/services';

describe('PaymentService', () => {
  let service: PaymentService;

  const paymentModel = {};
  const paymentTransactionModel = {};
  const bookingSessionModel = {};
  const mentorAvailabilitySlotModel = {};

  const aiPlanService = {
    findOne: jest.fn(),
    isBillingCycleAllowed: jest.fn(),
    calculatePricing: jest.fn(),
  };

  const aiSubscriptionService = {
    getActiveSubscriptionForUser: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };
  const notificationService = {
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(PaymentTransaction.name), useValue: paymentTransactionModel },
        { provide: getModelToken(BookingSession.name), useValue: bookingSessionModel },
        { provide: getModelToken(MentorAvailabilitySlot.name), useValue: mentorAvailabilitySlotModel },
        { provide: AiPlanService, useValue: aiPlanService },
        { provide: AiSubscriptionService, useValue: aiSubscriptionService },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(PaymentService);
  });

  it('rejects purchases for inactive AI plans', async () => {
    aiSubscriptionService.getActiveSubscriptionForUser.mockResolvedValue(null);
    aiPlanService.findOne.mockResolvedValue({
      id: 'plan-plus',
      price: 129000,
      isActive: false,
    });

    await expect(
      service.purchaseAiPlan('507f1f77bcf86cd799439011', {
        planId: '507f1f77bcf86cd799439012',
        billingCycle: BillingCycle.MONTHLY,
      }),
    ).rejects.toThrow('Selected plan is not available for purchase');

    expect(aiPlanService.isBillingCycleAllowed).not.toHaveBeenCalled();
  });
});
