import { CareerSimulationService } from './career-simulation.service';

describe('CareerSimulationService', () => {
  const userId = '507f1f77bcf86cd799439011';
  let service: CareerSimulationService;
  let careerFitResultService: {
    getTopCareerMatches: jest.Mock;
    getTopCareerMatchesVisible: jest.Mock;
  };

  beforeEach(() => {
    careerFitResultService = {
      getTopCareerMatches: jest.fn(),
      getTopCareerMatchesVisible: jest.fn(),
    };

    service = new CareerSimulationService(
      {} as never,
      {} as never,
      careerFitResultService as never,
    );
  });

  it('returns only visible unlocked top careers for simulation selection', async () => {
    careerFitResultService.getTopCareerMatchesVisible.mockResolvedValue([
      {
        careerTitle: 'Software Engineer',
        overallFitScore: 92,
        strengths: ['Strong logic fit'],
        personalityProfile: { dominantTraits: ['Logic'] },
        isLocked: false,
      },
      {
        recommendationRank: 2,
        rank: 2,
        isLocked: true,
        lockedReason: 'plan_limit',
        requiredPlan: 'Plus',
      },
      {
        careerTitle: 'Data Analyst',
        overallFitScore: 88,
        isLocked: false,
      },
    ]);

    await expect(service.getTopCareers(userId)).resolves.toEqual([
      {
        title: 'Software Engineer',
        fitScore: 92,
        strengths: ['Strong logic fit'],
        personalityTraits: ['Logic'],
      },
      {
        title: 'Data Analyst',
        fitScore: 88,
        strengths: [],
        personalityTraits: [],
      },
    ]);
    expect(careerFitResultService.getTopCareerMatchesVisible).toHaveBeenCalledWith(userId, 3);
    expect(careerFitResultService.getTopCareerMatches).not.toHaveBeenCalled();
  });
});
