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

import { CareerService } from './services/career.service';
import {
  CreateCareerDto,
  UpdateCareerDto,
  CareerResponseDto,
  CareerListResponseDto,
} from './dto/index';
import { Career, CareerCategory } from './schemas/career.schema';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Careers')
@Controller('careers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CareerController {
  constructor(private readonly careerService: CareerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new career' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Career created successfully',
    type: CareerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async create(@Body() createCareerDto: CreateCareerDto): Promise<Career> {
    return this.careerService.create(createCareerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all careers with pagination and filtering' })
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
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by career category',
    example: 'Technology',
  })
  @ApiQuery({
    name: 'industry',
    required: false,
    type: String,
    description: 'Filter by industry',
    example: 'Software Development',
  })
  @ApiQuery({
    name: 'experienceLevel',
    required: false,
    type: String,
    description: 'Filter by experience level',
    example: 'Mid-level',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Careers retrieved successfully',
    type: CareerListResponseDto,
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('experienceLevel') experienceLevel?: string,
  ): Promise<{
    data: Career[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filters: any = {};
    if (category) filters.category = category;
    if (industry) filters.industry = industry;
    if (experienceLevel) filters.experienceLevel = experienceLevel;

    return this.careerService.findAll(page, limit, filters);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search careers by various criteria' })
  @ApiQuery({
    name: 'skills',
    required: false,
    type: String,
    description: 'Comma-separated list of skills to search for',
    example: 'JavaScript,React,Node.js',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Search keyword for title or description',
    example: 'software engineer',
  })
  @ApiQuery({
    name: 'salaryRange',
    required: false,
    type: String,
    description: 'Salary range filter (format: min-max)',
    example: '50000-100000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [CareerResponseDto],
  })
  async search(
    @Query('skills') skills?: string,
    @Query('keyword') keyword?: string,
    @Query('salaryRange') salaryRange?: string,
  ): Promise<Career[]> {
    const searchCriteria: any = {};
    
    if (skills) {
      searchCriteria.skills = skills.split(',').map(skill => skill.trim());
    }
    
    if (keyword) {
      searchCriteria.keyword = keyword;
    }
    
    if (salaryRange) {
      const [min, max] = salaryRange.split('-').map(Number);
      if (isNaN(min) || isNaN(max)) {
        throw new BadRequestException('Invalid salary range format. Use: min-max');
      }
      searchCriteria.salaryRange = { min, max };
    }

    return this.careerService.searchCareers(searchCriteria);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all available career categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career categories retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async getCategories(): Promise<string[]> {
    return this.careerService.getCategories();
  }

  @Get('by-category/:category')
  @ApiOperation({ summary: 'Get careers by category' })
  @ApiParam({
    name: 'category',
    type: String,
    description: 'Career category',
    example: 'Technology',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Careers by category retrieved successfully',
    type: [CareerResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findByCategory(@Param('category') category: string): Promise<Career[]> {
    return this.careerService.findByCategory(category as CareerCategory);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get career statistics and analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalCareers: { type: 'number' },
        categoriesCount: { type: 'number' },
        topCategories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getStatistics(): Promise<any> {
    return this.careerService.getCareerStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get career by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career retrieved successfully',
    type: CareerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid career ID',
  })
  async findOne(@Param('id') id: string): Promise<Career> {
    return this.careerService.findOne(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related careers based on career ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of related careers to return (default: 5)',
    example: 5,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Related careers retrieved successfully',
    type: [CareerResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career not found',
  })
  async getRelatedCareers(
    @Param('id') id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 5,
  ): Promise<Career[]> {
    return this.careerService.getRelatedCareers(id, limit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update career by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Career updated successfully',
    type: CareerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or career ID',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCareerDto: UpdateCareerDto,
  ): Promise<Career> {
    return this.careerService.update(id, updateCareerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete career by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Career ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Career deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Career not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid career ID',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.careerService.remove(id);
  }
}