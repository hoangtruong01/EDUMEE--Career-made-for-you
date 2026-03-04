import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingSessionDocument = BookingSession & Document;

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED_BY_MENTEE = 'cancelled_by_mentee',
  CANCELLED_BY_MENTOR = 'cancelled_by_mentor',
  RESCHEDULED = 'rescheduled',
  COMPLETED = 'completed',
  NO_SHOW_MENTEE = 'no_show_mentee',
  NO_SHOW_MENTOR = 'no_show_mentor',
}

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
    transform: (doc: any, ret: any) => {
      ret.id = ret._id;
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

  @Prop({ type: String, enum: SessionType, required: true })
  sessionType!: SessionType;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  // Session scheduling details
  @Prop({ required: true })
  schedulingDetails!: {
    requestedDateTime: Date;
    confirmedDateTime?: Date;
    duration: number; // minutes
    timeZone: string;
    
    // Meeting details
    meetingPlatform: 'zoom' | 'google_meet' | 'teams' | 'phone' | 'in_person' | 'platform_built_in';
    meetingLink?: string;
    meetingId?: string;
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
  @Prop({ required: true })
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
    messageType: 'booking_request' | 'response' | 'clarification' | 'confirmation' | 'reminder' | 'follow_up';
    
    attachments?: {
      filename: string;
      url: string;
      type: string;
    }[];
  }[];

  // Payment and pricing
  @Prop({ type: Object })
  paymentInfo?: {
    sessionPrice: number;
    currency: string;
    
    paymentMethod: 'credit_card' | 'paypal' | 'bank_transfer' | 'free_session' | 'package_credit';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'free';
    
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

// Indexes
BookingSessionSchema.index({ menteeId: 1, status: 1 });
BookingSessionSchema.index({ mentorId: 1, status: 1 });
BookingSessionSchema.index({ 'schedulingDetails.confirmedDateTime': 1 });
BookingSessionSchema.index({ status: 1, sessionType: 1 });
BookingSessionSchema.index({ createdAt: -1 });