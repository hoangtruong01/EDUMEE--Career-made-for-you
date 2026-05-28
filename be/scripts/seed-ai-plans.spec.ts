import { backfillLegacyVisibleCareerRecommendationLimits } from './seed-ai-plans';

describe('seed-ai-plans backfills', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('sets visible career recommendations to max for legacy plans missing the visible limit', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 2 });
    const updateMany = jest.fn().mockReturnValue({ exec });

    const modifiedCount = await backfillLegacyVisibleCareerRecommendationLimits({
      updateMany,
    } as never);

    expect(modifiedCount).toBe(2);
    expect(updateMany).toHaveBeenCalledWith(
      {
        'limits.maxCareerRecommendationsPerRun': { $type: 'number' },
        $or: [
          { 'limits.visibleCareerRecommendationsPerRun': { $exists: false } },
          { 'limits.visibleCareerRecommendationsPerRun': null },
        ],
      },
      [
        {
          $set: {
            'limits.visibleCareerRecommendationsPerRun':
              '$limits.maxCareerRecommendationsPerRun',
          },
        },
      ],
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[seed:ai-plans] Backfilled visible career recommendation limits for 2 legacy plan(s).',
    );
  });

  it('does not log when every plan already has an explicit visible limit', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    const updateMany = jest.fn().mockReturnValue({ exec });

    const modifiedCount = await backfillLegacyVisibleCareerRecommendationLimits({
      updateMany,
    } as never);

    expect(modifiedCount).toBe(0);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
