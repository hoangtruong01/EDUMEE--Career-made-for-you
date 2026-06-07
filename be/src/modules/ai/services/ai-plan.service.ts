import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';
import { CreateAiPlanDto, UpdateAiPlanDto } from '../dto';
import { SubscriptionStatus, UserSubscription, UserSubscriptionDocument } from '../../users/schemas/user-subscriptions';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserVerifyStatus } from '../../../common/enums';

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

export type AiPlanSubscriberStatusFilter = 'active' | 'all' | 'cancelled' | 'expired';

export type AiPlanSubscribersParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export type AiPlanSubscriberItem = {
  userId: string;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
  userStatus: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatus | 'active';
  billingCycle?: BillingCycle;
  startDate?: Date;
  endDate?: Date;
  isCurrentPlanUser: boolean;
};

export type AiPlanSubscribersResponse = {
  subscribers: AiPlanSubscriberItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: AiPlanSubscriberStats;
};

type SubscriberAggregateRow = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  billingCycle?: BillingCycle;
  startDate?: Date;
  endDate?: Date;
  status: SubscriptionStatus;
  user?: {
    _id: Types.ObjectId;
    name?: string;
    email?: string;
    phone_number?: string;
    role?: string;
    verify?: UserVerifyStatus;
  };
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

  async listSubscribers(id: string, params: AiPlanSubscribersParams = {}): Promise<AiPlanSubscribersResponse> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const plan = await this.aiPlanModel.findById(id).exec();
    if (!plan) throw new NotFoundException('AI plan not found');

    const page = this.toPositiveInteger(params.page, 1);
    const limit = Math.min(this.toPositiveInteger(params.limit, 10), 100);
    const status = this.normalizeSubscriberStatus(params.status);
    const search = params.search?.trim();
    const statsByPlanId = await this.buildSubscriberStats([plan]);
    const stats = statsByPlanId.get(this.getPlanId(plan)) || this.emptySubscriberStats();

    if (plan.isDefaultPlan && status === 'active') {
      return this.listDefaultPlanCurrentUsers(plan, {
        page,
        limit,
        search,
        stats,
      });
    }

    return this.listSubscriptionUsersForPlan(plan, {
      page,
      limit,
      search,
      status,
      stats,
    });
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

    const planObjectId = new Types.ObjectId(id);
    await this.cleanupOrphanSubscriptionsForPlan(planObjectId);
    const activeByPlan = await this.countDistinctSubscribersByPlan({
      planId: planObjectId,
      ...this.buildActiveSubscriptionFilter(new Date()),
    });
    if ((activeByPlan.get(id) || 0) > 0) {
      throw new BadRequestException('Cannot delete plan with active subscriptions');
    }
    const res = await this.aiPlanModel.deleteOne({ _id: planObjectId }).exec();
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

  private async listDefaultPlanCurrentUsers(
    plan: AiPlanDocument,
    params: {
      page: number;
      limit: number;
      search?: string;
      stats: AiPlanSubscriberStats;
    },
  ): Promise<AiPlanSubscribersResponse> {
    const skip = (params.page - 1) * params.limit;
    const activePaidUserIds = await this.getActivePaidPlanUserIds();
    const query = {
      _id: { $nin: activePaidUserIds },
      ...this.buildUserSearchQuery(params.search),
    };

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('name email phone_number role verify')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(params.limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      subscribers: users.map((user) => this.serializeDefaultPlanSubscriber(user)),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
      stats: params.stats,
    };
  }

  private async listSubscriptionUsersForPlan(
    plan: AiPlanDocument,
    params: {
      page: number;
      limit: number;
      search?: string;
      status: AiPlanSubscriberStatusFilter;
      stats: AiPlanSubscriberStats;
    },
  ): Promise<AiPlanSubscribersResponse> {
    const now = new Date();
    const skip = (params.page - 1) * params.limit;
    const match: Record<string, unknown> = {
      planId: this.getPlanObjectId(plan),
      ...this.buildSubscriptionStatusFilter(params.status, now),
    };
    const searchMatch = this.buildSubscriberSearchMatch(params.search);
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { startDate: -1, createdAt: -1, _id: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      ...(searchMatch ? [{ $match: searchMatch }] : []),
      { $group: { _id: '$userId', subscription: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$subscription' } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: params.limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.userSubscriptionModel
      .aggregate<{ rows: SubscriberAggregateRow[]; total: Array<{ count: number }> }>(pipeline)
      .exec();
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;

    return {
      subscribers: rows.map((row) => this.serializeSubscriptionSubscriber(row, now)),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
      stats: params.stats,
    };
  }

  private async getActivePaidPlanUserIds(): Promise<Types.ObjectId[]> {
    const paidPlans = await this.aiPlanModel
      .find({ isDefaultPlan: { $ne: true }, price: { $gt: 0 } })
      .select('_id')
      .exec();
    const paidPlanIds = paidPlans.map((plan) => this.getPlanObjectId(plan));
    if (paidPlanIds.length === 0) return [];

    const activeUserIds = await this.userSubscriptionModel
      .distinct('userId', {
        planId: { $in: paidPlanIds },
        ...this.buildActiveSubscriptionFilter(new Date()),
      })
      .exec();
    return activeUserIds;
  }

  private buildSubscriptionStatusFilter(
    status: AiPlanSubscriberStatusFilter,
    now: Date,
  ): Record<string, unknown> {
    if (status === 'active') {
      return this.buildActiveSubscriptionFilter(now);
    }
    if (status === 'cancelled') {
      return { status: SubscriptionStatus.CANCELLED };
    }
    if (status === 'expired') {
      return { status: SubscriptionStatus.EXPIRED };
    }
    return {};
  }

  private buildActiveSubscriptionFilter(now: Date): Record<string, unknown> {
    return {
      status: SubscriptionStatus.ACTIVE,
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gt: now } }],
    };
  }

  private buildUserSearchQuery(search?: string): Record<string, unknown> {
    const normalized = search?.trim();
    if (!normalized) return {};

    const regex = new RegExp(this.escapeRegex(normalized), 'i');
    return {
      $or: [{ name: regex }, { email: regex }, { phone_number: regex }],
    };
  }

  private buildSubscriberSearchMatch(search?: string): Record<string, unknown> | null {
    const normalized = search?.trim();
    if (!normalized) return null;

    const regex = new RegExp(this.escapeRegex(normalized), 'i');
    return {
      $or: [{ 'user.name': regex }, { 'user.email': regex }, { 'user.phone_number': regex }],
    };
  }

  private serializeDefaultPlanSubscriber(user: UserDocument): AiPlanSubscriberItem {
    return {
      userId: user._id.toString(),
      name: user.name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      role: user.role || 'user',
      userStatus: this.formatUserStatus(user.verify),
      subscriptionStatus: 'active',
      billingCycle: BillingCycle.MONTHLY,
      isCurrentPlanUser: true,
    };
  }

  private serializeSubscriptionSubscriber(row: SubscriberAggregateRow, now: Date): AiPlanSubscriberItem {
    const user = row.user;
    return {
      userId: row.userId.toString(),
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      role: user?.role || 'user',
      userStatus: this.formatUserStatus(user?.verify),
      subscriptionId: row._id.toString(),
      subscriptionStatus: row.status,
      billingCycle: row.billingCycle,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrentPlanUser: this.isActiveSubscription(row, now),
    };
  }

  private isActiveSubscription(
    subscription: Pick<SubscriberAggregateRow, 'status' | 'endDate'>,
    now: Date,
  ): boolean {
    return (
      subscription.status === SubscriptionStatus.ACTIVE &&
      (!subscription.endDate || subscription.endDate.getTime() > now.getTime())
    );
  }

  private formatUserStatus(verify?: UserVerifyStatus): string {
    return verify === UserVerifyStatus.Banned ? 'Bị khóa' : 'Hoạt động';
  }

  private normalizeSubscriberStatus(status?: string): AiPlanSubscriberStatusFilter {
    const normalized = status?.trim().toLowerCase();
    if (normalized === 'all' || normalized === 'cancelled' || normalized === 'expired') {
      return normalized;
    }
    return 'active';
  }

  private toPositiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
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
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $match: { 'user.0': { $exists: true } } },
        { $group: { _id: '$planId', userIds: { $addToSet: '$userId' } } },
        { $project: { count: { $size: '$userIds' } } },
      ])
      .exec();

    return rows.reduce((acc, row) => {
      acc.set(row._id.toString(), row.count || 0);
      return acc;
    }, new Map<string, number>());
  }

  private async cleanupOrphanSubscriptionsForPlan(planId: Types.ObjectId): Promise<void> {
    const rows = await this.userSubscriptionModel
      .aggregate<{ _id: Types.ObjectId }>([
        { $match: { planId } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $match: { 'user.0': { $exists: false } } },
        { $project: { _id: 1 } },
      ])
      .exec();

    const orphanIds = rows.map((row) => row._id).filter(Boolean);
    if (orphanIds.length === 0) return;

    await this.userSubscriptionModel.deleteMany({ _id: { $in: orphanIds } }).exec();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
