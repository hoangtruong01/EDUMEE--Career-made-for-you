import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { SessionStatus } from "../enums/assessment.enum";


export type AssessmentSessionDocument = AssessmentSession & Document;

@Schema({
    timestamps: true,
    collection: 'assessment_sessions',
    toJSON: {
        virtuals: true,
        transform: (_doc: unknown, ret: Record<string, unknown>) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
})
export class AssessmentSession {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
    userId!: Types.ObjectId;

    @Prop({ enum: SessionStatus, default: SessionStatus.IN_PROGRESS })
    status!: SessionStatus;

    @Prop({ default: Date.now })
    startedAt!: Date; // Thời gian bắt đầu phiên đánh giá

    @Prop()
    completedAt?: Date; // Thời gian hoàn thành phiên đánh giá, có thể null nếu chưa hoàn thành
}

export const AssessmentSessionSchema = SchemaFactory.createForClass(AssessmentSession);

