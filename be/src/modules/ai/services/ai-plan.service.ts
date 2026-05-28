import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';
import { CreateAiPlanDto, UpdateAiPlanDto } from '../dto';
import { SubscriptionStatus, UserSubscription, UserSubscriptionDocument } from '../../users/schemas/user-subscriptions';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { User, UserDocument } from '../../users/schemas/user.schema';

export type AiPlanPricingSummary = {
  billingCycle: BillingCycle;
  months: number;
  monthlyPrice: number;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
  currency: string;
};

export type AiPlanCatalogItem = AiPlan & {
  pricingByBillingCycle: Partial<Record<BillingCycle, AiPlanPricingSummary>>;
};

export type AiPlanSubscriberStats = {
  activeSubscribers: number;
  totalSubscribers: number;
  cancelledSubscribers: number;
  expiredSubscribers: number;
};

export type AiPlanAdminItem = AiPlan & {
  subscriberStats: AiPlanSubscriberStats;
};

@Injectable()
export class AiPlanService {
  constructor(
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateAiPlanDto): Promise<AiPlanDocument> {
    const existing = await this.aiPlanModel.findOne({ name: dto.name }).exec();
    if (existing) throw new ConflictException('Plan name already exists');
    this.validateCareerRecommendationLimits(dto.limits);
    const nextDto = this.normalizePlanPayload(dto);
    if (nextDto.isDefaultPlan) {
      await this.unsetOtherDefaultPlans();
    }
    const plan = new this.aiPlanModel(nextDto);
    return plan.save();
  }

  async findAll(): Promise<AiPlanAdminItem[]> {
    const plans = await this.aiPlanModel.find().sort({ displayOrder: 1, createdAt: -1 }).exec();
    const statsByPlanId = await this.buildSubscriberStats(plans);

    return plans.map((plan) => ({
      ...(plan.toJSON() as AiPlan),
      subscriberStats: statsByPlanId.get(this.getPlanId(plan)) || this.emptySubscriberStats(),
    }));
  }

  async findCatalog(): Promise<AiPlanCatalogItem[]> {
    const plans = await this.aiPlanModel
      .find({ isActive: { $ne: false } })
      .sort({ displayOrder: 1, price: 1, createdAt: 1 })
      .exec();

    return plans.map((plan) => ({
      ...(plan.toJSON() as AiPlan),
      pricingByBillingCycle: this.buildPricingByBillingCycle(plan),
    }));
  }

  async findOne(id: string): Promise<AiPlanDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const plan = await this.aiPlanModel.findById(id).exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    return plan;
  }

  async update(id: string, dto: UpdateAiPlanDto): Promise<AiPlanDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const currentPlan = await this.aiPlanModel.findById(id).exec();
    if (!currentPlan) throw new NotFoundException('AI plan not found');

    if (currentPlan.isDefaultPlan && dto.isActive === false) {
      throw new BadRequestException('Default plan must remain active');
    }

    if (dto.name) {
      const existing = await this.aiPlanModel
        .findOne({ name: dto.name, _id: { $ne: new Types.ObjectId(id) } })
        .exec();
      if (existing) throw new ConflictException('Plan name already exists');
    }
    this.validateCareerRecommendationLimits({
      ...(currentPlan.limits || {}),
      ...(dto.limits || {}),
    });
    const nextDto = this.normalizePlanPayload(dto);
    if (nextDto.isDefaultPlan) {
      await this.unsetOtherDefaultPlans(new Types.ObjectId(id));
    }
    const plan = await this.aiPlanModel
      .findByIdAndUpdate(id, nextDto, { new: true, runValidators: true })
      .exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    return plan;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const plan = await this.aiPlanModel.findById(id).exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    if (plan.isDefaultPlan) {
      throw new BadRequestException('Cannot delete default plan');
    }

    const activeSubs = await this.userSubscriptionModel
      .countDocuments({ planId: new Types.ObjectId(id), status: SubscriptionStatus.ACTIVE })
      .exec();
    if (activeSubs > 0) {
      throw new BadRequestException('Cannot delete plan with active subscriptions');
    }
    const res = await this.aiPlanModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('AI plan not found');
  }

  calculatePricing(
    plan: Pick<AiPlan, 'price' | 'currency' | 'billingCycleDiscounts'>,
    billingCycle: BillingCycle,
  ): AiPlanPricingSummary {
    const months = this.getBillingCycleMonths(billingCycle);
    const subtotal = this.roundCurrency((plan.price || 0) * months);
    const discountPercentage = this.resolveDiscountPercentage(plan, billingCycle);
    const discountAmount = this.roundCurrency((subtotal * discountPercentage) / 100);
    const total = this.roundCurrency(Math.max(subtotal - discountAmount, 0));

    return {
      billingCycle,
      months,
      monthlyPrice: this.roundCurrency(plan.price || 0),
      subtotal,
      discountPercentage,
      discountAmount,
      total,
      currency: plan.currency || 'USD',
    };
  }

  private buildPricingByBillingCycle(
    plan: Pick<AiPlan, 'price' | 'currency' | 'billingCycleDiscounts' | 'allowedBillingCycles'>,
  ): Partial<Record<BillingCycle, AiPlanPricingSummary>> {
    const cycles = this.resolveAllowedBillingCycles(plan);
    return cycles.reduce<Partial<Record<BillingCycle, AiPlanPricingSummary>>>((acc, cycle) => {
      acc[cycle] = this.calculatePricing(plan, cycle);
      return acc;
    }, {});
  }

  isBillingCycleAllowed(
    plan: Pick<AiPlan, 'allowedBillingCycles'>,
    billingCycle: BillingCycle,
  ): boolean {
    return this.resolveAllowedBillingCycles(plan).includes(billingCycle);
  }

  private resolveDiscountPercentage(
    plan: Pick<AiPlan, 'billingCycleDiscounts'>,
    billingCycle: BillingCycle,
  ): number {
    const rawDiscount = plan.billingCycleDiscounts?.[billingCycle];
    if (typeof rawDiscount !== 'number' || Number.isNaN(rawDiscount)) return 0;
    if (rawDiscount < 0) return 0;
    if (rawDiscount > 100) return 100;
    return rawDiscount;
  }

  private getBillingCycleMonths(billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case BillingCycle.THREE_MONTHS:
        return 3;
      case BillingCycle.SIX_MONTHS:
        return 6;
      case BillingCycle.FIVE_MONTHS:
        return 5;
      case BillingCycle.NINE_MONTHS:
        return 9;
      case BillingCycle.YEARLY:
        return 12;
      case BillingCycle.MONTHLY:
      default:
        return 1;
    }
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private resolveAllowedBillingCycles(
    plan: Pick<AiPlan, 'allowedBillingCycles'>,
  ): BillingCycle[] {
    const configuredCycles = (plan.allowedBillingCycles || []).filter((cycle) =>
      Object.values(BillingCycle).includes(cycle),
    );
    if (configuredCycles.length > 0) {
      return configuredCycles;
    }

    return [
      BillingCycle.MONTHLY,
      BillingCycle.THREE_MONTHS,
      BillingCycle.SIX_MONTHS,
      BillingCycle.FIVE_MONTHS,
      BillingCycle.NINE_MONTHS,
      BillingCycle.YEARLY,
    ];
  }

  private async buildSubscriberStats(plans: AiPlanDocument[]): Promise<Map<string, AiPlanSubscriberStats>> {
    const statsByPlanId = new Map<string, AiPlanSubscriberStats>();
    if (plans.length === 0) return statsByPlanId;

    const now = new Date();
    const planIds = plans.map((plan) => this.getPlanObjectId(plan));
    const paidPlanIds = plans
      .filter((plan) => !plan.isDefaultPlan && Number(plan.price || 0) > 0)
      .map((plan) => this.getPlanObjectId(plan));
    const activeSubscriptionFilter = {
      status: SubscriptionStatus.ACTIVE,
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gt: now } }],
    };

    const [
      totalByPlan,
      activeByPlan,
      cancelledByPlan,
      expiredByPlan,
      totalUsers,
      activePaidUserIds,
    ] = await Promise.all([
      this.countDistinctSubscribersByPlan({ planId: { $in: planIds } }),
      this.countDistinctSubscribersByPlan({ planId: { $in: planIds }, ...activeSubscriptionFilter }),
      this.countDistinctSubscribersByPlan({
        planId: { $in: planIds },
        status: SubscriptionStatus.CANCELLED,
      }),
      this.countDistinctSubscribersByPlan({
        planId: { $in: planIds },
        status: SubscriptionStatus.EXPIRED,
      }),
      this.userModel.countDocuments().exec(),
      paidPlanIds.length > 0
        ? this.userSubscriptionModel
            .distinct('userId', { planId: { $in: paidPlanIds }, ...activeSubscriptionFilter })
            .exec()
        : Promise.resolve([]),
    ]);

    const activePaidUserCount = new Set(activePaidUserIds.map((id) => id.toString())).size;
    const defaultPlanCurrentUsers = Math.max(totalUsers - activePaidUserCount, 0);

    for (const plan of plans) {
      const planId = this.getPlanId(plan);
      const stats: AiPlanSubscriberStats = {
        activeSubscribers: activeByPlan.get(planId) || 0,
        totalSubscribers: totalByPlan.get(planId) || 0,
        cancelledSubscribers: cancelledByPlan.get(planId) || 0,
        expiredSubscribers: expiredByPlan.get(planId) || 0,
      };

      if (plan.isDefaultPlan) {
        stats.activeSubscribers = defaultPlanCurrentUsers;
        stats.totalSubscribers = Math.max(stats.totalSubscribers, defaultPlanCurrentUsers);
      }

      statsByPlanId.set(planId, stats);
    }

    return statsByPlanId;
  }

  private async countDistinctSubscribersByPlan(filter: Record<string, unknown>): Promise<Map<string, number>> {
    const rows = await this.userSubscriptionModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: filter },
        { $group: { _id: '$planId', userIds: { $addToSet: '$userId' } } },
        { $project: { count: { $size: '$userIds' } } },
      ])
      .exec();

    return rows.reduce((acc, row) => {
      acc.set(row._id.toString(), row.count || 0);
      return acc;
    }, new Map<string, number>());
  }

  private emptySubscriberStats(): AiPlanSubscriberStats {
    return {
      activeSubscribers: 0,
      totalSubscribers: 0,
      cancelledSubscribers: 0,
      expiredSubscribers: 0,
    };
  }

  private getPlanId(plan: AiPlanDocument): string {
    return this.getPlanObjectId(plan).toString();
  }

  private getPlanObjectId(plan: AiPlanDocument): Types.ObjectId {
    return plan._id;
  }

  private async unsetOtherDefaultPlans(currentPlanId?: unknown): Promise<void> {
    await this.aiPlanModel
      .updateMany(
        {
          isDefaultPlan: true,
          ...(currentPlanId ? { _id: { $ne: currentPlanId } } : {}),
        },
        { $set: { isDefaultPlan: false } },
      )
      .exec();
  }

  private normalizePlanPayload<T extends CreateAiPlanDto | UpdateAiPlanDto>(dto: T): T {
    if (!dto.isDefaultPlan) {
      return dto;
    }

    return {
      ...dto,
      isActive: true,
    };
  }

  private validateCareerRecommendationLimits(
    limits?: Pick<
      AiPlan['limits'],
      'maxCareerRecommendationsPerRun' | 'visibleCareerRecommendationsPerRun'
    >,
  ): void {
    const max = limits?.maxCareerRecommendationsPerRun;
    const visible = limits?.visibleCareerRecommendationsPerRun;

    if (typeof visible !== 'number') return;

    if (typeof max !== 'number') {
      throw new BadRequestException(
        'maxCareerRecommendationsPerRun is required when visibleCareerRecommendationsPerRun is set',
      );
    }

    if (visible > max) {
      throw new BadRequestException(
        'visibleCareerRecommendationsPerRun cannot exceed maxCareerRecommendationsPerRun',
      );
    }
  }
}
