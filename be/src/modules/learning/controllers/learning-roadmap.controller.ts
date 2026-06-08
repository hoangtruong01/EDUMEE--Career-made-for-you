import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilterQuery, Types } from 'mongoose';

import { RoadmapStatus } from '../../../common/enums/learning.enum';
import {
  CreateLearningRoadmapDto,
  GenerateAIRoadmapDto,
  UpdateLearningRoadmapDto,
} from '../dto/learning-roadmap.dto2';
import { LearningRoadmap, LearningRoadmapDocument } from '../schemas/learning-roadmap.schema2';
import {
  CreateRoadmapPayload,
  LearningRoadmapService,
} from '../services/learning-roadmap.service2';

import type { AuthUserLike } from '../../../common/auth';
import { assertOwnerOrAdmin, getAuthUserId, isAdmin } from '../../../common/auth';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('learning-roadmaps')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('learning-roadmaps')
export class LearningRoadmapController {
  constructor(
    private readonly learningRoadmapService: LearningRoadmapService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo lộ trình học tập cấu trúc phẳng thông thường' })
  async create(
    @Body() createDto: CreateLearningRoadmapDto,
    @CurrentUser() user: AuthUserLike,
  ): Promise<LearningRoadmapDocument> {
    const userId = getAuthUserId(user);
    const { plan } = await this.aiQuotaService.getPlanLimits(userId);

    if (plan.features?.personalizedRoadmap === false) {
      throw new ForbiddenException(
        'Tính năng lộ trình cá nhân hóa không được hỗ trợ trong gói của bạn',
      );
    }

    await this.aiQuotaService.checkQuota(userId, AiFeature.PERSONALIZED_ROADMAP);

    const createPayload: CreateRoadmapPayload = {
      ...createDto,
      userId: new Types.ObjectId(userId),
      isTemplate: false,
    };

    const res = await this.learningRoadmapService.create(createPayload);
    await this.aiQuotaService.consumeQuota(userId, AiFeature.PERSONALIZED_ROADMAP, {
      requestCount: 1,
      tokensUsed: 0,
    });
    return res;
  }

  @Post('generate-ai')
  @ApiOperation({ summary: 'AI thiết kế lộ trình học biến thiên cá nhân hóa từ Tên Nghề' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Khởi tạo lộ trình động từ AI Agent thành công',
  })
  async generateAIRoadmap(
    @Body() generateDto: GenerateAIRoadmapDto,
    @CurrentUser() user: AuthUserLike,
  ): Promise<LearningRoadmapDocument> {
    const userId = getAuthUserId(user);

    await this.aiQuotaService.checkQuota(userId, AiFeature.PERSONALIZED_ROADMAP);

    const res = await this.learningRoadmapService.generateDynamicRoadmap(
      userId,
      generateDto.careerTitle,
    );

    await this.aiQuotaService.consumeQuota(userId, AiFeature.PERSONALIZED_ROADMAP, {
      requestCount: 1,
      tokensUsed: 0,
    });
    return res;
  }

  @Get('dashboard-widget')
  @ApiOperation({ summary: 'Lấy dữ liệu tiến độ phẳng siêu tốc cho Dashboard Learner' })
  async getDashboardWidget(
    @CurrentUser() user: AuthUserLike,
  ): Promise<Record<string, unknown> | null> {
    const userId = getAuthUserId(user);
    return await this.learningRoadmapService.getDashboardWidget(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lộ trình với bộ lọc Type-Safe' })
  async findAll(
    @CurrentUser() user: AuthUserLike,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('targetCareer') targetCareer?: string,
    @Query('status') status?: string,
  ): Promise<{ data: LearningRoadmap[]; total: number; page: number; limit: number }> {
    const currentUserId = getAuthUserId(user);
    const queryFilters: FilterQuery<LearningRoadmapDocument> = {};

    if (userId) {
      assertOwnerOrAdmin(userId, user);
      queryFilters.userId = new Types.ObjectId(userId);
    } else if (!isAdmin(user)) {
      queryFilters.userId = new Types.ObjectId(currentUserId);
    }

    if (targetCareer) {
      queryFilters.careerId = new Types.ObjectId(targetCareer);
    }

    if (status) {
      queryFilters.status = status as unknown as RoadmapStatus;
    }

    return await this.learningRoadmapService.findAll(
      Number(page) || 1,
      Number(limit) || 10,
      queryFilters,
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'Lấy toàn bộ lộ trình mẫu gốc' })
  async findTemplates(): Promise<LearningRoadmap[]> {
    return await this.learningRoadmapService.findTemplates();
  }
  @Get('latest')
  @ApiOperation({ summary: 'Lấy dữ liệu lộ trình học tập mới nhất của học viên' })
  async getLatestRoadmap(
    @CurrentUser() user: AuthUserLike,
  ): Promise<LearningRoadmapDocument | null> {
    const userId = getAuthUserId(user);
    return this.learningRoadmapService.getLatestRoadmap(userId);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết lộ trình học tập' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserLike,
  ): Promise<LearningRoadmap> {
    return await this.assertRoadmapAccess(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin cấu trúc lộ trình' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLearningRoadmapDto,
    @CurrentUser() user: AuthUserLike,
  ): Promise<LearningRoadmap> {
    await this.assertRoadmapAccess(id, user);
    return await this.learningRoadmapService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa lộ trình học tập khỏi hệ thống' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUserLike): Promise<void> {
    await this.assertRoadmapAccess(id, user);
    await this.learningRoadmapService.remove(id);
  }

  private async assertRoadmapAccess(
    id: string,
    user: AuthUserLike,
  ): Promise<LearningRoadmapDocument> {
    const roadmap = await this.learningRoadmapService.findOne(id);
    assertOwnerOrAdmin(this.getRoadmapOwnerId(roadmap), user);
    return roadmap;
  }

  private getRoadmapOwnerId(roadmap: LearningRoadmap): string {
    if (!roadmap || !roadmap.userId) {
      return '';
    }
    return roadmap.userId.toString();
  }
}
