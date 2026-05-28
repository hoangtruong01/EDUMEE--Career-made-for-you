import { Injectable, NotFoundException, HttpException, Logger, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentSession, AssessmentSessionDocument } from '../schemas/assessment-sesions.schema';
import { SessionStatus } from '../enums/assessment.enum';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';

interface CreateAssessmentSessionOptions {
    forceNew?: boolean;
}

@Injectable()
export class AssessmentSessionService {
    private readonly logger = new Logger(AssessmentSessionService.name);
    constructor(
        @InjectModel(AssessmentSession.name)
        private sessionModel: Model<AssessmentSessionDocument>,
        private readonly aiQuotaService: AiQuotaService,
    ) { }

    // Create a new session for a user. Reuse existing in_progress session if one exists.
    async createSession(
        userId: string | Types.ObjectId,
        options: CreateAssessmentSessionOptions = {},
    ): Promise<AssessmentSession> {
        const userIdStr = String(userId);
        try {
            this.logger.log(`Creating session for user ${userIdStr}`);
            const userObjectId = new Types.ObjectId(userIdStr);
            const existing = await this.sessionModel.findOne({ userId: userObjectId, status: SessionStatus.IN_PROGRESS }).exec();
            if (existing && !options.forceNew) {
                this.logger.warn(`User ${userIdStr} already has an active session: ${String(existing._id)} - reusing it`);
                return existing as AssessmentSession;
            }

            try {
                await this.aiQuotaService.checkQuota(userIdStr, AiFeature.ASSESSMENT);
                this.logger.log(`Quota check passed for user ${userIdStr}`);
            } catch (e: unknown) {
                if (e instanceof HttpException) throw e;

                const err = e as HttpException & { message: string; stack?: string };
                this.logger.error(`Quota check failed unexpectedly for user ${userIdStr}: ${err.message}`, err.stack);
                throw new HttpException(err.message || 'Quota check failed', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (existing && options.forceNew) {
                const now = new Date();
                const cancelled = await this.sessionModel.updateMany(
                    { userId: userObjectId, status: SessionStatus.IN_PROGRESS },
                    { $set: { status: SessionStatus.CANCELLED, completedAt: now } },
                ).exec();
                this.logger.log(`Cancelled ${cancelled.modifiedCount} active sessions for user ${userIdStr}`);
            }

            // Determine attemptNumber based on prior sessions in the same billing period (month)
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const previousCount = await this.sessionModel.countDocuments({
                userId: userObjectId,
                createdAt: { $gte: startOfMonth },
            }).exec();

            // Default attemptNumber is previousCount + 1
            const attemptNumber = previousCount + 1;

            const session = new this.sessionModel({
                userId: userObjectId,
                status: SessionStatus.IN_PROGRESS,
                startedAt: new Date(),
                attemptNumber,
            });

            const saved = await session.save();
            this.logger.log(`Session saved: ${String(saved._id)}`);
            return saved;
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;

            const error = err as Error;
            this.logger.error(`FATAL ERROR in createSession: ${error.message}`, error.stack);
            throw err;
        }
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

    // cancel: mark session as cancelled without counting it as a completed assessment
    async cancelSession(sessionId: string | Types.ObjectId) {
        const session = await this.sessionModel.findById(sessionId).exec();
        if (!session) throw new NotFoundException('Session not found');

        session.status = SessionStatus.CANCELLED;
        session.completedAt = new Date();
        return session.save();
    }

    async removeSession(sessionId: string | Types.ObjectId) {
        const res = await this.sessionModel.deleteOne({ _id: sessionId }).exec();
        if (res.deletedCount === 0) throw new NotFoundException('Session not found');
        return res;
    }
}
