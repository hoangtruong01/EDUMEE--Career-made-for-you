import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BillingCycle,
  SubscriptionStatus,
  UserSubscription,
  UserSubscriptionDocument,
} from '../../users/schemas/user-subscriptions';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { AiPlan, AiPlanDocument } from '../schema/ai-plan.schema';

@Injectable()
export class AiSubscriptionService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(AiPlan.name)
    private readonly aiPlanModel: Model<AiPlanDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
      ...(paymentId
        ? {
            paymentId: new Types.ObjectId(paymentId),
            paymentIds: [new Types.ObjectId(paymentId)],
          }
        : {}),
      billingCycle,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
    });
    return sub.save();
  }

  async assignUserToPlan(params: {
    userId?: string;
    identifier?: string;
    planId: string;
    billingCycle?: BillingCycle;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserSubscriptionDocument> {
    const user = await this.resolveUserForAssignment(params.userId, params.identifier);

    return this.upsertActiveSubscription({
      userId: String(user._id),
      planId: params.planId,
      billingCycle: params.billingCycle,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  }

  async activateSubscriptionFromPayment(params: {
    userId: string;
    planId: string;
    paymentId: string;
    billingCycle: BillingCycle;
    startDate?: Date;
  }): Promise<UserSubscriptionDocument> {
    const { paymentId } = params;
    if (!Types.ObjectId.isValid(params.userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(params.planId)) throw new BadRequestException('Invalid planId');
    if (!Types.ObjectId.isValid(paymentId)) throw new BadRequestException('Invalid paymentId');

    const paymentObjectId = new Types.ObjectId(paymentId);
    const existing = await this.findSubscriptionByPaymentId(paymentObjectId);
    if (existing) {
      if (existing.status === SubscriptionStatus.ACTIVE) return existing;
      throw new ConflictException('Payment has already been linked to a subscription');
    }

    const plan = await this.aiPlanModel.findById(params.planId).exec();
    if (!plan) throw new NotFoundException('AI plan not found');

    const startDate = params.startDate ?? new Date();
    const currentActive = await this.getActiveSubscriptionForUser(params.userId);
    if (currentActive && currentActive.planId.toString() === params.planId) {
      const renewalBase =
        currentActive.endDate && currentActive.endDate.getTime() > startDate.getTime()
          ? currentActive.endDate
          : startDate;
      currentActive.billingCycle = params.billingCycle;
      currentActive.endDate = this.computeEndDate(renewalBase, params.billingCycle);
      this.linkPaymentToSubscription(currentActive, paymentObjectId);
      return currentActive.save();
    }

    if (currentActive) {
      currentActive.status = SubscriptionStatus.CANCELLED;
      currentActive.endDate = startDate;
      await currentActive.save();
    }

    return this.createActiveSubscription({
      userId: params.userId,
      planId: params.planId,
      paymentId,
      billingCycle: params.billingCycle,
      startDate,
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
        {
          $or: [
            { paymentId: new Types.ObjectId(paymentId) },
            { paymentIds: new Types.ObjectId(paymentId) },
          ],
          status: SubscriptionStatus.ACTIVE,
        },
        { $set: { status: SubscriptionStatus.CANCELLED, endDate: new Date() } },
        { new: true, runValidators: true },
      )
      .exec();
  }

  private async findSubscriptionByPaymentId(
    paymentId: Types.ObjectId,
  ): Promise<UserSubscriptionDocument | null> {
    return this.userSubscriptionModel
      .findOne({
        $or: [{ paymentId }, { paymentIds: paymentId }],
      })
      .exec();
  }

  private async resolveUserForAssignment(userId?: string, identifier?: string): Promise<UserDocument> {
    const normalizedUserId = userId?.trim();
    const normalizedIdentifier = identifier?.trim();

    if (!normalizedUserId && !normalizedIdentifier) {
      throw new BadRequestException('Select a user before assigning a plan');
    }

    if (normalizedUserId) {
      return this.resolveUserById(normalizedUserId);
    }

    return this.resolveUserByIdentifier(normalizedIdentifier || '');
  }

  private async resolveUserById(userId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async resolveUserByIdentifier(identifier: string): Promise<UserDocument> {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      throw new BadRequestException('Email or phone is required');
    }

    if (normalizedIdentifier.includes('@')) {
      const user = await this.userModel
        .findOne({ email: new RegExp(`^${this.escapeRegex(normalizedIdentifier)}$`, 'i') })
        .exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }

    const compactPhone = normalizedIdentifier.replace(/\s+/g, '');
    const phoneCandidates = Array.from(new Set([normalizedIdentifier, compactPhone])).filter(Boolean);
    const users = await this.userModel
      .find({ phone_number: { $in: phoneCandidates } })
      .limit(2)
      .exec();

    if (users.length === 0) {
      throw new NotFoundException('User not found');
    }
    if (users.length > 1) {
      throw new BadRequestException('Multiple users match this phone number. Use email instead');
    }

    return users[0];
  }

  private createActiveSubscription(params: {
    userId: string;
    planId: string;
    paymentId: string;
    billingCycle: BillingCycle;
    startDate: Date;
  }): Promise<UserSubscriptionDocument> {
    const paymentObjectId = new Types.ObjectId(params.paymentId);
    const sub = new this.userSubscriptionModel({
      userId: new Types.ObjectId(params.userId),
      planId: new Types.ObjectId(params.planId),
      paymentId: paymentObjectId,
      paymentIds: [paymentObjectId],
      billingCycle: params.billingCycle,
      startDate: params.startDate,
      endDate: this.computeEndDate(params.startDate, params.billingCycle),
      status: SubscriptionStatus.ACTIVE,
    });
    return sub.save();
  }

  private linkPaymentToSubscription(
    subscription: UserSubscriptionDocument,
    paymentId: Types.ObjectId,
  ): void {
    if (!subscription.paymentId) {
      subscription.paymentId = paymentId;
    }

    const ids = [
      subscription.paymentId,
      ...(subscription.paymentIds || []),
      paymentId,
    ].filter((id): id is Types.ObjectId => Boolean(id));
    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString()))).map(
      (id) => new Types.ObjectId(id),
    );
    subscription.paymentIds = uniqueIds;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      case BillingCycle.SIX_MONTHS:
        endDate.setMonth(endDate.getMonth() + 6);
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
