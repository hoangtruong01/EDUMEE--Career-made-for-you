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
  pricingByBillingCycle: Record<BillingCycle, AiPlanPricingSummary>;
};

@Injectable()
export class AiPlanService {
  constructor(
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
  ) {}

  async create(dto: CreateAiPlanDto): Promise<AiPlanDocument> {
    const existing = await this.aiPlanModel.findOne({ name: dto.name }).exec();
    if (existing) throw new ConflictException('Plan name already exists');
    if (dto.isDefaultPlan) {
      await this.unsetOtherDefaultPlans();
    }
    const plan = new this.aiPlanModel(dto);
    return plan.save();
  }

  async findAll(): Promise<AiPlanDocument[]> {
    return this.aiPlanModel.find().sort({ createdAt: -1 }).exec();
  }

  async findCatalog(): Promise<AiPlanCatalogItem[]> {
    const plans = await this.aiPlanModel.find().sort({ price: 1, createdAt: 1 }).exec();
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
    if (dto.name) {
      const existing = await this.aiPlanModel
        .findOne({ name: dto.name, _id: { $ne: new Types.ObjectId(id) } })
        .exec();
      if (existing) throw new ConflictException('Plan name already exists');
    }
    if (dto.isDefaultPlan) {
      await this.unsetOtherDefaultPlans(new Types.ObjectId(id));
    }
    const plan = await this.aiPlanModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!plan) throw new NotFoundException('AI plan not found');
    return plan;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
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
    plan: Pick<AiPlan, 'price' | 'currency' | 'billingCycleDiscounts'>,
  ): Record<BillingCycle, AiPlanPricingSummary> {
    return {
      [BillingCycle.MONTHLY]: this.calculatePricing(plan, BillingCycle.MONTHLY),
      [BillingCycle.THREE_MONTHS]: this.calculatePricing(plan, BillingCycle.THREE_MONTHS),
      [BillingCycle.FIVE_MONTHS]: this.calculatePricing(plan, BillingCycle.FIVE_MONTHS),
      [BillingCycle.NINE_MONTHS]: this.calculatePricing(plan, BillingCycle.NINE_MONTHS),
      [BillingCycle.YEARLY]: this.calculatePricing(plan, BillingCycle.YEARLY),
    };
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
}
