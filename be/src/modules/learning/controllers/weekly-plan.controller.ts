import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWeeklyPlanDto, UpdateWeeklyPlanDto } from '../dto/index';
import { WeeklyPlan } from '../schemas/weekly-plan.schema2';
import { WeeklyPlanService } from '../services/weekly-plan.service2';

@ApiTags('weekly-plans')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('weekly-plans')
export class WeeklyPlanController {
  constructor(private readonly weeklyPlanService: WeeklyPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Khởi tạo kế hoạch tuần học mới dựa trên đề xuất phân bổ của AI' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Khởi tạo kế hoạch tuần học thành công' })
  async create(
    @Body() createDto: CreateWeeklyPlanDto,
    @CurrentUser() user: AuthUserLike,
  ): Promise<WeeklyPlan> {
    const userId = getAuthUserId(user);
    return this.weeklyPlanService.create(createDto, userId);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Lấy thông tin kế hoạch tuần học hiện tại để xuất lên Dashboard Widget',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy kế hoạch tuần hiện tại thành công' })
  async getCurrentPlan(@CurrentUser() user: AuthUserLike): Promise<WeeklyPlan | null> {
    const userId = getAuthUserId(user);
    return this.weeklyPlanService.getDashboardPlan(userId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật ghi nhận tiến độ phân bổ thời gian thực tế đã học trong tuần',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật tiến độ tuần thành công' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWeeklyPlanDto,
  ): Promise<WeeklyPlan> {
    return this.weeklyPlanService.update(id, updateDto);
  }
}
