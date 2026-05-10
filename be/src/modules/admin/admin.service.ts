import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { LoginType, UserRole, UserVerifyStatus } from '../../common/enums';
import { AIService } from '../../common/services/ai.service';
import { CareerFitResult, CareerFitResultDocument } from '../assessment/schemas/career-fit-result.schema';
import { CareerInsight, CareerInsightDocument } from '../careers/schemas/career-insight.schema';
import { Career, CareerDocument } from '../careers/schemas/career.schema';
import { BookingSession, BookingSessionDocument } from '../mentoring/schemas/booking-session.schema';
import { User, UserDocument } from '../users/schemas/user.schema';


@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Career.name) private careerModel: Model<CareerDocument>,
    @InjectModel(CareerInsight.name) private careerInsightModel: Model<CareerInsightDocument>,
    @InjectModel(CareerFitResult.name) private careerFitResultModel: Model<CareerFitResultDocument>,
    @InjectModel(BookingSession.name) private bookingSessionModel: Model<BookingSessionDocument>,
    private readonly aiService: AIService,
  ) {}

  async getAllCareers(page: number = 1, limit: number = 10, search?: string, category?: string) {
    const skip = (page - 1) * limit;
    const normalizedCategory = this.normalizeCategory(category);

    // Use aggregation to merge Career and CareerInsight
    // We want all titles from both collections
    const curatedTitles = await this.careerModel.distinct('title', normalizedCategory ? { category: normalizedCategory } : {});
    const insightTitles = normalizedCategory && normalizedCategory !== 'other'
      ? []
      : await this.careerInsightModel.distinct('careerTitle');

    const allTitles = [...new Set([...curatedTitles, ...insightTitles])];

    let filteredTitles = allTitles;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTitles = filteredTitles.filter(t => t.toLowerCase().includes(searchLower));
    }

    // This is a bit inefficient for huge datasets, but for careers it's fine
    // Sort alphabetically for consistency
    filteredTitles.sort((a, b) => a.localeCompare(b));

    const total = filteredTitles.length;
    const paginatedTitles = filteredTitles.slice(skip, skip + limit);

    const [curatedCareers, insights] = await Promise.all([
      this.careerModel.find({ title: { $in: paginatedTitles } }).exec(),
      this.careerInsightModel.find({ careerTitle: { $in: paginatedTitles } }).exec(),
    ]);

    const merged = paginatedTitles.map(title => {
      const curated = curatedCareers.find(c => c.title === title);
      const insight = insights.find(i => i.careerTitle === title);

      if (curated) {
        const curatedObj = curated.toJSON();
        // If curated is missing discoveryData or marketInfo, but we have an insight, merge it
        if (insight) {
          if (!curatedObj.discoveryData || Object.keys(curatedObj.discoveryData).length === 0) {
            curatedObj.discoveryData = {
              pros: insight.analysis.pros || [],
              cons: insight.analysis.cons || [],
              topCompanies: insight.analysis.topCompanies || [],
              trends: insight.analysis.trends || [],
              salarySummary: insight.analysis.salaryRange || 'N/A'
            };
          }
          if (!curatedObj.marketInfo || !curatedObj.marketInfo.demandLevel) {
            curatedObj.marketInfo = {
              demandLevel: insight.analysis.demandLevel || 'medium',
              growthProjection: curatedObj.marketInfo?.growthProjection || 'N/A'
            };
          }
        }
        return curatedObj;
      }

      // If only insight exists, return a skeleton career object with full discovery data
      return {
        id: insight?._id,
        _id: insight?._id,
        title: title,
        category: 'other',
        description: insight?.analysis?.overview || 'AI Discovered',
        marketInfo: {
          demandLevel: insight?.analysis?.demandLevel || 'medium',
          growthProjection: 'N/A'
        },
        discoveryData: insight ? {
          pros: insight.analysis.pros || [],
          cons: insight.analysis.cons || [],
          topCompanies: insight.analysis.topCompanies || [],
          trends: insight.analysis.trends || [],
          salarySummary: insight.analysis.salaryRange || 'N/A'
        } : undefined,
        isDraft: true
      };
    });

    return { careers: merged, total };
  }

  async checkCareerTitleDuplicate(title: string) {
    const career = await this.careerModel.findOne({ title: { $regex: `^${title}$`, $options: 'i' } }).exec();
    return !!career;
  }

  async generateCareerWithAI(title: string) {
    const exists = await this.checkCareerTitleDuplicate(title);
    if (exists) {
      return { error: 'Ngành này đã tồn tại trong hệ thống.' };
    }
    return this.aiService.generateFullCareerData(title);
  }

  async createCareer(data: Partial<Career>) {
    const career = new this.careerModel(data);
    if (!career.slug) {
      if (data.title) {
        career.slug = data.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      }
    }
    const saved = await career.save();
    await this.syncToInsight(saved);
    return saved;
  }

  async updateCareer(id: string, data: Partial<Career>) {
    const updated = await this.careerModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (updated) {
      await this.syncToInsight(updated);
    }
    return updated;
  }

  async fillMissingData(id: string) {
    const career = await this.careerModel.findById(id).exec();
    if (!career) {
      // If it's a draft (insight), we can just call generateFullCareerData
      const insight = await this.careerInsightModel.findById(id).exec();
      if (insight) {
        return this.aiService.generateFullCareerData(insight.careerTitle);
      }
      return { error: 'Không tìm thấy dữ liệu.' };
    }

    // If it's an existing official career, we want to fill only what's missing
    // For now, we can pass the title to generateFullCareerData and let the admin decide what to keep
    // Or we can implement a more surgical AI prompt.
    // Given the current architecture, generating full data and letting the frontend merge is safest.
    return this.aiService.generateFullCareerData(career.title);
  }

  async deleteCareer(id: string) {
    const career = await this.careerModel.findById(id).exec();
    if (career) {
      await this.careerInsightModel.deleteOne({ careerTitle: career.title }).exec();
      return this.careerModel.findByIdAndDelete(id).exec();
    }
    if (Types.ObjectId.isValid(id)) {
      return this.careerInsightModel.findByIdAndDelete(id).exec();
    }
    return null;
  }

  private normalizeCategory(category?: string): string | undefined {
    if (!category) return undefined;
    const normalized = category.trim().toLowerCase();
    if (!normalized || normalized === 'all') return undefined;
    return normalized.replace(/\s+/g, '_');
  }

  private async syncToInsight(career: CareerDocument) {
    const insightData = {
      careerTitle: career.title,
      analysis: {
        overview: career.description,
        pros: career.discoveryData?.pros || [],
        cons: career.discoveryData?.cons || [],
        trends: career.discoveryData?.trends || [],
        salaryRange: career.discoveryData?.salarySummary || (career.careerLevels?.length
          ? `${career.careerLevels[0].salary[0].min}-${career.careerLevels[0].salary[0].max}`
          : 'N/A'),
        demandLevel: career.marketInfo?.demandLevel || 'medium',
        keySkills: career.skillRequirements?.technical?.map(s => s.skillName) || [],
        topCompanies: career.discoveryData?.topCompanies || []
      },
      lastAIUpdate: new Date()
    };

    try {
      await this.careerInsightModel.findOneAndUpdate(
        { careerTitle: career.title },
        { $set: insightData },
        { upsert: true }
      ).exec();
    } catch (error: unknown) {
      const mongoError = error as { code?: number; message?: string };
      if (mongoError.code === 11000 || mongoError.message?.includes('E11000')) {
        await this.careerInsightModel.findOneAndUpdate(
          { careerTitle: career.title },
          { $set: insightData }
        ).exec();
      } else {
        throw error;
      }
    }
  }

  async deleteUser(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async bulkDeleteUsers(ids: string[]) {
    return this.userModel.deleteMany({ _id: { $in: ids } });
  }


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
        user: (t.userId as unknown as { name?: string })?.name || 'Ẩn danh',
        time: t.createdAt,
        type: 'test',
      })),
    ].sort((a, b) => new Date(b.time as string | number | Date).getTime() - new Date(a.time as string | number | Date).getTime()).slice(0, 5);

    // Popular careers stats (Industries percentage)
    const allResults = await this.careerFitResultModel.find().select('careerTitle').exec();
    const industryCounts: Record<string, number> = {};
    let totalRecommendations = 0;

    for (const res of allResults) {
      if (res.careerTitle) {
        totalRecommendations++;
        const title = res.careerTitle;
        industryCounts[title] = (industryCounts[title] || 0) + 1;
      }
    }


    const popularCareers = Object.entries(industryCounts)
      .map(([name, count]) => ({
        name,
        views: count.toString(),
        matches: `${Math.round((count / totalRecommendations) * 100)}%`,
        delta: '+0%',
      }))
      .sort((a, b) => parseInt(b.views) - parseInt(a.views))
      .slice(0, 5);

    return {
      stats: [
        { title: 'Tổng người dùng', value: totalUsers.toLocaleString(), delta: '+0%', iconType: 'users' },
        { title: 'Bài test hoàn thành', value: totalTests.toLocaleString(), delta: '+0%', iconType: 'test' },
        { title: 'Nghề nghiệp', value: totalCareers.toLocaleString(), delta: '+0%', iconType: 'careers' },
        { title: 'Lượt tư vấn', value: totalSessions.toLocaleString(), delta: '+0%', iconType: 'mentor' },
      ],
      recentActivities,
      popularCareers,
    };
  }


  async getAllUsers(page: number = 1, limit: number = 10, loginType?: string) {
    const skip = (page - 1) * limit;
    const query: FilterQuery<User> = {};

    if (loginType && loginType !== 'Tất cả') {
      query.login_type = loginType === 'Google' ? 'google' : 'password';
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .exec(),
      this.userModel.countDocuments(query),
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
        login_type: u.login_type === LoginType.GOOGLE ? 'Google' : 'Password',

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
