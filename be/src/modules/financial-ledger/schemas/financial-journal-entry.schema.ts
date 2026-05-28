import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FinancialJournalEntryDocument = FinancialJournalEntry & Document;

export enum FinancialAccountCode {
  CASH_SEPAY = 'cash_sepay',
  EDUMEE_CREDIT_LIABILITY = 'edumee_credit_liability',
  MENTOR_BOOKING_ESCROW = 'mentor_booking_escrow',
  CASH_REFUND_LIABILITY = 'cash_refund_liability',
  MENTOR_EARNINGS_LIABILITY = 'mentor_earnings_liability',
  AI_PLAN_REVENUE = 'ai_plan_revenue',
  PLATFORM_FEE_REVENUE = 'platform_fee_revenue',
  REFUND_CONTRA_REVENUE = 'refund_contra_revenue',
}

export enum FinancialJournalDirection {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum FinancialJournalStatus {
  POSTED = 'posted',
  VOIDED = 'voided',
}

export enum FinancialEventType {
  PAYMENT_PAID = 'payment_paid',
  PAYMENT_REFUNDED = 'payment_refunded',
  MENTOR_SETTLEMENT_READY = 'mentor_settlement_ready',
  WITHDRAWAL_PAID = 'withdrawal_paid',
}

@Schema({ _id: false })
export class FinancialJournalLine {
  @Prop({ required: true, type: String, enum: FinancialAccountCode })
  accountCode!: FinancialAccountCode;

  @Prop({ required: true, type: String, enum: FinancialJournalDirection })
  direction!: FinancialJournalDirection;

  @Prop({ required: true, type: Number, min: 0 })
  amount!: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BookingSession' })
  bookingSessionId?: Types.ObjectId;

  @Prop({ type: String })
  walletAccountType?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const FinancialJournalLineSchema = SchemaFactory.createForClass(FinancialJournalLine);

@Schema({
  timestamps: true,
  collection: 'financial_journal_entries',
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>): Record<string, unknown> => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class FinancialJournalEntry {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: String })
  eventKey!: string;

  @Prop({ required: true, type: String, enum: FinancialEventType })
  eventType!: FinancialEventType;

  @Prop({ required: true, type: String })
  sourceType!: string;

  @Prop({ required: true, type: String })
  sourceId!: string;

  @Prop({ required: true, type: Date })
  occurredAt!: Date;

  @Prop({ required: true, type: String, default: 'VND' })
  currency!: string;

  @Prop({ required: true, type: String, enum: FinancialJournalStatus, default: FinancialJournalStatus.POSTED })
  status!: FinancialJournalStatus;

  @Prop({ required: true, type: [FinancialJournalLineSchema], default: [] })
  lines!: FinancialJournalLine[];

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const FinancialJournalEntrySchema = SchemaFactory.createForClass(FinancialJournalEntry);

FinancialJournalEntrySchema.index({ eventKey: 1 }, { unique: true });
FinancialJournalEntrySchema.index({ eventType: 1, occurredAt: -1 });
FinancialJournalEntrySchema.index({ sourceType: 1, sourceId: 1 });
FinancialJournalEntrySchema.index({ occurredAt: -1 });
FinancialJournalEntrySchema.index({ 'lines.accountCode': 1, occurredAt: -1 });
