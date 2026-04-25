import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Career, CareerDocument } from '../careers/schemas/career.schema';
import { CareerFitResult, CareerFitResultDocument } from '../assessment/schemas/career-fit-result.schema';
import { BookingSession, BookingSessionDocument } from '../mentoring/schemas/booking-session.schema';
import { UserRole, UserVerifyStatus } from '../../common/enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Career.name) private careerModel: Model<CareerDocument>,
    @InjectModel(CareerFitResult.name) private careerFitResultModel: Model<CareerFitResultDocument>,
    @InjectModel(BookingSession.name) private bookingSessionModel: Model<BookingSessionDocument>,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalTests, totalCareers, totalSessions] = await Promise.all([
      this.userModel.countDocuments(),
      this.careerFitResultModel.countDocuments(),
      this.careerModel.countDocuments(),
      this.bookingSessionModel.countDocuments(),
    ]);

    // Fetch recent activities
    const recentUsers = await this.userModel
      .find()
      .sort({ created_at: -1 })
      .limit(5)
      .select('name created_at')
      .exec();

    const recentTests = await this.careerFitResultModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name')
      .exec();

    const recentActivities = [
      ...recentUsers.map(u => ({
        title: 'Người dùng mới đăng ký',
        user: u.name,
        time: u.created_at,
        type: 'users',
      })),
      ...recentTests.map(t => ({
        title: 'Hoàn thành bài test',
        user: (t.userId as unknown as { name: string })?.name || 'Ẩn danh',
        time: t.createdAt,
        type: 'test',
      })),
    ].sort((a, b) => new Date(b.time as string | number | Date).getTime() - new Date(a.time as string | number | Date).getTime()).slice(0, 5);

    // Popular careers (based on recommendations in CareerFitResult)
    // This is a bit complex, let's just get top careers from the career model for now or aggregate
    const popularCareers = await this.careerModel
      .find()
      .limit(5)
      .select('title') // Removed viewCount and matchCount
      .exec();

    return {
      stats: [
        { title: 'Tổng người dùng', value: totalUsers.toLocaleString(), delta: '+0%', iconType: 'users' },
        { title: 'Bài test hoàn thành', value: totalTests.toLocaleString(), delta: '+0%', iconType: 'test' },
        { title: 'Nghề nghiệp', value: totalCareers.toLocaleString(), delta: '+0%', iconType: 'careers' },
        { title: 'Lượt tư vấn', value: totalSessions.toLocaleString(), delta: '+0%', iconType: 'mentor' },
      ],
      recentActivities,
      popularCareers: popularCareers.map(c => ({
        name: c.title,
        views: '0', // Placeholder
        matches: '0 khớp', // Placeholder
        delta: '+0%',
      })),
    };
  }

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .exec(),
      this.userModel.countDocuments(),
    ]);

    // Fetch test counts for these users
    const userIds = users.map(u => u._id);
    const testCounts = (await this.careerFitResultModel.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]));

    const testCountMap = (testCounts as { _id: Types.ObjectId; count: number }[]).reduce((acc: Record<string, number>, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        plan: 'Free' as const, // Default for now
        status: u.verify === UserVerifyStatus.Banned ? 'Bị khóa' : 'Hoạt động',
        joined: u.created_at,
        tests: (testCountMap)[(u._id).toString()] || 0,
      })),
      total,
    };
  }

  async updateUserStatus(id: string, status: string) {
    const verify = status === 'Hoạt động' ? 1 : 2; // Verified vs Banned
    return this.userModel.findByIdAndUpdate(id, { verify }, { new: true });
  }

  async updateUserRole(id: string, role: UserRole) {
    return this.userModel.findByIdAndUpdate(id, { role }, { new: true });
  }
}
