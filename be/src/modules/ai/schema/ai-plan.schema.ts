import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiPlanDocument = AiPlan & Document;

export enum PlanName {
    FREE = 'Free',
    PLUS = 'Plus',
    PRO = 'Pro',
}

export enum PlanFeature {
    CAREER_RECOMMENDATION = 'career_recommendation',
    SIMULATION = 'simulation',
    MENTOR_BOOKING = 'mentor_booking',
}

@Schema({
    timestamps: true,
    collection: 'ai_plans',
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
export class AiPlan {
    @Prop({ type: String, enum: PlanName, required: true })
    name!: PlanName;

    @Prop({ type: Number, default: 0 })
    price!: number;

    @Prop({ type: Object, default: {} })
    limits!: {
        assessmentsPerMonth?: number;
        chatMessagesPerMonth?: number;
        simulationsPerMonth?: number;
    };

    @Prop({ type: Object, default: {} })
    features!: {
        careerRecommendation?: boolean;
        jobSimulation?: boolean;
        mentorBooking?: boolean;
        careerComparison?: boolean;
        aiChatbot?: boolean;
    };
}

export const AiPlanSchema = SchemaFactory.createForClass(AiPlan);
AiPlanSchema.index({ name: 1 });
