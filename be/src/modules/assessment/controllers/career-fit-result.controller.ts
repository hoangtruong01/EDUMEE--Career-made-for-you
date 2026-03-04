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
import { CareerFitResultService } from '../services/career-fit-result.service';
import { CreateCareerFitResultDto, UpdateCareerFitResultDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Career Fit Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('career-fit-results')
export class CareerFitResultController {
  constructor(private readonly careerFitResultService: CareerFitResultService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new career fit result' })
  @ApiResponse({ 
    status: 201, 
    description: 'Career fit result created successfully' 
  })
  async create(@Body() createDto: CreateCareerFitResultDto) {
    return this.careerFitResultService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all career fit results with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'careerId', required: false, type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Career fit results retrieved successfully' 
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
    @Query('careerId') careerId?: string,
  ) {
    const filters: any = {};
    if (sessionId) filters.sessionId = sessionId;
    if (userId) filters.userId = userId;
    if (careerId) filters.careerId = careerId;

    return this.careerFitResultService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      filters,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get career fit results statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully' 
  })
  async getStatistics() {
    return this.careerFitResultService.getStatistics();
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get career fit results for a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Assessment session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Session career fit results retrieved successfully' 
  })
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.careerFitResultService.findBySession(sessionId);
  }

  @Get('user/:userId/top-matches')
  @ApiOperation({ summary: 'Get top career matches for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Top career matches retrieved successfully' 
  })
  async getTopMatches(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.careerFitResultService.getTopCareerMatches(
      userId,
      limit ? Number(limit) : 10,
    );
  }

  @Get('my-top-matches')
  @ApiOperation({ summary: 'Get top career matches for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Top career matches retrieved successfully' 
  })
  async getMyTopMatches(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.careerFitResultService.getTopCareerMatches(
      user.id,
      limit ? Number(limit) : 10,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get career fit results for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'User career fit results retrieved successfully' 
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.careerFitResultService.findByUser(
      userId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('my-results')
  @ApiOperation({ summary: 'Get career fit results for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'User career fit results retrieved successfully' 
  })
  async findMyResults(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.careerFitResultService.findByUser(
      user.id,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('career/:careerId')
  @ApiOperation({ summary: 'Get career fit results for a specific career' })
  @ApiParam({ name: 'careerId', description: 'Career ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Career fit results retrieved successfully' 
  })
  async findByCareer(@Param('careerId') careerId: string) {
    return this.careerFitResultService.findByCareer(careerId);
  }

  @Post('compare/:userId')
  @ApiOperation({ summary: 'Generate career comparison report for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Career comparison report generated successfully' 
  })
  async generateComparisonReport(
    @Param('userId') userId: string,
    @Body('careerIds') careerIds: string[],
  ) {
    return this.careerFitResultService.generateComparisonReport(userId, careerIds);
  }

  @Post('my-compare')
  @ApiOperation({ summary: 'Generate career comparison report for current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Career comparison report generated successfully' 
  })
  async generateMyComparisonReport(
    @CurrentUser() user: any,
    @Body('careerIds') careerIds: string[],
  ) {
    return this.careerFitResultService.generateComparisonReport(user.id, careerIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a career fit result by ID' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Career fit result retrieved successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Career fit result not found' 
  })
  async findOne(@Param('id') id: string) {
    return this.careerFitResultService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a career fit result' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Career fit result updated successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Career fit result not found' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCareerFitResultDto,
  ) {
    return this.careerFitResultService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a career fit result' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  @ApiResponse({ 
    status: 204, 
    description: 'Career fit result deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Career fit result not found' 
  })
  async remove(@Param('id') id: string) {
    return this.careerFitResultService.remove(id);
  }
}