import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCheckpointDto, UpdateCheckpointAiFeedbackDto } from '../dto/index';
import { Checkpoint } from '../schemas/checkpoint.schema2';
import { CheckpointService } from '../services/checkpoint.service2';

@ApiTags('checkpoints')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('checkpoints')
export class CheckpointController {
  constructor(private readonly checkpointService: CheckpointService) {}

  @Post()
  @ApiOperation({ summary: 'User nộp form tự đánh giá (Reflection) định kỳ' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ghi nhận điểm chạm checkpoint thành công',
  })
  async create(
    @Body() createDto: CreateCheckpointDto,
    @CurrentUser() user: AuthUserLike,
  ): Promise<Checkpoint> {
    const userId = getAuthUserId(user);
    return this.checkpointService.create(createDto, userId);
  }

  @Put(':id/ai-feedback')
  @ApiOperation({ summary: 'Cơ chế AI Agent tự động phân tích và trả lời lời khuyên bảo mật' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật lời khuyên thành công' })
  async updateAiFeedback(
    @Param('id') id: string,
    @Body() aiDto: UpdateCheckpointAiFeedbackDto,
  ): Promise<Checkpoint> {
    return this.checkpointService.updateAiFeedback(id, aiDto);
  }

  @Get('roadmap/:roadmapId')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử checkpoint sức khỏe của một lộ trình' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Truy vấn lịch sử checkpoint thành công' })
  async findByRoadmap(@Param('roadmapId') roadmapId: string): Promise<Checkpoint[]> {
    return this.checkpointService.findByRoadmap(roadmapId);
  }
}
