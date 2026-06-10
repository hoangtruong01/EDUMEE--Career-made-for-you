import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import type { AuthUserLike } from '../../../common/auth';
import { assertOwnerOrAdmin, getAuthUserId, isAdmin } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCareerFitResultDto, UpdateCareerFitResultDto } from '../dto';
import { CareerFitResultService } from '../services/career-fit-result.service';

interface CareerInput {
  id: string;
  title: string;
}

interface GenerateAnalysisRequest {
  availableCareers?: CareerInput[];
  sessionId?: string;
}

function toOwnerId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return toOwnerId((value as { _id?: unknown })._id);
  }
  return '';
}

@ApiTags('Career Fit Results')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('career-fit-results')
export class CareerFitResultController {
  constructor(private readonly careerFitResultService: CareerFitResultService) {}

  /* ======================================================================== */
  /* 1. KHỐI CÁC ROUTE TĨNH (STATIC ROUTES) - BẮT BUỘC PHẢI ĐẶT TRÊN CÙNG       */
  /* ======================================================================== */

  @Get('insights')
  @ApiOperation({ summary: 'Get all discovered career insights for repository' })
  @ApiResponse({ status: 200, description: 'List of all career insights' })
  async getInsights() {
    return this.careerFitResultService.findAllInsights();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get career fit statistics' })
  async getStatistics(): Promise<Record<string, unknown>> {
    return this.careerFitResultService.getStatistics();
  }

  @Get('my-results')
  @Get('my-result')
  @ApiOperation({ summary: 'Get current user career fit results' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  async findMyResults(
    @CurrentUser() user: AuthUserLike,
    @Query('limit') limit?: number,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.careerFitResultService.findByUserVisible(getAuthUserId(user), limit, sessionId);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get current user assessment result history' })
  async findMyHistory(@CurrentUser() user: AuthUserLike) {
    return this.careerFitResultService.findMyHistory(getAuthUserId(user));
  }

  @Get('top-matches')
  @ApiOperation({ summary: 'Get top career matches for current user' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top matches to return (default: 10)',
  })
  async getTopMatches(@CurrentUser() user: AuthUserLike, @Query('limit') limit?: number) {
    return this.careerFitResultService.getTopCareerMatchesVisible(getAuthUserId(user), limit || 10);
  }

  @Get('career-insight')
  @ApiOperation({ summary: 'Get AI-generated career insight' })
  @ApiQuery({ name: 'careerTitle', required: true, type: String })
  @ApiQuery({
    name: 'traits',
    required: true,
    type: String,
    description: 'Comma-separated personality traits',
  })
  async getCareerInsight(
    @CurrentUser() user: AuthUserLike,
    @Query('careerTitle') careerTitle: string,
    @Query('traits') traits: string,
  ) {
    const personalityTraits = traits.split(',').map((trait) => trait.trim());
    const insight = await this.careerFitResultService.getCareerInsight(
      getAuthUserId(user),
      careerTitle,
      personalityTraits,
    );
    return { careerTitle, personalityTraits, insight };
  }

  @Get('detailed-analysis')
  @ApiOperation({
    summary: 'Get AI-generated detailed career analysis with pros/cons and 5-year trends',
  })
  @ApiQuery({
    name: 'careerTitle',
    required: true,
    type: String,
    description: 'Career title to analyze',
  })
  @ApiResponse({ status: 200, description: 'Detailed AI career analysis' })
  async getDetailedAnalysis(
    @CurrentUser() user: AuthUserLike,
    @Query('careerTitle') careerTitle: string,
  ): Promise<Record<string, unknown>> {
    return this.careerFitResultService.getDetailedAnalysis(getAuthUserId(user), careerTitle);
  }

  /* ======================================================================== */
  /* 2. KHỐI CÁC ROUTE POST (CÁC THAO TÁC KHỞI TẠO DỮ LIỆU)                     */
  /* ======================================================================== */

  @Post()
  @ApiOperation({ summary: 'Create a new career fit result' })
  @ApiResponse({ status: 201, description: 'Career fit result created successfully' })
  async create(@Body() createDto: CreateCareerFitResultDto) {
    return this.careerFitResultService.create(createDto);
  }

  @Post('generate-my-analysis')
  @ApiOperation({
    summary: 'Generate AI-powered career analysis from current user answers (auto-fetch from DB)',
  })
  @ApiResponse({
    status: 201,
    description: 'AI analysis completed and career fit results generated',
  })
  async generateMyAnalysis(
    @CurrentUser() user: AuthUserLike,
    @Body() requestData?: GenerateAnalysisRequest,
  ) {
    const userId = getAuthUserId(user);
    console.log('Generate My Analysis - User:', userId);

    return this.careerFitResultService.generateAnalysisFromUserAnswers(
      userId,
      (requestData?.availableCareers as unknown as import('../../careers/schemas/career.schema').Career[]) ||
        [],
      requestData?.sessionId,
    );
  }

  @Post('comparison')
  @ApiOperation({ summary: 'Generate comparison report for multiple careers' })
  async generateComparison(
    @CurrentUser() user: AuthUserLike,
    @Body() body: { careerIds: string[] },
  ): Promise<Record<string, unknown>> {
    return await this.careerFitResultService.generateComparisonReport(
      getAuthUserId(user),
      body.careerIds,
    );
  }

  /* ======================================================================== */
  /* 3. KHỐI ROUTE QUERY CHUNG (CÓ THỂ CHỨA NHIỀU THAM SỐ LỌC)                  */
  /* ======================================================================== */

  @Get()
  @ApiOperation({ summary: 'Get all career fit results' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthUserLike,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
  ) {
    const filters: NonNullable<Parameters<CareerFitResultService['findAll']>[2]> = {};
    const currentUserId = getAuthUserId(user);
    if (userId) {
      assertOwnerOrAdmin(userId, user);
      filters.userId = new Types.ObjectId(userId);
    } else {
      if (!isAdmin(user)) {
        filters.userId = new Types.ObjectId(currentUserId);
      }
    }
    const result = await this.careerFitResultService.findAll(page || 1, limit || 10, filters);
    if (!isAdmin(user)) {
      return {
        ...result,
        data: await this.careerFitResultService.applyCareerRecommendationVisibility(
          currentUserId,
          result.data,
        ),
      };
    }

    return result;
  }

  /* ======================================================================== */
  /* 4. KHỐI CÁC ROUTE CHỨA PARAM BIẾN ĐỘNG - BẮT BUỘC PHẢI ĐỂ DƯỚI CÙNG        */
  /* ======================================================================== */

  @Get(':id')
  @ApiOperation({ summary: 'Get career fit result by ID' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    const res = await this.careerFitResultService.findOne(id);
    const ownerId = toOwnerId((res as { userId?: unknown }).userId);
    assertOwnerOrAdmin(ownerId, user);
    if (isAdmin(user)) {
      return res;
    }
    const [visibleResult] = await this.careerFitResultService.applyCareerRecommendationVisibility(
      getAuthUserId(user),
      [res],
    );
    return visibleResult;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update career fit result' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCareerFitResultDto,
    @CurrentUser() user: AuthUserLike,
  ) {
    const res = await this.careerFitResultService.findOne(id);
    const ownerId = toOwnerId((res as { userId?: unknown }).userId);
    assertOwnerOrAdmin(ownerId, user);
    return this.careerFitResultService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete career fit result' })
  @ApiParam({ name: 'id', description: 'Career fit result ID' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    const res = await this.careerFitResultService.findOne(id);
    const ownerId = toOwnerId((res as { userId?: unknown }).userId);
    assertOwnerOrAdmin(ownerId, user);
    return this.careerFitResultService.remove(id);
  }
}
