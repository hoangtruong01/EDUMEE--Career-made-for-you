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
import { TaskSubmissionService } from '../services/task-submission.service';
import { CreateTaskSubmissionDto, UpdateTaskSubmissionDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isAdmin } from '../../../common/auth';

@ApiTags('task-submissions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('task-submissions')
export class TaskSubmissionController {
  constructor(
    private readonly taskSubmissionService: TaskSubmissionService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task submission' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Submission created successfully' })
  async create(@Body() createDto: CreateTaskSubmissionDto, @CurrentUser() user: any) {
    const { plan } = await this.aiQuotaService.getPlanLimits(user.userId);
    if (plan.features?.jobSimulation === false) {
      throw new ForbiddenException('Job simulation is not available in your plan');
    }
    await this.aiQuotaService.checkQuota(user.userId, AiFeature.SIMULATION);
    const res = await this.taskSubmissionService.create({ ...createDto, userId: user.userId } as any);
    await this.aiQuotaService.consumeQuota(user.userId, AiFeature.SIMULATION, { requestCount: 1, tokensUsed: 0 });
    return res;
  }

  @Get()
  @ApiOperation({ summary: 'Get all task submissions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submissions retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('taskId') taskId?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      ...(userId ? { userId } : {}),
      ...(taskId ? { taskId } : {}),
      ...(status ? { status } : {}),
    } as Parameters<TaskSubmissionService['findAll']>[2];

    return this.taskSubmissionService.findAll(page, limit, filters);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending evaluations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pending submissions retrieved successfully' })
  findPendingEvaluations() {
    return this.taskSubmissionService.findPendingEvaluations();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get submission statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  getStatistics(@Query() filters?: any) {
    return this.taskSubmissionService.getSubmissionStatistics(filters);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Leaderboard retrieved successfully' })
  getLeaderboard(@Query('taskId') taskId?: string, @Query('limit') limit?: number) {
    return this.taskSubmissionService.getLeaderboard(taskId, limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get submissions by user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submissions retrieved successfully' })
  findByUser(@Param('userId') userId: string) {
    return this.taskSubmissionService.findByUser(userId);
  }

  @Get('user/:userId/progress')
  @ApiOperation({ summary: 'Get user progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress retrieved successfully' })
  getUserProgress(@Param('userId') userId: string) {
    return this.taskSubmissionService.getUserProgress(userId);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get submissions by task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submissions retrieved successfully' })
  findByTask(@Param('taskId') taskId: string) {
    return this.taskSubmissionService.findByTask(taskId);
  }

  @Get('user/:userId/task/:taskId')
  @ApiOperation({ summary: 'Get submissions by user and task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submissions retrieved successfully' })
  findByUserAndTask(@Param('userId') userId: string, @Param('taskId') taskId: string) {
    return this.taskSubmissionService.findByUserAndTask(userId, taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task submission by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submission retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Submission not found' })
  findOne(@Param('id') id: string) {
    return this.taskSubmissionService.findOne(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit for evaluation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submission sent for evaluation' })
  async submitForEvaluation(@Param('id') id: string, @CurrentUser() user: any) {
    const { plan } = await this.aiQuotaService.getPlanLimits(user.userId);
    if (plan.features?.jobSimulation === false) {
      throw new ForbiddenException('Job simulation is not available in your plan');
    }
    await this.aiQuotaService.checkQuota(user.userId, AiFeature.SIMULATION);
    const submission = await this.taskSubmissionService.findOne(id);
    if (!isAdmin(user) && (submission as any).userId.toString() !== user.userId) {
      throw new ForbiddenException('Forbidden');
    }
    const res = await this.taskSubmissionService.submitForEvaluation(id);
    await this.aiQuotaService.consumeQuota(user.userId, AiFeature.SIMULATION, { requestCount: 1, tokensUsed: 0 });
    return res;
  }

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Evaluate a submission' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submission evaluated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  evaluateSubmission(@Param('id') id: string, @Body() evaluation: any) {
    return this.taskSubmissionService.evaluateSubmission(id, evaluation);
  }

  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request revision for a submission' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Revision requested successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  requestRevision(
    @Param('id') id: string,
    @Body() body: { feedback: string; requiredChanges: string[] },
  ) {
    return this.taskSubmissionService.requestRevision(id, body.feedback, body.requiredChanges);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a submission' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submission approved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  approveSubmission(@Param('id') id: string) {
    return this.taskSubmissionService.approveSubmission(id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Create a retry attempt' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Retry attempt created successfully' })
  createRetryAttempt(@Param('id') id: string, @Body() newSubmissionData: CreateTaskSubmissionDto) {
    return this.taskSubmissionService.createRetryAttempt(id, newSubmissionData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task submission' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submission updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Submission not found' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTaskSubmissionDto) {
    return this.taskSubmissionService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task submission' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Submission deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Submission not found' })
  remove(@Param('id') id: string) {
    return this.taskSubmissionService.remove(id);
  }
}
