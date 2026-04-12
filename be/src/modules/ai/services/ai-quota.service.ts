import {
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';
import { AiFeature, AiUsageLog, AiUsageLogDocument } from '../schema/ai-usage-logs.schema';
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
  | 'personalizedRoadmapsPerMonth';

const FEATURE_TO_LIMIT_KEY: Partial<Record<AiFeature, LimitKey>> = {
  [AiFeature.ASSESSMENT]: 'assessmentsPerMonth',
  [AiFeature.CHATBOT]: 'chatMessagesPerMonth',
  [AiFeature.SIMULATION]: 'simulationsPerMonth',
  [AiFeature.CAREER_RECOMMENDATION]: 'careerRecommendationRunsPerMonth',
  [AiFeature.CAREER_COMPARISON]: 'careerComparisonsPerMonth',
  [AiFeature.PERSONALIZED_ROADMAP]: 'personalizedRoadmapsPerMonth',
};

@Injectable()
export class AiQuotaService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(AiUsageLog.name)
    private readonly aiUsageLogModel: Model<AiUsageLogDocument>,
  ) {}

  async getActivePlanForUser(userId: string): Promise<AiPlanDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const sub = await this.userSubscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE })
      .exec();
    if (!sub) return null;
    return this.aiPlanModel.findById(sub.planId).exec();
  }

  async getPlanForUserOrFree(userId: string): Promise<AiPlanDocument | null> {
    const active = await this.getActivePlanForUser(userId);
    if (active) return active;
    // Fallback to FREE plan if exists.
    return this.aiPlanModel.findOne({ name: 'Free' }).exec();
  }

  async checkQuota(userId: string, feature: AiFeature, now = new Date()): Promise<void> {
    const plan = await this.getPlanForUserOrFree(userId);
    if (!plan) {
      // No subscription: treat as no AI access except if plan-less flows decide otherwise.
      throw new ForbiddenException('AI plan is required');
    }

    this.assertFeatureEnabled(plan, feature);

    const limitKey = FEATURE_TO_LIMIT_KEY[feature];
    if (!limitKey) return; // No limit configured for this feature.

    const limit = plan.limits?.[limitKey];
    if (typeof limit !== 'number') return; // Unlimited when not specified.

    const { month, year } = this.getMonthYear(now);
    const usage = await this.aiUsageLogModel
      .findOne({
        userId: new Types.ObjectId(userId),
        feature,
        month,
        year,
      })
      .exec();
    const used = usage?.requestCount || 0;
    if (used >= limit) {
      throw new HttpException('AI quota exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async consumeQuota(
    userId: string,
    feature: AiFeature,
    usage: { tokensUsed?: number; requestCount?: number },
    now = new Date(),
  ): Promise<void> {
    const plan = await this.getPlanForUserOrFree(userId);
    if (!plan) throw new ForbiddenException('AI plan is required');
    this.assertFeatureEnabled(plan, feature);

    const { month, year } = this.getMonthYear(now);
    await this.aiUsageLogModel
      .updateOne(
        {
          userId: new Types.ObjectId(userId),
          feature,
          month,
          year,
        },
        {
          $inc: {
            tokensUsed: usage.tokensUsed ?? 0,
            requestCount: usage.requestCount ?? 1,
          },
          $setOnInsert: { userId: new Types.ObjectId(userId), feature, month, year },
        },
        { upsert: true },
      )
      .exec();
  }

  private assertFeatureEnabled(plan: AiPlan, feature: AiFeature): void {
    // Feature flags in AiPlan.features are boolean-ish; enforce when present.
    const flags = plan.features || {};

    const enabled =
      feature === AiFeature.CAREER_RECOMMENDATION
        ? flags.careerRecommendation
        : feature === AiFeature.CAREER_COMPARISON
          ? flags.careerComparison
          : feature === AiFeature.PERSONALIZED_ROADMAP
            ? flags.personalizedRoadmap
            : feature === AiFeature.SIMULATION
              ? flags.jobSimulation
              : feature === AiFeature.MENTOR_BOOKING
                ? flags.mentorBooking
                : feature === AiFeature.CHATBOT
                  ? flags.aiChatbot
                  : feature === AiFeature.ASSESSMENT
                    ? true
                    : true;

    if (enabled === false) {
      throw new ForbiddenException('AI feature is not available in your plan');
    }
  }

  private getMonthYear(now: Date): { month: number; year: number } {
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  async getRemainingQuota(userId: string, feature: AiFeature, now = new Date()): Promise<{
    feature: AiFeature;
    month: number;
    year: number;
    limit?: number;
    used: number;
    remaining?: number;
    unlimited: boolean;
  }> {
    const plan = await this.getPlanForUserOrFree(userId);
    if (!plan) throw new ForbiddenException('AI plan is required');
    this.assertFeatureEnabled(plan, feature);

    const { month, year } = this.getMonthYear(now);
    const limitKey = FEATURE_TO_LIMIT_KEY[feature];
    const limit = limitKey ? plan.limits?.[limitKey] : undefined;
    const usage = await this.aiUsageLogModel
      .findOne({ userId: new Types.ObjectId(userId), feature, month, year })
      .lean()
      .exec();
    const used = usage?.requestCount || 0;

    const unlimited = typeof limit !== 'number';
    const remaining = unlimited ? undefined : Math.max(0, (limit as number) - used);
    return { feature, month, year, limit: unlimited ? undefined : (limit as number), used, remaining, unlimited };
  }

  async getPlanLimits(userId: string): Promise<{ plan: AiPlanDocument; limits: AiPlan['limits'] }> {
    const plan = await this.getPlanForUserOrFree(userId);
    if (!plan) throw new ForbiddenException('AI plan is required');
    return { plan, limits: plan.limits || {} };
  }
}
