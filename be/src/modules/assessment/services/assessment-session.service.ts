import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentSession, AssessmentSessionDocument } from '../schemas/assessment-sesions.schema';
import { SessionStatus } from '../enums/assessment.enum';
import { UserSubscription, UserSubscriptionDocument } from '../../users/schemas/user-subscriptions';
import { AiPlan, AiPlanDocument } from '../../ai/schema/ai-plan.schema';

@Injectable()
export class AssessmentSessionService {
    constructor(
        @InjectModel(AssessmentSession.name)
        private sessionModel: Model<AssessmentSessionDocument>,
        @InjectModel(UserSubscription.name)
        private userSubscriptionModel: Model<UserSubscriptionDocument>,
        @InjectModel(AiPlan.name)
        private aiPlanModel: Model<AiPlanDocument>,
    ) { }

    // Create a new session for a user. Prevent multiple active sessions.
    async createSession(userId: string | Types.ObjectId): Promise<AssessmentSession> {
        const existing = await this.sessionModel.findOne({ userId, status: SessionStatus.IN_PROGRESS }).exec();
        if (existing) throw new BadRequestException('An active session already exists for this user');

        // Determine attemptNumber based on prior sessions in the same billing period (month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const previousCount = await this.sessionModel.countDocuments({
            userId: new Types.ObjectId(userId),
            createdAt: { $gte: startOfMonth },
        }).exec();

        // Default attemptNumber is previousCount + 1
        const attemptNumber = previousCount + 1;

        // Check active user subscription and plan limits (assessmentsPerMonth)
        const subscription = await this.userSubscriptionModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: ['active', ''] },
        }).exec();

        if (subscription && subscription.planId) {
            const plan = await this.aiPlanModel.findById(subscription.planId).lean().exec();
            const planLimit = plan?.limits?.assessmentsPerMonth;
            if (typeof planLimit === 'number' && planLimit >= 0) {
                if (previousCount >= planLimit) {
                    throw new BadRequestException('Assessment attempt limit reached for current plan');
                }
            }
        }

        const session = new this.sessionModel({
            userId: new Types.ObjectId(userId),
            status: SessionStatus.IN_PROGRESS,
            startedAt: new Date(),
            attemptNumber,
        });

        return session.save();
    }

    async getById(id: string | Types.ObjectId): Promise<AssessmentSession> {
        const session = await this.sessionModel.findById(id).lean().exec();
        if (!session) throw new NotFoundException('Session not found');
        return session as AssessmentSession;
    }

    async listByUser(userId: string | Types.ObjectId, filter = {}) {
        return this.sessionModel.find({ userId, ...filter }).sort({ createdAt: -1 }).exec();
    }

    async updateSession(id: string | Types.ObjectId, patch: Partial<AssessmentSession>) {
        const updated = await this.sessionModel
            .findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
            .exec();
        if (!updated) throw new NotFoundException('Session not found');
        return updated;
    }

    // finish: mark completedAt and set status
    async finishSession(sessionId: string | Types.ObjectId) {
        const session = await this.sessionModel.findById(sessionId).exec();
        if (!session) throw new NotFoundException('Session not found');

        session.status = SessionStatus.COMPLETED;
        session.completedAt = new Date();
        return session.save();
    }

    // cancel: schema doesn't include CANCELLED status, so mark completed and set completedAt
    async cancelSession(sessionId: string | Types.ObjectId) {
        const session = await this.sessionModel.findById(sessionId).exec();
        if (!session) throw new NotFoundException('Session not found');

        session.status = SessionStatus.COMPLETED;
        session.completedAt = new Date();
        return session.save();
    }

    async removeSession(sessionId: string | Types.ObjectId) {
        const res = await this.sessionModel.deleteOne({ _id: sessionId }).exec();
        if (res.deletedCount === 0) throw new NotFoundException('Session not found');
        return res;
    }
}
