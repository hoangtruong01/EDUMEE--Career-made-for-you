import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type SessionReviewDocument = SessionReview & Document;

export enum ReviewerType {
  MENTEE = 'mentee',
  MENTOR = 'mentor',
}

export enum ReviewStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  FLAGGED = 'flagged',
}

@Schema({
  timestamps: true,
  collection: 'session_reviews',
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
export class SessionReview {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'TutoringSession' })
  tutoringSessionId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reviewerId!: Types.ObjectId;

  @Prop({ type: String, enum: ReviewerType, required: true })
  reviewerType!: ReviewerType;

  // The other party in the session
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reviewedUserId!: Types.ObjectId; // Mentor if reviewer is mentee, vice versa

  @Prop({ type: String, enum: ReviewStatus, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  // Overall ratings
  @Prop({ required: true })
  overallRatings!: {
    overallSatisfaction: number; // 1-5 scale
    wouldRecommend: boolean;
    likelyToBookAgain?: boolean; // Mentee rating mentor
    
    // Specific ratings
    communication: number; // 1-5 scale
    expertise: number; // 1-5 scale  
    helpfulness: number; // 1-5 scale
    professionalism: number; // 1-5 scale
    punctuality: number; // 1-5 scale
  };

  // Detailed feedback based on reviewer type
  @Prop({ type: Object })
  menteeReviewDetails?: { // If reviewer is mentee
    // Session value
    sessionValue: {
      goalsMet: number; // 0-100%
      learningValue: number; // 1-5 scale
      clarityOfExplanations: number; // 1-5 scale
      practicalRelevance: number; // 1-5 scale
    };
    
    // Mentor-specific ratings
    mentorQualities: {
      knowledgeDepth: number; // 1-5 scale
      teachingAbility: number; // 1-5 scale
      patience: number; // 1-5 scale
      encouragement: number; // 1-5 scale
      adaptability: number; // 1-5 scale
    };
    
    // Session structure and delivery
    sessionStructure: {
      preparedness: number; // 1-5 scale
      timeManagement: number; // 1-5 scale
      engagement: number; // 1-5 scale
      followUpQuality: number; // 1-5 scale
    };
    
    // Specific feedback
    mostValuable: string; // What was most valuable about the session
    leastValuable?: string; // What was least valuable
    improvementSuggestions: string[]; // Suggestions for mentor improvement
    
    // Future mentoring preferences
    wouldContinueWithMentor: boolean;
    recommendedSessionFrequency?: string;
    preferredSessionFormat?: string;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  mentorReviewDetails?: any; // If reviewer is mentor

  // Written feedback
  @Prop({ type: MongooseSchema.Types.Mixed })
  writtenFeedback?: any;

  // Session-specific feedback
  @Prop({ type: MongooseSchema.Types.Mixed })
  sessionSpecificFeedback?: any;

  // Impact and outcomes
  @Prop({ type: MongooseSchema.Types.Mixed })
  impactAssessment?: any;

  // Comparative feedback (for mentees who've had multiple mentors)
  @Prop({ type: MongooseSchema.Types.Mixed })
  comparativeFeedback?: any;

  // Admin and moderation
  @Prop({ type: MongooseSchema.Types.Mixed })
  moderationInfo?: any;

  // Usage and helpfulness tracking
  @Prop({ type: MongooseSchema.Types.Mixed })
  usageTracking?: any;

  // Review authenticity verification
  @Prop({ type: MongooseSchema.Types.Mixed })
  verificationInfo?: any;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SessionReviewSchema = SchemaFactory.createForClass(SessionReview);

// Indexes
SessionReviewSchema.index({ tutoringSessionId: 1 });
SessionReviewSchema.index({ reviewerId: 1, reviewerType: 1 });
SessionReviewSchema.index({ reviewedUserId: 1, status: 1 });
SessionReviewSchema.index({ 'overallRatings.overallSatisfaction': -1 });
SessionReviewSchema.index({ status: 1, createdAt: -1 });