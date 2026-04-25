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
import { assertOwnerOrAdmin, getAuthUserId, isAdmin } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { Types } from 'mongoose';

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
  @ApiOperation({ summary: 'Create a new synchronous learning roadmap for the current user' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Roadmap created successfully' })
  async create(@Body() createDto: CreateLearningRoadmapDto, @CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const { plan } = await this.aiQuotaService.getPlanLimits(userId);
    if (plan.features?.personalizedRoadmap === false) {
      throw new ForbiddenException('Personalized roadmap is not available in your plan');
    }
    await this.aiQuotaService.checkQuota(userId, AiFeature.PERSONALIZED_ROADMAP);
    const res = await this.learningRoadmapService.create({
      ...createDto,
      userId,
      isTemplate: false,
      isPublic: false,
    });
    await this.aiQuotaService.consumeQuota(userId, AiFeature.PERSONALIZED_ROADMAP, { requestCount: 1, tokensUsed: 0 });
    return res;
  }

  @Get()
  @ApiOperation({ summary: 'Get learning roadmaps visible to the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmaps retrieved successfully' })
  findAll(
    @CurrentUser() user: AuthUserLike,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('targetCareer') targetCareer?: string,
    @Query('status') status?: string,
  ) {
    const currentUserId = getAuthUserId(user);
    const filters = {
      ...(userId ? { userId } : !isAdmin(user) ? { userId: currentUserId } : {}),
      ...(targetCareer ? { targetCareer } : {}),
      ...(status ? { status } : {}),
    } as Parameters<LearningRoadmapService['findAll']>[2];

    if (userId) {
      assertOwnerOrAdmin(userId, user);
    }

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
  findByUser(@Param('userId') userId: string, @CurrentUser() user: AuthUserLike) {
    assertOwnerOrAdmin(userId, user);
    return this.learningRoadmapService.findByUser(userId);
  }

  @Get('career/:careerId')
  @ApiOperation({ summary: 'Get roadmaps by career' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmaps retrieved successfully' })
  findByCareer(@Param('careerId') careerId: string, @CurrentUser() user: AuthUserLike) {
    return this.learningRoadmapService.findByCareer(
      careerId,
      isAdmin(user) ? undefined : getAuthUserId(user),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a learning roadmap by ID for its owner or admin' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmap retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Roadmap not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.assertRoadmapAccess(id, user);
  }

  @Get(':id/skill-progress')
  @ApiOperation({ summary: 'Get skill progress for a roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Skill progress retrieved successfully' })
  async getSkillProgress(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    await this.assertRoadmapAccess(id, user);
    const skillProgress = (await this.learningRoadmapService.getSkillProgress(id)) as unknown[];
    return skillProgress;
  }

  @Post(':templateId/clone')
  @ApiOperation({ summary: 'Clone a template roadmap' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Roadmap cloned successfully' })
  async cloneTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: AuthUserLike,
    @Body() customizations?: Record<string, unknown>,
  ) {
    const template = await this.learningRoadmapService.findOne(templateId);
    if (!isAdmin(user) && (!template.isTemplate || !template.isPublic)) {
      throw new ForbiddenException('Template is not available');
    }

    return this.learningRoadmapService.cloneTemplate(
      templateId,
      getAuthUserId(user),
      customizations as Partial<CreateLearningRoadmapDto> | undefined,
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
    await this.assertRoadmapAccess(id, user);
    const userId = getAuthUserId(user);
    const { plan } = await this.aiQuotaService.getPlanLimits(userId);
    if (plan.features?.personalizedRoadmap === false) {
      throw new ForbiddenException('Personalized roadmap is not available in your plan');
    }
    return this.learningRoadmapService.generateWeeklyPlan(id, weekNumber, availableHours);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a synchronous learning roadmap for its owner or admin' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmap updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Roadmap not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLearningRoadmapDto,
    @CurrentUser() user: AuthUserLike,
  ) {
    await this.assertRoadmapAccess(id, user);

    const sanitizedUpdate: UpdateLearningRoadmapDto = { ...updateDto };
    if (!isAdmin(user)) {
      delete sanitizedUpdate.userId;
      delete sanitizedUpdate.isTemplate;
      delete sanitizedUpdate.isPublic;
    }

    return this.learningRoadmapService.update(id, sanitizedUpdate);
  }

  @Put(':id/progress')
  @ApiOperation({ summary: 'Update roadmap progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress updated successfully' })
  async updateProgress(
    @Param('id') id: string,
    @Body() progressUpdate: any,
    @CurrentUser() user: AuthUserLike,
  ) {
    await this.assertRoadmapAccess(id, user);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.learningRoadmapService.updateProgress(id, progressUpdate);
  }

  @Put(':id/phase/:phaseId')
  @ApiOperation({ summary: 'Update a specific phase' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Phase updated successfully' })
  async updatePhase(
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() phaseUpdate: any,
    @CurrentUser() user: AuthUserLike,
  ) {
    await this.assertRoadmapAccess(id, user);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.learningRoadmapService.updatePhase(id, phaseId, phaseUpdate);
  }

  @Put(':id/phase/:phaseId/complete')
  @ApiOperation({ summary: 'Complete a phase' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Phase completed successfully' })
  async completePhase(
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @CurrentUser() user: AuthUserLike,
  ) {
    await this.assertRoadmapAccess(id, user);
    return this.learningRoadmapService.completePhase(id, phaseId);
  }

  @Put(':id/adaptations')
  @ApiOperation({ summary: 'Add an adaptation to the roadmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Adaptation added successfully' })
  async addAdaptation(
    @Param('id') id: string,
    @Body() adaptation: any,
    @CurrentUser() user: AuthUserLike,
  ) {
    await this.assertRoadmapAccess(id, user);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.learningRoadmapService.addAdaptation(id, adaptation);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a learning roadmap for its owner or admin' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Roadmap deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Roadmap not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    await this.assertRoadmapAccess(id, user);
    return this.learningRoadmapService.remove(id);
  }

  private async assertRoadmapAccess(id: string, user: AuthUserLike) {
    const roadmap = await this.learningRoadmapService.findOne(id);
    assertOwnerOrAdmin(this.getRoadmapOwnerId(roadmap), user);
    return roadmap;
  }

  private getRoadmapOwnerId(roadmap: { userId?: unknown }): string {
    const userId = roadmap.userId;
    if (typeof userId === 'string') return userId;
    if (userId instanceof Types.ObjectId) return userId.toHexString();
    if (userId && typeof userId === 'object' && '_id' in userId) {
      const populatedId = (userId as { _id?: unknown })._id;
      if (typeof populatedId === 'string') return populatedId;
      if (populatedId instanceof Types.ObjectId) return populatedId.toHexString();
    }
    return '';
  }
}
