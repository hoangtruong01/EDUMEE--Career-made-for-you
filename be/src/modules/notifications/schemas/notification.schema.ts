import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  MENTOR_BOOKING_PENDING = 'mentor_booking_pending',
  MENTOR_BOOKING_CONFIRMED = 'mentor_booking_confirmed',
  MENTOR_BOOKING_CANCELLED = 'mentor_booking_cancelled',
  MENTOR_BOOKING_RESCHEDULED = 'mentor_booking_rescheduled',
  MENTOR_BOOKING_RESCHEDULE_REQUESTED = 'mentor_booking_reschedule_requested',
  MENTOR_BOOKING_RESCHEDULE_ACCEPTED = 'mentor_booking_reschedule_accepted',
  MENTOR_BOOKING_RESCHEDULE_DECLINED = 'mentor_booking_reschedule_declined',
  MENTOR_BOOKING_MESSAGE = 'mentor_booking_message',
  MENTOR_BOOKING_REFUNDED = 'mentor_booking_refunded',
  MENTOR_BOOKING_REFUND_PENDING = 'mentor_booking_refund_pending',
  MENTOR_SESSION_COMPLETED = 'mentor_session_completed',
  MENTOR_REVIEW_REQUESTED = 'mentor_review_requested',
  MENTOR_REVIEW_SUBMITTED = 'mentor_review_submitted',
  MENTOR_AVAILABILITY_BULK_CREATED = 'mentor_availability_bulk_created',
  PAYMENT_PAID = 'payment_paid',
  WALLET_CREDIT_ADDED = 'wallet_credit_added',
  WALLET_CREDIT_USED = 'wallet_credit_used',
  ROADMAP_GENERATED = 'roadmap_generated',
  ROADMAP_LESSON_COMPLETED = 'roadmap_lesson_completed',
  ROADMAP_TEST_FAILED = 'roadmap_test_failed',
  ROADMAP_PHASE_COMPLETED = 'roadmap_phase_completed',
  ROADMAP_STREAK_MILESTONE = 'roadmap_streak_milestone',
  ROADMAP_INACTIVITY_REMINDER = 'roadmap_inactivity_reminder',
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
