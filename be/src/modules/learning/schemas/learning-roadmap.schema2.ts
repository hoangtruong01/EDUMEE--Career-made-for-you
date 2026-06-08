import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RoadmapStatus, TaskProgressStatus } from '../../../common/enums/learning.enum';

export type LearningRoadmapDocument = LearningRoadmap & Document;

// Định nghĩa Interface chặt chẽ, nói không với 'any'
export interface IMilestone {
  milestoneId: string; // Tự gen bằng UUID hoặc string độc nhất
  title: string;
  order: number;
  taskIds: Types.ObjectId[]; // Chứa ID của SimulationTask
}

export interface IPhase {
  phaseId: string;
  title: string;
  order: number;
  milestones: IMilestone[];
}

export interface ITaskProgress {
  taskId: Types.ObjectId;
  status: TaskProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
  score?: number; // Điểm số nếu có chấm bài
}

@Schema({ timestamps: true, collection: 'learning_roadmaps' })
export class LearningRoadmap {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Career' })
  careerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: String, enum: RoadmapStatus, default: RoadmapStatus.DRAFT })
  status!: RoadmapStatus;

  // Tính toán real-time: (Tổng SKIPPED + COMPLETED) / Tổng số task
  @Prop({ default: 0, min: 0, max: 100 })
  overallProgress!: number;

  // 1. CẤU TRÚC LỘ TRÌNH (Bản đồ tĩnh do AI gen ra)
  @Prop({ required: true, type: Array })
  phases!: IPhase[];

  // 2. TRACKING TIẾN ĐỘ THỰC TẾ (Mảng phẳng để query cực nhanh)
  @Prop({ type: Array, default: [] })
  taskProgress!: ITaskProgress[];

  // Cho phép tái sử dụng Roadmap này cho user khác mà không cần gọi AI gen lại
  @Prop({ default: false })
  isTemplate!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const LearningRoadmapSchema = SchemaFactory.createForClass(LearningRoadmap);
// Composite Index: Tìm lộ trình của 1 user cho 1 nghề cụ thể cực nhanh
LearningRoadmapSchema.index({ userId: 1, careerId: 1 });
LearningRoadmapSchema.index({ isTemplate: 1 });
