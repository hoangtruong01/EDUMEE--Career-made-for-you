import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssessmentSessionDocument = AssessmentSession & Document;

export enum AssessmentStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum AssessmentType {
  PERSONALITY = 'personality',
  INTERESTS = 'interests', 
  SKILLS = 'skills',
  APTITUDE = 'aptitude',
  FULL_ASSESSMENT = 'full_assessment',
}

@Schema({
  timestamps: true,
  collection: 'assessment_sessions',
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
export class AssessmentSession {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: AssessmentType, required: true })
  type!: AssessmentType; // Changed from assessmentType to match DTO

  @Prop({ type: String, enum: AssessmentStatus, default: AssessmentStatus.DRAFT })
  status!: AssessmentStatus;

  @Prop({ type: Number, min: 0, max: 100 })
  progressPercentage?: number;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Object })
  metadata?: {
    timeSpent?: number; // seconds
    deviceType?: string;
    sessionSource?: string;
    retakeCount?: number;
  };

  // Raw scores from different assessment dimensions
  @Prop({ type: Object })
  rawScores?: {
    personalityScores?: Record<string, number>; // Big 5, MBTI, etc.
    interestScores?: Record<string, number>; // Holland codes, etc.
    skillScores?: Record<string, number>; // Technical, soft skills
    aptitudeScores?: Record<string, number>; // Numerical, verbal, logical
    constraintFactors?: Record<string, any>; // Budget, time, location preferences
  };

  @Prop({ type: Object })
  progressTracking?: {
    currentQuestionIndex?: number;
    questionsAnswered?: number;
    totalQuestions?: number;
    timeSpentOnCurrentQuestion?: number;
    lastActiveAt?: Date;
  };

  @Prop({ type: Object })
  sessionMetrics?: {
    totalTimeSpent?: number;
    averageTimePerQuestion?: number;
    questionsSkipped?: number;
    questionsRevisited?: number;
    completionRate?: number;
  };

  @Prop({ type: Object })
  results?: {
    overallScore?: number;
    dimensionScores?: Record<string, number>;
    recommendations?: string[];
    completedAt?: Date;
  };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'AssessmentAnswer' }] })
  answers?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'CareerFitResult' })
  careerFitResult?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentSessionSchema = SchemaFactory.createForClass(AssessmentSession);

// Indexes
AssessmentSessionSchema.index({ userId: 1, assessmentType: 1 });
AssessmentSessionSchema.index({ status: 1 });
AssessmentSessionSchema.index({ createdAt: -1 });