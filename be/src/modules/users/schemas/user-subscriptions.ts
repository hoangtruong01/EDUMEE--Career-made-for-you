import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserSubscriptionDocument = UserSubscription & Document;

export enum BillingCycle {
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
}

@Schema({
    timestamps: true,
    collection: 'user_subscriptions',
    toJSON: {
        virtuals: true,
        transform: (_doc: any, ret: Record<string, unknown>) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
})
export class UserSubscription {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: 'AiPlan' })
    planId!: Types.ObjectId;

    @Prop({ type: String, enum: BillingCycle, required: true })
    billingCycle!: BillingCycle;

    @Prop({ type: Date, required: true })
    startDate!: Date;

    @Prop({ type: Date })
    endDate?: Date;

    @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
    status!: SubscriptionStatus;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);
UserSubscriptionSchema.index({ userId: 1 });
UserSubscriptionSchema.index({ planId: 1 });
UserSubscriptionSchema.index({ status: 1 });
