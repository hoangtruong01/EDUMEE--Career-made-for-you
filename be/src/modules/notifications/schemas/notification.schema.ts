import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  MENTOR_BOOKING_PENDING = 'mentor_booking_pending',
  MENTOR_BOOKING_CONFIRMED = 'mentor_booking_confirmed',
  MENTOR_BOOKING_CANCELLED = 'mentor_booking_cancelled',
  MENTOR_BOOKING_RESCHEDULED = 'mentor_booking_rescheduled',
  MENTOR_AVAILABILITY_BULK_CREATED = 'mentor_availability_bulk_created',
}

@Schema({
  timestamps: true,
  collection: 'notifications',
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
export class Notification {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  recipientId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: NotificationType })
  type!: NotificationType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ type: Date })
  readAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, readAt: 1 });
