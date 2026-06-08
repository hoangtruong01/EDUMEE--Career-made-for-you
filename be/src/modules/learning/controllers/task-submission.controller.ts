import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TaskSubmissionService } from '../services/task-submission.service2';

import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTaskSubmissionDto, UpdateTaskSubmissionDto } from '../dto/task-submission.dto2';

import { FilterQuery } from 'mongoose';
import { ISubmissionContent, TaskSubmissionDocument } from '../schemas/task-submission.schema2';

@ApiTags('task-submissions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('task-submissions')
export class TaskSubmissionController {
  constructor(
    private readonly taskSubmissionService: TaskSubmissionService,
    // 🎯 Đã gỡ bỏ AiQuotaService để trả luồng nộp bài lộ trình về bản chất tinh gọn, không dính líu đến tính năng gói Premium thương mại
  ) {}

  @Post()
  @ApiOperation({ summary: 'Nộp bài thực hành lý thuyết hoặc làm bài thi Milestone hệ biến thiên' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ghi nhận và chấm điểm bài nộp thành công',
  })
  async create(
    @Body() createDto: CreateTaskSubmissionDto,
    @CurrentUser() user: AuthUserLike,
  ): Promise<TaskSubmissionDocument> {
    const userId = getAuthUserId(user);

    // =========================================================================
    // 🎯 LOẠI BỎ CHỐT CHẶN PHẦN MỀM THƯƠNG MẠI (ANTI-403 FORBIDDEN)
    // Toàn bộ các bộ lọc checkQuota, consumeQuota thuộc phân hệ SIMULATION đã được tháo dỡ
    // Luồng chạy sẽ đi thẳng xuống nghiệp vụ ghi nhận, tính streak và bẻ khóa cuốn chiếu
    // =========================================================================

    const rawContent = createDto.submissionContent;
    const rawQuizAnswers = rawContent?.quizAnswers;
    let safeQuizAnswers: Array<{ questionIndex: number; selectedValue: number }> | undefined =
      undefined;

    if (rawQuizAnswers && Array.isArray(rawQuizAnswers)) {
      safeQuizAnswers = rawQuizAnswers.map((ans) => ({
        questionIndex: ans.questionIndex,
        selectedValue: ans.selectedValue,
      }));
    }

    const safeContent: ISubmissionContent = {
      textContent: rawContent?.textContent,
      quizAnswers: safeQuizAnswers,
    };

    // Gọi thẳng xuống Service chấm điểm lý thuyết/trắc nghiệm và cập nhật trạng thái COMPLETED cuốn chiếu
    return await this.taskSubmissionService.submitAndEvaluate(
      userId,
      createDto.taskId,
      createDto.roadmapId,
      safeContent,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Truy vấn danh sách lịch sử nộp bài mô phỏng' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('taskId') taskId?: string,
    @Query('status') status?: string,
  ): Promise<{ data: TaskSubmissionDocument[]; total: number; page: number; limit: number }> {
    const filters: FilterQuery<TaskSubmissionDocument> = {};
    if (userId) filters.userId = userId;
    if (taskId) filters.taskId = taskId;
    if (status) filters.status = status;

    return await this.taskSubmissionService.findAll(
      Number(page) || 1,
      Number(limit) || 10,
      filters,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử bài làm của một Learner' })
  async findByUser(@Param('userId') userId: string): Promise<TaskSubmissionDocument[]> {
    return await this.taskSubmissionService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một bài nộp thực hành' })
  async findOne(@Param('id') id: string): Promise<TaskSubmissionDocument> {
    return await this.taskSubmissionService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin bài làm nâng cao' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskSubmissionDto,
  ): Promise<TaskSubmissionDocument> {
    return await this.taskSubmissionService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Gỡ bỏ bản ghi bài làm khỏi hệ thống' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.taskSubmissionService.remove(id);
  }
}
