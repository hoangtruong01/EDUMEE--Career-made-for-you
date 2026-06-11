import {
  backfillLegacyMentorBookingEntitlements,
  backfillLegacyVisibleCareerRecommendationLimits,
} from './seed-ai-plans';

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

  it('enables mentor booking trial for legacy paid plans missing entitlement', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 3 });
    const updateMany = jest.fn().mockReturnValue({ exec });

    const modifiedCount = await backfillLegacyMentorBookingEntitlements({
      updateMany,
    } as never);

    expect(modifiedCount).toBe(3);
    expect(updateMany).toHaveBeenCalledWith(
      {
        isDefaultPlan: { $ne: true },
        $and: [
          {
            $or: [
              { price: { $gt: 0 } },
              { name: /plus|pro|business/i },
              { seatLimit: { $gt: 0 } },
              { 'features.teamDashboard': true },
              { 'features.multiUserManagement': true },
            ],
          },
          {
            $or: [
              { 'features.mentorBooking': { $ne: true } },
              { 'limits.mentorBookingsPerMonth': { $exists: false } },
              { 'limits.mentorBookingsPerMonth': null },
              { 'limits.mentorBookingsPerMonth': { $lt: 5 } },
            ],
          },
        ],
      },
      [
        {
          $set: {
            'features.mentorBooking': true,
            'limits.mentorBookingsPerMonth': {
              $cond: [
                { $gte: ['$limits.mentorBookingsPerMonth', 5] },
                '$limits.mentorBookingsPerMonth',
                5,
              ],
            },
          },
        },
      ],
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[seed:ai-plans] Backfilled mentor booking trial entitlement for 3 legacy paid plan(s).',
    );
  });

  it('keeps Free/default plans out of the mentor booking trial backfill', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    const updateMany = jest.fn().mockReturnValue({ exec });

    await backfillLegacyMentorBookingEntitlements({ updateMany } as never);

    const [filter] = updateMany.mock.calls[0];
    expect(filter).toMatchObject({
      isDefaultPlan: { $ne: true },
    });
    expect(filter.$and[0].$or).toEqual(
      expect.arrayContaining([
        { price: { $gt: 0 } },
        { name: /plus|pro|business/i },
      ]),
    );
    expect(filter.$and[0].$or).not.toContainEqual({ name: /^free$/i });
  });

  it('does not lower mentor booking quota when legacy plans already have more trial slots', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const updateMany = jest.fn().mockReturnValue({ exec });

    await backfillLegacyMentorBookingEntitlements({ updateMany } as never);

    const [, updatePipeline] = updateMany.mock.calls[0];
    expect(updatePipeline[0].$set['limits.mentorBookingsPerMonth']).toEqual({
      $cond: [
        { $gte: ['$limits.mentorBookingsPerMonth', 5] },
        '$limits.mentorBookingsPerMonth',
        5,
      ],
    });
  });

  it('does not log when every paid plan already has mentor booking entitlement', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    const updateMany = jest.fn().mockReturnValue({ exec });

    const modifiedCount = await backfillLegacyMentorBookingEntitlements({
      updateMany,
    } as never);

    expect(modifiedCount).toBe(0);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
