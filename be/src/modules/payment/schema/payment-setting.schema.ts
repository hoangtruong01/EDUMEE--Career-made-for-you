import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentSettingDocument = PaymentSetting & Document;

export const MENTOR_FEE_SETTING_KEY = 'mentor_fee';
export const DEFAULT_MENTOR_PLATFORM_FEE_RATE = 0.15;

@Schema({
  timestamps: true,
  collection: 'payment_settings',
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class PaymentSetting {
  @Prop({ required: true, unique: true, type: String })
  key!: string;

  @Prop({ type: Number, default: DEFAULT_MENTOR_PLATFORM_FEE_RATE })
  mentorPlatformFeeRate!: number;
}

export const PaymentSettingSchema = SchemaFactory.createForClass(PaymentSetting);
