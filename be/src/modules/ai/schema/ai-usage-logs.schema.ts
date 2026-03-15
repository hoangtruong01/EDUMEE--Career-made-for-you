import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiUsageLogDocument = AiUsageLog & Document;

export enum AiFeature {
    CAREER_RECOMMENDATION = 'career_recommendation',
    CHATBOT = 'chatbot',
    ASSESSMENT = 'assessment',
    SIMULATION = 'simulation',
    MENTOR_BOOKING = 'mentor_booking',
}

@Schema({
    timestamps: true,
    collection: 'ai_usage_logs',
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
export class AiUsageLog {
    _id!: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId;

    @Prop({ type: String, enum: AiFeature, required: true })
    feature!: AiFeature;

    @Prop({ type: Number, default: 0 })
    tokensUsed!: number;

    @Prop({ type: Number, default: 0 })
    requestCount!: number;

    @Prop({ type: Number })
    month?: number;

    @Prop({ type: Number })
    year?: number;
}

export const AiUsageLogSchema = SchemaFactory.createForClass(AiUsageLog);
AiUsageLogSchema.index({ userId: 1, feature: 1 });
AiUsageLogSchema.index({ userId: 1, feature: 1, year: 1, month: 1 });
