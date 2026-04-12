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
import { LearningRoadmapService } from '../services/learning-roadmap.service';
import { CreateLearningRoadmapDto, UpdateLearningRoadmapDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';

@ApiTags('learning-roadmaps')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('learning-roadmaps')
export class LearningRoadmapController {
  constructor(
    private readonly learningRoadmapService: LearningRoadmapService,
    private readonly aiQuotaService: AiQuotaService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new learning roadmap' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Roadmap created successfully' })
  async create(@Body() createDto: CreateLearningRoadmapDto, @CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const { plan } = await this.aiQuotaService.getPlanLimits(userId);
    if (plan.features?.personalizedRoadmap === false) {
      throw new ForbiddenException('Personalized roadmap is not available in your plan');
    }
    await this.aiQuotaService.checkQuota(userId, AiFeature.PERSONALIZED_ROADMAP);
    const res = await this.learningRoadmapService.create({ ...createDto, userId });
    await this.aiQuotaService.consumeQuota(userId, AiFeature.PERSONALIZED_ROADMAP, { requestCount: 1, tokensUsed: 0 });
    return res;
  }

  @Get()
  @ApiOperation({ summary: 'Get all learning roadmaps' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmaps retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('targetCareer') targetCareer?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      ...(userId ? { userId } : {}),
      ...(targetCareer ? { targetCareer } : {}),
      ...(status ? { status } : {}),
    } as Parameters<LearningRoadmapService['findAll']>[2];

    return this.learningRoadmapService.findAll(page, limit, filters);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all roadmap templates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Templates retrieved successfully' })
  findTemplates() {
    return this.learningRoadmapService.findTemplates();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get roadmap statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  getStatistics() {
    return this.learningRoadmapService.getRoadmapStatistics();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get roadmaps by user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmaps retrieved successfully' })
  findByUser(@Param('userId') userId: string) {
    return this.learningRoadmapService.findByUser(userId);
  }

  @Get('career/:careerId')
  @ApiOperation({ summary: 'Get roadmaps by career' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmaps retrieved successfully' })
  findByCareer(@Param('careerId') careerId: string) {
    return this.learningRoadmapService.findByCareer(careerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a learning roadmap by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmap retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Roadmap not found' })
  findOne(@Param('id') id: string) {
    return this.learningRoadmapService.findOne(id);
  }

  @Get(':id/skill-progress')
  @ApiOperation({ summary: 'Get skill progress for a roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Skill progress retrieved successfully' })
  getSkillProgress(@Param('id') id: string) {
    return this.learningRoadmapService.getSkillProgress(id);
  }

  @Post(':templateId/clone')
  @ApiOperation({ summary: 'Clone a template roadmap' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Roadmap cloned successfully' })
  cloneTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: AuthUserLike,
    @Body() customizations?: Record<string, unknown>,
  ) {
    return this.learningRoadmapService.cloneTemplate(
      templateId,
      getAuthUserId(user),
      customizations as Parameters<LearningRoadmapService['cloneTemplate']>[2],
    );
  }

  @Post(':id/generate-weekly-plan')
  @ApiOperation({ summary: 'Generate weekly plan for a roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Weekly plan generated successfully' })
  async generateWeeklyPlan(
    @Param('id') id: string,
    @Query('weekNumber') weekNumber: number,
    @Query('availableHours') availableHours: number,
    @CurrentUser() user: AuthUserLike,
  ) {
    const userId = getAuthUserId(user);
    const { plan } = await this.aiQuotaService.getPlanLimits(userId);
    if (plan.features?.personalizedRoadmap === false) {
      throw new ForbiddenException('Personalized roadmap is not available in your plan');
    }
    return this.learningRoadmapService.generateWeeklyPlan(id, weekNumber, availableHours);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a learning roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmap updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Roadmap not found' })
  update(@Param('id') id: string, @Body() updateDto: UpdateLearningRoadmapDto) {
    return this.learningRoadmapService.update(id, updateDto);
  }

  @Put(':id/progress')
  @ApiOperation({ summary: 'Update roadmap progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress updated successfully' })
  updateProgress(@Param('id') id: string, @Body() progressUpdate: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.learningRoadmapService.updateProgress(id, progressUpdate);
  }

  @Put(':id/phase/:phaseId')
  @ApiOperation({ summary: 'Update a specific phase' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Phase updated successfully' })
  updatePhase(
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() phaseUpdate: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.learningRoadmapService.updatePhase(id, phaseId, phaseUpdate);
  }

  @Put(':id/phase/:phaseId/complete')
  @ApiOperation({ summary: 'Complete a phase' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Phase completed successfully' })
  completePhase(@Param('id') id: string, @Param('phaseId') phaseId: string) {
    return this.learningRoadmapService.completePhase(id, phaseId);
  }

  @Put(':id/adaptations')
  @ApiOperation({ summary: 'Add an adaptation to the roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Adaptation added successfully' })
  addAdaptation(@Param('id') id: string, @Body() adaptation: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.learningRoadmapService.addAdaptation(id, adaptation);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a learning roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmap deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Roadmap not found' })
  remove(@Param('id') id: string) {
    return this.learningRoadmapService.remove(id);
  }
}
