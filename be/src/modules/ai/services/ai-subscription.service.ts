import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BillingCycle,
  SubscriptionStatus,
  UserSubscription,
  UserSubscriptionDocument,
} from '../../users/schemas/user-subscriptions';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';

@Injectable()
export class AiSubscriptionService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
  ) {}

  async upsertActiveSubscription(params: {
    userId: string;
    planId: string;
    billingCycle?: BillingCycle;
    startDate?: Date;
    endDate?: Date;
    paymentId?: string;
  }): Promise<UserSubscriptionDocument> {
    const { userId, planId, paymentId } = params;
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(planId)) throw new BadRequestException('Invalid planId');
    if (paymentId && !Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');

    const plan = await this.aiPlanModel.findById(planId).exec();
    if (!plan) throw new NotFoundException('AI plan not found');

    // Cancel existing active subs
    await this.userSubscriptionModel.updateMany(
      { userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
    );

    const startDate = params.startDate ?? new Date();
    const billingCycle = params.billingCycle ?? BillingCycle.MONTHLY;
    const endDate = params.endDate ?? this.computeEndDate(startDate, billingCycle);
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const sub = new this.userSubscriptionModel({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
      ...(paymentId ? { paymentId: new Types.ObjectId(paymentId) } : {}),
      billingCycle,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
    });
    return sub.save();
  }

  async activateSubscriptionFromPayment(params: {
    userId: string;
    planId: string;
    paymentId: string;
    billingCycle: BillingCycle;
    startDate?: Date;
  }): Promise<UserSubscriptionDocument> {
    const { paymentId } = params;
    if (!Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');

    const existing = await this.userSubscriptionModel
      .findOne({ paymentId: new Types.ObjectId(paymentId) })
      .exec();
    if (existing) {
      if (existing.status === SubscriptionStatus.ACTIVE) return existing;
      throw new ConflictException('Payment has already been linked to a subscription');
    }

    return this.upsertActiveSubscription({
      userId: params.userId,
      planId: params.planId,
      paymentId,
      billingCycle: params.billingCycle,
      startDate: params.startDate,
    });
  }

  async cancelSubscription(id: string): Promise<UserSubscriptionDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid subscription id');
    const sub = await this.userSubscriptionModel
      .findByIdAndUpdate(
        id,
        { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async getActiveSubscriptionForUser(userId: string): Promise<UserSubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    await this.expireStaleSubscriptions(userId);
    return this.userSubscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE })
      .sort({ startDate: -1, createdAt: -1 })
      .exec();
  }

  async revokeSubscriptionForPayment(paymentId: string): Promise<UserSubscriptionDocument | null> {
    if (!Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');
    return this.userSubscriptionModel
      .findOneAndUpdate(
        { paymentId: new Types.ObjectId(paymentId), status: SubscriptionStatus.ACTIVE },
        { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
  }

  private async expireStaleSubscriptions(userId: string): Promise<void> {
    const now = new Date();
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

  private computeEndDate(startDate: Date, billingCycle: BillingCycle): Date {
    const endDate = new Date(startDate);
    switch (billingCycle) {
      case BillingCycle.THREE_MONTHS:
        endDate.setMonth(endDate.getMonth() + 3);
        return endDate;
      case BillingCycle.FIVE_MONTHS:
        endDate.setMonth(endDate.getMonth() + 5);
        return endDate;
      case BillingCycle.NINE_MONTHS:
        endDate.setMonth(endDate.getMonth() + 9);
        return endDate;
      case BillingCycle.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        return endDate;
      case BillingCycle.MONTHLY:
      default:
        endDate.setMonth(endDate.getMonth() + 1);
        return endDate;
    }
  }
}
