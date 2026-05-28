import { AiFeature } from '../ai/schema/ai-usage-logs.schema';
import { AiQuotaService } from '../ai/services/ai-quota.service';
import { CareerSimulationController } from './career-simulation.controller';
import { CareerSimulationService } from './services/career-simulation.service';

describe('CareerSimulationController', () => {
  const userId = '507f1f77bcf86cd799439011';
  const careerTitle = 'Software Engineer';
  const simulation = { id: 'sim-1', label: careerTitle, levels: [] };

  let controller: CareerSimulationController;
  let simulationService: jest.Mocked<
    Pick<CareerSimulationService, 'getTopCareers' | 'hasCachedSimulation' | 'getOrGenerateSimulation'>
  >;
  let aiQuotaService: jest.Mocked<Pick<AiQuotaService, 'runWithQuota'>>;

  beforeEach(() => {
    simulationService = {
      getTopCareers: jest.fn().mockResolvedValue([]),
      hasCachedSimulation: jest.fn().mockResolvedValue(false),
      getOrGenerateSimulation: jest.fn().mockResolvedValue(simulation),
    };
    aiQuotaService = {
      runWithQuota: jest.fn(async (_userId, _feature, action) => action()),
    };

    controller = new CareerSimulationController(
      simulationService as never,
      aiQuotaService as never,
    );
  });

  it('returns cached simulations without consuming simulation quota', async () => {
    simulationService.hasCachedSimulation.mockResolvedValue(true);

    await expect(
      controller.getSimulation({ userId } as never, careerTitle),
    ).resolves.toEqual(simulation);

    expect(simulationService.hasCachedSimulation).toHaveBeenCalledWith(userId, careerTitle);
    expect(simulationService.getOrGenerateSimulation).toHaveBeenCalledWith(userId, careerTitle);
    expect(aiQuotaService.runWithQuota).not.toHaveBeenCalled();
  });

  it('generates new simulations through the simulation quota gate', async () => {
    await expect(
      controller.getSimulation({ userId } as never, careerTitle),
    ).resolves.toEqual(simulation);

    expect(aiQuotaService.runWithQuota).toHaveBeenCalledWith(
      userId,
      AiFeature.SIMULATION,
      expect.any(Function),
      { requestCount: 1, tokensUsed: 0 },
    );
    expect(simulationService.getOrGenerateSimulation).toHaveBeenCalledWith(userId, careerTitle);
  });
});
