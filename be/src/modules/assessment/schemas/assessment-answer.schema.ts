import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssessmentAnswerDocument = AssessmentAnswer & Document;

@Schema({
  timestamps: true,
  collection: 'assessment_answers',
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AssessmentAnswer {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AssessmentQuestion' })
  questionId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AssessmentSession' })
  sessionId?: Types.ObjectId;

  // Câu trả lời ABCD
  @Prop({ required: true, enum: ['A', 'B', 'C', 'D'] })
  answer!: string;

  // Thời gian trả lời (milliseconds)
  @Prop({ type: Number })
  responseTime?: number;

  @Prop({ type: Date, default: Date.now })
  answeredAt?: Date;

  // Metadata tùy chọn
  @Prop({ type: Object })
  metadata?: {
    skipped?: boolean;
    notes?: string;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentAnswerSchema = SchemaFactory.createForClass(AssessmentAnswer);

// Indexes for performance
AssessmentAnswerSchema.index({ userId: 1, questionId: 1 }, { unique: true }); // User chỉ có thể trả lời 1 lần cho mỗi câu hỏi
AssessmentAnswerSchema.index({ answeredAt: -1 });
AssessmentAnswerSchema.index({ questionId: 1 });