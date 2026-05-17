import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { LoginType, UserRole, UserVerifyStatus } from '../../common/enums';
import { AIService } from '../../common/services/ai.service';
import { AssessmentSession, AssessmentSessionDocument } from '../assessment/schemas/assessment-sesions.schema';
import { SessionStatus } from '../assessment/enums/assessment.enum';
import { CareerFitResult, CareerFitResultDocument } from '../assessment/schemas/career-fit-result.schema';
import { CareerInsight, CareerInsightDocument } from '../careers/schemas/career-insight.schema';
import { Career, CareerCategory, CareerDocument } from '../careers/schemas/career.schema';
import { CareerSkillTagInput, SkillTagService } from '../careers/services/skill-tag.service';
import { BookingSession, BookingSessionDocument } from '../mentoring/schemas/booking-session.schema';
import { Payment, PaymentDocument, PaymentPurpose, PaymentStatus } from '../payment/schema/payment.schema';
import { AiPlan, AiPlanDocument } from '../ai/schema/ai-plan.schema';
import { SubscriptionStatus, UserSubscription, UserSubscriptionDocument } from '../users/schemas/user-subscriptions';
import { User, UserDocument } from '../users/schemas/user.schema';
import { TrackingService } from '../tracking/tracking.service';

type AdminUsersFilters = {
  search?: string;
  role?: string;
  status?: string;
  plan?: string;
  loginType?: string;
};

type AdminFinancePaymentParams = {
  page?: number;
  limit?: number;
  status?: string;
  purpose?: string;
  plan?: string;
  search?: string;
};

type AdminFinanceRange = 'month' | 'quarter' | 'year';
type AdminAnalyticsRange = '6m' | '12m';

type AdminCareerPayload = Partial<Career> & {
  id?: string;
  _id?: string;
  skillTags?: CareerSkillTagInput[];
};

type FinancePaymentUser = {
  name?: string;
  email?: string;
};

type FinancePaymentPlan = {
  name?: string;
};

type FinancePaymentRow = {
  id?: unknown;
  checkoutReference?: string;
  providerPaymentId?: string;
  userId?: unknown;
  planId?: unknown;
  purpose?: PaymentPurpose;
  billingCycle?: string;
  amount?: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  currency?: string;
  provider?: string;
  status?: PaymentStatus;
  createdAt?: Date;
  paidAt?: Date;
  refundedAmount?: number;
  refundedAt?: Date;
  refundReason?: string;
};

type PaymentAmountAggregateRow = {
  total?: number;
};

type CareerDistributionAggregateRow = {
  _id: string;
  count: number;
};


@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Career.name) private careerModel: Model<CareerDocument>,
    @InjectModel(CareerInsight.name) private careerInsightModel: Model<CareerInsightDocument>,
    @InjectModel(CareerFitResult.name) private careerFitResultModel: Model<CareerFitResultDocument>,
    @InjectModel(AssessmentSession.name) private assessmentSessionModel: Model<AssessmentSessionDocument>,
    @InjectModel(BookingSession.name) private bookingSessionModel: Model<BookingSessionDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(AiPlan.name) private aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(UserSubscription.name) private userSubscriptionModel: Model<UserSubscriptionDocument>,
    private readonly aiService: AIService,
    private readonly trackingService: TrackingService,
    private readonly skillTagService: SkillTagService,
  ) {}

  async getAllCareers(page: number = 1, limit: number = 10, search?: string, category?: string): Promise<{ careers: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const normalizedCategory = this.normalizeCategory(category);

    // Use aggregation to merge Career and CareerInsight
    const [curatedTitles, insightTitles] = await Promise.all([
      this.careerModel.distinct('title', normalizedCategory ? { category: normalizedCategory } : {}),
      normalizedCategory && normalizedCategory !== 'other'
        ? []
        : this.careerInsightModel.distinct('careerTitle')
    ]);

    // Create a map of lowercase title -> original title (prefer curated)
    const titleMap = new Map<string, string>();
    curatedTitles.forEach(t => titleMap.set(t.toLowerCase(), t));
    insightTitles.forEach(t => {
      const lower = t.toLowerCase();
      if (!titleMap.has(lower)) {
        titleMap.set(lower, t);
      }
    });

    const uniqueTitles = Array.from(titleMap.values());
    let filteredTitles = uniqueTitles;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTitles = filteredTitles.filter(t => t.toLowerCase().includes(searchLower));
    }
    filteredTitles.sort((a, b) => a.localeCompare(b));
    const total = filteredTitles.length;
    const paginatedTitles = filteredTitles.slice(skip, skip + limit);

    const [curatedCareers, insights] = await Promise.all([
      this.careerModel.find({ title: { $in: paginatedTitles.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }).exec(),
      this.careerInsightModel.find({ careerTitle: { $in: paginatedTitles.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }).exec(),
    ]);

    const merged = paginatedTitles.map(title => {
      const titleLower = title.toLowerCase();
      const curated = curatedCareers.find(c => c.title.toLowerCase() === titleLower);
      const insight = insights.find(i => i.careerTitle.toLowerCase() === titleLower);

      if (curated) {
        const curatedObj = curated.toJSON();
        if (insight && insight.analysis) {
          if (!curatedObj.discoveryData) {
            curatedObj.discoveryData = { pros: [], cons: [], topCompanies: [], trends: [], salarySummary: '' };
          }
          const disc = curatedObj.discoveryData;
          if (!disc.pros?.length) disc.pros = insight.analysis.pros || [];
          if (!disc.cons?.length) disc.cons = insight.analysis.cons || [];
          if (!disc.topCompanies?.length) disc.topCompanies = insight.analysis.topCompanies || [];
          if (!disc.trends?.length) disc.trends = insight.analysis.trends || [];
          if (!disc.salarySummary) disc.salarySummary = insight.analysis.salaryRange || 'N/A';

          if (!curatedObj.marketInfo || !curatedObj.marketInfo.demandLevel) {
            curatedObj.marketInfo = {
              demandLevel: (insight.analysis.demandLevel as unknown as 'low' | 'medium' | 'high' | 'very_high') || 'medium',
              growthProjection: curatedObj.marketInfo?.growthProjection || 'N/A',
              jobAvailability: curatedObj.marketInfo?.jobAvailability || 3,
              competitionLevel: curatedObj.marketInfo?.competitionLevel || 'medium',
              automationRisk: curatedObj.marketInfo?.automationRisk || 'low',
            };
          }
          if (!curatedObj.description) {
            curatedObj.description = insight.analysis.overview || '';
          }
        }
        return {
          ...curatedObj,
          id: (curatedObj.id || curatedObj._id) as unknown as string,
          isDraft: false,
        };
      }

      return {
        id: insight?._id as unknown as string,
        _id: insight?._id as unknown as string,
        title: title,
        category: 'other',
        description: insight?.analysis?.overview || 'AI Discovered',
        marketInfo: {
          demandLevel: (insight?.analysis?.demandLevel as unknown as 'low' | 'medium' | 'high' | 'very_high') || 'medium',
          growthProjection: 'N/A',
          jobAvailability: 3,
          competitionLevel: 'medium',
          automationRisk: 'low',
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
    const data = await this.aiService.generateFullCareerData(title);
    return this.normalizeAIData(data);
  }

  async createCareer(data: AdminCareerPayload) {
    try {
      const { careerData, skillTags } = this.extractCareerSkillTags(data);
      if (careerData.category) {
        careerData.category = careerData.category.toLowerCase() as unknown as CareerCategory;
      }
      const career = new this.careerModel(careerData);
      if (!career.slug && careerData.title) {
        career.slug = careerData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      }
      const saved = await career.save();
      await this.syncToInsight(saved);
      await this.skillTagService.syncForCareer(saved, skillTags);
      return saved;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      this.logger.error('Error creating career:', error);
      return { error: errorMessage || 'Không thể tạo nghề nghiệp' };
    }
  }

  async updateCareer(id: string, data: AdminCareerPayload) {
    if (!Types.ObjectId.isValid(id)) {
      return { error: 'ID nghề nghiệp không hợp lệ.' };
    }
    try {
      const { careerData, skillTags } = this.extractCareerSkillTags(data);
      if (careerData.category) {
        careerData.category = careerData.category.toLowerCase() as unknown as CareerCategory;
      }
      const oldCareer = await this.careerModel.findById(id).exec();
      let updated = await this.careerModel.findByIdAndUpdate(id, careerData, { new: true }).exec();
      if (!updated) {
        const insight = await this.careerInsightModel.findById(id).exec();
        if (insight) {
          const formalCareerData: Record<string, unknown> = { ...careerData };
          delete formalCareerData['_id'];
          delete formalCareerData['id'];
          const career = new this.careerModel(formalCareerData);
          if (!career.slug && career.title) {
            career.slug = career.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
          }
          updated = await career.save();
        } else {
          return null;
        }
      }
      if (updated) {
        if (oldCareer && oldCareer.title.toLowerCase() !== updated.title.toLowerCase()) {
          await this.careerInsightModel.deleteOne({ careerTitle: oldCareer.title }).exec();
        }
        await this.syncToInsight(updated);
        await this.skillTagService.syncForCareer(updated, skillTags, oldCareer?.title);
      }
      return updated;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      this.logger.error('Error updating career:', error);
      return { error: errorMessage || 'Không thể cập nhật nghề nghiệp' };
    }
  }

  async fillMissingData(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return { error: 'ID nghề nghiệp không hợp lệ.' };
    }
    const career = await this.careerModel.findById(id).exec();
    let data: unknown;

    if (!career) {
      const insight = await this.careerInsightModel.findById(id).exec();
      if (insight) {
        data = await this.aiService.generateFullCareerData(insight.careerTitle);
      } else {
        return { error: 'Không tìm thấy dữ liệu.' };
      }
    } else {
      data = await this.aiService.generateFullCareerData(career.title);
    }

    return this.normalizeAIData(data);
  }

  private normalizeAIData(data: unknown) {
    if (!data || typeof data !== 'object') return data;

    const result = data as Record<string, unknown>;

    // Normalize category
    if (result.category && typeof result.category === 'string') {
      result.category = result.category.toLowerCase();
    }
    
    // Normalize marketInfo
    if (result.marketInfo && typeof result.marketInfo === 'object' && !Array.isArray(result.marketInfo)) {
      const marketInfo = result.marketInfo as Record<string, unknown>;
      if (marketInfo.demandLevel && typeof marketInfo.demandLevel === 'string') {
        const dl = marketInfo.demandLevel.toLowerCase();
        if (dl.includes('rất cao')) marketInfo.demandLevel = 'very_high';
        else if (dl.includes('rất thấp')) marketInfo.demandLevel = 'very_low';
        else if (dl.includes('cao')) marketInfo.demandLevel = 'high';
        else if (dl.includes('thấp')) marketInfo.demandLevel = 'low';
        else if (dl.includes('trung bình')) marketInfo.demandLevel = 'medium';
        else if (dl.includes('very high')) marketInfo.demandLevel = 'very_high';
        else if (dl.includes('very low')) marketInfo.demandLevel = 'very_low';
        else marketInfo.demandLevel = dl;
      }
    }

    // Normalize discoveryData
    if (result.discoveryData && typeof result.discoveryData === 'object' && !Array.isArray(result.discoveryData)) {
      const discoveryData = result.discoveryData as Record<string, unknown>;
      discoveryData.salarySummary = (discoveryData.salarySummary as string) || (discoveryData.salaryRange as string) || '';
    }

    return result;
  }

  async deleteCareer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return { error: 'ID nghề nghiệp không hợp lệ.' };
    }
    const career = await this.careerModel.findById(id).exec();
    if (career) {
      await this.careerInsightModel.deleteOne({ careerTitle: career.title }).exec();
      await this.skillTagService.unlinkCareer(career._id, career.title);
      return this.careerModel.findByIdAndDelete(id).exec();
    }
    return this.careerInsightModel.findByIdAndDelete(id).exec();
  }

  private extractCareerSkillTags(data: AdminCareerPayload): {
    careerData: Partial<Career> & { id?: string; _id?: string };
    skillTags?: CareerSkillTagInput[];
  } {
    const { skillTags, ...careerData } = data;
    return {
      careerData,
      skillTags: Array.isArray(skillTags) ? skillTags : undefined,
    };
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

  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    filters: AdminUsersFilters = {},
  ) {
    const safePage = this.toPositiveInteger(page, 1);
    const safeLimit = Math.min(this.toPositiveInteger(limit, 10), 100);
    const skip = (safePage - 1) * safeLimit;
    const query: FilterQuery<User> = {};

    if (filters.search?.trim()) {
      const normalizedSearch = filters.search.trim();
      const regex = new RegExp(this.escapeRegex(normalizedSearch), 'i');
      const phoneDigits = normalizedSearch.replace(/\D/g, '');
      const searchConditions: FilterQuery<User>[] = [{ name: regex }, { email: regex }, { phone_number: regex }];
      if (phoneDigits.length >= 3) {
        const loosePhoneRegex = new RegExp(
          phoneDigits
            .split('')
            .map((char) => this.escapeRegex(char))
            .join('\\D*'),
          'i',
        );
        searchConditions.push({ phone_number: loosePhoneRegex });
      }
      query.$or = searchConditions;
    }

    const role = this.normalizeRoleFilter(filters.role);
    if (role) query.role = role;

    const loginType = this.normalizeLoginTypeFilter(filters.loginType);
    if (loginType) query.login_type = loginType;

    const verify = this.normalizeUserStatusFilter(filters.status);
    if (verify !== undefined) query.verify = verify;

    const planUserIds = await this.resolvePlanFilterUserIds(filters.plan);
    if (planUserIds) {
      query._id = { $in: planUserIds };
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .skip(skip)
        .limit(safeLimit)
        .sort({ created_at: -1 })
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    const userIds = users.map((u) => u._id);
    const [testCounts, subscriptionPlans] = await Promise.all([
      this.careerFitResultModel.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      this.loadCurrentPlansForUsers(userIds),
    ]);

    const testCountMap = (testCounts as { _id: Types.ObjectId; count: number }[]).reduce(
      (acc: Record<string, number>, curr) => {
        acc[curr._id.toString()] = curr.count;
        return acc;
      },
      {},
    );

    return {
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        phone_number: u.phone_number,
        role: u.role,
        login_type: u.login_type === LoginType.GOOGLE ? 'Google' : 'Password',
        plan: subscriptionPlans[u._id.toString()] || 'Free',
        status: u.verify === UserVerifyStatus.Banned ? 'Bị khóa' : 'Hoạt động',
        joined: u.created_at,
        tests: testCountMap[u._id.toString()] || 0,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async getFinanceSummary(rangeValue?: string) {
    const range = this.normalizeFinanceRange(rangeValue);
    const current = this.getDateRange(range);
    const previous = this.getPreviousDateRange(current);

    const [
      currentRevenue,
      previousRevenue,
      currentTransactions,
      previousTransactions,
      systemBalance,
      statusCounts,
    ] = await Promise.all([
      this.sumPaymentAmount({ status: PaymentStatus.PAID, paidAt: { $gte: current.from, $lt: current.to } }),
      this.sumPaymentAmount({ status: PaymentStatus.PAID, paidAt: { $gte: previous.from, $lt: previous.to } }),
      this.paymentModel.countDocuments({ createdAt: { $gte: current.from, $lt: current.to } }).exec(),
      this.paymentModel.countDocuments({ createdAt: { $gte: previous.from, $lt: previous.to } }).exec(),
      this.sumPaymentAmount({ status: PaymentStatus.PAID }),
      this.paymentModel.aggregate([
        { $match: { createdAt: { $gte: current.from, $lt: current.to } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = (statusCounts as { _id: PaymentStatus; count: number }[]).reduce(
      (acc: Record<string, number>, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    return {
      range,
      currency: 'VND',
      totalRevenue: currentRevenue,
      revenueDelta: this.calculateDelta(currentRevenue, previousRevenue),
      transactionCount: currentTransactions,
      transactionDelta: this.calculateDelta(currentTransactions, previousTransactions),
      systemBalance,
      paidCount: counts[PaymentStatus.PAID] || 0,
      pendingCount: counts[PaymentStatus.PENDING] || 0,
      failedCount: counts[PaymentStatus.FAILED] || 0,
      cancelledCount: counts[PaymentStatus.CANCELLED] || 0,
      refundedCount: counts[PaymentStatus.REFUNDED] || 0,
    };
  }

  async getFinancePayments(params: AdminFinancePaymentParams = {}) {
    const page = this.toPositiveInteger(params.page, 1);
    const limit = Math.min(this.toPositiveInteger(params.limit, 10), 100);
    const filter: Record<string, unknown> = {};

    if (params.status && params.status !== 'all') {
      filter.status = params.status;
    }
    if (params.purpose && params.purpose !== 'all') {
      filter.purpose = params.purpose;
    }

    const planIds = await this.resolvePlanIds(params.plan);
    if (planIds) {
      filter.planId = { $in: planIds };
    }

    if (params.search?.trim()) {
      const search = params.search.trim();
      const regex = new RegExp(this.escapeRegex(search), 'i');
      const users = await this.userModel
        .find({ $or: [{ name: regex }, { email: regex }] })
        .select('_id')
        .limit(200)
        .exec();
      filter.$or = [
        { checkoutReference: regex },
        { providerPaymentId: regex },
        { userId: { $in: users.map((user) => user._id) } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('planId', 'name')
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      payments: payments.map((payment) => this.serializeFinancePayment(payment)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAnalytics(rangeValue?: string) {
    const range = this.normalizeAnalyticsRange(rangeValue);
    const months = range === '6m' ? 6 : 12;
    const current = this.getRollingRangeByMonths(months);
    const previous = this.getPreviousDateRange(current);
    const weekBuckets = this.buildRecentWeekBuckets(6);
    const monthBuckets = this.buildRecentMonthBuckets(months);

    const [
      visits,
      previousVisits,
      activeUsers,
      previousActiveUsers,
      sessionsTotal,
      sessionsCompleted,
      previousSessionsTotal,
      previousSessionsCompleted,
      mentorBookings,
      previousMentorBookings,
      userGrowth,
      assessmentCompletions,
      careerDistribution,
      recentTracking,
    ] = await Promise.all([
      this.trackingService.countPageViews(current.from, current.to),
      this.trackingService.countPageViews(previous.from, previous.to),
      this.trackingService.countActiveVisitors(current.from, current.to),
      this.trackingService.countActiveVisitors(previous.from, previous.to),
      this.assessmentSessionModel.countDocuments({ createdAt: { $gte: current.from, $lt: current.to } }).exec(),
      this.assessmentSessionModel
        .countDocuments({
          status: SessionStatus.COMPLETED,
          createdAt: { $gte: current.from, $lt: current.to },
        })
        .exec(),
      this.assessmentSessionModel.countDocuments({ createdAt: { $gte: previous.from, $lt: previous.to } }).exec(),
      this.assessmentSessionModel
        .countDocuments({
          status: SessionStatus.COMPLETED,
          createdAt: { $gte: previous.from, $lt: previous.to },
        })
        .exec(),
      this.bookingSessionModel.countDocuments({ createdAt: { $gte: current.from, $lt: current.to } }).exec(),
      this.bookingSessionModel.countDocuments({ createdAt: { $gte: previous.from, $lt: previous.to } }).exec(),
      this.countUsersByBuckets(monthBuckets),
      this.countAssessmentsByBuckets(weekBuckets),
      this.getCareerDistribution(current.from, current.to),
      this.trackingService.listEvents({ page: 1, limit: 8 }),
    ]);

    const completionRate = this.calculateRate(sessionsCompleted, sessionsTotal);
    const previousCompletionRate = this.calculateRate(previousSessionsCompleted, previousSessionsTotal);

    return {
      range,
      stats: {
        totalVisits: {
          value: visits,
          delta: this.calculateDelta(visits, previousVisits),
        },
        activeUsers: {
          value: activeUsers,
          delta: this.calculateDelta(activeUsers, previousActiveUsers),
        },
        assessmentCompletionRate: {
          value: completionRate,
          delta: completionRate - previousCompletionRate,
        },
        mentorBookings: {
          value: mentorBookings,
          delta: this.calculateDelta(mentorBookings, previousMentorBookings),
        },
      },
      userGrowth,
      assessmentCompletions,
      careerDistribution,
      trackingEvents: recentTracking.events,
    };
  }

  getTrackingEvents(params: {
    page?: number;
    limit?: number;
    eventType?: string;
    path?: string;
  }) {
    return this.trackingService.listEvents(params);
  }

  async updateUserStatus(id: string, status: string) {
    const verify = this.normalizeUserStatusFilter(status) ?? UserVerifyStatus.Verified;
    return this.userModel.findByIdAndUpdate(id, { verify }, { new: true });
  }

  async updateUserRole(id: string, role: UserRole) {
    return this.userModel.findByIdAndUpdate(id, { role }, { new: true });
  }

  private async loadCurrentPlansForUsers(userIds: Types.ObjectId[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};

    const subscriptions = await this.userSubscriptionModel
      .find({
        userId: { $in: userIds },
        status: SubscriptionStatus.ACTIVE,
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: new Date() } }],
      })
      .sort({ startDate: -1, createdAt: -1 })
      .populate('planId', 'name')
      .exec();

    return subscriptions.reduce((acc: Record<string, string>, subscription) => {
      const userId = subscription.userId.toString();
      if (acc[userId]) return acc;
      const populatedPlan = subscription.planId as unknown as { name?: string };
      acc[userId] = populatedPlan?.name || 'Free';
      return acc;
    }, {});
  }

  private async resolvePlanFilterUserIds(plan?: string): Promise<Types.ObjectId[] | undefined> {
    const normalized = plan?.trim();
    if (!normalized || normalized === 'all' || normalized === 'Tất cả') return undefined;
    if (normalized.toLowerCase() === 'free') {
      const paidPlans = await this.aiPlanModel.find({ price: { $gt: 0 } }).select('_id').exec();
      const paidSubs = await this.userSubscriptionModel
        .find({
          planId: { $in: paidPlans.map((paidPlan) => paidPlan._id) },
          status: SubscriptionStatus.ACTIVE,
          $or: [{ endDate: { $exists: false } }, { endDate: { $gte: new Date() } }],
        })
        .select('userId')
        .exec();
      const paidUserIds = paidSubs.map((subscription) => subscription.userId);
      const freeUsers = await this.userModel
        .find({ _id: { $nin: paidUserIds } })
        .select('_id')
        .exec();
      return freeUsers.map((user) => user._id);
    }

    const planIds = await this.resolvePlanIds(normalized);
    if (!planIds || planIds.length === 0) return [];
    const subscriptions = await this.userSubscriptionModel
      .find({
        planId: { $in: planIds },
        status: SubscriptionStatus.ACTIVE,
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: new Date() } }],
      })
      .select('userId')
      .exec();
    return subscriptions.map((subscription) => subscription.userId);
  }

  private async resolvePlanIds(plan?: string): Promise<Types.ObjectId[] | undefined> {
    const normalized = plan?.trim();
    if (!normalized || normalized === 'all' || normalized === 'Tất cả') return undefined;
    if (normalized.toLowerCase() === 'free') return [];

    const regex = new RegExp(`^${this.escapeRegex(normalized)}$`, 'i');
    const plans = await this.aiPlanModel.find({ name: regex }).select('_id').exec();
    return plans.map((planDoc) => planDoc._id);
  }

  private serializeFinancePayment(payment: PaymentDocument) {
    const row = payment.toJSON() as FinancePaymentRow;
    const user = this.isFinancePaymentUser(row.userId) ? row.userId : undefined;
    const plan = this.isFinancePaymentPlan(row.planId) ? row.planId : undefined;
    const subtotalAmount = Number(row.subtotalAmount);
    const creditAppliedAmount = Number(row.creditAppliedAmount || 0);
    const amount = Number(row.amount || 0);
    const totalAmount = Number.isFinite(subtotalAmount) && subtotalAmount > 0
      ? subtotalAmount
      : amount + creditAppliedAmount;
    const eventDate = row.status === PaymentStatus.REFUNDED
      ? row.refundedAt || row.paidAt || row.createdAt
      : row.status === PaymentStatus.PAID
        ? row.paidAt || row.createdAt
        : row.createdAt;
    return {
      id: row.id,
      checkoutReference: row.checkoutReference,
      providerPaymentId: row.providerPaymentId,
      userName: user?.name || 'N/A',
      userEmail: user?.email || 'N/A',
      planName: plan?.name || (row.purpose === PaymentPurpose.MENTOR_BOOKING ? 'Mentor booking' : 'N/A'),
      purpose: row.purpose,
      billingCycle: row.billingCycle,
      amount,
      subtotalAmount: Number.isFinite(subtotalAmount) ? subtotalAmount : undefined,
      creditAppliedAmount,
      totalAmount,
      currency: row.currency,
      provider: row.provider,
      status: row.status,
      createdAt: row.createdAt,
      paidAt: row.paidAt,
      refundedAmount: row.refundedAmount,
      refundedAt: row.refundedAt,
      refundReason: row.refundReason,
      eventDate,
    };
  }

  private async sumPaymentAmount(filter: Record<string, unknown>): Promise<number> {
    const result = await this.paymentModel.aggregate<PaymentAmountAggregateRow>([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ['$subtotalAmount', 0] }, 0] },
                '$subtotalAmount',
                { $add: [{ $ifNull: ['$amount', 0] }, { $ifNull: ['$creditAppliedAmount', 0] }] },
              ],
            },
          },
        },
      },
    ]);
    return Number(result[0]?.total || 0);
  }

  private async countUsersByBuckets(buckets: { label: string; from: Date; to: Date }[]) {
    const values = await Promise.all(
      buckets.map((bucket) =>
        this.userModel.countDocuments({ created_at: { $gte: bucket.from, $lt: bucket.to } }).exec(),
      ),
    );
    return buckets.map((bucket, index) => ({ label: bucket.label, value: values[index] }));
  }

  private async countAssessmentsByBuckets(buckets: { label: string; from: Date; to: Date }[]) {
    const values = await Promise.all(
      buckets.map((bucket) =>
        this.assessmentSessionModel
          .countDocuments({
            status: SessionStatus.COMPLETED,
            completedAt: { $gte: bucket.from, $lt: bucket.to },
          })
          .exec(),
      ),
    );
    return buckets.map((bucket, index) => ({ label: bucket.label, value: values[index] }));
  }

  private async getCareerDistribution(from: Date, to: Date) {
    const rows = await this.careerFitResultModel.aggregate<CareerDistributionAggregateRow>([
      {
        $match: {
          careerTitle: { $exists: true, $ne: '' },
          createdAt: { $gte: from, $lt: to },
        },
      },
      { $group: { _id: '$careerTitle', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return rows.map((row) => ({
      name: row._id,
      value: total > 0 ? Math.round((row.count / total) * 100) : 0,
      count: row.count,
    }));
  }

  private isFinancePaymentUser(value: unknown): value is FinancePaymentUser {
    return Boolean(value) && typeof value === 'object';
  }

  private isFinancePaymentPlan(value: unknown): value is FinancePaymentPlan {
    return Boolean(value) && typeof value === 'object';
  }

  private normalizeRoleFilter(role?: string): UserRole | undefined {
    if (!role || role === 'all' || role === 'Tất cả') return undefined;
    const value = role.toLowerCase();
    if (value === 'student' || value === 'user' || value === 'sinh viên') return UserRole.USER;
    if (value === 'mentor') return UserRole.MENTOR;
    if (value === 'admin') return UserRole.ADMIN;
    return undefined;
  }

  private normalizeLoginTypeFilter(loginType?: string): LoginType | undefined {
    if (!loginType || loginType === 'all' || loginType === 'Tất cả') return undefined;
    const value = loginType.toLowerCase();
    if (value === 'google') return LoginType.GOOGLE;
    if (value === 'password') return LoginType.PASSWORD;
    return undefined;
  }

  private normalizeUserStatusFilter(status?: string): UserVerifyStatus | undefined {
    if (!status || status === 'all' || status === 'Tất cả') return undefined;
    const value = status.toLowerCase();
    if (value === 'active' || value.includes('hoạt')) return UserVerifyStatus.Verified;
    if (value === 'banned' || value.includes('khóa') || value.includes('khoa')) {
      return UserVerifyStatus.Banned;
    }
    return undefined;
  }

  private normalizeFinanceRange(range?: string): AdminFinanceRange {
    return range === 'quarter' || range === 'year' ? range : 'month';
  }

  private normalizeAnalyticsRange(range?: string): AdminAnalyticsRange {
    return range === '6m' ? '6m' : '12m';
  }

  private getDateRange(range: AdminFinanceRange): { from: Date; to: Date } {
    const now = new Date();
    const to = now;
    if (range === 'year') {
      return { from: new Date(now.getFullYear(), 0, 1), to };
    }
    if (range === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return { from: new Date(now.getFullYear(), quarterStartMonth, 1), to };
    }
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  }

  private getRollingRangeByMonths(months: number): { from: Date; to: Date } {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth() - months + 1, 1),
      to: now,
    };
  }

  private getPreviousDateRange(range: { from: Date; to: Date }): { from: Date; to: Date } {
    const duration = range.to.getTime() - range.from.getTime();
    return {
      from: new Date(range.from.getTime() - duration),
      to: range.from,
    };
  }

  private buildRecentMonthBuckets(months: number): { label: string; from: Date; to: Date }[] {
    const now = new Date();
    return Array.from({ length: months }).map((_, index) => {
      const monthOffset = months - 1 - index;
      const from = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 1);
      return {
        label: `T${from.getMonth() + 1}`,
        from,
        to,
      };
    });
  }

  private buildRecentWeekBuckets(weeks: number): { label: string; from: Date; to: Date }[] {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return Array.from({ length: weeks }).map((_, index) => {
      const weekOffset = weeks - 1 - index;
      const to = new Date(end);
      to.setDate(end.getDate() - weekOffset * 7);
      const from = new Date(to);
      from.setDate(to.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return {
        label: `Tuần ${index + 1}`,
        from,
        to,
      };
    });
  }

  private calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private calculateRate(part: number, total: number): number {
    if (total === 0) return 0;
    return Number(((part / total) * 100).toFixed(1));
  }

  private toPositiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
