import mongoose, { Types } from 'mongoose';
import {
  FinancialAccountCode,
  FinancialEventType,
  FinancialJournalDirection,
  FinancialJournalEntry,
  FinancialJournalEntrySchema,
  FinancialJournalStatus,
} from '../src/modules/financial-ledger/schemas';
import {
  Payment,
  PaymentPurpose,
  PaymentSchema,
  PaymentSettlementStatus,
} from '../src/modules/payment/schema/payment.schema';
import {
  WalletWithdrawalRequest,
  WalletWithdrawalRequestSchema,
  WalletWithdrawalStatus,
} from '../src/modules/wallet/schemas';

type JournalLine = {
  accountCode: FinancialAccountCode;
  direction: FinancialJournalDirection;
  amount: number;
  userId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  bookingSessionId?: Types.ObjectId;
  walletAccountType?: string;
  metadata?: Record<string, unknown>;
};

type JournalPayload = {
  eventKey: string;
  eventType: FinancialEventType;
  sourceType: string;
  sourceId: string;
  occurredAt: Date;
  currency: string;
  status: FinancialJournalStatus;
  lines: JournalLine[];
  metadata?: Record<string, unknown>;
};

const isDryRun = process.argv.includes('--dry-run');

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }
  return uri;
}

async function migrateFinancialLedger(): Promise<void> {
  await mongoose.connect(getDatabaseUri());
  const paymentModel = mongoose.model(Payment.name, PaymentSchema);
  const withdrawalModel = mongoose.model(WalletWithdrawalRequest.name, WalletWithdrawalRequestSchema);
  const journalModel = mongoose.model(FinancialJournalEntry.name, FinancialJournalEntrySchema);

  const payloads: JournalPayload[] = [];
  const payments = await paymentModel.find({ paidAt: { $exists: true } }).exec();
  for (const payment of payments) {
    payloads.push(buildPaymentPaidPayload(payment));

    if (payment.purpose === PaymentPurpose.MENTOR_BOOKING && payment.settlementStatus === PaymentSettlementStatus.READY) {
      const settlement = buildMentorSettlementPayload(payment);
      if (settlement) payloads.push(settlement);
    }

    const refundedAmount = roundCurrency(Number(payment.refundedAmount || 0));
    if (refundedAmount > 0) {
      payloads.push(buildRefundPayload(payment, refundedAmount));
    }
  }

  const withdrawals = await withdrawalModel.find({ status: WalletWithdrawalStatus.PAID }).exec();
  for (const withdrawal of withdrawals) {
    payloads.push(buildWithdrawalPaidPayload(withdrawal));
  }

  const validPayloads = payloads.filter(Boolean);
  let inserted = 0;
  let skipped = 0;
  for (const payload of validPayloads) {
    assertBalanced(payload);
    const exists = await journalModel.exists({
      $or: [
        { eventKey: payload.eventKey },
        {
          eventType: payload.eventType,
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
        },
      ],
    }).exec();
    if (exists) {
      skipped += 1;
      continue;
    }
    if (!isDryRun) {
      await journalModel.create(payload);
    }
    inserted += 1;
  }

  const totals = validPayloads.reduce(
    (acc, payload) => {
      for (const line of payload.lines) {
        if (line.direction === FinancialJournalDirection.DEBIT) acc.debit += line.amount;
        if (line.direction === FinancialJournalDirection.CREDIT) acc.credit += line.amount;
      }
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  console.log(`${isDryRun ? 'Dry-run' : 'Migration'} financial ledger complete.`);
  console.log(`Prepared: ${validPayloads.length}, inserted: ${inserted}, skipped: ${skipped}.`);
  console.log(`Debit total: ${totals.debit}, credit total: ${totals.credit}.`);
}

function buildPaymentPaidPayload(payment: any): JournalPayload {
  const totalAmount = getPaymentTotalAmount(payment);
  const cashAmount = roundCurrency(Number(payment.amount || 0));
  const creditAmount = roundCurrency(Number(payment.creditAppliedAmount || 0));
  const lines: JournalLine[] = [];
  const common = {
    userId: payment.userId,
    paymentId: payment._id,
    bookingSessionId: payment.bookingSessionId,
  };

  if (cashAmount > 0) {
    lines.push({
      ...common,
      accountCode: FinancialAccountCode.CASH_SEPAY,
      direction: FinancialJournalDirection.DEBIT,
      amount: cashAmount,
    });
  }
  if (creditAmount > 0) {
    lines.push({
      ...common,
      accountCode: FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
      direction: FinancialJournalDirection.DEBIT,
      amount: creditAmount,
    });
  }
  lines.push({
    ...common,
    accountCode:
      payment.purpose === PaymentPurpose.MENTOR_BOOKING
        ? FinancialAccountCode.MENTOR_BOOKING_ESCROW
        : FinancialAccountCode.AI_PLAN_REVENUE,
    direction: FinancialJournalDirection.CREDIT,
    amount: totalAmount,
  });

  return {
    eventKey: `payment:${payment._id.toString()}:paid`,
    eventType: FinancialEventType.PAYMENT_PAID,
    sourceType: 'payment',
    sourceId: payment._id.toString(),
    occurredAt: payment.paidAt || payment.createdAt || new Date(),
    currency: payment.currency || 'VND',
    status: FinancialJournalStatus.POSTED,
    lines,
    metadata: buildPaymentMetadata(payment),
  };
}

function buildMentorSettlementPayload(payment: any): JournalPayload | null {
  const settlementBaseAmount = roundCurrency(Number(payment.settlementBaseAmount || 0));
  const platformFeeAmount = roundCurrency(Number(payment.platformFeeAmount || 0));
  const mentorPayoutAmount = roundCurrency(Number(payment.mentorPayoutAmount || 0));
  if (settlementBaseAmount <= 0 || platformFeeAmount + mentorPayoutAmount !== settlementBaseAmount) return null;

  const common = {
    userId: payment.userId,
    paymentId: payment._id,
    bookingSessionId: payment.bookingSessionId,
  };
  return {
    eventKey: `payment:${payment._id.toString()}:mentor-settlement-ready`,
    eventType: FinancialEventType.MENTOR_SETTLEMENT_READY,
    sourceType: 'payment',
    sourceId: payment._id.toString(),
    occurredAt: payment.settledAt || payment.paidAt || payment.createdAt || new Date(),
    currency: payment.currency || 'VND',
    status: FinancialJournalStatus.POSTED,
    lines: [
      {
        ...common,
        accountCode: FinancialAccountCode.MENTOR_BOOKING_ESCROW,
        direction: FinancialJournalDirection.DEBIT,
        amount: settlementBaseAmount,
      },
      {
        ...common,
        accountCode: FinancialAccountCode.PLATFORM_FEE_REVENUE,
        direction: FinancialJournalDirection.CREDIT,
        amount: platformFeeAmount,
      },
      {
        ...common,
        accountCode: FinancialAccountCode.MENTOR_EARNINGS_LIABILITY,
        direction: FinancialJournalDirection.CREDIT,
        amount: mentorPayoutAmount,
        walletAccountType: 'mentor_earnings',
      },
    ],
    metadata: buildPaymentMetadata(payment),
  };
}

function buildRefundPayload(payment: any, refundAmount: number): JournalPayload {
  const split = splitRefundByPaymentSource(payment, refundAmount);
  const common = {
    userId: payment.userId,
    paymentId: payment._id,
    bookingSessionId: payment.bookingSessionId,
  };
  const lines: JournalLine[] = [
    {
      ...common,
      accountCode:
        payment.purpose === PaymentPurpose.MENTOR_BOOKING && payment.settlementStatus !== PaymentSettlementStatus.READY
          ? FinancialAccountCode.MENTOR_BOOKING_ESCROW
          : FinancialAccountCode.REFUND_CONTRA_REVENUE,
      direction: FinancialJournalDirection.DEBIT,
      amount: refundAmount,
      metadata: { reason: payment.refundReason },
    },
  ];
  if (split.cashRefundAmount > 0) {
    lines.push({
      ...common,
      accountCode: FinancialAccountCode.CASH_REFUND_LIABILITY,
      direction: FinancialJournalDirection.CREDIT,
      amount: split.cashRefundAmount,
      walletAccountType: 'cash_refund',
    });
  }
  if (split.creditRefundAmount > 0) {
    lines.push({
      ...common,
      accountCode: FinancialAccountCode.EDUMEE_CREDIT_LIABILITY,
      direction: FinancialJournalDirection.CREDIT,
      amount: split.creditRefundAmount,
      walletAccountType: 'edumee_credit',
    });
  }

  return {
    eventKey: `payment:${payment._id.toString()}:refund:backfill`,
    eventType: FinancialEventType.PAYMENT_REFUNDED,
    sourceType: 'payment',
    sourceId: payment._id.toString(),
    occurredAt: payment.refundedAt || payment.updatedAt || payment.createdAt || new Date(),
    currency: payment.currency || 'VND',
    status: FinancialJournalStatus.POSTED,
    lines,
    metadata: {
      ...buildPaymentMetadata(payment),
      refundAmount,
      cashRefundAmount: split.cashRefundAmount,
      creditRefundAmount: split.creditRefundAmount,
    },
  };
}

function buildWithdrawalPaidPayload(withdrawal: any): JournalPayload {
  const amount = roundCurrency(Number(withdrawal.amount || 0));
  const liabilityAccount =
    withdrawal.accountType === 'mentor_earnings'
      ? FinancialAccountCode.MENTOR_EARNINGS_LIABILITY
      : FinancialAccountCode.CASH_REFUND_LIABILITY;
  return {
    eventKey: `withdrawal:${withdrawal._id.toString()}:paid`,
    eventType: FinancialEventType.WITHDRAWAL_PAID,
    sourceType: 'wallet_withdrawal',
    sourceId: withdrawal._id.toString(),
    occurredAt: withdrawal.processedAt || withdrawal.updatedAt || withdrawal.createdAt || new Date(),
    currency: withdrawal.currency || 'VND',
    status: FinancialJournalStatus.POSTED,
    lines: [
      {
        accountCode: liabilityAccount,
        direction: FinancialJournalDirection.DEBIT,
        amount,
        userId: withdrawal.userId,
        walletAccountType: withdrawal.accountType,
      },
      {
        accountCode: FinancialAccountCode.CASH_SEPAY,
        direction: FinancialJournalDirection.CREDIT,
        amount,
        userId: withdrawal.userId,
        walletAccountType: withdrawal.accountType,
      },
    ],
    metadata: {
      accountType: withdrawal.accountType,
      transferReference: withdrawal.transferReference,
    },
  };
}

function splitRefundByPaymentSource(payment: any, refundAmount: number) {
  const totalAmount = getPaymentTotalAmount(payment);
  const creditAppliedAmount = roundCurrency(Number(payment.creditAppliedAmount || 0));
  const cashPaidAmount = Math.max(totalAmount - creditAppliedAmount, 0);
  if (totalAmount <= 0) {
    return { cashRefundAmount: refundAmount, creditRefundAmount: 0 };
  }
  const cashRefundAmount = roundCurrency(Math.min(refundAmount, (refundAmount * cashPaidAmount) / totalAmount));
  const creditRefundAmount = roundCurrency(Math.max(refundAmount - cashRefundAmount, 0));
  return { cashRefundAmount, creditRefundAmount };
}

function getPaymentTotalAmount(payment: any): number {
  const explicitTotal = Number(payment.subtotalAmount);
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return roundCurrency(explicitTotal);
  return roundCurrency(Number(payment.amount || 0) + Number(payment.creditAppliedAmount || 0));
}

function buildPaymentMetadata(payment: any): Record<string, unknown> {
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

function assertBalanced(payload: JournalPayload): void {
  const totals = payload.lines.reduce(
    (acc, line) => {
      if (line.direction === FinancialJournalDirection.DEBIT) acc.debit += line.amount;
      if (line.direction === FinancialJournalDirection.CREDIT) acc.credit += line.amount;
      return acc;
    },
    { debit: 0, credit: 0 },
  );
  if (totals.debit !== totals.credit) {
    throw new Error(`Unbalanced journal ${payload.eventKey}: debit=${totals.debit}, credit=${totals.credit}`);
  }
}

function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

migrateFinancialLedger()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
