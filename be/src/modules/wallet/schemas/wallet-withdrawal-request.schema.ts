import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WalletAccountType, WalletCurrency } from './wallet-account.schema';

export type WalletWithdrawalRequestDocument = WalletWithdrawalRequest & Document;

export enum WalletWithdrawalStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  PAID = 'paid',
  REJECTED = 'rejected',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({
  timestamps: true,
  collection: 'wallet_withdrawal_requests',
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
export class WalletWithdrawalRequest {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'WalletAccount' })
  walletAccountId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: WalletAccountType })
  accountType!: WalletAccountType;

  @Prop({ required: true, type: Number, min: 0 })
  amount!: number;

  @Prop({ type: String, enum: WalletCurrency, default: WalletCurrency.VND })
  currency!: WalletCurrency;

  @Prop({ required: true, type: String, enum: WalletWithdrawalStatus, default: WalletWithdrawalStatus.REQUESTED })
  status!: WalletWithdrawalStatus;

  @Prop({ type: Object })
  bankAccountSnapshot?: Record<string, unknown>;

  @Prop({ type: String })
  transferReference?: string;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({ type: Date, default: Date.now })
  requestedAt!: Date;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'WalletLedgerEntry' })
  holdLedgerEntryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WalletLedgerEntry' })
  finalLedgerEntryId?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WalletWithdrawalRequestSchema = SchemaFactory.createForClass(WalletWithdrawalRequest);

WalletWithdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
WalletWithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
WalletWithdrawalRequestSchema.index({ accountType: 1, status: 1 });
