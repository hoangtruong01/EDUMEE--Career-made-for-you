import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({
  collection: 'analytics_events',
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AnalyticsEvent {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  eventType!: string;

  @Prop({ type: String, required: true, trim: true })
  path!: string;

  @Prop({ type: String, required: true, trim: true })
  anonymousId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: String, trim: true })
  userAgent?: string;

  @Prop({ type: String, trim: true })
  ipHash?: string;

  createdAt!: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ path: 1, createdAt: -1 });
AnalyticsEventSchema.index({ anonymousId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ userId: 1, createdAt: -1 });
