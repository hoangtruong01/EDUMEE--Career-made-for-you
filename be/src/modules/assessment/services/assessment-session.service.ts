import { Injectable, NotFoundException, BadRequestException, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentSession, AssessmentSessionDocument } from '../schemas/assessment-sesions.schema';
import { SessionStatus } from '../enums/assessment.enum';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';

@Injectable()
export class AssessmentSessionService {
    constructor(
        @InjectModel(AssessmentSession.name)
        private sessionModel: Model<AssessmentSessionDocument>,
        private readonly aiQuotaService: AiQuotaService,
    ) { }

    // Create a new session for a user. Prevent multiple active sessions.
    async createSession(userId: string | Types.ObjectId): Promise<AssessmentSession> {
        const existing = await this.sessionModel.findOne({ userId, status: SessionStatus.IN_PROGRESS }).exec();
        if (existing) throw new BadRequestException('An active session already exists for this user');

        // Quota per month (AiUsageLog-based) for assessment attempts
        try {
            await this.aiQuotaService.checkQuota(String(userId), AiFeature.ASSESSMENT);
        } catch (e: unknown) {
            // Standardize quota to 429
            if (e instanceof HttpException && e.getStatus() === 429) throw e;
            if (e instanceof HttpException) throw e;
            throw e;
        }

        // Determine attemptNumber based on prior sessions in the same billing period (month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const previousCount = await this.sessionModel.countDocuments({
            userId: new Types.ObjectId(userId),
            createdAt: { $gte: startOfMonth },
        }).exec();

        // Default attemptNumber is previousCount + 1
        const attemptNumber = previousCount + 1;

        const session = new this.sessionModel({
            userId: new Types.ObjectId(userId),
            status: SessionStatus.IN_PROGRESS,
            startedAt: new Date(),
            attemptNumber,
        });

        const saved = await session.save();
        await this.aiQuotaService.consumeQuota(String(userId), AiFeature.ASSESSMENT, { requestCount: 1, tokensUsed: 0 });
        return saved;
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
