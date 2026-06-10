import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { PaymentService } from './payment.service';
import {
  Payment,
  PaymentProvider,
  PaymentPurpose,
  PaymentSettlementStatus,
  PaymentStatus,
} from '../schema/payment.schema';
import { PaymentTransaction } from '../schema/payment-transaction.schema';
import { PaymentSetting } from '../schema/payment-setting.schema';
import { AiPlanService } from '../../ai/services/ai-plan.service';
import { AiSubscriptionService } from '../../ai/services/ai-subscription.service';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { BookingSession, BookingStatus } from '../../mentoring/schemas/booking-session.schema';
import { MentorAvailabilitySlot } from '../../mentoring/schemas/mentor-availability-slot.schema';
import { NotificationService } from '../../notifications/services';
import { WalletService } from '../../wallet/services';
import { FinancialLedgerService } from '../../financial-ledger';

describe('PaymentService', () => {
  let service: PaymentService;

  let paymentModel: any;
  const paymentTransactionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const paymentSettingModel = {
    findOne: jest.fn(),
  };
  const bookingSessionModel = {};
  const mentorAvailabilitySlotModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

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
    cashRefund: jest.fn(),
    creditMentorEarnings: jest.fn(),
  };
  const financialLedgerService = {
    postPaymentPaid: jest.fn(),
    postPaymentRefunded: jest.fn(),
    postMentorSettlementReady: jest.fn(),
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
    paymentModel.find = jest.fn().mockReturnValue(createQuery([]));
    (bookingSessionModel as any).find = jest.fn().mockReturnValue(createQuery([]));
    (bookingSessionModel as any).findById = jest.fn().mockReturnValue(createQuery(null));
    (bookingSessionModel as any).findByIdAndUpdate = jest.fn().mockReturnValue(createQuery(null));
    mentorAvailabilitySlotModel.findOne.mockReturnValue(createQuery({ _id: new Types.ObjectId() }));
    mentorAvailabilitySlotModel.findOneAndUpdate.mockReturnValue(createQuery({ _id: new Types.ObjectId() }));
    paymentTransactionModel.create.mockResolvedValue({});
    paymentTransactionModel.findOne.mockReturnValue(createQuery(null));
    paymentSettingModel.findOne.mockReturnValue(createQuery(null));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        { provide: getModelToken(PaymentTransaction.name), useValue: paymentTransactionModel },
        { provide: getModelToken(PaymentSetting.name), useValue: paymentSettingModel },
        { provide: getModelToken(BookingSession.name), useValue: bookingSessionModel },
        { provide: getModelToken(MentorAvailabilitySlot.name), useValue: mentorAvailabilitySlotModel },
        { provide: AiPlanService, useValue: aiPlanService },
        { provide: AiSubscriptionService, useValue: aiSubscriptionService },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationService, useValue: notificationService },
        { provide: WalletService, useValue: walletService },
        { provide: FinancialLedgerService, useValue: financialLedgerService },
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
    expect(result.checkoutReference).toMatch(/^EDU[A-F0-9]{12}$/);
    expect(result.redirectUrl).toContain('https://edumee.vn/payment/checkout/');
    expect(result.redirectUrl).not.toContain('localhost');
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 129000,
        checkoutReference: expect.stringMatching(/^EDU[A-F0-9]{12}$/),
        currency: 'VND',
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
        successUrl: 'https://edumee.vn/dashboard?payment=success',
      }),
    );
  });

  it('creates AI plan payments through the unified purchase contract', async () => {
    aiSubscriptionService.getActiveSubscriptionForUser.mockResolvedValue(null);
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

    const result = await service.createPaymentPurchase('507f1f77bcf86cd799439011', {
      purpose: PaymentPurpose.AI_PLAN,
      targetId: '507f1f77bcf86cd799439012',
      billingCycle: BillingCycle.MONTHLY,
      provider: PaymentProvider.SEPAY,
      returnUrls: {
        success: 'http://localhost:3000/dashboard?payment=success',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        paymentId: '507f1f77bcf86cd799439099',
        checkoutReference: expect.stringMatching(/^EDU[A-F0-9]{12}$/),
        redirectUrl: expect.stringContaining('/payment/checkout/'),
        purpose: PaymentPurpose.AI_PLAN,
        provider: PaymentProvider.SEPAY,
      }),
    );
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        purpose: PaymentPurpose.AI_PLAN,
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
      }),
    );
  });

  it('requires billingCycle for unified AI plan purchases', async () => {
    await expect(
      service.createPaymentPurchase('507f1f77bcf86cd799439011', {
        purpose: PaymentPurpose.AI_PLAN,
        targetId: '507f1f77bcf86cd799439012',
        provider: PaymentProvider.SEPAY,
      }),
    ).rejects.toThrow('billingCycle is required for AI plan purchases');

    expect(aiPlanService.findOne).not.toHaveBeenCalled();
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
    expect(result.checkoutReference).toMatch(/^EDU[A-F0-9]{12}$/);
    expect(result.redirectUrl).toContain('http://localhost:3000/payment/checkout/');
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingSessionId: booking._id,
        purpose: PaymentPurpose.MENTOR_BOOKING,
        amount: 50000,
        checkoutReference: expect.stringMatching(/^EDU[A-F0-9]{12}$/),
        currency: 'VND',
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
        platformFeeRate: 0.15,
        settlementStatus: PaymentSettlementStatus.PENDING,
        successUrl: 'http://localhost:3000/mentor-matching?payment=success',
        errorUrl: 'http://localhost:3000/mentor-matching?payment=error',
        cancelUrl: 'http://localhost:3000/mentor-matching?payment=cancel',
      }),
    );
    expect(paymentModel.mock.calls[0][0]).not.toHaveProperty('settlementBaseAmount');
    expect((bookingSessionModel as any).findByIdAndUpdate).toHaveBeenCalledWith(
      booking._id,
      expect.objectContaining({
        'paymentInfo.paymentStatus': 'pending',
        'paymentInfo.transactionId': '507f1f77bcf86cd799439099',
      }),
    );
  });

  it('snapshots configured mentor platform fee rates on new mentor booking payments', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const bookingId = '507f1f77bcf86cd799439020';
    const booking = {
      _id: new Types.ObjectId(bookingId),
      menteeId: new Types.ObjectId(userId),
      status: BookingStatus.AWAITING_PAYMENT,
      paymentInfo: {
        sessionPrice: 200000,
        currency: 'VND',
      },
    };
    (bookingSessionModel as any).findById.mockReturnValue(createQuery(booking));
    paymentSettingModel.findOne.mockReturnValueOnce(createQuery({ mentorPlatformFeeRate: 0.2 }));

    await service.purchaseMentorBooking(userId, {
      bookingSessionId: bookingId,
    });

    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingSessionId: booking._id,
        platformFeeRate: 0.2,
        settlementStatus: PaymentSettlementStatus.PENDING,
      }),
    );
    expect(paymentModel.mock.calls[0][0]).not.toHaveProperty('settlementBaseAmount');
  });

  it('creates mentor booking payments through the unified purchase contract without billingCycle', async () => {
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

    const result = await service.createPaymentPurchase(userId, {
      purpose: PaymentPurpose.MENTOR_BOOKING,
      targetId: bookingId,
      provider: PaymentProvider.SEPAY,
      returnUrls: {
        success: 'http://localhost:3000/mentor-matching?payment=success',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        paymentId: '507f1f77bcf86cd799439099',
        checkoutReference: expect.stringMatching(/^EDU[A-F0-9]{12}$/),
        redirectUrl: expect.stringContaining('/payment/checkout/'),
        purpose: PaymentPurpose.MENTOR_BOOKING,
        provider: PaymentProvider.SEPAY,
      }),
    );
    expect(paymentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingSessionId: booking._id,
        purpose: PaymentPurpose.MENTOR_BOOKING,
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
      }),
    );
  });

  it('rejects unsupported providers in the unified purchase contract', async () => {
    await expect(
      service.createPaymentPurchase('507f1f77bcf86cd799439011', {
        purpose: PaymentPurpose.MENTOR_BOOKING,
        targetId: '507f1f77bcf86cd799439020',
        provider: PaymentProvider.ZALOPAY,
      }),
    ).rejects.toThrow('Only SePay is supported by the unified payment purchase flow');
  });

  it('returns checkout session data for a pending mentor booking token', async () => {
    mockSepayCheckoutConfig(configService);
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
      successUrl: 'http://localhost:3000/mentor-matching?payment=success',
      errorUrl: 'http://localhost:3000/mentor-matching?payment=error',
      cancelUrl: 'http://localhost:3000/mentor-matching?payment=cancel',
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
    };
    const booking = {
      _id: bookingId,
      mentorId: new Types.ObjectId('507f1f77bcf86cd799439021'),
      tutorProfileId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      availabilitySlotId: new Types.ObjectId('507f1f77bcf86cd799439023'),
      status: BookingStatus.AWAITING_PAYMENT,
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
    (bookingSessionModel as any).findById
      .mockReturnValueOnce(createQuery(booking))
      .mockReturnValueOnce(createQuery(booking));

    const session = await service.getPaymentCheckoutSession('checkout-token');

    expect(session).toEqual(
      expect.objectContaining({
        paymentId: paymentId.toString(),
        status: PaymentStatus.PENDING,
        checkoutReference: 'CHK-TEST',
        purpose: PaymentPurpose.MENTOR_BOOKING,
        amount: 50000,
        currency: 'VND',
        sepayCheckout: expect.objectContaining({
          type: 'form_post',
          method: 'POST',
          actionUrl: 'https://pay-sandbox.sepay.vn/v1/checkout/init',
          environment: 'sandbox',
          fields: expect.objectContaining({
            merchant: 'test-merchant',
            operation: 'PURCHASE',
            payment_method: 'BANK_TRANSFER',
            order_invoice_number: 'CHK-TEST',
            order_amount: 50000,
            currency: 'VND',
            success_url: expect.stringContaining('paymentId=507f1f77bcf86cd799439099'),
            error_url: expect.stringContaining('paymentId=507f1f77bcf86cd799439099'),
            cancel_url: expect.stringContaining('paymentId=507f1f77bcf86cd799439099'),
            signature: expect.any(String),
          }),
        }),
        booking: expect.objectContaining({
          id: bookingId.toString(),
          sessionType: 'career_guidance',
          duration: 90,
          topicsToDiscuss: ['CV'],
        }),
      }),
    );
  });

  it('returns a production SePay checkout form when SEPAY_ENV is production', async () => {
    mockSepayCheckoutConfig(configService, 'production');
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      purpose: PaymentPurpose.AI_PLAN,
      amount: 129000,
      currency: 'VND',
      provider: PaymentProvider.SEPAY,
      paymentMethod: 'BANK_TRANSFER',
      checkoutReference: 'EDU9F2A7C1B4D8E',
      successUrl: 'http://localhost:3000/dashboard?payment=success',
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));

    const session = await service.getPaymentCheckoutSession('checkout-token');

    expect(session.sepayCheckout).toEqual(
      expect.objectContaining({
        actionUrl: 'https://pay.sepay.vn/v1/checkout/init',
        environment: 'production',
        fields: expect.objectContaining({
          merchant: 'test-merchant',
          order_invoice_number: 'EDU9F2A7C1B4D8E',
          order_amount: 129000,
          currency: 'VND',
          success_url: expect.stringContaining('paymentId=507f1f77bcf86cd799439099'),
          signature: expect.any(String),
        }),
      }),
    );
  });

  it('returns checkout status for a paid mentor booking token', async () => {
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const paidAt = new Date('2026-05-21T08:00:00.000Z');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      amount: 50000,
      currency: 'VND',
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PAID,
      paidAt,
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    (bookingSessionModel as any).findById.mockReturnValueOnce(createQuery({
      _id: bookingId,
      status: BookingStatus.PENDING,
    }));

    const status = await service.getPaymentCheckoutStatus('checkout-token');

    expect(status).toEqual(
      expect.objectContaining({
        paymentId: paymentId.toString(),
        status: PaymentStatus.PAID,
        checkoutReference: 'EDU9F2A7C1B4D8E',
        amount: 50000,
        currency: 'VND',
        purpose: PaymentPurpose.MENTOR_BOOKING,
        paidAt: paidAt.toISOString(),
        bookingStatus: BookingStatus.PENDING,
      }),
    );
    expect(status.sepayCheckout).toBeUndefined();
  });

  it('rejects invalid or expired checkout sessions', async () => {
    paymentModel.findOne.mockReturnValueOnce(createQuery(null));
    await expect(service.getPaymentCheckoutSession('missing-token')).rejects.toThrow(
      'Checkout link is invalid or expired',
    );

    paymentModel.findOne.mockReturnValueOnce(
      createQuery({
        checkoutTokenExpiresAt: new Date(Date.now() - 60_000),
      }),
    );
    await expect(service.getPaymentCheckoutSession('expired-token')).rejects.toThrow(
      'Checkout link is invalid or expired',
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

  it('does not debit Edumee Credit when a full-credit mentor booking loses the slot race', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const bookingId = '507f1f77bcf86cd799439020';
    const booking = {
      _id: new Types.ObjectId(bookingId),
      menteeId: new Types.ObjectId(userId),
      tutorProfileId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      availabilitySlotId: new Types.ObjectId('507f1f77bcf86cd799439023'),
      status: BookingStatus.AWAITING_PAYMENT,
      paymentInfo: { sessionPrice: 50000, currency: 'VND' },
    };
    (bookingSessionModel as any).findById.mockReturnValue(createQuery(booking));
    mentorAvailabilitySlotModel.findOne.mockReturnValue(createQuery({ _id: booking.availabilitySlotId }));
    mentorAvailabilitySlotModel.findOneAndUpdate.mockReturnValue(createQuery(null));
    walletService.getAvailableBalance.mockResolvedValue(50000);

    await expect(
      service.purchaseMentorBooking(userId, {
        bookingSessionId: bookingId,
        useEdumeeCredit: true,
      }),
    ).rejects.toThrow('Khung gio da co nguoi thanh toan truoc');

    expect(walletService.debit).not.toHaveBeenCalled();
    expect((bookingSessionModel as any).findByIdAndUpdate).not.toHaveBeenCalled();
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
      planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      billingCycle: BillingCycle.MONTHLY,
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
    walletService.cashRefund.mockResolvedValue({ _id: new Types.ObjectId() });
    (bookingSessionModel as any).findById.mockReturnValueOnce(createQuery(booking));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValue(createQuery(booking));

    const result = await service.handleMentorBookingCancellation(booking, 'mentor', 'Mentor unavailable');

    expect(result).toEqual({ status: 'refunded', refundAmount: 50000 });
    expect(walletService.cashRefund).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000 }));
    expect(walletService.refund).not.toHaveBeenCalled();
    expect(payment.status).toBe(PaymentStatus.REFUNDED);
    expect(payment.settlementStatus).toBe(PaymentSettlementStatus.REFUNDED);
  });

  it('settles a completed paid mentor booking with the platform fee', async () => {
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      status: PaymentStatus.PAID,
      amount: 0,
      subtotalAmount: 200000,
      creditAppliedAmount: 200000,
      currency: 'VND',
      settlementStatus: PaymentSettlementStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const booking = {
      _id: bookingId,
      mentorId: new Types.ObjectId('507f1f77bcf86cd799439021'),
    } as any;
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    (bookingSessionModel as any).findById.mockReturnValueOnce(createQuery(booking));
    walletService.creditMentorEarnings.mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await service.settleMentorBookingPayment(bookingId);

    expect(result).toBe(payment);
    expect(payment.settlementBaseAmount).toBe(200000);
    expect(payment.platformFeeRate).toBe(0.15);
    expect(payment.platformFeeAmount).toBe(30000);
    expect(payment.mentorPayoutAmount).toBe(170000);
    expect(payment.settlementStatus).toBe(PaymentSettlementStatus.READY);
    expect(payment.settledAt).toBeInstanceOf(Date);
    expect(payment.save).toHaveBeenCalledTimes(1);
    expect(paymentTransactionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: payment._id,
        eventType: 'mentor_settlement_ready',
        status: 'success',
        payload: expect.objectContaining({
          settlementBaseAmount: 200000,
          platformFeeAmount: 30000,
          mentorPayoutAmount: 170000,
        }),
      }),
    );
    expect(walletService.creditMentorEarnings).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '507f1f77bcf86cd799439021',
        amount: 170000,
        sourceType: 'mentor_payout',
        sourceId: payment._id.toString(),
        idempotencyKey: `payment:${payment._id.toString()}:mentor-payout`,
      }),
    );
  });

  it('refunds 50 percent for mentee cancellation in 2-24h and settles the retained amount', async () => {
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const mentorId = new Types.ObjectId('507f1f77bcf86cd799439021');
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      status: PaymentStatus.PAID,
      amount: 200000,
      subtotalAmount: 200000,
      creditAppliedAmount: 0,
      currency: 'VND',
      settlementStatus: PaymentSettlementStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const booking = {
      _id: bookingId,
      menteeId: payment.userId,
      mentorId,
      status: BookingStatus.CONFIRMED,
      schedulingDetails: { requestedDateTime: new Date(Date.now() + 3 * 60 * 60_000), duration: 90 },
      paymentInfo: { sessionPrice: 200000, currency: 'VND' },
    } as any;
    paymentModel.findOne
      .mockReturnValueOnce(createQuery(payment))
      .mockReturnValueOnce(createQuery(payment));
    (bookingSessionModel as any).findById.mockReturnValueOnce(createQuery(booking));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValue(createQuery(booking));
    walletService.cashRefund.mockResolvedValue({ _id: new Types.ObjectId() });
    walletService.creditMentorEarnings.mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await service.handleMentorBookingCancellation(booking, 'mentee', 'Cannot attend');

    expect(result).toEqual({ status: 'refunded', refundAmount: 100000 });
    expect(walletService.cashRefund).toHaveBeenCalledWith(expect.objectContaining({ amount: 100000 }));
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.refundedAmount).toBe(100000);
    expect(payment.settlementBaseAmount).toBe(100000);
    expect(payment.platformFeeAmount).toBe(15000);
    expect(payment.mentorPayoutAmount).toBe(85000);
    expect(payment.settlementStatus).toBe(PaymentSettlementStatus.READY);
    expect(walletService.creditMentorEarnings).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mentorId.toString(),
        amount: 85000,
      }),
    );
  });

  it('returns mentor income only for bookings owned by the current mentor', async () => {
    const mentorId = '507f1f77bcf86cd799439021';
    const ownedBookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const otherBookingId = new Types.ObjectId('507f1f77bcf86cd799439030');
    const ownedBooking = {
      _id: ownedBookingId,
      mentorId: new Types.ObjectId(mentorId),
      menteeUser: { name: 'Linh', email: 'linh@example.com' },
      sessionType: 'career_guidance',
      status: BookingStatus.COMPLETED,
    };
    const ownedPayment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      bookingSessionId: ownedBookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      status: PaymentStatus.PAID,
      subtotalAmount: 200000,
      currency: 'VND',
      platformFeeRate: 0.15,
      settlementStatus: PaymentSettlementStatus.READY,
      paidAt: new Date(),
    } as any;

    (bookingSessionModel as any).find.mockReturnValueOnce(createQuery([ownedBooking]));
    paymentModel.find.mockImplementation((filter: Record<string, any>) => {
      const bookingIds = filter.bookingSessionId?.$in?.map((id: Types.ObjectId) => id.toString()) || [];
      const visiblePayments = bookingIds.includes(ownedBookingId.toString()) && !bookingIds.includes(otherBookingId.toString())
        ? [ownedPayment]
        : [];
      return createQuery(visiblePayments);
    });

    const result = await service.getMentorIncome(mentorId, { range: 'year' });

    expect((bookingSessionModel as any).find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { mentorId: new Types.ObjectId(mentorId) },
          { $expr: { $eq: ['$mentorId', mentorId] } },
        ]),
      }),
    );
    expect(paymentModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: PaymentPurpose.MENTOR_BOOKING,
        status: PaymentStatus.PAID,
        settlementStatus: PaymentSettlementStatus.READY,
      }),
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual(
      expect.objectContaining({
        bookingSessionId: ownedBookingId.toString(),
        menteeName: 'Linh',
        settlementBaseAmount: 200000,
        platformFeeAmount: 30000,
        mentorPayoutAmount: 170000,
      }),
    );
    expect(result.summary.mentorPayoutAmount).toBe(170000);
  });

  it('excludes mentor income payments that are not successful ready settlements', async () => {
    const mentorId = '507f1f77bcf86cd799439021';
    const readyBookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const pendingBookingId = new Types.ObjectId('507f1f77bcf86cd799439022');
    const withheldBookingId = new Types.ObjectId('507f1f77bcf86cd799439023');
    const refundedBookingId = new Types.ObjectId('507f1f77bcf86cd799439024');
    const failedBookingId = new Types.ObjectId('507f1f77bcf86cd799439025');
    const cancelledBookingId = new Types.ObjectId('507f1f77bcf86cd799439026');
    const refundPendingBookingId = new Types.ObjectId('507f1f77bcf86cd799439027');
    const bookingIds = [
      readyBookingId,
      pendingBookingId,
      withheldBookingId,
      refundedBookingId,
      failedBookingId,
      cancelledBookingId,
      refundPendingBookingId,
    ];
    const bookings = bookingIds.map((bookingId, index) => ({
      _id: bookingId,
      mentorId: new Types.ObjectId(mentorId),
      menteeUser: { name: `Mentee ${index + 1}` },
      sessionType: 'career_guidance',
      status: BookingStatus.COMPLETED,
    }));
    const makePayment = (
      id: string,
      bookingSessionId: Types.ObjectId,
      status: PaymentStatus,
      settlementStatus: PaymentSettlementStatus,
      subtotalAmount: number,
    ) => ({
      _id: new Types.ObjectId(id),
      bookingSessionId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      status,
      subtotalAmount,
      currency: 'VND',
      platformFeeRate: 0.15,
      settlementStatus,
      paidAt: new Date(),
    } as any);
    const readyPayment = makePayment(
      '507f1f77bcf86cd799439091',
      readyBookingId,
      PaymentStatus.PAID,
      PaymentSettlementStatus.READY,
      300000,
    );
    const allPayments = [
      readyPayment,
      makePayment(
        '507f1f77bcf86cd799439092',
        pendingBookingId,
        PaymentStatus.PAID,
        PaymentSettlementStatus.PENDING,
        200000,
      ),
      makePayment(
        '507f1f77bcf86cd799439093',
        withheldBookingId,
        PaymentStatus.PAID,
        PaymentSettlementStatus.WITHHELD,
        200000,
      ),
      makePayment(
        '507f1f77bcf86cd799439094',
        refundedBookingId,
        PaymentStatus.PAID,
        PaymentSettlementStatus.REFUNDED,
        200000,
      ),
      makePayment(
        '507f1f77bcf86cd799439095',
        failedBookingId,
        PaymentStatus.FAILED,
        PaymentSettlementStatus.READY,
        200000,
      ),
      makePayment(
        '507f1f77bcf86cd799439096',
        cancelledBookingId,
        PaymentStatus.CANCELLED,
        PaymentSettlementStatus.READY,
        200000,
      ),
      makePayment(
        '507f1f77bcf86cd799439097',
        refundPendingBookingId,
        PaymentStatus.REFUND_PENDING,
        PaymentSettlementStatus.READY,
        200000,
      ),
    ];

    (bookingSessionModel as any).find.mockReturnValueOnce(createQuery(bookings));
    paymentModel.find.mockImplementation((filter: Record<string, any>) => {
      const visibleBookingIds = new Set(
        (filter.bookingSessionId?.$in || []).map((id: Types.ObjectId) => id.toString()),
      );
      return createQuery(
        allPayments.filter((payment) => (
          visibleBookingIds.has(payment.bookingSessionId.toString()) &&
          payment.status === filter.status &&
          payment.settlementStatus === filter.settlementStatus
        )),
      );
    });

    const result = await service.getMentorIncome(mentorId, { range: 'year' });

    expect(paymentModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: PaymentPurpose.MENTOR_BOOKING,
        status: PaymentStatus.PAID,
        settlementStatus: PaymentSettlementStatus.READY,
      }),
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual(
      expect.objectContaining({
        paymentId: readyPayment._id.toString(),
        bookingSessionId: readyBookingId.toString(),
        settlementBaseAmount: 300000,
        platformFeeAmount: 45000,
        mentorPayoutAmount: 255000,
        settlementStatus: PaymentSettlementStatus.READY,
      }),
    );
    expect(result.total).toBe(1);
    expect(result.summary).toEqual(
      expect.objectContaining({
        grossRevenue: 300000,
        platformFeeAmount: 45000,
        mentorPayoutAmount: 255000,
        readyPayoutAmount: 255000,
        pendingPayoutAmount: 0,
        completedSessionCount: 1,
      }),
    );
  });

  it('withholds mentor settlement when cancellation requires refund review', async () => {
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
      schedulingDetails: { requestedDateTime: new Date(Date.now() + 60 * 60_000), duration: 90 },
      paymentInfo: { sessionPrice: 50000, currency: 'VND' },
    } as any;
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValue(createQuery(booking));

    const result = await service.handleMentorBookingCancellation(booking, 'mentee', 'Cannot attend');

    expect(result).toEqual({ status: 'refund_pending' });
    expect(payment.status).toBe(PaymentStatus.REFUND_PENDING);
    expect(payment.settlementStatus).toBe(PaymentSettlementStatus.WITHHELD);
    expect(walletService.refund).not.toHaveBeenCalled();
  });

  it('marks a mentor booking payment paid from a SePay bank webhook payload', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_BANK_WEBHOOK_API_KEY') return 'test-sepay-key';
      if (key === 'SEPAY_BANK_TRANSFER_CODE_PREFIX') return 'EDU';
      return fallback;
    });
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      currency: 'VND',
      status: PaymentStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const booking = {
      _id: bookingId,
      menteeId: payment.userId,
      mentorId: new Types.ObjectId('507f1f77bcf86cd799439021'),
      tutorProfileId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      availabilitySlotId: new Types.ObjectId('507f1f77bcf86cd799439023'),
      status: BookingStatus.AWAITING_PAYMENT,
      sessionType: 'career_guidance',
      schedulingDetails: { requestedDateTime: new Date(), duration: 90 },
      paymentInfo: { sessionPrice: 500000, currency: 'VND' },
    };
    const updatedBooking = { ...booking, status: BookingStatus.PENDING };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    paymentTransactionModel.findOne.mockReturnValueOnce(createQuery(null));
    (bookingSessionModel as any).findById
      .mockReturnValueOnce(createQuery(booking))
      .mockReturnValueOnce(createQuery(booking));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValueOnce(createQuery(updatedBooking));

    const result = await service.handleSepayBankWebhook('Apikey test-sepay-key', {
      id: 92704,
      gateway: 'MBBank',
      transactionDate: '2026-01-15 10:30:00',
      accountNumber: '0123456789',
      subAccount: 'SBSEPAYX9KA2B7MN4QR',
      code: '',
      content: 'EDU9F2A7C1B4D8E thanh toan mentor',
      transferType: 'in',
      transferAmount: 500000,
      referenceCode: 'SB1A2B3C4D5E',
    });

    expect(result).toEqual(
      expect.objectContaining({
        received: true,
        processed: true,
        idempotent: false,
        paymentId: paymentId.toString(),
        status: PaymentStatus.PAID,
      }),
    );
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect((bookingSessionModel as any).findByIdAndUpdate).toHaveBeenCalledWith(
      bookingId,
      expect.objectContaining({
        status: BookingStatus.PENDING,
        'paymentInfo.paymentStatus': 'paid',
        'paymentInfo.transactionId': paymentId.toString(),
      }),
      { new: true },
    );
    expect(paymentTransactionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId,
        eventId: 'sepay-bank:92704',
        providerTransactionId: 'SB1A2B3C4D5E',
        eventType: 'payment_succeeded',
        status: 'success',
      }),
    );
  });

  it('refunds a late mentor booking SePay transfer when another payment already claimed the slot', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_BANK_WEBHOOK_API_KEY') return 'test-sepay-key';
      if (key === 'SEPAY_BANK_TRANSFER_CODE_PREFIX') return 'EDU';
      return fallback;
    });
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      subtotalAmount: 500000,
      currency: 'VND',
      status: PaymentStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const booking = {
      _id: bookingId,
      menteeId: payment.userId,
      tutorProfileId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      availabilitySlotId: new Types.ObjectId('507f1f77bcf86cd799439023'),
      status: BookingStatus.AWAITING_PAYMENT,
      paymentInfo: { sessionPrice: 500000, currency: 'VND' },
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    paymentTransactionModel.findOne.mockReturnValueOnce(createQuery(null));
    (bookingSessionModel as any).findById
      .mockReturnValueOnce(createQuery(booking))
      .mockReturnValueOnce(createQuery(booking));
    mentorAvailabilitySlotModel.findOneAndUpdate.mockReturnValue(createQuery(null));

    const result = await service.handleSepayBankWebhook('Apikey test-sepay-key', {
      id: 92706,
      gateway: 'MBBank',
      transactionDate: '2026-01-15 10:30:00',
      accountNumber: '0123456789',
      content: 'EDU9F2A7C1B4D8E thanh toan mentor',
      transferType: 'in',
      transferAmount: 500000,
      referenceCode: 'SB-LATE',
    });

    expect(result).toEqual(
      expect.objectContaining({
        received: true,
        processed: false,
        paymentId: paymentId.toString(),
        status: PaymentStatus.REFUNDED,
      }),
    );
    expect(payment.status).toBe(PaymentStatus.REFUNDED);
    expect(walletService.cashRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: payment.userId.toString(),
        amount: 500000,
        sourceType: 'payment_refund',
      }),
    );
    expect((bookingSessionModel as any).findByIdAndUpdate).toHaveBeenCalledWith(
      bookingId,
      expect.objectContaining({
        status: BookingStatus.CANCELLED_BY_MENTEE,
        'paymentInfo.paymentStatus': 'refunded',
      }),
    );
    expect(financialLedgerService.postPaymentPaid).not.toHaveBeenCalled();
  });

  it('activates an AI plan payment from a SePay bank webhook payload', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_BANK_WEBHOOK_API_KEY') return 'test-sepay-key';
      return fallback;
    });
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      billingCycle: BillingCycle.MONTHLY,
      purpose: PaymentPurpose.AI_PLAN,
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 129000,
      currency: 'VND',
      status: PaymentStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    paymentTransactionModel.findOne.mockReturnValueOnce(createQuery(null));

    const result = await service.handleSepayBankWebhook('Apikey test-sepay-key', {
      id: 92705,
      code: 'EDU9F2A7C1B4D8E',
      transferType: 'in',
      transferAmount: 129000,
      referenceCode: 'SB1A2B3C4D5F',
    });

    expect(result).toEqual(
      expect.objectContaining({
        processed: true,
        idempotent: false,
        status: PaymentStatus.PAID,
      }),
    );
    expect(aiSubscriptionService.activateSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        paymentId: paymentId.toString(),
        billingCycle: BillingCycle.MONTHLY,
      }),
    );
  });

  it('simulates a test bank transfer for a mentor booking checkout owner', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'PAYMENT_TEST_BANK_ENABLED') return 'true';
      if (key === 'TEST_BANK_INITIAL_BALANCE') return '1000000000';
      if (key === 'SEPAY_BANK_TRANSFER_CODE_PREFIX') return 'EDU';
      return fallback;
    });
    const userId = '507f1f77bcf86cd799439011';
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const bookingId = new Types.ObjectId('507f1f77bcf86cd799439020');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId(userId),
      bookingSessionId: bookingId,
      purpose: PaymentPurpose.MENTOR_BOOKING,
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      currency: 'VND',
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const booking = {
      _id: bookingId,
      menteeId: payment.userId,
      mentorId: new Types.ObjectId('507f1f77bcf86cd799439021'),
      tutorProfileId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      availabilitySlotId: new Types.ObjectId('507f1f77bcf86cd799439023'),
      status: BookingStatus.AWAITING_PAYMENT,
      sessionType: 'career_guidance',
      schedulingDetails: { requestedDateTime: new Date(), duration: 90 },
      paymentInfo: { sessionPrice: 500000, currency: 'VND' },
    };
    const updatedBooking = { ...booking, status: BookingStatus.PENDING };
    paymentModel.findOne
      .mockReturnValueOnce(createQuery(payment))
      .mockReturnValueOnce(createQuery(payment));
    paymentTransactionModel.findOne.mockReturnValueOnce(createQuery(null));
    (bookingSessionModel as any).findById
      .mockReturnValueOnce(createQuery(booking))
      .mockReturnValueOnce(createQuery(booking));
    (bookingSessionModel as any).findByIdAndUpdate.mockReturnValueOnce(createQuery(updatedBooking));

    const result = await service.simulateCheckoutTestBankTransfer(
      'checkout-token',
      {
        amount: 500000,
        content: 'EDU9F2A7C1B4D8E thanh toan mentor',
      },
      { id: userId, role: 'student' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        processed: true,
        paymentId: paymentId.toString(),
        status: PaymentStatus.PAID,
        checkoutReference: 'EDU9F2A7C1B4D8E',
        testBank: expect.objectContaining({
          beforeBalance: 1000000000,
          afterBalance: 999500000,
          transactionId: expect.stringMatching(/^test-bank-/),
        }),
      }),
    );
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(paymentTransactionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId,
        eventId: expect.stringMatching(/^test-bank:test-bank-/),
        eventType: 'payment_succeeded',
        status: 'success',
      }),
    );
    expect((bookingSessionModel as any).findByIdAndUpdate).toHaveBeenCalledWith(
      bookingId,
      expect.objectContaining({
        status: BookingStatus.PENDING,
        'paymentInfo.paymentStatus': 'paid',
      }),
      { new: true },
    );
  });

  it('simulates a test bank transfer for an AI plan checkout owner', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_ENV') return 'sandbox';
      if (key === 'SEPAY_BANK_TRANSFER_CODE_PREFIX') return 'EDU';
      return fallback;
    });
    const userId = '507f1f77bcf86cd799439011';
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    const payment = {
      _id: paymentId,
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      billingCycle: BillingCycle.MONTHLY,
      purpose: PaymentPurpose.AI_PLAN,
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 129000,
      currency: 'VND',
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    paymentModel.findOne
      .mockReturnValueOnce(createQuery(payment))
      .mockReturnValueOnce(createQuery(payment));
    paymentTransactionModel.findOne.mockReturnValueOnce(createQuery(null));

    const result = await service.simulateCheckoutTestBankTransfer(
      'checkout-token',
      {
        amount: 129000,
        content: 'EDU9F2A7C1B4D8E thanh toan goi ai',
      },
      { id: userId, role: 'student' },
    );

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(aiSubscriptionService.activateSubscriptionFromPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        planId: '507f1f77bcf86cd799439012',
        paymentId: paymentId.toString(),
        billingCycle: BillingCycle.MONTHLY,
      }),
    );
  });

  it('rejects test bank transfers with wrong amount or missing checkout code', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'PAYMENT_TEST_BANK_ENABLED') return 'true';
      if (key === 'SEPAY_BANK_TRANSFER_CODE_PREFIX') return 'EDU';
      return fallback;
    });
    const userId = '507f1f77bcf86cd799439011';
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId(userId),
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    await expect(
      service.simulateCheckoutTestBankTransfer(
        'checkout-token',
        { amount: 499000, content: 'EDU9F2A7C1B4D8E thanh toan mentor' },
        { id: userId, role: 'student' },
      ),
    ).rejects.toThrow('Transfer amount must match payment amount');

    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    await expect(
      service.simulateCheckoutTestBankTransfer(
        'checkout-token',
        { amount: 500000, content: 'thanh toan mentor' },
        { id: userId, role: 'student' },
      ),
    ).rejects.toThrow('Transfer content must include checkout reference');

    expect(paymentTransactionModel.create).not.toHaveBeenCalled();
  });

  it('rejects test bank transfers for non-owners when not admin', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'PAYMENT_TEST_BANK_ENABLED') return 'true';
      return fallback;
    });
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PENDING,
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));

    await expect(
      service.simulateCheckoutTestBankTransfer(
        'checkout-token',
        { amount: 500000, content: 'EDU9F2A7C1B4D8E thanh toan mentor' },
        { id: '507f1f77bcf86cd799439012', role: 'student' },
      ),
    ).rejects.toThrow('Forbidden');

    expect(paymentTransactionModel.create).not.toHaveBeenCalled();
  });

  it('rejects test bank transfers when simulator is disabled or checkout is closed', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'PAYMENT_TEST_BANK_ENABLED') return 'false';
      return fallback;
    });
    await expect(
      service.simulateCheckoutTestBankTransfer(
        'checkout-token',
        { amount: 500000, content: 'EDU9F2A7C1B4D8E thanh toan mentor' },
        { id: '507f1f77bcf86cd799439011', role: 'student' },
      ),
    ).rejects.toThrow('Payment test bank simulator is disabled');

    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'PAYMENT_TEST_BANK_ENABLED') return 'true';
      return fallback;
    });
    const paidPayment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      status: PaymentStatus.PAID,
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(paidPayment));
    await expect(
      service.simulateCheckoutTestBankTransfer(
        'checkout-token',
        { amount: 500000, content: 'EDU9F2A7C1B4D8E thanh toan mentor' },
        { id: '507f1f77bcf86cd799439011', role: 'student' },
      ),
    ).rejects.toThrow('Payment is not pending');
  });

  it('does not process duplicate SePay bank webhook events twice', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_BANK_WEBHOOK_API_KEY') return 'test-sepay-key';
      return fallback;
    });
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      planId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      billingCycle: BillingCycle.MONTHLY,
      purpose: PaymentPurpose.AI_PLAN,
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 129000,
      currency: 'VND',
      status: PaymentStatus.PAID,
      save: jest.fn().mockResolvedValue(undefined),
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));
    paymentTransactionModel.findOne.mockReturnValueOnce(createQuery({ eventId: 'sepay-bank:92705' }));

    const result = await service.handleSepayBankWebhook('Apikey test-sepay-key', {
      id: 92705,
      code: 'EDU9F2A7C1B4D8E',
      transferType: 'in',
      transferAmount: 129000,
    });

    expect(result).toEqual(
      expect.objectContaining({
        processed: true,
        idempotent: true,
        status: PaymentStatus.PAID,
      }),
    );
    expect(paymentTransactionModel.create).not.toHaveBeenCalled();
  });

  it('rejects SePay bank webhooks with an invalid API key', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_BANK_WEBHOOK_API_KEY') return 'test-sepay-key';
      return fallback;
    });

    await expect(
      service.handleSepayBankWebhook('Apikey wrong-key', {
        id: 92704,
        code: 'EDU9F2A7C1B4D8E',
        transferType: 'in',
        transferAmount: 500000,
      }),
    ).rejects.toThrow('Invalid SePay bank webhook API key');

    expect(paymentModel.findOne).not.toHaveBeenCalled();
  });

  it('acknowledges but does not process SePay bank webhooks with a mismatched amount', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'SEPAY_BANK_WEBHOOK_API_KEY') return 'test-sepay-key';
      return fallback;
    });
    const payment = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      provider: PaymentProvider.SEPAY,
      checkoutReference: 'EDU9F2A7C1B4D8E',
      amount: 500000,
      status: PaymentStatus.PENDING,
    };
    paymentModel.findOne.mockReturnValueOnce(createQuery(payment));

    const result = await service.handleSepayBankWebhook('Apikey test-sepay-key', {
      id: 92704,
      code: 'EDU9F2A7C1B4D8E',
      transferType: 'in',
      transferAmount: 499000,
    });

    expect(result).toEqual(
      expect.objectContaining({
        received: true,
        processed: false,
        reason: 'amount_mismatch',
        status: PaymentStatus.PENDING,
      }),
    );
    expect(paymentTransactionModel.create).not.toHaveBeenCalled();
  });
});

function createQuery<T>(value: T) {
  return {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function mockSepayCheckoutConfig(
  configService: { get: jest.Mock },
  env: 'sandbox' | 'production' = 'sandbox',
) {
  configService.get.mockImplementation((key: string, fallback?: unknown) => {
    if (key === 'SEPAY_MERCHANT_ID') return 'test-merchant';
    if (key === 'SEPAY_SECRET_KEY') return 'test-secret';
    if (key === 'SEPAY_ENV') return env;
    return fallback;
  });
}
