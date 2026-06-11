import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationType } from '../../notifications/schemas/notification.schema';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  UserLearningProfile,
  UserLearningProfileDocument,
} from '../schemas/user-learning-profile.schema';
@Injectable()
export class UserLearningProfileService {
  constructor(
    @InjectModel(UserLearningProfile.name)
    private readonly profileModel: Model<UserLearningProfileDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // Hàm này được gọi mỗi khi User hoàn thành hoặc Skip 1 bài học
  async updateLearningActivity(userId: string): Promise<UserLearningProfile> {
    const profile = await this.profileModel.findOne({ userId: new Types.ObjectId(userId) });

    // Nếu chưa có profile (User mới), tạo mới
    if (!profile) {
      return this.profileModel.create({
        userId: new Types.ObjectId(userId),
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: new Date(),
        totalTasksCompleted: 1,
      });
    }

    const now = new Date();
    const lastActive = profile.lastActiveDate;

    // Reset thời gian về đầu ngày (00:00:00) để so sánh số ngày
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActiveDay = lastActive
      ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate())
      : new Date(0);

    const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // LOGIC TÍNH STREAK:
    if (diffDays === 1) {
      // Học ngày tiếp theo -> Tăng chuỗi
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
    } else if (diffDays > 1) {
      // Bỏ lỡ > 1 ngày -> Reset chuỗi về 1
      profile.currentStreak = 1;
    }
    // Nếu diffDays === 0 (Học nhiều bài trong cùng 1 ngày) -> Giữ nguyên chuỗi

    profile.lastActiveDate = now;
    profile.totalTasksCompleted += 1;

    // Check và cấp huy hiệu (Ví dụ)
    this.checkAndAwardAchievements(profile);

    return profile.save();
  }

  private async checkAndAwardAchievements(profile: UserLearningProfileDocument): Promise<void> {
    const userIdStr = profile.userId.toString();

    if (profile.totalTasksCompleted === 1 && !profile.achievements.includes('FIRST_BLOOD')) {
      profile.achievements.push('FIRST_BLOOD');
      await this.notificationService.create({
        recipientId: userIdStr,
        type: NotificationType.ROADMAP_STREAK_MILESTONE,
        title: 'Mở khóa thành tựu mới 🌟',
        body: 'Hệ thống AI vừa cấp Huy hiệu danh giá [Khởi Đầu Thực Chiến] vào Hồ sơ của bạn nhờ bài nộp thành công đầu tiên!',
        payload: { badge: 'FIRST_BLOOD' },
      });
    }

    if (profile.currentStreak === 7 && !profile.achievements.includes('STREAK_7_DAYS')) {
      profile.achievements.push('STREAK_7_DAYS');
      await this.notificationService.create({
        recipientId: userIdStr,
        type: NotificationType.ROADMAP_STREAK_MILESTONE,
        title: 'Duy trì chuỗi học tập thần sầu 🔥',
        body: 'Xuất sắc! Bạn đã kiên trì thực chiến liên tục suốt 7 ngày. Huy hiệu [Chiến Binh Bứt Phá] đã thuộc về bạn.',
        payload: { streak: 7, badge: 'STREAK_7_DAYS' },
      });
    }
  }
}
