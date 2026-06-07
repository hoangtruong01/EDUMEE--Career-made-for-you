import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';
import { AiFeature, AiUsageLog, AiUsageLogDocument } from '../schema/ai-usage-logs.schema';
import { CareerFitResult, CareerFitResultDocument } from '../../assessment/schemas/career-fit-result.schema';
import {
  SubscriptionStatus,
  UserSubscription,
  UserSubscriptionDocument,
} from '../../users/schemas/user-subscriptions';

type LimitKey =
  | 'assessmentsPerMonth'
  | 'chatMessagesPerMonth'
  | 'simulationsPerMonth'
  | 'careerRecommendationRunsPerMonth'
  | 'careerComparisonsPerMonth'
  | 'personalizedRoadmapsPerMonth'
  | 'mentorBookingsPerMonth';

const FEATURE_TO_LIMIT_KEY: Partial<Record<AiFeature, LimitKey>> = {
  [AiFeature.ASSESSMENT]: 'assessmentsPerMonth',
  [AiFeature.CHATBOT]: 'chatMessagesPerMonth',
  [AiFeature.SIMULATION]: 'simulationsPerMonth',
  [AiFeature.CAREER_RECOMMENDATION]: 'careerRecommendationRunsPerMonth',
  [AiFeature.CAREER_COMPARISON]: 'careerComparisonsPerMonth',
  [AiFeature.PERSONALIZED_ROADMAP]: 'personalizedRoadmapsPerMonth',
  [AiFeature.MENTOR_BOOKING]: 'mentorBookingsPerMonth',
};

const FEATURE_TO_FLAG_KEY: Partial<Record<AiFeature, keyof AiPlan['features']>> = {
  [AiFeature.CAREER_RECOMMENDATION]: 'careerRecommendation',
  [AiFeature.CAREER_COMPARISON]: 'careerComparison',
  [AiFeature.PERSONALIZED_ROADMAP]: 'personalizedRoadmap',
  [AiFeature.SIMULATION]: 'jobSimulation',
  [AiFeature.MENTOR_BOOKING]: 'mentorBooking',
  [AiFeature.CHATBOT]: 'aiChatbot',
};

type QuotaPeriodContext = {
  periodStart: Date;
  periodEnd: Date;
  nextResetAt: Date;
  month: number;
  year: number;
};

type AiPlanContext = {
  plan: AiPlanDocument;
  subscription?: UserSubscriptionDocument | null;
  quotaPeriod: QuotaPeriodContext;
};

type QuotaResetPolicy = 'periodic' | 'lifetime' | 'unlimited';

type QuotaView = {
  feature: AiFeature;
  month: number;
  year: number;
  periodStart: Date;
  periodEnd: Date;
  nextResetAt: Date;
  limit?: number;
  used: number;
  remaining?: number;
  unlimited: boolean;
  resetPolicy: QuotaResetPolicy;
};

type PlanGateErrorCode = 'AI_PLAN_REQUIRED' | 'PLAN_FEATURE_DISABLED' | 'PLAN_QUOTA_EXCEEDED';

type QuotaUsageInput = { tokensUsed?: number; requestCount?: number };

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(AiUsageLog.name)
    private readonly aiUsageLogModel: Model<AiUsageLogDocument>,
    @InjectModel(CareerFitResult.name)
    private readonly careerFitResultModel: Model<CareerFitResultDocument>,
  ) {}

  async getActivePlanForUser(userId: string): Promise<AiPlanDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    await this.expireStaleSubscriptions(userId);
    const sub = await this.findActiveSubscription(userId);
    if (!sub) return null;
    await this.ensureSubscriptionQuotaPeriod(sub, new Date());
    return this.aiPlanModel.findById(sub.planId).exec();
  }

  async getPlanForUserOrFree(userId: string): Promise<AiPlanDocument | null> {
    const context = await this.getPlanContext(userId);
    return context?.plan || null;
  }

  async assertFeatureAvailable(userId: string, feature: AiFeature, now = new Date()): Promise<void> {
    const context = await this.getPlanContext(userId, now);
    if (!context) {
      this.throwPlanRequired(feature);
    }

    this.assertFeatureEnabled(context.plan, feature);
  }

  async checkQuota(userId: string, feature: AiFeature, now = new Date()): Promise<void> {
    const context = await this.getPlanContext(userId, now);
    if (!context) {
      this.logger.error(`No plan found for user ${userId}`);
      this.throwPlanRequired(feature);
    }
    const { plan, quotaPeriod } = context;
    this.logger.log(`Using plan ${plan.name} for user ${userId}`);

    this.assertFeatureEnabled(plan, feature);

    const limitKey = FEATURE_TO_LIMIT_KEY[feature];
    if (!limitKey) return; // No limit configured for this feature.

    if (feature === AiFeature.ASSESSMENT) {
      await this.assertAssessmentQuotaLimits(plan, userId, quotaPeriod);
      return;
    }

    const limit = plan.limits?.[limitKey];
    if (typeof limit !== 'number') return; // Unlimited when not specified.

    const usage = await this.aiUsageLogModel
      .findOne(this.buildUsagePeriodFilter(userId, feature, quotaPeriod))
      .exec();
    const used = usage?.requestCount || 0;
    this.logger.log(`User ${userId} used ${used}/${limit} for ${feature}`);
    if (used >= limit) {
      this.logger.warn(`Quota exceeded for user ${userId} on ${feature}`);
      this.throwQuotaExceeded(plan, this.buildQuotaView(feature, limit, used, quotaPeriod));
    }
  }

  async consumeQuota(
    userId: string,
    feature: AiFeature,
    usage: QuotaUsageInput,
    now = new Date(),
  ): Promise<void> {
    if (feature === AiFeature.ASSESSMENT) return;

    const context = await this.getPlanContext(userId, now);
    if (!context) this.throwPlanRequired(feature);
    const { plan, quotaPeriod } = context;
    this.assertFeatureEnabled(plan, feature);

    const existingUsage = await this.aiUsageLogModel
      .findOne(this.buildUsagePeriodFilter(userId, feature, quotaPeriod))
      .exec();

    const update = {
      $inc: {
        tokensUsed: usage.tokensUsed ?? 0,
        requestCount: usage.requestCount ?? 1,
      },
      $set: {
        month: quotaPeriod.month,
        year: quotaPeriod.year,
        periodStart: quotaPeriod.periodStart,
        periodEnd: quotaPeriod.periodEnd,
      },
      $setOnInsert: { userId: new Types.ObjectId(userId), feature },
    };

    await this.aiUsageLogModel
      .updateOne(
        existingUsage?._id
          ? { _id: existingUsage._id }
          : {
              userId: new Types.ObjectId(userId),
              feature,
              periodStart: quotaPeriod.periodStart,
              periodEnd: quotaPeriod.periodEnd,
            },
        update,
        { upsert: true },
      )
      .exec();
  }

  async refundQuota(
    userId: string,
    feature: AiFeature,
    usage: QuotaUsageInput = { requestCount: 1, tokensUsed: 0 },
    now = new Date(),
  ): Promise<void> {
    if (feature === AiFeature.ASSESSMENT) return;
    if (!Types.ObjectId.isValid(userId)) return;

    const requestCount = Math.max(0, usage.requestCount ?? 1);
    const tokensUsed = Math.max(0, usage.tokensUsed ?? 0);
    if (requestCount <= 0 && tokensUsed <= 0) return;

    const context = await this.getPlanContext(userId, now).catch(() => null);
    const baseFilter = context
      ? this.buildUsagePeriodFilter(userId, feature, context.quotaPeriod)
      : { userId: new Types.ObjectId(userId), feature };

    const existingUsage = await this.aiUsageLogModel
      .findOne({
        ...baseFilter,
        $and: [
          ...(Array.isArray((baseFilter as Record<string, unknown>).$and)
            ? ((baseFilter as Record<string, unknown>).$and as Record<string, unknown>[])
            : []),
          { requestCount: { $gt: 0 } },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!existingUsage) return;

    existingUsage.requestCount = Math.max(0, Number(existingUsage.requestCount || 0) - requestCount);
    existingUsage.tokensUsed = Math.max(0, Number(existingUsage.tokensUsed || 0) - tokensUsed);
    await existingUsage.save();
  }

  async runWithQuota<T>(
    userId: string,
    feature: AiFeature,
    action: () => Promise<T>,
    usage: QuotaUsageInput = { requestCount: 1, tokensUsed: 0 },
    now = new Date(),
  ): Promise<T> {
    await this.checkQuota(userId, feature, now);
    const result = await action();
    await this.consumeQuota(userId, feature, usage, now);
    return result;
  }

  private assertFeatureEnabled(plan: AiPlan, feature: AiFeature): void {
    // Assessment attempts are always allowed; the quota (limits) controls it.
    if (feature === AiFeature.ASSESSMENT) return;

    // For gated features, require an explicit `true` flag. Missing/undefined means disabled.
    const flagKey = FEATURE_TO_FLAG_KEY[feature];
    if (!flagKey) return;

    const enabled = plan.features?.[flagKey];
    if (enabled !== true) {
      this.throwFeatureDisabled(plan, feature);
    }
  }

  private throwPlanRequired(feature?: AiFeature): never {
    throw new HttpException(
      {
        message: 'AI plan is required',
        error: 'AI_PLAN_REQUIRED',
        code: 'AI_PLAN_REQUIRED' satisfies PlanGateErrorCode,
        feature,
        recommendedAction: 'upgrade_plan',
      },
      HttpStatus.FORBIDDEN,
    );
  }

  private throwFeatureDisabled(plan: AiPlan, feature: AiFeature): never {
    throw new HttpException(
      {
        message: 'AI feature is not available in your plan',
        error: 'PLAN_FEATURE_DISABLED',
        code: 'PLAN_FEATURE_DISABLED' satisfies PlanGateErrorCode,
        feature,
        currentPlan: this.resolveCurrentPlanCode(plan),
        planName: plan.name,
        recommendedAction: 'upgrade_plan',
      },
      HttpStatus.FORBIDDEN,
    );
  }

  private throwQuotaExceeded(plan: AiPlan, quota: QuotaView): never {
    throw new HttpException(
      {
        message: 'AI quota exceeded',
        error: 'PLAN_QUOTA_EXCEEDED',
        code: 'PLAN_QUOTA_EXCEEDED' satisfies PlanGateErrorCode,
        feature: quota.feature,
        currentPlan: this.resolveCurrentPlanCode(plan),
        planName: plan.name,
        quota: this.toQuotaErrorView(quota),
        nextResetAt: quota.nextResetAt,
        recommendedAction: quota.resetPolicy === 'periodic' ? 'wait_for_reset_or_upgrade' : 'upgrade_plan',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private buildQuotaView(
    feature: AiFeature,
    limit: number,
    used: number,
    quotaPeriod: QuotaPeriodContext,
    resetPolicy: QuotaResetPolicy = 'periodic',
  ): QuotaView {
    return {
      feature,
      month: quotaPeriod.month,
      year: quotaPeriod.year,
      periodStart: quotaPeriod.periodStart,
      periodEnd: quotaPeriod.periodEnd,
      nextResetAt: quotaPeriod.nextResetAt,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      unlimited: false,
      resetPolicy,
    };
  }

  private toQuotaErrorView(quota: QuotaView): Record<string, unknown> {
    return {
      used: quota.used,
      limit: quota.limit ?? 0,
      remaining: quota.remaining ?? 0,
      periodStart: quota.periodStart,
      periodEnd: quota.periodEnd,
      nextResetAt: quota.nextResetAt,
      resetPolicy: quota.resetPolicy,
    };
  }

  private resolveCurrentPlanCode(plan: Pick<AiPlan, 'name' | 'price' | 'isDefaultPlan' | 'features' | 'seatLimit'>): 'free' | 'plus' | 'business' {
    if (plan.isDefaultPlan || (typeof plan.price === 'number' && plan.price <= 0)) {
      return 'free';
    }

    const normalized = plan.name?.trim().toLowerCase() || '';
    const isBusinessPlan =
      normalized.includes('business') ||
      plan.features?.teamDashboard === true ||
      plan.features?.multiUserManagement === true ||
      Number(plan.seatLimit || 0) > 0;

    return isBusinessPlan ? 'business' : 'plus';
  }

  private getMonthYear(now: Date): { month: number; year: number } {
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  async getRemainingQuota(userId: string, feature: AiFeature, now = new Date()): Promise<QuotaView> {
    const context = await this.getPlanContext(userId, now);
    if (!context) this.throwPlanRequired(feature);
    const { plan, quotaPeriod } = context;
    this.assertFeatureEnabled(plan, feature);

    if (feature === AiFeature.ASSESSMENT) {
      const monthlyLimit = plan.limits?.assessmentsPerMonth;
      if (typeof monthlyLimit === 'number') {
        const used = await this.getAssessmentResultSessionCount(userId, quotaPeriod);
        const remaining = Math.max(0, monthlyLimit - used);
        return {
          feature,
          month: quotaPeriod.month,
          year: quotaPeriod.year,
          periodStart: quotaPeriod.periodStart,
          periodEnd: quotaPeriod.periodEnd,
          nextResetAt: quotaPeriod.nextResetAt,
          limit: monthlyLimit,
          used,
          remaining,
          unlimited: false,
          resetPolicy: 'periodic',
        };
      }

      const lifetimeLimit = plan.limits?.assessmentsLifetimeLimit;
      if (typeof lifetimeLimit === 'number') {
        const used = await this.getAssessmentResultSessionCount(userId);
        const remaining = Math.max(0, lifetimeLimit - used);
        return {
          feature,
          month: quotaPeriod.month,
          year: quotaPeriod.year,
          periodStart: quotaPeriod.periodStart,
          periodEnd: quotaPeriod.periodEnd,
          nextResetAt: quotaPeriod.nextResetAt,
          limit: lifetimeLimit,
          used,
          remaining,
          unlimited: false,
          resetPolicy: 'lifetime',
        };
      }

      const used = await this.getAssessmentResultSessionCount(userId);
      return {
        feature,
        month: quotaPeriod.month,
        year: quotaPeriod.year,
        periodStart: quotaPeriod.periodStart,
        periodEnd: quotaPeriod.periodEnd,
        nextResetAt: quotaPeriod.nextResetAt,
        used,
        unlimited: true,
        resetPolicy: 'unlimited',
      };
    }

    const limitKey = FEATURE_TO_LIMIT_KEY[feature];
    const limit = limitKey ? plan.limits?.[limitKey] : undefined;
    const usage = await this.aiUsageLogModel
      .findOne(this.buildUsagePeriodFilter(userId, feature, quotaPeriod))
      .lean()
      .exec();
    const used = usage?.requestCount || 0;

    const unlimited = typeof limit !== 'number';
    const remaining = unlimited ? undefined : Math.max(0, (limit) - used);
    return {
      feature,
      month: quotaPeriod.month,
      year: quotaPeriod.year,
      periodStart: quotaPeriod.periodStart,
      periodEnd: quotaPeriod.periodEnd,
      nextResetAt: quotaPeriod.nextResetAt,
      limit: unlimited ? undefined : (limit),
      used,
      remaining,
      unlimited,
      resetPolicy: unlimited ? 'unlimited' : 'periodic',
    };
  }

  async getPlanLimits(userId: string): Promise<{ plan: AiPlanDocument; limits: AiPlan['limits'] }> {
    const context = await this.getPlanContext(userId);
    if (!context) this.throwPlanRequired();
    return { plan: context.plan, limits: context.plan.limits || {} };
  }

  private async assertAssessmentQuotaLimits(
    plan: AiPlan,
    userId: string,
    quotaPeriod: QuotaPeriodContext,
  ): Promise<void> {
    const monthlyLimit = plan.limits?.assessmentsPerMonth;
    if (typeof monthlyLimit === 'number') {
      const monthlyAssessments = await this.getAssessmentResultSessionCount(userId, quotaPeriod);
      if (monthlyAssessments >= monthlyLimit) {
        this.throwQuotaExceeded(
          plan,
          this.buildQuotaView(AiFeature.ASSESSMENT, monthlyLimit, monthlyAssessments, quotaPeriod),
        );
      }
      return;
    }

    const lifetimeLimit = plan.limits?.assessmentsLifetimeLimit;
    if (typeof lifetimeLimit !== 'number') return;

    const completedAssessments = await this.getAssessmentResultSessionCount(userId);
    if (completedAssessments >= lifetimeLimit) {
      this.throwQuotaExceeded(
        plan,
        this.buildQuotaView(
          AiFeature.ASSESSMENT,
          lifetimeLimit,
          completedAssessments,
          quotaPeriod,
          'lifetime',
        ),
      );
    }
  }

  private async getAssessmentResultSessionCount(
    userId: string,
    quotaPeriod?: Pick<QuotaPeriodContext, 'periodStart' | 'periodEnd'>,
  ): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const filter: Record<string, unknown> = {
      userId: userObjectId,
      assessmentSessionId: { $exists: true, $ne: null },
    };

    if (quotaPeriod) {
      const generatedAtFilter = {
        generatedAt: { $gte: quotaPeriod.periodStart, $lt: quotaPeriod.periodEnd },
      };
      const createdAtFallbackFilter = {
        $or: [{ generatedAt: { $exists: false } }, { generatedAt: null }],
        createdAt: { $gte: quotaPeriod.periodStart, $lt: quotaPeriod.periodEnd },
      };
      filter.$or = [generatedAtFilter, createdAtFallbackFilter];
    }

    const sessionIds = await this.careerFitResultModel
      .distinct('assessmentSessionId', filter)
      .exec();

    return sessionIds.length;
  }

  private async expireStaleSubscriptions(userId: string, now = new Date()): Promise<void> {
    await this.userSubscriptionModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          status: SubscriptionStatus.ACTIVE,
          endDate: { $lte: now },
        },
        { $set: { status: SubscriptionStatus.EXPIRED } },
      )
      .exec();
  }

  private async getPlanContext(userId: string, now = new Date()): Promise<AiPlanContext | null> {
    if (!Types.ObjectId.isValid(userId)) {
      const freePlan = await this.aiPlanModel.findOne({ isDefaultPlan: true }).exec();
      return freePlan ? { plan: freePlan, quotaPeriod: this.getCalendarMonthPeriod(now) } : null;
    }

    await this.expireStaleSubscriptions(userId, now);
    const subscription = await this.findActiveSubscription(userId);
    if (subscription) {
      const quotaPeriod = await this.ensureSubscriptionQuotaPeriod(subscription, now);
      const plan = await this.aiPlanModel.findById(subscription.planId).exec();
      if (plan) return { plan, subscription, quotaPeriod };
    }

    const freePlan = await this.aiPlanModel.findOne({ isDefaultPlan: true }).exec();
    return freePlan ? { plan: freePlan, subscription: null, quotaPeriod: this.getCalendarMonthPeriod(now) } : null;
  }

  private findActiveSubscription(userId: string): Promise<UserSubscriptionDocument | null> {
    return this.userSubscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE })
      .sort({ startDate: -1, createdAt: -1 })
      .exec();
  }

  private async ensureSubscriptionQuotaPeriod(
    subscription: UserSubscriptionDocument,
    now: Date,
  ): Promise<QuotaPeriodContext> {
    const period = this.resolveSubscriptionQuotaPeriod(subscription, now);
    const changed =
      subscription.quotaPeriodStart?.getTime() !== period.periodStart.getTime() ||
      subscription.quotaPeriodEnd?.getTime() !== period.periodEnd.getTime() ||
      subscription.nextQuotaResetAt?.getTime() !== period.nextResetAt.getTime();

    if (changed) {
      subscription.quotaPeriodStart = period.periodStart;
      subscription.quotaPeriodEnd = period.periodEnd;
      subscription.nextQuotaResetAt = period.nextResetAt;
      await subscription.save();
    }

    return period;
  }

  private resolveSubscriptionQuotaPeriod(
    subscription: UserSubscriptionDocument,
    now: Date,
  ): QuotaPeriodContext {
    const subscriptionStart = subscription.startDate;
    const subscriptionEnd = subscription.endDate || this.addMonths(subscriptionStart, 1);
    let periodStart = this.isValidDate(subscription.quotaPeriodStart)
      ? new Date(subscription.quotaPeriodStart)
      : new Date(subscriptionStart);
    let periodEnd = this.isValidDate(subscription.quotaPeriodEnd)
      ? new Date(subscription.quotaPeriodEnd)
      : this.minDate(this.addMonths(periodStart, 1), subscriptionEnd);

    if (periodEnd.getTime() <= periodStart.getTime()) {
      periodStart = new Date(subscriptionStart);
      periodEnd = this.minDate(this.addMonths(periodStart, 1), subscriptionEnd);
    }

    while (periodEnd.getTime() <= now.getTime() && periodEnd.getTime() < subscriptionEnd.getTime()) {
      periodStart = new Date(periodEnd);
      periodEnd = this.minDate(this.addMonths(periodStart, 1), subscriptionEnd);
    }

    return this.toQuotaPeriodContext(periodStart, periodEnd);
  }

  private getCalendarMonthPeriod(now: Date): QuotaPeriodContext {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return this.toQuotaPeriodContext(periodStart, periodEnd);
  }

  private toQuotaPeriodContext(periodStart: Date, periodEnd: Date): QuotaPeriodContext {
    const { month, year } = this.getMonthYear(periodStart);
    return {
      periodStart,
      periodEnd,
      nextResetAt: new Date(periodEnd),
      month,
      year,
    };
  }

  private buildUsagePeriodFilter(
    userId: string,
    feature: AiFeature,
    quotaPeriod: QuotaPeriodContext,
  ): Record<string, unknown> {
    return {
      userId: new Types.ObjectId(userId),
      feature,
      $or: [
        {
          periodStart: quotaPeriod.periodStart,
          periodEnd: quotaPeriod.periodEnd,
        },
        {
          periodStart: { $exists: false },
          periodEnd: { $exists: false },
          month: quotaPeriod.month,
          year: quotaPeriod.year,
        },
      ],
    };
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private minDate(a: Date, b: Date): Date {
    return new Date(Math.min(a.getTime(), b.getTime()));
  }

  private isValidDate(value?: Date): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }
}
