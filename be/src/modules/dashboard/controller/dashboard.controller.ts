// be/src/modules/dashboard/controller/dashboard.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AiCourseRecommendationDto, DashboardResponseDto } from '../dto/dashboard.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Lấy dữ liệu Dashboard tổng hợp của học viên' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async getMetrics(@CurrentUser() user: RequestUser): Promise<DashboardResponseDto> {
    const userId = user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng.');
    }
    return this.dashboardService.getDashboardData(userId);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'AI đề xuất các khóa học mở rộng chuyên sâu theo ngành nghề' })
  @ApiResponse({ status: 200, type: [AiCourseRecommendationDto] })
  async getAiRecommendations(
    @Query('career') career: string,
  ): Promise<AiCourseRecommendationDto[]> {
    if (!career) {
      return [];
    }
    // 🎯 FIX: Bổ sung await để hứng dữ liệu thực tế từ Promise đổ về
    const recommendations = await this.dashboardService.getAiRecommendationsIsolated(career);
    return recommendations as unknown as AiCourseRecommendationDto[];
  }

  @Post('explore-career')
  @ApiOperation({ summary: 'Tăng tích lũy chỉ số ngành nghề đã thám hiểm cá nhân độc bản' })
  async trackExploration(
    @CurrentUser() user: RequestUser,
    @Body() body: { careerId: string },
  ): Promise<{ success: boolean }> {
    const userId = user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng.');
    }
    return this.dashboardService.incrementExplorationCount(userId, body.careerId);
  }
}
