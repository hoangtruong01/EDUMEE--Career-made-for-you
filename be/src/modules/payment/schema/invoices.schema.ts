import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({
    timestamps: true,
    collection: 'invoices',
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
export class Invoice {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Payment' })
    paymentId?: Types.ObjectId;

    @Prop({ type: String, required: true, unique: true })
    invoiceNumber!: string;

    @Prop({ type: Number, required: true })
    amount!: number;

    @Prop({ type: String, required: true })
    currency!: string;

    @Prop({ type: Date, required: true })
    issuedAt!: Date;

    @Prop({ type: String })
    pdfUrl?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ userId: 1 });
InvoiceSchema.index({ paymentId: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
