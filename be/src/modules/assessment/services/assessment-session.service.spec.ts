import { HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';
import { SessionStatus } from '../enums/assessment.enum';
import { AssessmentSessionService } from './assessment-session.service';

describe('AssessmentSessionService', () => {
  let service: AssessmentSessionService;
  let sessionModel: any;
  let aiQuotaService: jest.Mocked<Pick<AiQuotaService, 'checkQuota' | 'consumeQuota'>>;

  beforeEach(() => {
    sessionModel = jest.fn().mockImplementation(function createSessionDocument(
      this: any,
      payload: Record<string, unknown>,
    ) {
      Object.assign(this, payload);
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    });
    sessionModel.findOne = jest.fn().mockReturnValue(createQuery(null));
    sessionModel.updateMany = jest.fn().mockReturnValue(createQuery({ modifiedCount: 0 }));
    sessionModel.countDocuments = jest.fn().mockReturnValue(createQuery(0));
    sessionModel.findById = jest.fn();
    sessionModel.find = jest.fn();
    sessionModel.findByIdAndUpdate = jest.fn();
    sessionModel.deleteOne = jest.fn();

    aiQuotaService = {
      checkQuota: jest.fn().mockResolvedValue(undefined),
      consumeQuota: jest.fn().mockResolvedValue(undefined),
    };

    service = new AssessmentSessionService(sessionModel, aiQuotaService as any);
  });

  it('checks quota but does not consume assessment quota when creating a session', async () => {
    const userId = '507f1f77bcf86cd799439011';

    const session = await service.createSession(userId);

    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(userId, AiFeature.ASSESSMENT);
    expect(aiQuotaService.consumeQuota).not.toHaveBeenCalled();
    expect(sessionModel).toHaveBeenCalledWith(expect.objectContaining({
      userId: expect.any(Types.ObjectId),
      status: SessionStatus.IN_PROGRESS,
      attemptNumber: 1,
    }));
    expect(session.status).toBe(SessionStatus.IN_PROGRESS);
  });

  it('propagates quota errors without creating a session', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const quotaError = new HttpException(
      {
        message: 'AI quota exceeded',
        code: 'PLAN_QUOTA_EXCEEDED',
        feature: AiFeature.ASSESSMENT,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    aiQuotaService.checkQuota.mockRejectedValue(quotaError);

    await expect(service.createSession(userId)).rejects.toBe(quotaError);

    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(userId, AiFeature.ASSESSMENT);
    expect(sessionModel).not.toHaveBeenCalled();
    expect(sessionModel.countDocuments).not.toHaveBeenCalled();
  });
});

function createQuery<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}
