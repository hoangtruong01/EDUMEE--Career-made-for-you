import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

export enum ReportTargetType {
  POST = 'post',
  COMMENT = 'comment',
}

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Schema({ timestamps: true, collection: 'community_reports' })
export class Report {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reporterId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: ReportTargetType })
  targetType!: ReportTargetType;

  @Prop({ required: true, type: Types.ObjectId })
  targetId!: Types.ObjectId; // Could be Post ID or Comment ID

  @Prop({ type: Types.ObjectId, ref: 'CommunityPost' })
  postId?: Types.ObjectId; // Reference to the post (even if target is comment)

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ trim: true })
  details?: string;

  @Prop({
    type: String,
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedById?: Types.ObjectId;

  @Prop()
  resolvedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ status: 1, createdAt: -1 });
