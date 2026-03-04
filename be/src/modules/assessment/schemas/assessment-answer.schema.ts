import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AssessmentAnswerDocument = AssessmentAnswer & Document;

@Schema({
  timestamps: true,
  collection: 'assessment_answers',
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
export class AssessmentAnswer {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AssessmentSession' })
  sessionId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AssessmentQuestion' })
  questionId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  // Raw answer data
  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  answer!: any; // Can be string, number, array, object depending on question type

  // Calculated scores
  @Prop({ type: Number })
  rawScore?: number;

  @Prop({ type: Number })
  normalizedScore?: number; // 0-1 or 0-100 scale

  // Response metadata
  @Prop({ type: Number })
  responseTime?: number; // Time taken to answer in seconds

  @Prop({ type: Date, default: Date.now })
  answeredAt?: Date;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ type: Object })
  dimensionScores?: Record<string, number>; // Scores for different assessment dimensions

  @Prop({ type: Object })
  metadata?: {
    skipped?: boolean;
    revisited?: boolean;
    confidence?: number; // User's confidence in their answer
    notes?: string;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentAnswerSchema = SchemaFactory.createForClass(AssessmentAnswer);

// Indexes
AssessmentAnswerSchema.index({ sessionId: 1 });
AssessmentAnswerSchema.index({ userId: 1, questionId: 1 });
AssessmentAnswerSchema.index({ answeredAt: -1 });