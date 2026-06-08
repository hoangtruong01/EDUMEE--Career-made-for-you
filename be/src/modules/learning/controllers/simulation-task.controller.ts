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
import { Types } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateSimulationTaskDto, UpdateSimulationTaskDto } from '../dto/index';
import { SimulationTask } from '../schemas/simulation-task.schema2';
import { SimulationTaskService } from '../services/simulation-task.service2';
@ApiTags('simulation-tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('simulation-tasks')
export class SimulationTaskController {
  constructor(private readonly simulationTaskService: SimulationTaskService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Tạo đề bài mô phỏng nghề nghiệp thực chiến mới (Admin / AI)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tạo đề bài thực hành thành công' })
  async create(@Body() createDto: CreateSimulationTaskDto): Promise<SimulationTask> {
    return this.simulationTaskService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách ngân hàng đề bài có phân trang và bộ lọc chuyên ngành' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Truy vấn danh sách thành công' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('careerId') careerId?: string,
  ): Promise<{ data: SimulationTask[]; total: number }> {
    const filters: Partial<SimulationTask> = {};

    if (careerId) {
      // STRICT FIX: Khởi tạo thẳng thành Types.ObjectId chuẩn của Mongoose, tuyệt đối không dùng any
      filters.careerId = new Types.ObjectId(careerId);
    }

    return this.simulationTaskService.findAll(Number(page) || 1, Number(limit) || 10, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nội dung đề bài thực hành và cấu trúc Rubric chấm điểm' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy chi tiết đề bài thành công' })
  async findOne(@Param('id') id: string): Promise<SimulationTask> {
    return this.simulationTaskService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cập nhật chỉnh sửa nội dung tiêu chí chấm điểm của đề bài' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật đề bài thành công' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSimulationTaskDto,
  ): Promise<SimulationTask> {
    return this.simulationTaskService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Xóa mềm ẩn đề bài khỏi hệ thống để bảo toàn lịch sử bài làm sinh viên',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ghi nhận ẩn bài học thành công' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.simulationTaskService.remove(id);
  }
}
