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

@ApiTags('Career Simulation')
@Controller('career-simulation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CareerSimulationController {
  constructor(private readonly simulationService: CareerSimulationService) {}

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
    return this.simulationService.getOrGenerateSimulation(
      getAuthUserId(user), 
      careerTitle
    );
  }
}
