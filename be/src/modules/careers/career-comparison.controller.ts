import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CareerComparisonService } from './services/career-comparison.service';
import {
  CreateCareerComparisonDto,
  UpdateCareerComparisonDto,
  CareerComparisonResponseDto,
} from './dto/index';
import { CareerComparison } from './schemas/career-comparison.schema';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Career Comparisons')
@Controller('career-comparisons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CareerComparisonController {
  constructor(
    private readonly careerComparisonService: CareerComparisonService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new career comparison' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Career comparison created successfully',
    type: CareerComparisonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async create(
    @Body() createCareerComparisonDto: CreateCareerComparisonDto,
    @CurrentUser() user: any,
  ): Promise<CareerComparison> {
    // Ensure userId is set to current user
    const dto = { ...createCareerComparisonDto, userId: user.id };
    return this.careerComparisonService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all career comparisons with pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career comparisons retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CareerComparisonResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('userId') userId?: string,
  ): Promise<{
    data: CareerComparison[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filters: any = {};
    if (userId) filters.userId = userId;

    return this.careerComparisonService.findAll(page, limit, filters);
  }

  @Get('my-comparisons')
  @ApiOperation({ summary: 'Get all comparisons for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User career comparisons retrieved successfully',
    type: [CareerComparisonResponseDto],
  })
  async getMyComparisons(@CurrentUser() user: any): Promise<CareerComparison[]> {
    return this.careerComparisonService.findByUser(user.id);
  }

  @Post('compare-careers')
  @ApiOperation({
    summary: 'Compare multiple careers side by side without saving',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career comparison analysis completed',
    schema: {
      type: 'object',
      properties: {
        careers: { type: 'array' },
        comparison: { type: 'object' },
        summary: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid career IDs or insufficient data',
  })
  async compareCareers(
    @Body() { careerIds }: { careerIds: string[] },
  ): Promise<any> {
    if (!careerIds || careerIds.length < 2) {
      throw new BadRequestException(
        'At least 2 career IDs are required for comparison',
      );
    }

    if (careerIds.length > 5) {
      throw new BadRequestException('Maximum 5 careers can be compared at once');
    }

    return this.careerComparisonService.compareCareersSideBySide(careerIds);
  }

  @Post('detailed-analysis')
  @ApiOperation({
    summary: 'Generate detailed career comparison with analysis and recommendations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detailed career analysis completed',
    schema: {
      type: 'object',
      properties: {
        careers: { type: 'array' },
        detailedAnalysis: { type: 'object' },
        recommendations: { type: 'object' },
        scoreBreakdown: { type: 'array' },
        comparisonId: { type: 'string' },
      },
    },
  })
  async generateDetailedAnalysis(
    @Body()
    {
      careerIds,
      criteria,
    }: {
      careerIds: string[];
      criteria?: any;
    },
    @CurrentUser() user: any,
  ): Promise<any> {
    if (!careerIds || careerIds.length < 2) {
      throw new BadRequestException(
        'At least 2 career IDs are required for detailed analysis',
      );
    }

    return this.careerComparisonService.generateDetailedComparison(
      user.id,
      careerIds,
      criteria,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get career comparison statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comparison statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalComparisons: { type: 'number' },
        avgCareersPerComparison: { type: 'number' },
        mostComparedCareers: { type: 'array' },
      },
    },
  })
  async getStatistics(): Promise<any> {
    return this.careerComparisonService.getComparisonStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get career comparison by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career comparison ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career comparison retrieved successfully',
    type: CareerComparisonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career comparison not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid comparison ID',
  })
  async findOne(@Param('id') id: string): Promise<CareerComparison> {
    return this.careerComparisonService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update career comparison by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career comparison ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career comparison updated successfully',
    type: CareerComparisonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career comparison not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or comparison ID',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCareerComparisonDto: UpdateCareerComparisonDto,
    @CurrentUser() user: any,
  ): Promise<CareerComparison> {
    // Verify ownership or admin access could be added here
    return this.careerComparisonService.update(id, updateCareerComparisonDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete career comparison by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career comparison ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Career comparison deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career comparison not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid comparison ID',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    // Verify ownership or admin access could be added here
    return this.careerComparisonService.remove(id);
  }
}