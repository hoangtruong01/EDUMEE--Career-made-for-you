import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletAccountDocument = WalletAccount & Document;

export enum WalletCurrency {
  VND = 'VND',
}

@Schema({
  timestamps: true,
  collection: 'wallet_accounts',
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
export class WalletAccount {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: WalletCurrency, default: WalletCurrency.VND })
  currency!: WalletCurrency;

  @Prop({ type: Number, default: 0, min: 0 })
  availableBalance!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  heldBalance!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WalletAccountSchema = SchemaFactory.createForClass(WalletAccount);

WalletAccountSchema.index({ userId: 1, currency: 1 }, { unique: true });
