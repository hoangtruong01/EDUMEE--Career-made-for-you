import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserLearningProfileDocument = UserLearningProfile & Document;

@Schema({ timestamps: true, collection: 'user_learning_profiles' })
export class UserLearningProfile {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  // Xử lý bài toán cày cuốc:
  // currentStreak: Số ngày học liên tiếp hiện tại.
  // lastActiveDate: Để check xem hôm nay user đã tính streak chưa, tránh việc làm 2 bài trong 1 ngày bị cộng 2 lần streak.
  @Prop({ default: 0 })
  currentStreak!: number;

  @Prop({ default: 0 })
  longestStreak!: number;

  @Prop({ type: Date })
  lastActiveDate?: Date;

  // Xử lý bài toán động lực (Huy hiệu)
  @Prop({ type: [String], default: [] })
  achievements!: string[]; // Sẽ lưu các Enum như: 'FIRST_BLOOD', 'STREAK_7_DAYS'

  // Thống kê tổng quan để vẽ biểu đồ cho User Dashboard
  @Prop({ default: 0 })
  totalTasksCompleted!: number;

  @Prop({ default: 0 })
  totalHoursSpent!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserLearningProfileSchema = SchemaFactory.createForClass(UserLearningProfile);
// Đánh index userId để query O(1) cực nhanh cho Dashboard
UserLearningProfileSchema.index({ userId: 1 });
