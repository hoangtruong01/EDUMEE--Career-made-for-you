import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WeeklyPlanDocument = WeeklyPlan & Document;

export enum WeeklyPlanStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED', // Hết tuần mà không đạt target
}

export interface IPlannedTask {
  taskId: Types.ObjectId;
  isCompleted: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Schema({ timestamps: true, collection: 'weekly_plans' })
export class WeeklyPlan {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LearningRoadmap' })
  roadmapId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  weekNumber!: number; // Tuần 1, Tuần 2,...

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: String, enum: WeeklyPlanStatus, default: WeeklyPlanStatus.IN_PROGRESS })
  status!: WeeklyPlanStatus;

  // Danh sách các Task mà AI ép KPI cho user trong tuần này
  @Prop({ type: Array, required: true })
  plannedTasks!: IPlannedTask[];

  // User tự cam kết sẽ học bao nhiêu giờ tuần này
  @Prop({ required: true, min: 1 })
  committedHours!: number;

  @Prop({ default: 0 })
  actualHoursSpent!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WeeklyPlanSchema = SchemaFactory.createForClass(WeeklyPlan);
// Đảm bảo 1 user không thể tạo 2 cái kế hoạch cho cùng 1 tuần trong 1 roadmap
WeeklyPlanSchema.index({ userId: 1, roadmapId: 1, weekNumber: 1 }, { unique: true });
