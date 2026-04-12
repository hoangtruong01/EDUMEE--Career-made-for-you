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
import { Types } from 'mongoose';
import { CareerFitResultService } from '../services/career-fit-result.service';
import { CreateCareerFitResultDto, UpdateCareerFitResultDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { assertOwnerOrAdmin, isAdmin } from '../../../common/auth';

interface CurrentUserPayload {
  userId: string;
  email: string;
  role: string;
}

interface Career {
  id: string;
  title: string;
}

interface GenerateAnalysisRequest {
  availableCareers?: Career[];
}


@ApiTags('Career Fit Results')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('career-fit-results')
export class CareerFitResultController {
  constructor(private readonly careerFitResultService: CareerFitResultService) {}

  @Post('generate-my-analysis')
  @ApiOperation({ summary: 'Generate AI-powered career analysis from current user answers (auto-fetch from DB)' })
  @ApiResponse({ 
    status: 201, 
    description: 'AI analysis completed and career fit results generated' 
  })
  async generateMyAnalysis(
    @CurrentUser() user: CurrentUserPayload,
    @Body() requestData?: GenerateAnalysisRequest,
  ) {
    console.log('Generate My Analysis - User:', user?.userId);
    
    return this.careerFitResultService.generateAnalysisFromUserAnswers(
      user.userId,
      requestData?.availableCareers || []
    );
  }

  @Get('career-insight')
  @ApiOperation({ summary: 'Get AI-generated career insight' })
  @ApiQuery({ name: 'careerTitle', required: true, type: String })
  @ApiQuery({ name: 'traits', required: true, type: String, description: 'Comma-separated personality traits' })
  async getCareerInsight(
    @CurrentUser() user: CurrentUserPayload,
    @Query('careerTitle') careerTitle: string,
    @Query('traits') traits: string,
  ) {
    const personalityTraits = traits.split(',').map(trait => trait.trim());
    const insight = await this.careerFitResultService.getCareerInsight(user.userId, careerTitle, personalityTraits);
    return { careerTitle, personalityTraits, insight };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new career fit result' })
  @ApiResponse({ status: 201, description: 'Career fit result created successfully' })
  async create(@Body() createDto: CreateCareerFitResultDto) {
    return this.careerFitResultService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all career fit results' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    const filters: Partial<any> = {};
    if (userId) {
      assertOwnerOrAdmin(userId, user as any);
      filters.userId = new Types.ObjectId(userId);
    } else {
      // Non-admin defaults to own results only.
      if (!isAdmin(user as any)) {
        filters.userId = new Types.ObjectId((user as any).userId);
      }
    }
    return this.careerFitResultService.findAll(page || 1, limit || 10, filters);
  }

  @Get('my-results')
  @ApiOperation({ summary: 'Get current user career fit results' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMyResults(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: number,
  ) {
    return this.careerFitResultService.findByUser(user.userId, limit);
  }

  @Get('top-matches')
  @ApiOperation({ summary: 'Get top career matches for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top matches to return (default: 10)' })
  async getTopMatches(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: number,
  ) {
    return this.careerFitResultService.getTopCareerMatches(user.userId, limit || 10);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get career fit statistics' })
  async getStatistics(): Promise<Record<string, unknown>> {
    return this.careerFitResultService.getStatistics() as Promise<Record<string, unknown>>;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get career fit result by ID' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const res = await this.careerFitResultService.findOne(id);
    assertOwnerOrAdmin((res as any).userId.toString(), user);
    return res;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update career fit result' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCareerFitResultDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const res = await this.careerFitResultService.findOne(id);
    assertOwnerOrAdmin((res as any).userId.toString(), user);
    return this.careerFitResultService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete career fit result' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const res = await this.careerFitResultService.findOne(id);
    assertOwnerOrAdmin((res as any).userId.toString(), user);
    return this.careerFitResultService.remove(id);
  }

  @Post('comparison')
  @ApiOperation({ summary: 'Generate comparison report for multiple careers' })
  async generateComparison(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { careerIds: string[] },
  ): Promise<Record<string, unknown>> {
    return (await this.careerFitResultService.generateComparisonReport(user.userId, body.careerIds)) as Record<string, unknown>;
  }
}
