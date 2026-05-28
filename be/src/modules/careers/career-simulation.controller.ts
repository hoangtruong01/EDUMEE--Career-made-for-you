import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CareerSimulationService } from './services/career-simulation.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserLike } from '../../common/auth';
import { getAuthUserId } from '../../common/auth';
import { AiQuotaService } from '../ai/services/ai-quota.service';
import { AiFeature } from '../ai/schema/ai-usage-logs.schema';

@ApiTags('Career Simulation')
@Controller('career-simulation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CareerSimulationController {
  constructor(
    private readonly simulationService: CareerSimulationService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  @Get('top-careers')
  @ApiOperation({ summary: 'Get user top recommended careers for simulation' })
  @ApiResponse({ status: 200, description: 'Top careers retrieved successfully' })
  async getTopCareers(@CurrentUser() user: AuthUserLike) {
    return this.simulationService.getTopCareers(getAuthUserId(user));
  }

  @Get(':careerTitle')
  @ApiOperation({ summary: 'Get or generate simulation for a specific career' })
  @ApiResponse({ status: 200, description: 'Simulation data retrieved/generated successfully' })
  async getSimulation(
    @CurrentUser() user: AuthUserLike,
    @Param('careerTitle') careerTitle: string,
  ): Promise<any> {
    const userId = getAuthUserId(user);
    const hasCachedSimulation = await this.simulationService.hasCachedSimulation(userId, careerTitle);
    if (hasCachedSimulation) {
      return this.simulationService.getOrGenerateSimulation(userId, careerTitle);
    }

    return this.aiQuotaService.runWithQuota(
      userId,
      AiFeature.SIMULATION,
      () => this.simulationService.getOrGenerateSimulation(userId, careerTitle),
      { requestCount: 1, tokensUsed: 0 },
    );
  }
}
