import { PaymentProvider, PaymentPurpose, PaymentStatus } from '../payment/schema/payment.schema';
import { AdminService } from './admin.service';

describe('AdminService finance', () => {
  let service: AdminService;
  let paymentModel: any;
  let financialLedgerService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockReturnValue(createQuery(0)),
      find: jest.fn().mockReturnValue(createQuery([])),
    };
    financialLedgerService = {
      getFinanceSummary: jest.fn().mockResolvedValue(buildLedgerSummary()),
    };

    service = new AdminService(
      {},
      {},
      {},
      {},
      {},
      {},
      paymentModel,
      {},
      {},
      {},
      {},
      {},
      {},
      financialLedgerService,
    );
  });

  it('returns all payment providers and statuses by default', async () => {
    paymentModel.find.mockReturnValue(
      createQuery([
        buildPayment({ id: 'payment-1', provider: PaymentProvider.SEPAY, status: PaymentStatus.PENDING }),
        buildPayment({ id: 'payment-2', provider: PaymentProvider.EDUMEE_CREDIT, status: PaymentStatus.PAID }),
      ]),
    );
    paymentModel.countDocuments.mockReturnValue(createQuery(2));

    const result = await service.getFinancePayments();

    expect(paymentModel.find).toHaveBeenCalledWith({});
    expect(paymentModel.countDocuments).toHaveBeenCalledWith({});
    expect(result.total).toBe(2);
    expect(result.payments.map((payment) => payment.provider)).toEqual([
      PaymentProvider.SEPAY,
      PaymentProvider.EDUMEE_CREDIT,
    ]);
  });

  it('keeps provider and status filters for finance payments', async () => {
    paymentModel.find.mockReturnValue(createQuery([]));
    paymentModel.countDocuments.mockReturnValue(createQuery(0));

    await service.getFinancePayments({
      provider: PaymentProvider.SEPAY,
      status: PaymentStatus.PAID,
    });

    expect(paymentModel.find).toHaveBeenCalledWith({
      provider: PaymentProvider.SEPAY,
      status: PaymentStatus.PAID,
    });
  });

  it('summarizes revenue from successful payments only while counting every payment status', async () => {
    paymentModel.aggregate
      .mockResolvedValueOnce([
        {
          grossCashIn: 100000,
          totalRevenue: 150000,
          aiPlanRevenue: 100000,
          platformFeeRevenue: 20000,
        },
      ])
      .mockResolvedValueOnce([
        {
          grossCashIn: 50000,
          totalRevenue: 50000,
          aiPlanRevenue: 50000,
          platformFeeRevenue: 0,
        },
      ])
      .mockResolvedValueOnce([
        { _id: PaymentStatus.PAID, count: 1 },
        { _id: PaymentStatus.PENDING, count: 1 },
        { _id: PaymentStatus.FAILED, count: 1 },
        { _id: PaymentStatus.CANCELLED, count: 1 },
        { _id: PaymentStatus.REFUNDED, count: 1 },
        { _id: PaymentStatus.REFUND_PENDING, count: 1 },
      ])
      .mockResolvedValueOnce([{ _id: PaymentStatus.PAID, count: 1 }]);

    const summary = await service.getFinanceSummary('month');

    expect(paymentModel.aggregate.mock.calls[0][0][0]).toEqual({
      $match: expect.objectContaining({ status: PaymentStatus.PAID }),
    });
    expect(summary.grossCashIn).toBe(100000);
    expect(summary.totalRevenue).toBe(150000);
    expect(summary.aiPlanRevenue).toBe(100000);
    expect(summary.platformFeeRevenue).toBe(20000);
    expect(summary.netRevenue).toBe(120000);
    expect(summary.pendingCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.cancelledCount).toBe(1);
    expect(summary.refundedCount).toBe(1);
    expect(summary.refundPendingCount).toBe(1);
    expect(summary.transactionCount).toBe(6);
  });
});

function buildPayment(overrides: Record<string, unknown> = {}) {
  const row = {
    id: 'payment-id',
    checkoutReference: 'EDU-001',
    providerPaymentId: 'GW-001',
    userId: { name: 'Student', email: 'student@example.com' },
    planId: { name: 'Plus' },
    purpose: PaymentPurpose.AI_PLAN,
    amount: 100000,
    subtotalAmount: 100000,
    creditAppliedAmount: 0,
    currency: 'VND',
    provider: PaymentProvider.SEPAY,
    status: PaymentStatus.PENDING,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
  return {
    toJSON: () => row,
  };
}

function buildLedgerSummary() {
  return {
    range: 'month',
    currency: 'VND',
    netRevenue: 0,
    grossCashIn: 0,
    aiPlanRevenue: 0,
    platformFeeRevenue: 0,
    refunds: 0,
    mentorEscrowBalance: 0,
    mentorPayableBalance: 0,
    withdrawalsPaid: 0,
    totalRevenue: 0,
    revenueDelta: 0,
    transactionCount: 0,
    transactionDelta: 0,
    systemBalance: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    refundedCount: 0,
  };
}

function createQuery<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
}
