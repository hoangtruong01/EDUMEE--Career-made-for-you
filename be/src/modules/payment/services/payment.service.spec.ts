import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { PaymentService } from './payment.service';
import { Payment, PaymentProvider, PaymentPurpose, PaymentStatus } from '../schema/payment.schema';
import { PaymentTransaction } from '../schema/payment-transaction.schema';
import { AiPlanService } from '../../ai/services/ai-plan.service';
import { AiSubscriptionService } from '../../ai/services/ai-subscription.service';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { BookingSession, BookingStatus } from '../../mentoring/schemas/booking-session.schema';
import { MentorAvailabilitySlot } from '../../mentoring/schemas/mentor-availability-slot.schema';
import { NotificationService } from '../../notifications/services';
import { WalletService } from '../../wallet/services';

describe('PaymentService', () => {
  let service: PaymentService;

  let paymentModel: any;
  const paymentTransactionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const bookingSessionModel = {};
  const mentorAvailabilitySlotModel = {};

  const aiPlanService = {
    findOne: jest.fn(),
    isBillingCycleAllowed: jest.fn(),
    calculatePricing: jest.fn(),
  };

  const aiSubscriptionService = {
    getActiveSubscriptionForUser: jest.fn(),
    activateSubscriptionFromPayment: jest.fn(),
    revokeSubscriptionForPayment: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };
  const notificationService = {
    create: jest.fn(),
    createMany: jest.fn(),
  };
  const walletService = {
    getAvailableBalance: jest.fn(),
    debit: jest.fn(),
    hold: jest.fn(),
    captureHold: jest.fn(),
    releaseHold: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    paymentModel = jest.fn().mockImplementation(function createPayment(this: any, payload: Record<string, unknown>) {
      Object.assign(this, payload);
      this._id = new Types.ObjectId('507f1f77bcf86cd799439099');
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    });
    paymentModel.findOne = jest.fn().mockReturnValue(createQuery(null));
    (bookingSessionModel as any).findById = jest.fn();
    (bookingSessionModel as any).findByIdAndUpdate = jest.fn().mockReturnValue(createQuery(null));
    paymentTransactionModel.create.mockResolvedValue({});
    paymentTransactionModel.findOne.mockReturnValue(createQuery(null));

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
        { provide: WalletService, useValue: walletService },
      ],
    }).compile();

    service = module.get(PaymentService);
    configService.get.mockImplementation((_key: string, fallback?: unknown) => fallback);
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

  it('rejects purchases for zero-price AI plans', async () => {
    aiPlanService.findOne.mockResolvedValue({
      id: 'plan-free',
      price: 0,
      isActive: true,
    });

    await expect(
      service.purchaseAiPlan('507f1f77bcf86cd799439011', {
        planId: '507f1f77bcf86cd799439012',
        billingCycle: BillingCycle.MONTHLY,
      }),
    ).rejects.toThrow('Selected plan is not purchasable until a positive price is configured');
  });

  it('allows AI plan purchases for users who already have an active subscription', async () => {
    aiSubscriptionService.getActiveSubscriptionForUser.mockResolvedValue({
      status: 'active',
    });
    aiPlanService.findOne.mockResolvedValue({
      id: 'plan-plus',
      price: 129000,
      currency: 'VND',
      isActive: true,
    });
    aiPlanService.isBillingCycleAllowed.mockReturnValue(true);
    aiPlanService.calculatePricing.mockReturnValue({
      billingCycle: BillingCycle.MONTHLY,
      months: 1,
      monthlyPrice: 129000,
      subtotal: 129000,
      discountPercentage: 0,
      discountAmount: 0,
      total: 129000,
      currency: 'VND',
    });

    const result = await service.purchaseAiPlan('507f1f77bcf86cd799439011', {
      planId: '507f1f77bcf86cd799439012',
      billingCycle: BillingCycle.MONTHLY,
      returnUrls: {
        success: 'https://edumee.vn/dashboard?payment=success',
        error: 'https://edumee.vn/dashboard?payment=error',
        cancel: 'https://edumee.vn/dashboard?payment=cancel',
      },
    });

    expect(result.paymentId).toBe('507f1f77bcf86cd799439099');
    expect(result.redirectUrl).toContain('https://edumee.vn/payment/checkout/');
    expect(result.redirectUrl).not.toContain('localhost');
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 129000,
        currency: 'VND',
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
        successUrl: 'https://edumee.vn/dashboard?payment=success',
      }),
    );
  });

  it('reuses an existing pending AI plan payment for the same plan and cycle', async () => {
    const pendingPayment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439088'),
      checkoutReference: 'CHK-EXISTING',
      successUrl: 'https://app.edumee.vn/dashboard?payment=success',
      save: jest.fn().mockResolvedValue(undefined),
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(pendingPayment));
    aiPlanService.findOne.mockResolvedValue({
      id: 'plan-plus',
      price: 129000,
      currency: 'VND',
      isActive: true,
    });
    aiPlanService.isBillingCycleAllowed.mockReturnValue(true);

    const result = await service.purchaseAiPlan('507f1f77bcf86cd799439011', {
      planId: '507f1f77bcf86cd799439012',
      billingCycle: BillingCycle.MONTHLY,
    });

    expect(result.paymentId).toBe('507f1f77bcf86cd799439088');
    expect(result.checkoutReference).toBe('CHK-EXISTING');
    expect(result.redirectUrl).toContain('https://app.edumee.vn/payment/checkout/');
    expect(result.redirectUrl).not.toContain('localhost');
    expect(pendingPayment.save).toHaveBeenCalledTimes(1);
    expect(paymentModel).not.toHaveBeenCalled();
  });

  it('creates mentor booking payments with frontend checkout urls and stored return urls', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const bookingId = '507f1f77bcf86cd799439020';
    const booking = {
      _id: new Types.ObjectId(bookingId),
      menteeId: new Types.ObjectId(userId),
      status: BookingStatus.AWAITING_PAYMENT,
      paymentInfo: {
        sessionPrice: 50000,
        currency: 'VND',
      },
    };
    (bookingSessionModel as any).findById.mockReturnValue(createQuery(booking));

    const result = await service.purchaseMentorBooking(userId, {
      bookingSessionId: bookingId,
      returnUrls: {
        success: 'http://localhost:3000/mentor-matching?payment=success',
        error: 'http://localhost:3000/mentor-matching?payment=error',
        cancel: 'http://localhost:3000/mentor-matching?payment=cancel',
      },
    });

    expect(result.paymentId).toBe('507f1f77bcf86cd799439099');
    expect(result.redirectUrl).toContain('http://localhost:3000/payment/checkout/');
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingSessionId: booking._id,
        purpose: PaymentPurpose.MENTOR_BOOKING,
        amount: 50000,
        currency: 'VND',
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
        successUrl: 'http://localhost:3000/mentor-matching?payment=success',
        errorUrl: 'http://localhost:3000/mentor-matching?payment=error',
        cancelUrl: 'http://localhost:3000/mentor-matching?payment=cancel',
      }),
    );
    expect((bookingSessionModel as any).findByIdAndUpdate).toHaveBeenCalledWith(
      booking._id,
      expect.objectContaining({
        'paymentInfo.paymentStatus': 'pending',
        'paymentInfo.transactionId': '507f1f77bcf86cd799439099',
      }),
    );
  });

  it('returns checkout session data for a pending mentor booking token', async () => {
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      amount: 50000,
      currency: 'VND',
      provider: PaymentProvider.SEPAY,
      paymentMethod: 'BANK_TRANSFER',
      checkoutReference: 'CHK-TEST',
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
    };
    const booking = {
      _id: bookingId,
      mentorId: new Types.ObjectId('507f1f77bcf86cd799439021'),
      tutorProfileId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      sessionType: 'career_guidance',
      schedulingDetails: {
        requestedDateTime: new Date('2026-05-17T11:30:00.000Z'),
        duration: 90,
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
      },
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    (bookingSessionModel as any).findById.mockReturnValueOnce(createQuery(booking));
    (service as any).buildSepayCheckout = jest.fn().mockReturnValue({
      method: 'POST',
      url: 'https://pay-sandbox.sepay.vn/checkout',
      fields: {
        order_invoice_number: 'CHK-TEST',
        empty: undefined,
      },
    });

    const session = await service.getSepayCheckoutSession('checkout-token');

    expect(session).toEqual(
      expect.objectContaining({
        paymentId: paymentId.toString(),
        checkoutReference: 'CHK-TEST',
        purpose: PaymentPurpose.MENTOR_BOOKING,
        amount: 50000,
        currency: 'VND',
        method: 'POST',
        actionUrl: 'https://pay-sandbox.sepay.vn/checkout',
        fields: { order_invoice_number: 'CHK-TEST' },
        booking: expect.objectContaining({
          id: bookingId.toString(),
          sessionType: 'career_guidance',
          duration: 90,
          topicsToDiscuss: ['CV'],
        }),
      }),
    );
  });

  it('rejects invalid, expired, or closed checkout sessions', async () => {
    paymentModel.findOne.mockReturnValueOnce(createQuery(null));
    await expect(service.getSepayCheckoutSession('missing-token')).rejects.toThrow(
      'Checkout link is invalid or expired',
    );

    paymentModel.findOne.mockReturnValueOnce(
      createQuery({
        checkoutTokenExpiresAt: new Date(Date.now() - 60_000),
      }),
    );
    await expect(service.getSepayCheckoutSession('expired-token')).rejects.toThrow(
      'Checkout link is invalid or expired',
    );

    paymentModel.findOne.mockReturnValueOnce(
      createQuery({
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PAID,
        checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    );
    await expect(service.getSepayCheckoutSession('closed-token')).rejects.toThrow(
      'Payment is already paid',
    );
  });

  it('activates an AI plan immediately when Edumee Credit covers the full price', async () => {
    aiPlanService.findOne.mockResolvedValue({
      id: 'plan-plus',
      price: 129000,
      currency: 'VND',
      isActive: true,
    });
    aiPlanService.isBillingCycleAllowed.mockReturnValue(true);
    aiPlanService.calculatePricing.mockReturnValue({
      billingCycle: BillingCycle.MONTHLY,
      months: 1,
      monthlyPrice: 129000,
      subtotal: 129000,
      discountPercentage: 0,
      discountAmount: 0,
      total: 129000,
      currency: 'VND',
    });
    walletService.getAvailableBalance.mockResolvedValue(129000);
    walletService.debit.mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await service.purchaseAiPlan('507f1f77bcf86cd799439011', {
      planId: '507f1f77bcf86cd799439012',
      billingCycle: BillingCycle.MONTHLY,
      useEdumeeCredit: true,
      returnUrls: { success: 'http://localhost:3000/dashboard?payment=success' },
    });

    expect(result.redirectUrl).toContain('paymentId=507f1f77bcf86cd799439099');
    expect(walletService.debit).toHaveBeenCalledWith(expect.objectContaining({ amount: 129000 }));
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 0,
        subtotalAmount: 129000,
        creditAppliedAmount: 129000,
        provider: PaymentProvider.EDUMEE_CREDIT,
        status: PaymentStatus.PAID,
      }),
    );
    expect(aiSubscriptionService.activateSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
      }),
    );
  });

  it('activates a mentor booking immediately when Edumee Credit covers the full price', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const bookingId = '507f1f77bcf86cd799439020';
    const booking = {
      _id: new Types.ObjectId(bookingId),
      menteeId: new Types.ObjectId(userId),
      mentorId: new Types.ObjectId('507f1f77bcf86cd799439021'),
      status: BookingStatus.AWAITING_PAYMENT,
      sessionType: 'career_guidance',
      schedulingDetails: { requestedDateTime: new Date(), duration: 90 },
      paymentInfo: { sessionPrice: 50000, currency: 'VND' },
    };
    const updatedBooking = { ...booking, status: BookingStatus.PENDING };
    (bookingSessionModel as any).findById
      .mockReturnValueOnce(createQuery(booking))
      .mockReturnValueOnce(createQuery(booking));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValue(createQuery(updatedBooking));
    walletService.getAvailableBalance.mockResolvedValue(50000);
    walletService.debit.mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await service.purchaseMentorBooking(userId, {
      bookingSessionId: bookingId,
      useEdumeeCredit: true,
      returnUrls: { success: 'http://localhost:3000/mentor-matching?payment=success' },
    });

    expect(result.redirectUrl).toContain('/mentor-matching?payment=success');
    expect(walletService.debit).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000 }));
    expect((bookingSessionModel as any).findByIdAndUpdate).toHaveBeenCalledWith(
      booking._id,
      expect.objectContaining({
        status: BookingStatus.PENDING,
        'paymentInfo.paymentStatus': 'paid',
      }),
      { new: true },
    );
  });

  it('captures held Edumee Credit when a partial-credit SePay payment succeeds', async () => {
    const holdId = new Types.ObjectId();
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      billingCycle: BillingCycle.MONTHLY,
      purpose: PaymentPurpose.AI_PLAN,
      status: PaymentStatus.PENDING,
      creditAppliedAmount: 40000,
      creditHoldId: holdId,
      save: jest.fn().mockResolvedValue(undefined),
    };
    walletService.captureHold.mockResolvedValue({});

    await (service as any).markPaymentPaid(payment, {
      eventId: 'evt-paid',
      payload: {},
      sourceLabel: 'test',
    });

    expect(walletService.captureHold).toHaveBeenCalledWith(
      holdId.toString(),
      `payment:${payment._id.toString()}:credit-capture`,
      expect.any(String),
    );
    expect(aiSubscriptionService.activateSubscriptionFromPayment).toHaveBeenCalled();
  });

  it('releases held Edumee Credit when a partial-credit SePay payment fails', async () => {
    const holdId = new Types.ObjectId();
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      purpose: PaymentPurpose.AI_PLAN,
      status: PaymentStatus.PENDING,
      creditAppliedAmount: 40000,
      creditHoldId: holdId,
      save: jest.fn().mockResolvedValue(undefined),
    };
    walletService.releaseHold.mockResolvedValue({});

    await (service as any).markPaymentFailed(payment, {
      eventId: 'evt-failed',
      payload: {},
      sourceLabel: 'test',
    });

    expect(walletService.releaseHold).toHaveBeenCalledWith(
      holdId.toString(),
      `payment:${payment._id.toString()}:credit-release`,
      expect.any(String),
    );
  });

  it('refunds a paid mentor booking cancellation into Edumee Credit once', async () => {
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      status: PaymentStatus.PAID,
      amount: 50000,
      subtotalAmount: 50000,
      currency: 'VND',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const booking = {
      _id: bookingId,
      menteeId: payment.userId,
      mentorId: new Types.ObjectId(),
      status: BookingStatus.CONFIRMED,
      schedulingDetails: { requestedDateTime: new Date(Date.now() + 48 * 60 * 60_000), duration: 90 },
      paymentInfo: { sessionPrice: 50000, currency: 'VND' },
    } as any;
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    walletService.refund.mockResolvedValue({ _id: new Types.ObjectId() });
    (bookingSessionModel as any).findById.mockReturnValueOnce(createQuery(booking));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValue(createQuery(booking));

    const result = await service.handleMentorBookingCancellation(booking, 'mentor', 'Mentor unavailable');

    expect(result).toEqual({ status: 'refunded', refundAmount: 50000 });
    expect(walletService.refund).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000 }));
    expect(payment.status).toBe(PaymentStatus.REFUNDED);
  });
});

function createQuery<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}
