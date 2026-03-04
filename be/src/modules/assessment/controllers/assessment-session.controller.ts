import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssessmentSessionService } from '../services/assessment-session.service';
import { CreateAssessmentSessionDto, UpdateAssessmentSessionDto } from '../dto';
import { AssessmentStatus } from '../schemas/assessment-session.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Assessment Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment-sessions')
export class AssessmentSessionController {
  constructor(private readonly assessmentSessionService: AssessmentSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new assessment session' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment session created successfully' 
  })
  async create(@Body() createDto: CreateAssessmentSessionDto) {
    return this.assessmentSessionService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assessment sessions with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: AssessmentStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment sessions retrieved successfully' 
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: AssessmentStatus,
    @Query('userId') userId?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (userId) filters.userId = userId;

    return this.assessmentSessionService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      filters,
    );
  }

  @Get('my-sessions')
  @ApiOperation({ summary: 'Get current user assessment sessions' })
  @ApiQuery({ name: 'status', required: false, enum: AssessmentStatus })
  @ApiResponse({ 
    status: 200, 
    description: 'User assessment sessions retrieved successfully' 
  })
  async findMysessions(
    @CurrentUser() user: any,
    @Query('status') status?: AssessmentStatus,
  ) {
    return this.assessmentSessionService.findByUser(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assessment session by ID' })
  @ApiParam({ name: 'id', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment session retrieved successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assessment session not found' 
  })
  async findOne(@Param('id') id: string) {
    return this.assessmentSessionService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get assessment session statistics' })
  @ApiParam({ name: 'id', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Session statistics retrieved successfully' 
  })
  async getStats(@Param('id') id: string) {
    return this.assessmentSessionService.getSessionStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assessment session' })
  @ApiParam({ name: 'id', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment session updated successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assessment session not found' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAssessmentSessionDto,
  ) {
    return this.assessmentSessionService.update(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update assessment session status' })
  @ApiParam({ name: 'id', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Session status updated successfully' 
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: AssessmentStatus,
  ) {
    return this.assessmentSessionService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assessment session' })
  @ApiParam({ name: 'id', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 204, 
    description: 'Assessment session deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assessment session not found' 
  })
  async remove(@Param('id') id: string) {
    return this.assessmentSessionService.remove(id);
  }
}