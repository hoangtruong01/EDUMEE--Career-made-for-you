import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  FinancialAccountCode,
  FinancialEventType,
  FinancialJournalDirection,
  FinancialJournalEntry,
  FinancialJournalEntryDocument,
  FinancialJournalLine,
  FinancialJournalStatus,
} from '../schemas';

export type FinancialJournalLineInput = {
  accountCode: FinancialAccountCode;
  direction: FinancialJournalDirection;
  amount: number;
  userId?: string | Types.ObjectId;
  paymentId?: string | Types.ObjectId;
  bookingSessionId?: string | Types.ObjectId;
  walletAccountType?: string;
  metadata?: Record<string, unknown>;
};

export type PostJournalEntryInput = {
  eventKey: string;
  eventType: FinancialEventType;
  sourceType: string;
  sourceId: string;
  occurredAt?: Date;
  currency?: string;
  lines: FinancialJournalLineInput[];
  metadata?: Record<string, unknown>;
};

export type LedgerPaymentSnapshot = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: string;
  amount: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  currency?: string;
  paidAt?: Date;
  refundedAt?: Date;
  bookingSessionId?: Types.ObjectId;
  settlementBaseAmount?: number;
  platformFeeAmount?: number;
  mentorPayoutAmount?: number;
  settlementStatus?: string;
  checkoutReference?: string;
};

export type RefundPostingInput = {
  payment: LedgerPaymentSnapshot;
  eventId: string;
  refundAmount: number;
  cashRefundAmount: number;
  creditRefundAmount: number;
  settlementStatusBefore?: string;
  occurredAt?: Date;
  reason?: string;
};

export type WithdrawalPostingInput = {
  withdrawalId: string;
  userId: string | Types.ObjectId;
  accountType: string;
  amount: number;
  currency?: string;
  processedAt?: Date;
  transferReference?: string;
};

export type FinanceSummary = {
  range: 'month' | 'quarter' | 'year';
  currency: string;
  netRevenue: number;
  grossCashIn: number;
  aiPlanRevenue: number;
  platformFeeRevenue: number;
  refunds: number;
  mentorEscrowBalance: number;
  mentorPayableBalance: number;
  withdrawalsPaid: number;
  transactionCount: number;
  transactionDelta: number;
  revenueDelta: number;
  totalRevenue: number;
  systemBalance: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  refundedCount: number;
};

export type FinanceTransactionListParams = {
  page?: number;
  limit?: number;
  eventType?: string;
  sourceType?: string;
  purpose?: string;
  search?: string;
  from?: Date;
  to?: Date;
};

const REVENUE_ACCOUNTS = [
  FinancialAccountCode.AI_PLAN_REVENUE,
  FinancialAccountCode.PLATFORM_FEE_REVENUE,
] as const;

const LIABILITY_ACCOUNTS = [
  FinancialAccountCode.MENTOR_BOOKING_ESCROW,
  FinancialAccountCode.MENTOR_EARNINGS_LIABILITY,
  FinancialAccountCode.CASH_REFUND_LIABILITY,
  FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
] as const;

@Injectable()
export class FinancialLedgerService {
  constructor(
    @InjectModel(FinancialJournalEntry.name)
    private readonly financialJournalEntryModel: Model<FinancialJournalEntryDocument>,
  ) {}

  async postJournalEntry(input: PostJournalEntryInput): Promise<FinancialJournalEntryDocument> {
    const eventKey = input.eventKey?.trim();
    if (!eventKey) throw new BadRequestException('eventKey is required');

    const existing = await this.financialJournalEntryModel.findOne({ eventKey }).exec();
    if (existing) return existing;

    const lines = this.normalizeLines(input.lines);
    this.assertBalanced(lines);

    return this.financialJournalEntryModel.create({
      eventKey,
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      occurredAt: input.occurredAt || new Date(),
      currency: input.currency || 'VND',
      status: FinancialJournalStatus.POSTED,
      lines,
      metadata: input.metadata,
    });
  }

  async postPaymentPaid(payment: LedgerPaymentSnapshot): Promise<FinancialJournalEntryDocument | null> {
    const totalAmount = this.getPaymentTotalAmount(payment);
    if (totalAmount <= 0) return null;

    const cashAmount = this.roundCurrency(Number(payment.amount || 0));
    const creditAmount = this.roundCurrency(Number(payment.creditAppliedAmount || 0));
    const commonLine = this.buildPaymentLineContext(payment);
    const lines: FinancialJournalLineInput[] = [];

    if (cashAmount > 0) {
      lines.push({
        ...commonLine,
        accountCode: FinancialAccountCode.CASH_SEPAY,
        direction: FinancialJournalDirection.DEBIT,
        amount: cashAmount,
      });
    }
    if (creditAmount > 0) {
      lines.push({
        ...commonLine,
        accountCode: FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
        direction: FinancialJournalDirection.DEBIT,
        amount: creditAmount,
      });
    }

    lines.push({
      ...commonLine,
      accountCode:
        payment.purpose === 'mentor_booking'
          ? FinancialAccountCode.MENTOR_BOOKING_ESCROW
          : FinancialAccountCode.AI_PLAN_REVENUE,
      direction: FinancialJournalDirection.CREDIT,
      amount: totalAmount,
    });

    return this.postJournalEntry({
      eventKey: `payment:${payment._id.toString()}:paid`,
      eventType: FinancialEventType.PAYMENT_PAID,
      sourceType: 'payment',
      sourceId: payment._id.toString(),
      occurredAt: payment.paidAt || new Date(),
      currency: payment.currency || 'VND',
      lines,
      metadata: this.buildPaymentMetadata(payment),
    });
  }

  async postPaymentRefunded(input: RefundPostingInput): Promise<FinancialJournalEntryDocument | null> {
    const refundAmount = this.roundCurrency(input.refundAmount);
    if (refundAmount <= 0) return null;

    const payment = input.payment;
    const commonLine = this.buildPaymentLineContext(payment);
    const lines: FinancialJournalLineInput[] = [];
    const sourceAccount = this.getRefundSourceDebitAccount(payment, input.settlementStatusBefore, refundAmount);

    lines.push({
      ...commonLine,
      accountCode: sourceAccount,
      direction: FinancialJournalDirection.DEBIT,
      amount: refundAmount,
      metadata: { reason: input.reason },
    });

    const cashRefundAmount = this.roundCurrency(input.cashRefundAmount);
    if (cashRefundAmount > 0) {
      lines.push({
        ...commonLine,
        accountCode: FinancialAccountCode.CASH_REFUND_LIABILITY,
        direction: FinancialJournalDirection.CREDIT,
        amount: cashRefundAmount,
        walletAccountType: 'cash_refund',
      });
    }

    const creditRefundAmount = this.roundCurrency(input.creditRefundAmount);
    if (creditRefundAmount > 0) {
      lines.push({
        ...commonLine,
        accountCode: FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
        direction: FinancialJournalDirection.CREDIT,
        amount: creditRefundAmount,
        walletAccountType: 'edumee_credit',
      });
    }

    return this.postJournalEntry({
      eventKey: `payment:${payment._id.toString()}:refund:${input.eventId}`,
      eventType: FinancialEventType.PAYMENT_REFUNDED,
      sourceType: 'payment',
      sourceId: payment._id.toString(),
      occurredAt: input.occurredAt || payment.refundedAt || new Date(),
      currency: payment.currency || 'VND',
      lines,
      metadata: {
        ...this.buildPaymentMetadata(payment),
        refundAmount,
        cashRefundAmount,
        creditRefundAmount,
        reason: input.reason,
      },
    });
  }

  async postMentorSettlementReady(payment: LedgerPaymentSnapshot): Promise<FinancialJournalEntryDocument | null> {
    if (payment.purpose !== 'mentor_booking') return null;
    const settlementBaseAmount = this.roundCurrency(Number(payment.settlementBaseAmount || 0));
    const platformFeeAmount = this.roundCurrency(Number(payment.platformFeeAmount || 0));
    const mentorPayoutAmount = this.roundCurrency(Number(payment.mentorPayoutAmount || 0));
    if (settlementBaseAmount <= 0 || platformFeeAmount + mentorPayoutAmount !== settlementBaseAmount) {
      return null;
    }

    const commonLine = this.buildPaymentLineContext(payment);
    return this.postJournalEntry({
      eventKey: `payment:${payment._id.toString()}:mentor-settlement-ready`,
      eventType: FinancialEventType.MENTOR_SETTLEMENT_READY,
      sourceType: 'payment',
      sourceId: payment._id.toString(),
      occurredAt: new Date(),
      currency: payment.currency || 'VND',
      lines: [
        {
          ...commonLine,
          accountCode: FinancialAccountCode.MENTOR_BOOKING_ESCROW,
          direction: FinancialJournalDirection.DEBIT,
          amount: settlementBaseAmount,
        },
        {
          ...commonLine,
          accountCode: FinancialAccountCode.PLATFORM_FEE_REVENUE,
          direction: FinancialJournalDirection.CREDIT,
          amount: platformFeeAmount,
        },
        {
          ...commonLine,
          accountCode: FinancialAccountCode.MENTOR_EARNINGS_LIABILITY,
          direction: FinancialJournalDirection.CREDIT,
          amount: mentorPayoutAmount,
          walletAccountType: 'mentor_earnings',
        },
      ],
      metadata: this.buildPaymentMetadata(payment),
    });
  }

  async postWithdrawalPaid(input: WithdrawalPostingInput): Promise<FinancialJournalEntryDocument | null> {
    const amount = this.roundCurrency(input.amount);
    if (amount <= 0) return null;

    const liabilityAccount =
      input.accountType === 'mentor_earnings'
        ? FinancialAccountCode.MENTOR_EARNINGS_LIABILITY
        : FinancialAccountCode.CASH_REFUND_LIABILITY;

    return this.postJournalEntry({
      eventKey: `withdrawal:${input.withdrawalId}:paid`,
      eventType: FinancialEventType.WITHDRAWAL_PAID,
      sourceType: 'wallet_withdrawal',
      sourceId: input.withdrawalId,
      occurredAt: input.processedAt || new Date(),
      currency: input.currency || 'VND',
      lines: [
        {
          accountCode: liabilityAccount,
          direction: FinancialJournalDirection.DEBIT,
          amount,
          userId: input.userId,
          walletAccountType: input.accountType,
        },
        {
          accountCode: FinancialAccountCode.CASH_SEPAY,
          direction: FinancialJournalDirection.CREDIT,
          amount,
          userId: input.userId,
          walletAccountType: input.accountType,
        },
      ],
      metadata: {
        accountType: input.accountType,
        transferReference: input.transferReference,
      },
    });
  }

  async getFinanceSummary(range: 'month' | 'quarter' | 'year', current: { from: Date; to: Date }, previous: { from: Date; to: Date }): Promise<FinanceSummary> {
    const [currentTotals, previousTotals, lifetimeTotals, currentCount, previousCount] = await Promise.all([
      this.getTotalsForRange(current),
      this.getTotalsForRange(previous),
      this.getLifetimeBalances(),
      this.financialJournalEntryModel.countDocuments({
        status: FinancialJournalStatus.POSTED,
        occurredAt: { $gte: current.from, $lt: current.to },
      }).exec(),
      this.financialJournalEntryModel.countDocuments({
        status: FinancialJournalStatus.POSTED,
        occurredAt: { $gte: previous.from, $lt: previous.to },
      }).exec(),
    ]);

    const netRevenue = currentTotals.aiPlanRevenue + currentTotals.platformFeeRevenue - currentTotals.refundContraRevenue;
    const previousRevenue = previousTotals.aiPlanRevenue + previousTotals.platformFeeRevenue - previousTotals.refundContraRevenue;

    return {
      range,
      currency: 'VND',
      netRevenue: this.roundCurrency(netRevenue),
      grossCashIn: this.roundCurrency(currentTotals.grossCashIn),
      aiPlanRevenue: this.roundCurrency(currentTotals.aiPlanRevenue),
      platformFeeRevenue: this.roundCurrency(currentTotals.platformFeeRevenue),
      refunds: this.roundCurrency(currentTotals.refunds),
      mentorEscrowBalance: this.roundCurrency(lifetimeTotals.mentorEscrowBalance),
      mentorPayableBalance: this.roundCurrency(lifetimeTotals.mentorPayableBalance),
      withdrawalsPaid: this.roundCurrency(currentTotals.withdrawalsPaid),
      transactionCount: currentCount,
      transactionDelta: this.calculateDelta(currentCount, previousCount),
      revenueDelta: this.calculateDelta(netRevenue, previousRevenue),
      totalRevenue: this.roundCurrency(netRevenue),
      systemBalance: this.roundCurrency(lifetimeTotals.cashBalance),
      paidCount: 0,
      pendingCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      refundedCount: 0,
    };
  }

  async listFinanceTransactions(params: FinanceTransactionListParams = {}) {
    const page = this.toPositiveInteger(params.page, 1);
    const limit = Math.min(this.toPositiveInteger(params.limit, 10), 100);
    const filter: FilterQuery<FinancialJournalEntryDocument> = {
      status: FinancialJournalStatus.POSTED,
    };

    if (params.eventType && params.eventType !== 'all') {
      filter.eventType = params.eventType;
    }
    if (params.sourceType && params.sourceType !== 'all') {
      filter.sourceType = params.sourceType;
    }
    if (params.purpose && params.purpose !== 'all') {
      filter['metadata.purpose'] = params.purpose;
    }
    if (params.from || params.to) {
      filter.occurredAt = {};
      if (params.from) (filter.occurredAt as Record<string, Date>).$gte = params.from;
      if (params.to) (filter.occurredAt as Record<string, Date>).$lt = params.to;
    }
    if (params.search?.trim()) {
      const regex = new RegExp(this.escapeRegex(params.search.trim()), 'i');
      filter.$or = [
        { eventKey: regex },
        { sourceId: regex },
        { sourceType: regex },
        { eventType: regex },
        { 'metadata.checkoutReference': regex },
      ];
    }

    const [entries, total] = await Promise.all([
      this.financialJournalEntryModel
        .find(filter)
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.financialJournalEntryModel.countDocuments(filter).exec(),
    ]);

    return {
      transactions: entries.map((entry) => this.serializeJournalEntry(entry)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private normalizeLines(lines: FinancialJournalLineInput[]): FinancialJournalLineInput[] {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw new BadRequestException('A journal entry must include at least two lines');
    }

    return lines.map((line) => {
      const amount = this.roundCurrency(Number(line.amount || 0));
      if (!Number.isInteger(amount) || amount < 0) {
        throw new BadRequestException('Journal line amount must be a non-negative VND integer');
      }
      if (amount === 0) {
        throw new BadRequestException('Journal line amount must be greater than zero');
      }
      return {
        ...line,
        amount,
        userId: this.toObjectId(line.userId),
        paymentId: this.toObjectId(line.paymentId),
        bookingSessionId: this.toObjectId(line.bookingSessionId),
      };
    });
  }

  private assertBalanced(lines: FinancialJournalLineInput[]): void {
    const totals = lines.reduce(
      (acc, line) => {
        if (line.direction === FinancialJournalDirection.DEBIT) acc.debit += line.amount;
        if (line.direction === FinancialJournalDirection.CREDIT) acc.credit += line.amount;
        return acc;
      },
      { debit: 0, credit: 0 },
    );
    if (this.roundCurrency(totals.debit) !== this.roundCurrency(totals.credit)) {
      throw new BadRequestException('Financial journal entry is not balanced');
    }
  }

  private async getTotalsForRange(range: { from: Date; to: Date }) {
    const entries = await this.financialJournalEntryModel
      .find({
        status: FinancialJournalStatus.POSTED,
        occurredAt: { $gte: range.from, $lt: range.to },
      })
      .exec();
    return this.calculateTotals(entries);
  }

  private async getLifetimeBalances() {
    const entries = await this.financialJournalEntryModel
      .find({ status: FinancialJournalStatus.POSTED })
      .exec();
    const balances = this.calculateAccountBalances(entries);
    return {
      cashBalance: balances.get(FinancialAccountCode.CASH_SEPAY) || 0,
      mentorEscrowBalance: balances.get(FinancialAccountCode.MENTOR_BOOKING_ESCROW) || 0,
      mentorPayableBalance: balances.get(FinancialAccountCode.MENTOR_EARNINGS_LIABILITY) || 0,
    };
  }

  private calculateTotals(entries: FinancialJournalEntryDocument[]) {
    const totals = {
      grossCashIn: 0,
      aiPlanRevenue: 0,
      platformFeeRevenue: 0,
      refunds: 0,
      refundContraRevenue: 0,
      withdrawalsPaid: 0,
    };

    for (const entry of entries) {
      for (const line of entry.lines || []) {
        const amount = Number(line.amount || 0);
        if (line.accountCode === FinancialAccountCode.CASH_SEPAY && line.direction === FinancialJournalDirection.DEBIT) {
          totals.grossCashIn += amount;
        }
        if (line.accountCode === FinancialAccountCode.AI_PLAN_REVENUE && line.direction === FinancialJournalDirection.CREDIT) {
          totals.aiPlanRevenue += amount;
        }
        if (line.accountCode === FinancialAccountCode.PLATFORM_FEE_REVENUE && line.direction === FinancialJournalDirection.CREDIT) {
          totals.platformFeeRevenue += amount;
        }
        if (line.accountCode === FinancialAccountCode.REFUND_CONTRA_REVENUE && line.direction === FinancialJournalDirection.DEBIT) {
          totals.refundContraRevenue += amount;
        }
        if (
          entry.eventType === FinancialEventType.PAYMENT_REFUNDED &&
          line.direction === FinancialJournalDirection.CREDIT &&
          [
            FinancialAccountCode.CASH_REFUND_LIABILITY,
            FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
          ].includes(line.accountCode as FinancialAccountCode)
        ) {
          totals.refunds += amount;
        }
        if (
          entry.eventType === FinancialEventType.WITHDRAWAL_PAID &&
          line.accountCode === FinancialAccountCode.CASH_SEPAY &&
          line.direction === FinancialJournalDirection.CREDIT
        ) {
          totals.withdrawalsPaid += amount;
        }
      }
    }

    return totals;
  }

  private calculateAccountBalances(entries: FinancialJournalEntryDocument[]): Map<FinancialAccountCode, number> {
    const balances = new Map<FinancialAccountCode, number>();
    for (const entry of entries) {
      for (const line of entry.lines || []) {
        const accountCode = line.accountCode as FinancialAccountCode;
        const amount = Number(line.amount || 0);
        const normalBalance = this.getNormalBalance(accountCode);
        const signedAmount = line.direction === normalBalance ? amount : -amount;
        balances.set(accountCode, (balances.get(accountCode) || 0) + signedAmount);
      }
    }
    return balances;
  }

  private getNormalBalance(accountCode: FinancialAccountCode): FinancialJournalDirection {
    if (accountCode === FinancialAccountCode.CASH_SEPAY || accountCode === FinancialAccountCode.REFUND_CONTRA_REVENUE) {
      return FinancialJournalDirection.DEBIT;
    }
    return FinancialJournalDirection.CREDIT;
  }

  private getRefundSourceDebitAccount(
    payment: LedgerPaymentSnapshot,
    settlementStatusBefore: string | undefined,
    refundAmount: number,
  ): FinancialAccountCode {
    if (payment.purpose !== 'mentor_booking') return FinancialAccountCode.REFUND_CONTRA_REVENUE;
    if (settlementStatusBefore === 'ready') return FinancialAccountCode.REFUND_CONTRA_REVENUE;
    const settlementBaseAmount = Number(payment.settlementBaseAmount || 0);
    if (settlementBaseAmount > 0 && refundAmount > settlementBaseAmount) {
      return FinancialAccountCode.REFUND_CONTRA_REVENUE;
    }
    return FinancialAccountCode.MENTOR_BOOKING_ESCROW;
  }

  private buildPaymentLineContext(payment: LedgerPaymentSnapshot): Partial<FinancialJournalLine> {
    return {
      userId: payment.userId,
      paymentId: payment._id,
      bookingSessionId: payment.bookingSessionId,
    };
  }

  private buildPaymentMetadata(payment: LedgerPaymentSnapshot): Record<string, unknown> {
    return {
      checkoutReference: payment.checkoutReference,
      purpose: payment.purpose,
      amount: payment.amount,
      subtotalAmount: payment.subtotalAmount,
      creditAppliedAmount: payment.creditAppliedAmount,
      paidAt: payment.paidAt,
      paymentStatus: 'paid',
      settlementBaseAmount: payment.settlementBaseAmount,
      platformFeeAmount: payment.platformFeeAmount,
      mentorPayoutAmount: payment.mentorPayoutAmount,
      settlementStatus: payment.settlementStatus,
    };
  }

  private getPaymentTotalAmount(payment: LedgerPaymentSnapshot): number {
    const explicitTotal = Number(payment.subtotalAmount);
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) return this.roundCurrency(explicitTotal);
    return this.roundCurrency(Number(payment.amount || 0) + Number(payment.creditAppliedAmount || 0));
  }

  private serializeJournalEntry(entry: FinancialJournalEntryDocument) {
    const debitTotal = (entry.lines || [])
      .filter((line) => line.direction === FinancialJournalDirection.DEBIT)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const creditTotal = (entry.lines || [])
      .filter((line) => line.direction === FinancialJournalDirection.CREDIT)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);

    return {
      id: entry._id.toString(),
      eventKey: entry.eventKey,
      eventType: entry.eventType,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      occurredAt: entry.occurredAt,
      currency: entry.currency,
      status: entry.status,
      debitTotal,
      creditTotal,
      lines: entry.lines,
      metadata: entry.metadata,
    };
  }

  private calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private toPositiveInteger(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 1) return fallback;
    return Math.floor(numeric);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private toObjectId(value?: string | Types.ObjectId): Types.ObjectId | undefined {
    if (!value) return undefined;
    if (value instanceof Types.ObjectId) return value;
    if (!Types.ObjectId.isValid(value)) return undefined;
    return new Types.ObjectId(value);
  }

  private roundCurrency(amount: number): number {
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount);
  }
}
