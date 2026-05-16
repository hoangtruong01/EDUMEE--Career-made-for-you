import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MentorAvailabilitySlotDocument = MentorAvailabilitySlot & Document;

export enum MentorAvailabilitySlotStatus {
  AVAILABLE = 'available',
  HELD = 'held',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
}

@Schema({
  timestamps: true,
  collection: 'mentor_availability_slots',
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
export class MentorAvailabilitySlot {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  mentorId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'TutorProfile' })
  tutorProfileId!: Types.ObjectId;

  @Prop({ required: true, type: Date })
  startAt!: Date;

  @Prop({ required: true, type: Date })
  endAt!: Date;

  @Prop({
    type: String,
    enum: MentorAvailabilitySlotStatus,
    default: MentorAvailabilitySlotStatus.AVAILABLE,
  })
  status!: MentorAvailabilitySlotStatus;

  @Prop({ type: Types.ObjectId, ref: 'BookingSession' })
  bookingSessionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  heldBy?: Types.ObjectId;

  @Prop({ type: Date })
  heldUntil?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MentorAvailabilitySlotSchema = SchemaFactory.createForClass(MentorAvailabilitySlot);

MentorAvailabilitySlotSchema.index({ mentorId: 1, startAt: 1 });
MentorAvailabilitySlotSchema.index({ tutorProfileId: 1, status: 1, startAt: 1 });
MentorAvailabilitySlotSchema.index({ status: 1, heldUntil: 1 });
MentorAvailabilitySlotSchema.index(
  { mentorId: 1, startAt: 1, endAt: 1 },
  { unique: true },
);
