import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewVoteDocument = ReviewVote & Document;

export enum VoteType {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  ACCURATE = 'accurate',
  OUTDATED = 'outdated',
  RELEVANT = 'relevant',
  NOT_RELEVANT = 'not_relevant',
}

@Schema({
  timestamps: true,
  collection: 'review_votes',
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
export class ReviewVote {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'CareerReview' })
  reviewId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  voterId!: Types.ObjectId;

  @Prop({ type: String, enum: VoteType, required: true })
  voteType!: VoteType;

  // Vote context for better understanding
  @Prop({ type: Object })
  voteContext?: {
    // Voter's background (for weighting votes)
    voterBackground?: {
      hasRelevantExperience: boolean;
      yearsOfExperience?: number;
      sameIndustry?: boolean;
      sameCareerPath?: boolean;
    };
    
    // Why they found it helpful/not helpful
    reason?: string;
    specificAspects?: string[]; // What aspects were helpful
    
    // Additional feedback
    additionalComments?: string;
    suggestedImprovements?: string[];
  };

  // Voting metadata
  @Prop({ type: Object })
  votingMetadata?: {
    changeFromPreviousVote?: VoteType; // If user changed their vote
    voteChangedAt?: Date;
    
    // Anti-spam measures
    votingSource: 'organic' | 'prompted' | 'incentivized';
    deviceFingerprint?: string;
    ipAddress?: string; // Hashed for privacy
    
    // Quality indicators
    timeSpentOnReview?: number; // Seconds spent reading before voting
    scrollPercentage?: number; // How much of review they read
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReviewVoteSchema = SchemaFactory.createForClass(ReviewVote);

// Indexes
ReviewVoteSchema.index({ reviewId: 1, voteType: 1 });
ReviewVoteSchema.index({ voterId: 1, reviewId: 1 }, { unique: true }); // One vote per user per review
ReviewVoteSchema.index({ voteType: 1, createdAt: -1 });

// ===========================

export type ReviewReportDocument = ReviewReport & Document;

export enum ReportReason {
  SPAM = 'spam',
  FAKE_REVIEW = 'fake_review',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HARASSMENT = 'harassment',
  MISINFORMATION = 'misinformation',
  COMPANY_BASHING = 'company_bashing',
  PERSONAL_ATTACK = 'personal_attack',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  PRIVACY_VIOLATION = 'privacy_violation',
  OUTDATED_INFORMATION = 'outdated_information',
  DUPLICATE_CONTENT = 'duplicate_content',
  OTHER = 'other',
}

export enum ReportStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ACTIONNED = 'actioned',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({
  timestamps: true,
  collection: 'review_reports',
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
export class ReviewReport {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'CareerReview' })
  reviewId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reporterId!: Types.ObjectId;

  @Prop({ type: String, enum: ReportReason, required: true })
  reportReason!: ReportReason;

  @Prop({ type: String, enum: ReportStatus, default: ReportStatus.SUBMITTED })
  status!: ReportStatus;

  @Prop({ type: String, enum: ReportSeverity, default: ReportSeverity.MEDIUM })
  severity!: ReportSeverity;

  // Detailed report information
  @Prop({ required: true, type: Object })
  reportDetails!: {
    description: string; // Reporter's explanation
    
    // Specific issues identified
    specificIssues?: {
      section: string; // Which part of review
      issueType: string;
      description: string;
      evidenceUrls?: string[];
    }[];
    
    // Impact assessment
    impactLevel: 'low' | 'medium' | 'high';
    affectedUsers?: string; // Who might be harmed
    
    // Supporting evidence
    screenshots?: {
      filename: string;
      url: string;
      description: string;
    }[];
    
    additionalEvidence?: string;
    relatedReports?: Types.ObjectId[]; // Other related reports
  };

  // Reporter context (for credibility assessment)
  @Prop({ type: Object })
  reporterContext?: {
    // Reporter's background
    hasRelevantExperience: boolean;
    reportingHistory: {
      totalReports: number;
      validReports: number;
      invalidReports: number;
    };
    
    // Potential bias indicators
    potentialBias?: string[];
    relationshipToReviewer?: 'none' | 'colleague' | 'competitor' | 'student' | 'unknown';
    
    // Report quality indicators
    reportQuality: 'poor' | 'fair' | 'good' | 'excellent';
    providedEvidence: boolean;
    followedGuidelines: boolean;
  };

  // Moderation workflow
  @Prop({ type: Object })
  moderationWorkflow?: {
    assignedModerator?: Types.ObjectId;
    assignmentDate?: Date;
    
    priorityLevel: number; // 1-5 scale
    estimatedReviewTime?: number; // minutes
    
    moderatorNotes?: {
      note: string;
      addedBy: Types.ObjectId;
      addedAt: Date;
      noteType: 'investigation' | 'conclusion' | 'action' | 'followup';
    }[];
    
    investigationSteps?: {
      step: string;
      completed: boolean;
      completedAt?: Date;
      result?: string;
    }[];
  };

  // Resolution details
  @Prop({ type: Object })
  resolution?: {
    resolutionDate: Date;
    resolvedBy: Types.ObjectId;
    
    decision: 'no_action' | 'content_warning' | 'edit_required' | 'hide_review' | 'delete_review' | 'ban_user';
    
    reasoning: string;
    evidenceConsidered: string[];
    
    // Actions taken
    actionsTaken?: {
      action: string;
      actionDate: Date;
      actionBy: Types.ObjectId;
      actionDetails?: string;
    }[];
    
    // Communication with involved parties
    communicationLog?: {
      recipientType: 'reporter' | 'reviewer' | 'admin';
      messageType: 'notification' | 'explanation' | 'warning' | 'resolution';
      sentDate: Date;
      messageContent?: string;
    }[];
    
    // Follow-up requirements
    followUpRequired: boolean;
    followUpDate?: Date;
    followUpReason?: string;
  };

  // Appeal process (if applicable)
  @Prop({ type: Object })
  appealInfo?: {
    appealSubmitted: boolean;
    appealDate?: Date;
    appealedBy?: Types.ObjectId;
    appealReason?: string;
    
    appealStatus?: 'pending' | 'under_review' | 'upheld' | 'overturned';
    appealDecision?: string;
    appealDecisionDate?: Date;
    
    finalDecision: boolean;
  };

  // Analytics and learning
  @Prop({ type: Object })
  analyticsData?: {
    // Report pattern analysis
    partOfPattern: boolean;
    patternDescription?: string;
    relatedReportIds?: Types.ObjectId[];
    
    // Quality metrics
    reportAccuracy?: number; // 0-1 scale (determined post-resolution)
    timeToResolution?: number; // hours
    
    // System learning
    falsePositiveIndicators?: string[];
    improvementSuggestions?: string[];
    
    // Community impact
    communitySupport?: number; // Other users who flagged same issue
    reviewerResponseType?: 'cooperative' | 'defensive' | 'hostile' | 'no_response';
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReviewReportSchema = SchemaFactory.createForClass(ReviewReport);

// Indexes
ReviewReportSchema.index({ reviewId: 1, status: 1 });
ReviewReportSchema.index({ reporterId: 1, createdAt: -1 });
ReviewReportSchema.index({ reportReason: 1, severity: 1 });
ReviewReportSchema.index({ status: 1, 'moderationWorkflow.priorityLevel': -1 });
ReviewReportSchema.index({ 'resolution.resolutionDate': -1 });