import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SepayPaymentMethod } from '../payment.constants';
import { BillingCycle } from '../../users/schemas/user-subscriptions';

export type PaymentDocument = Payment & Document;

export enum PaymentProvider {
    STRIPE = 'stripe',
    PAYPAL = 'paypal',
    VNPAY = 'vnpay',
    ZALOPAY = 'zalopay',
    SEPAY = 'sepay',
    EDUMEE_CREDIT = 'edumee_credit',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
    REFUND_PENDING = 'refund_pending',
}

export enum PaymentPurpose {
    AI_PLAN = 'ai_plan',
    MENTOR_BOOKING = 'mentor_booking',
}

@Schema({
    timestamps: true,
    collection: 'payments',
    toJSON: {
        virtuals: true,
        transform: (_doc: any, ret: Record<string, unknown>) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.checkoutTokenHash;
            delete ret.checkoutTokenExpiresAt;
            return ret;
        },
    },
})
export class Payment {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'AiPlan' })
    planId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'BookingSession' })
    bookingSessionId?: Types.ObjectId;

    @Prop({ type: String, enum: PaymentPurpose, default: PaymentPurpose.AI_PLAN })
    purpose!: PaymentPurpose;

    @Prop({ type: String, enum: BillingCycle })
    billingCycle?: BillingCycle;

    @Prop({ type: Number, required: true })
    amount!: number;

    @Prop({ type: Number })
    subtotalAmount?: number;

    @Prop({ type: Number, default: 0 })
    creditAppliedAmount?: number;

    @Prop({ type: Types.ObjectId, ref: 'WalletLedgerEntry' })
    creditHoldId?: Types.ObjectId;

    @Prop({ type: String, default: 'USD' })
    currency!: string;

    @Prop({ type: String, enum: PaymentProvider, required: true })
    provider!: PaymentProvider;

    @Prop({ type: String, enum: SepayPaymentMethod })
    paymentMethod?: SepayPaymentMethod;

    @Prop({ type: String })
    checkoutReference?: string;

    @Prop({ type: String })
    checkoutTokenHash?: string;

    @Prop({ type: Date })
    checkoutTokenExpiresAt?: Date;

    @Prop({ type: String })
    successUrl?: string;

    @Prop({ type: String })
    errorUrl?: string;

    @Prop({ type: String })
    cancelUrl?: string;

    @Prop({ type: String })
    providerPaymentId?: string;

    @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
    status!: PaymentStatus;

    @Prop({ type: Date })
    paidAt?: Date;

    @Prop({ type: String })
    failureReason?: string;

    @Prop({ type: Date })
    refundedAt?: Date;

    @Prop({ type: Number })
    refundedAmount?: number;

    @Prop({ type: String })
    refundReason?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ planId: 1 });
PaymentSchema.index({ bookingSessionId: 1 });
PaymentSchema.index({ purpose: 1, status: 1 });
PaymentSchema.index({ providerPaymentId: 1 });
PaymentSchema.index({ checkoutReference: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ checkoutTokenHash: 1 }, { sparse: true });

