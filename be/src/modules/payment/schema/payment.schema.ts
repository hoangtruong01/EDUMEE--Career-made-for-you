import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentProvider {
    STRIPE = 'stripe',
    PAYPAL = 'paypal',
    VNPAY = 'vnpay',
    ZALOPAY = 'zalopay',
    SEPAY = 'sepay',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
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
            return ret;
        },
    },
})
export class Payment {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'AiPlan' })
    planId?: Types.ObjectId;

    @Prop({ type: Number, required: true })
    amount!: number;

    @Prop({ type: String, default: 'USD' })
    currency!: string;

    @Prop({ type: String, enum: PaymentProvider, required: true })
    provider!: PaymentProvider;

    @Prop({ type: String })
    providerPaymentId?: string;

    @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
    status!: PaymentStatus;

    @Prop({ type: Date })
    paidAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ planId: 1 });
PaymentSchema.index({ providerPaymentId: 1 });

