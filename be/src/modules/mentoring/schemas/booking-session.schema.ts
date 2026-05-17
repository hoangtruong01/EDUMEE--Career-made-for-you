import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingSessionDocument = BookingSession & Document;

function normalizeUserSummary(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const user = value as Record<string, unknown>;
  const id = user.id || user._id;

  return {
    id: id?.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };
}

export enum BookingStatus {
  AWAITING_PAYMENT = 'awaiting_payment',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED_BY_MENTEE = 'cancelled_by_mentee',
  CANCELLED_BY_MENTOR = 'cancelled_by_mentor',
  RESCHEDULED = 'rescheduled',
  COMPLETED = 'completed',
  NO_SHOW_MENTEE = 'no_show_mentee',
  NO_SHOW_MENTOR = 'no_show_mentor',
}

export const ACTIVE_SLOT_BOOKING_STATUSES = [
  BookingStatus.AWAITING_PAYMENT,
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.RESCHEDULED,
] as const;

export enum SessionType {
  CAREER_GUIDANCE = 'career_guidance',
  SKILL_COACHING = 'skill_coaching',
  INTERVIEW_PREPARATION = 'interview_preparation',
  PROJECT_REVIEW = 'project_review',
  RESUME_REVIEW = 'resume_review',
  GENERAL_MENTORING = 'general_mentoring',
  FOLLOW_UP = 'follow_up',
}

@Schema({
  timestamps: true,
  collection: 'booking_sessions',
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>): Record<string, unknown> => {
      ret.id = ret._id;
      ret.mentorUser = normalizeUserSummary(ret.mentorUser);
      ret.menteeUser = normalizeUserSummary(ret.menteeUser);
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class BookingSession {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  menteeId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'TutorProfile' })
  tutorProfileId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  mentorId!: Types.ObjectId; // Cached from TutorProfile for performance

  @Prop({ required: true, type: Types.ObjectId, ref: 'MentorAvailabilitySlot' })
  availabilitySlotId!: Types.ObjectId;

  @Prop({ type: String, enum: SessionType, required: true })
  sessionType!: SessionType;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  // Session scheduling details
  @Prop({ required: true, type: Object })
  schedulingDetails!: {
    requestedDateTime: Date;
    confirmedDateTime?: Date;
    duration: number; // minutes
    timeZone: string;
    
    // Meeting details
    meetingPlatform: 'zoom' | 'google_meet' | 'teams' | 'phone' | 'in_person' | 'platform_built_in';
    meetingLink?: string;
    meetingId?: string;
    meetingCode?: string;
    meetingPassword?: string;
    
    // Location (for in-person meetings)
    location?: {
      address: string;
      city: string;
      country: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
  };

  // Booking request details
  @Prop({ required: true, type: Object })
  bookingRequest!: {
    // What the mentee wants to discuss
    topicsToDiscuss: string[];
    specificQuestions?: string[];
    currentSituation: string;
    desiredOutcomes: string[];
    
    // Mentee's background (for context)
    menteeBackground?: {
      currentRole?: string;
      experience?: string;
      careerGoals?: string[];
      challenges?: string[];
    };
    
    // Special requests
    preparationMaterials?: {
      type: 'resume' | 'portfolio' | 'project' | 'document' | 'code';
      title: string;
      description: string;
      url?: string;
      fileId?: string;
    }[];
    
    additionalNotes?: string;
    isFirstSession: boolean;
    urgencyLevel?: 'low' | 'medium' | 'high';
  };

  // Mentor's response to booking
  @Prop({ type: Object })
  mentorResponse?: {
    responseDate: Date;
    accepted: boolean;
    
    // If accepted
    confirmationNotes?: string;
    preparationSuggestions?: string[];
    agendaSuggested?: string[];
    
    // If declined/rescheduled
    declineReason?: string;
    alternativeDatesSuggested?: Date[];
    reschedulingOptions?: {
      newDateTime: Date;
      reason: string;
      flexibility?: string; // How flexible mentor is with timing
    }[];
  };

  // Communication thread
  @Prop({ type: [Object] })
  communicationThread?: {
    messageId: string;
    senderId: Types.ObjectId;
    senderType: 'mentee' | 'mentor' | 'system';
    message: string;
    timestamp: Date;
    messageType:
      | 'booking_request'
      | 'response'
      | 'clarification'
      | 'confirmation'
      | 'reminder'
      | 'follow_up'
      | 'chat'
      | 'reschedule_proposal'
      | 'reschedule_accept'
      | 'reschedule_decline'
      | 'system';
    
    attachments?: {
      filename: string;
      url: string;
      type: string;
    }[];
  }[];

  @Prop({ type: [Object] })
  rescheduleProposals?: {
    id: string;
    proposedBy: Types.ObjectId;
    proposedByRole: 'mentee' | 'mentor';
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    availabilitySlotId?: Types.ObjectId;
    newDateTime: Date;
    duration: number;
    timeZone?: string;
    reason?: string;
    message?: string;
    createdAt: Date;
    respondedAt?: Date;
    respondedBy?: Types.ObjectId;
  }[];

  // Payment and pricing
  @Prop({ type: Object })
  paymentInfo?: {
    sessionPrice: number;
    currency: string;
    
    paymentMethod: 'credit_card' | 'paypal' | 'bank_transfer' | 'free_session' | 'package_credit';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'refund_pending' | 'free';
    
    transactionId?: string;
    paymentDate?: Date;
    refundInfo?: {
      refundAmount: number;
      refundDate: Date;
      refundReason: string;
      refundStatus: 'pending' | 'completed' | 'failed';
    };
    
    // Package/credit usage
    packageId?: Types.ObjectId;
    creditsUsed?: number;
  };

  // Automated reminders and notifications
  @Prop({ type: Object })
  reminderSettings?: {
    menteeReminders: {
      reminderTime: string; // "24h", "2h", "15min"
      sent: boolean;
      sentAt?: Date;
    }[];
    
    mentorReminders: {
      reminderTime: string;
      sent: boolean;
      sentAt?: Date;
    }[];
    
    followUpScheduled: boolean;
    followUpDate?: Date;
  };

  // Rescheduling history
  @Prop({ type: [Object] })
  reschedulingHistory?: {
    originalDateTime: Date;
    newDateTime: Date;
    rescheduledBy: 'mentee' | 'mentor';
    reason: string;
    rescheduledAt: Date;
    
    impactOnPricing?: {
      feeApplied: boolean;
      feeAmount?: number;
      feeReason?: string;
    };
  }[];

  // Connection to actual session
  @Prop({ type: Types.ObjectId, ref: 'TutoringSession' })
  tutoringSessionId?: Types.ObjectId;

  // Quality assurance
  @Prop({ type: Object })
  qualityAssurance?: {
    flagged: boolean;
    flagReason?: string;
    flaggedBy?: Types.ObjectId;
    
    adminReview?: {
      reviewerId: Types.ObjectId;
      reviewDate: Date;
      reviewNotes: string;
      actionTaken: string;
    };
    
    disputeRaised?: {
      raisedBy: 'mentee' | 'mentor';
      disputeReason: string;
      disputeDate: Date;
      resolutionStatus: 'pending' | 'resolved' | 'escalated';
      resolution?: string;
    };
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const BookingSessionSchema = SchemaFactory.createForClass(BookingSession);

BookingSessionSchema.virtual('mentorUser', {
  ref: 'User',
  localField: 'mentorId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name email avatar' },
});

BookingSessionSchema.virtual('menteeUser', {
  ref: 'User',
  localField: 'menteeId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name email avatar' },
});

// Indexes
BookingSessionSchema.index({ menteeId: 1, status: 1 });
BookingSessionSchema.index({ mentorId: 1, status: 1 });
BookingSessionSchema.index(
  { availabilitySlotId: 1 },
  {
    unique: true,
    name: 'booking_session_active_slot_unique',
    partialFilterExpression: {
      status: { $in: [...ACTIVE_SLOT_BOOKING_STATUSES] },
    },
  },
);
BookingSessionSchema.index({ 'schedulingDetails.confirmedDateTime': 1 });
BookingSessionSchema.index({ status: 1, sessionType: 1 });
BookingSessionSchema.index({ createdAt: -1 });
