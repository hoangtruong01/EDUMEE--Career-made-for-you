import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BillingCycle } from '../../users/schemas/user-subscriptions';

export type AiPlanDocument = AiPlan & Document;

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
    @Prop({ type: String, required: true, trim: true })
    name!: string;

    @Prop({ type: Number, default: 0 })
    price!: number;

    @Prop({ type: String, default: 'USD' })
    currency!: string;

    @Prop({ type: Boolean, default: false })
    isDefaultPlan!: boolean;

    @Prop({ type: Object, default: {} })
    billingCycleDiscounts!: Partial<Record<BillingCycle, number>>;

    @Prop({ type: Object, default: {} })
    limits!: {
        assessmentsPerMonth?: number;
        chatMessagesPerMonth?: number;
        simulationsPerMonth?: number;
        careerRecommendationRunsPerMonth?: number;
        maxCareerRecommendationsPerRun?: number;
        careerComparisonsPerMonth?: number;
        maxCareersPerComparison?: number;
        personalizedRoadmapsPerMonth?: number;
    };

    @Prop({ type: Object, default: {} })
    features!: {
        careerRecommendation?: boolean;
        jobSimulation?: boolean;
        mentorBooking?: boolean;
        careerComparison?: boolean;
        aiChatbot?: boolean;
        personalizedRoadmap?: boolean;
    };
}

export const AiPlanSchema = SchemaFactory.createForClass(AiPlan);
AiPlanSchema.index({ name: 1 }, { unique: true });
AiPlanSchema.index(
    { isDefaultPlan: 1 },
    { unique: true, partialFilterExpression: { isDefaultPlan: true } },
);
