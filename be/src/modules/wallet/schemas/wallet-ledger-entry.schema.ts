import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WalletCurrency } from './wallet-account.schema';

export type WalletLedgerEntryDocument = WalletLedgerEntry & Document;

export enum WalletLedgerEntryType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  HOLD = 'hold',
  CAPTURE = 'capture',
  RELEASE = 'release',
  REFUND = 'refund',
}

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'wallet_ledger_entries',
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
export class WalletLedgerEntry {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'WalletAccount' })
  walletAccountId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: WalletLedgerEntryType })
  type!: WalletLedgerEntryType;

  @Prop({ required: true, type: Number, min: 0 })
  amount!: number;

  @Prop({ type: String, enum: WalletCurrency, default: WalletCurrency.VND })
  currency!: WalletCurrency;

  @Prop({ type: String })
  sourceType?: string;

  @Prop({ type: String })
  sourceId?: string;

  @Prop({ type: Types.ObjectId, ref: 'WalletLedgerEntry' })
  relatedLedgerEntryId?: Types.ObjectId;

  @Prop({ type: String })
  idempotencyKey?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt!: Date;
}

export const WalletLedgerEntrySchema = SchemaFactory.createForClass(WalletLedgerEntry);

WalletLedgerEntrySchema.index({ userId: 1, createdAt: -1 });
WalletLedgerEntrySchema.index({ walletAccountId: 1, createdAt: -1 });
WalletLedgerEntrySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
WalletLedgerEntrySchema.index({ sourceType: 1, sourceId: 1 });
