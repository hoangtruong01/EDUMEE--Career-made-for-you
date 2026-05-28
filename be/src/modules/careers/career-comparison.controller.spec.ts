import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AiFeature } from '../ai/schema/ai-usage-logs.schema';
import { AiQuotaService } from '../ai/services/ai-quota.service';
import { CareerComparisonController } from './career-comparison.controller';
import { CareerComparisonService } from './services/career-comparison.service';

describe('CareerComparisonController', () => {
  const userId = '507f1f77bcf86cd799439011';
  const careerIds = ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
  let controller: CareerComparisonController;
  let careerComparisonService: jest.Mocked<
    Pick<
      CareerComparisonService,
      | 'normalizeAllowedCareerIdsForUser'
      | 'compareAllowedCareersSideBySide'
      | 'generateAllowedDetailedComparison'
      | 'getAllowedCareersForUser'
    >
  >;
  let aiQuotaService: jest.Mocked<
    Pick<AiQuotaService, 'assertFeatureAvailable' | 'runWithQuota'>
  >;

  beforeEach(() => {
    careerComparisonService = {
      normalizeAllowedCareerIdsForUser: jest.fn().mockResolvedValue(careerIds),
      compareAllowedCareersSideBySide: jest.fn().mockResolvedValue({ careers: [] }),
      generateAllowedDetailedComparison: jest.fn().mockResolvedValue({ careers: [] }),
      getAllowedCareersForUser: jest.fn().mockResolvedValue([]),
    };
    aiQuotaService = {
      assertFeatureAvailable: jest.fn().mockResolvedValue(undefined),
      runWithQuota: jest.fn(async (_userId, _feature, action) => action()),
    };

    controller = new CareerComparisonController(
      careerComparisonService as never,
      aiQuotaService as never,
    );
  });

  it('compares valid careers through the comparison quota gate', async () => {
    await controller.compareCareers({ careerIds }, { userId } as never);

    expect(careerComparisonService.normalizeAllowedCareerIdsForUser).toHaveBeenCalledWith(
      userId,
      careerIds,
    );
    expect(aiQuotaService.runWithQuota).toHaveBeenCalledWith(
      userId,
      AiFeature.CAREER_COMPARISON,
      expect.any(Function),
      { requestCount: 1, tokensUsed: 0 },
    );
    expect(careerComparisonService.compareAllowedCareersSideBySide).toHaveBeenCalledWith(
      userId,
      careerIds,
    );
  });

  it('generates detailed analysis through the comparison quota gate', async () => {
    await controller.generateDetailedAnalysis({ careerIds }, { userId } as never);

    expect(aiQuotaService.runWithQuota).toHaveBeenCalledWith(
      userId,
      AiFeature.CAREER_COMPARISON,
      expect.any(Function),
      { requestCount: 1, tokensUsed: 0 },
    );
    expect(careerComparisonService.generateAllowedDetailedComparison).toHaveBeenCalledWith(
      userId,
      careerIds,
      undefined,
    );
  });

  it('rejects too many careers before feature gate or comparison analysis', async () => {
    careerComparisonService.normalizeAllowedCareerIdsForUser.mockRejectedValue(
      new BadRequestException('You can compare up to 3 careers at once'),
    );

    await expect(
      controller.compareCareers(
        {
          careerIds: [
            ...careerIds,
            '507f1f77bcf86cd799439014',
            '507f1f77bcf86cd799439015',
          ],
        },
        { userId } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(aiQuotaService.runWithQuota).not.toHaveBeenCalled();
    expect(careerComparisonService.compareAllowedCareersSideBySide).not.toHaveBeenCalled();
  });

  it('rejects users whose plan does not unlock career comparison', async () => {
    aiQuotaService.runWithQuota.mockRejectedValue(
      new ForbiddenException('AI feature is not available in your plan'),
    );

    await expect(
      controller.compareCareers({ careerIds }, { userId } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(careerComparisonService.compareAllowedCareersSideBySide).not.toHaveBeenCalled();
  });

  it('gates allowed-careers by the career comparison feature flag', async () => {
    await controller.getAllowedCareers({ userId } as never);

    expect(aiQuotaService.assertFeatureAvailable).toHaveBeenCalledWith(
      userId,
      AiFeature.CAREER_COMPARISON,
    );
    expect(careerComparisonService.getAllowedCareersForUser).toHaveBeenCalledWith(userId);
  });
});
