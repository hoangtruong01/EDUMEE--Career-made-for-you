import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentTransactionDocument = PaymentTransaction & Document;

export enum PaymentTransactionStatus {
	SUCCESS = 'success',
	FAILED = 'failed',
}

@Schema({
	timestamps: { createdAt: true, updatedAt: false },
	collection: 'payment_transactions',
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
export class PaymentTransaction {
	@Prop({ required: true, type: Types.ObjectId, ref: 'Payment' })
	paymentId!: Types.ObjectId;

	@Prop({ type: String })
	providerTransactionId?: string;

	@Prop({ type: String })
	eventType?: string;

	@Prop({ type: String, enum: PaymentTransactionStatus, required: true })
	status!: PaymentTransactionStatus;

	@Prop({ type: Object })
	payload?: Record<string, unknown>;

}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);
PaymentTransactionSchema.index({ paymentId: 1 });
PaymentTransactionSchema.index({ providerTransactionId: 1 });
PaymentTransactionSchema.index({ status: 1 });
