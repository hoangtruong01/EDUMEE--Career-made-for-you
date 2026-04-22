import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  }): Promise<UserSubscriptionDocument> {
    const { userId, planId } = params;
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(planId)) throw new BadRequestException('Invalid planId');

    const plan = await this.aiPlanModel.findById(planId).exec();
    if (!plan) throw new NotFoundException('AI plan not found');

    // Cancel existing active subs
    await this.userSubscriptionModel.updateMany(
      { userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
    );

    const startDate = params.startDate ?? new Date();
    const billingCycle = params.billingCycle ?? BillingCycle.MONTHLY;

    const sub = new this.userSubscriptionModel({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
      billingCycle,
      startDate,
      endDate: params.endDate,
      status: SubscriptionStatus.ACTIVE,
    });
    return sub.save();
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
    return this.userSubscriptionModel
      .findOne({ userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE })
      .exec();
  }
}

