import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CheckpointDocument = Checkpoint & Document;

export enum CheckpointType {
  PHASE_REVIEW = 'PHASE_REVIEW', // Đánh giá khi hết 1 Phase
  MONTHLY_REVIEW = 'MONTHLY_REVIEW', // Đánh giá hàng tháng
}

export interface IUserReflection {
  confidenceLevel: number; // 1-5 sao: Độ tự tin hiện tại
  challenges: string; // Khó khăn đang gặp
  isThinkingAboutQuitting: boolean; // Có ý định bỏ cuộc không?
}

@Schema({ timestamps: true, collection: 'checkpoints' })
export class Checkpoint {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LearningRoadmap' })
  roadmapId!: Types.ObjectId;

  @Prop({ type: String, enum: CheckpointType, required: true })
  type!: CheckpointType;

  // Thu thập cảm nhận thật của user (Form khảo sát)
  @Prop({ type: Object, required: true })
  userReflection!: IUserReflection;

  // AI nhận xét dựa trên Data (Ví dụ: "Bạn đang hoàn thành task nhanh hơn dự kiến 20%")
  @Prop({ type: [String], default: [] })
  aiFeedback!: string[];

  // Hành động tiếp theo AI gợi ý (Ví dụ: "Giảm độ khó", "Học chậm lại")
  @Prop({ type: [String], default: [] })
  recommendedActions!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const CheckpointSchema = SchemaFactory.createForClass(Checkpoint);
CheckpointSchema.index({ roadmapId: 1 });
