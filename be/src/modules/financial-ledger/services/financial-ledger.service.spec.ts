import { BadRequestException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  FinancialAccountCode,
  FinancialEventType,
  FinancialJournalDirection,
} from '../schemas';
import { FinancialLedgerService } from './financial-ledger.service';

describe('FinancialLedgerService', () => {
  let service: FinancialLedgerService;
  let journalModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    journalModel = {
      findOne: jest.fn().mockReturnValue(createQuery(null)),
      create: jest.fn((payload) => Promise.resolve({ _id: new Types.ObjectId(), ...payload })),
      find: jest.fn().mockReturnValue(createQuery([])),
      countDocuments: jest.fn().mockReturnValue(createQuery(0)),
    };
    service = new FinancialLedgerService(journalModel);
  });

  it('rejects unbalanced journal entries', async () => {
    await expect(
      service.postJournalEntry({
        eventKey: 'event:unbalanced',
        eventType: FinancialEventType.PAYMENT_PAID,
        sourceType: 'payment',
        sourceId: 'payment-1',
        lines: [
          {
            accountCode: FinancialAccountCode.CASH_SEPAY,
            direction: FinancialJournalDirection.DEBIT,
            amount: 100000,
          },
          {
            accountCode: FinancialAccountCode.AI_PLAN_REVENUE,
            direction: FinancialJournalDirection.CREDIT,
            amount: 90000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns existing journal entry by eventKey idempotently', async () => {
    const existing = { eventKey: 'payment:paid:1' };
    journalModel.findOne.mockReturnValue(createQuery(existing));

    const result = await service.postJournalEntry({
      eventKey: 'payment:paid:1',
      eventType: FinancialEventType.PAYMENT_PAID,
      sourceType: 'payment',
      sourceId: 'payment-1',
      lines: [
        {
          accountCode: FinancialAccountCode.CASH_SEPAY,
          direction: FinancialJournalDirection.DEBIT,
          amount: 100000,
        },
        {
          accountCode: FinancialAccountCode.AI_PLAN_REVENUE,
          direction: FinancialJournalDirection.CREDIT,
          amount: 100000,
        },
      ],
    });

    expect(result).toBe(existing);
    expect(journalModel.create).not.toHaveBeenCalled();
  });

  it('posts AI plan paid as cash and credit liability into revenue', async () => {
    const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
    await service.postPaymentPaid({
      _id: paymentId,
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      purpose: 'ai_plan',
      amount: 70000,
      subtotalAmount: 100000,
      creditAppliedAmount: 30000,
      currency: 'VND',
      paidAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    expect(journalModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: `payment:${paymentId.toString()}:paid`,
        eventType: FinancialEventType.PAYMENT_PAID,
        lines: expect.arrayContaining([
          expect.objectContaining({
            accountCode: FinancialAccountCode.CASH_SEPAY,
            direction: FinancialJournalDirection.DEBIT,
            amount: 70000,
          }),
          expect.objectContaining({
            accountCode: FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
            direction: FinancialJournalDirection.DEBIT,
            amount: 30000,
          }),
          expect.objectContaining({
            accountCode: FinancialAccountCode.AI_PLAN_REVENUE,
            direction: FinancialJournalDirection.CREDIT,
            amount: 100000,
          }),
        ]),
      }),
    );
  });

  it('aggregates net revenue and liability balances from posted journals', async () => {
    const currentEntries = [
      buildEntry([
        line(FinancialAccountCode.CASH_SEPAY, FinancialJournalDirection.DEBIT, 100000),
        line(FinancialAccountCode.AI_PLAN_REVENUE, FinancialJournalDirection.CREDIT, 100000),
      ]),
      buildEntry([
        line(FinancialAccountCode.MENTOR_BOOKING_ESCROW, FinancialJournalDirection.DEBIT, 200000),
        line(FinancialAccountCode.PLATFORM_FEE_REVENUE, FinancialJournalDirection.CREDIT, 30000),
        line(FinancialAccountCode.MENTOR_EARNINGS_LIABILITY, FinancialJournalDirection.CREDIT, 170000),
      ]),
      buildEntry(
        [
          line(FinancialAccountCode.REFUND_CONTRA_REVENUE, FinancialJournalDirection.DEBIT, 20000),
          line(FinancialAccountCode.CASH_REFUND_LIABILITY, FinancialJournalDirection.CREDIT, 20000),
        ],
        FinancialEventType.PAYMENT_REFUNDED,
      ),
    ];
    const lifetimeEntries = [
      ...currentEntries,
      buildEntry([
        line(FinancialAccountCode.CASH_SEPAY, FinancialJournalDirection.DEBIT, 200000),
        line(FinancialAccountCode.MENTOR_BOOKING_ESCROW, FinancialJournalDirection.CREDIT, 200000),
      ]),
    ];
    journalModel.find
      .mockReturnValueOnce(createQuery(currentEntries))
      .mockReturnValueOnce(createQuery([]))
      .mockReturnValueOnce(createQuery(lifetimeEntries));
    journalModel.countDocuments
      .mockReturnValueOnce(createQuery(3))
      .mockReturnValueOnce(createQuery(0));

    const summary = await service.getFinanceSummary(
      'month',
      { from: new Date('2026-05-01'), to: new Date('2026-06-01') },
      { from: new Date('2026-04-01'), to: new Date('2026-05-01') },
    );

    expect(summary.aiPlanRevenue).toBe(100000);
    expect(summary.platformFeeRevenue).toBe(30000);
    expect(summary.refunds).toBe(20000);
    expect(summary.netRevenue).toBe(110000);
    expect(summary.mentorPayableBalance).toBe(170000);
  });

  it('filters finance transactions by AI plan purpose', async () => {
    await service.listFinanceTransactions({
      eventType: FinancialEventType.PAYMENT_PAID,
      purpose: 'ai_plan',
    });

    expect(journalModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: FinancialEventType.PAYMENT_PAID,
        'metadata.purpose': 'ai_plan',
      }),
    );
  });
});

function line(accountCode: FinancialAccountCode, direction: FinancialJournalDirection, amount: number) {
  return { accountCode, direction, amount };
}

function buildEntry(lines: ReturnType<typeof line>[], eventType = FinancialEventType.PAYMENT_PAID) {
  return {
    _id: new Types.ObjectId(),
    eventKey: 'event',
    eventType,
    sourceType: 'payment',
    sourceId: 'payment-1',
    occurredAt: new Date(),
    currency: 'VND',
    status: 'posted',
    lines,
  };
}

function createQuery<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
}
