import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingSessionService } from '../services/onboarding-session.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { assertOwnerOrAdmin, isAdmin } from '../../../common/auth';
import { UpdateOnboardingSessionDto, CreateOnboardingSessionDto } from '../dto/onboarding-session.dto';
import { OnboardingStep } from '../schemas/onboarding-session.schema';

@ApiTags('onboarding-sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('onboarding-sessions')
export class OnboardingSessionController {
  constructor(private readonly onboardingSessionService: OnboardingSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new onboarding session' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Session created successfully' })
  create(
    @Body() createDto: CreateOnboardingSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingSessionService.createForUser(user.userId, createDto as any);
  }

  @Get()
  @ApiOperation({ summary: 'Get all onboarding sessions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sessions retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    } as Parameters<OnboardingSessionService['findAll']>[2];

    return this.onboardingSessionService.findAll(page, limit, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get onboarding statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getStatistics() {
    return this.onboardingSessionService.getStatistics();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active onboarding sessions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active sessions retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findActive() {
    return this.onboardingSessionService.findActive();
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get completed onboarding sessions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Completed sessions retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findCompleted() {
    return this.onboardingSessionService.findCompleted();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user onboarding session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session retrieved successfully' })
  findMy(@CurrentUser() user: any) {
    return this.onboardingSessionService.findByUser(user.userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get onboarding session by user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findByUser(@Param('userId') userId: string) {
    return this.onboardingSessionService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an onboarding session by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const session = await this.onboardingSessionService.findOne(id);
    assertOwnerOrAdmin(session.userId.toString(), user);
    return session;
  }

  @Put(':id/progress')
  @ApiOperation({ summary: 'Update onboarding progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress updated successfully' })
  updateProgress(
    @Param('id') id: string,
    @Body() body: { stepId: OnboardingStep; stepData: Record<string, unknown> },
    @CurrentUser() user: any,
  ) {
    // ownership check
    return this.onboardingSessionService.findOne(id).then((session) => {
      assertOwnerOrAdmin(session.userId.toString(), user);
      return this.onboardingSessionService.updateProgress(id, body.stepId, body.stepData);
    });
  }

  @Put(':id/complete-step')
  @ApiOperation({ summary: 'Complete an onboarding step' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Step completed successfully' })
  completeStep(
    @Param('id') id: string,
    @Body() body: { step: OnboardingStep; stepData: any },
    @CurrentUser() user: any,
  ) {
    return this.onboardingSessionService.findOne(id).then((session) => {
      assertOwnerOrAdmin(session.userId.toString(), user);
      return this.onboardingSessionService.completeStep(id, body.step, body.stepData);
    });
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete the onboarding process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Onboarding completed successfully' })
  completeOnboarding(@Param('id') id: string, @CurrentUser() user: any) {
    return this.onboardingSessionService.findOne(id).then((session) => {
      assertOwnerOrAdmin(session.userId.toString(), user);
      return this.onboardingSessionService.completeOnboarding(id);
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an onboarding session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOnboardingSessionDto,
    @CurrentUser() user: any,
  ) {
    const session = await this.onboardingSessionService.findOne(id);
    assertOwnerOrAdmin(session.userId.toString(), user);
    if (!isAdmin(user)) {
      // Non-admin cannot set status/progress directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { status, progressPercentage, ...rest } = updateDto as any;
      return this.onboardingSessionService.update(id, rest);
    }
    return this.onboardingSessionService.update(id, updateDto as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an onboarding session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const session = await this.onboardingSessionService.findOne(id);
    assertOwnerOrAdmin(session.userId.toString(), user);
    // Non-admin: only allow delete if still in progress
    if (!isAdmin(user) && session.status === 'completed') {
      throw new ForbiddenException('Cannot delete a completed onboarding session');
    }
    return this.onboardingSessionService.remove(id);
  }
}
