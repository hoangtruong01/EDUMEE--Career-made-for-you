import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CareerReviewService } from '../services/career-review.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCareerReviewDto, UpdateCareerReviewDto } from '../dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isAdmin } from '../../../common/auth';
import { ReviewStatus } from '../schemas/career-review.schema';
import { ConfigService } from '@nestjs/config';


@ApiTags('career-reviews')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('career-reviews')
export class CareerReviewController {
  constructor(
    private readonly careerReviewService: CareerReviewService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new career review' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Review created successfully' })
  create(@Body() createDto: CreateCareerReviewDto, @CurrentUser() user: any) {
    const salt =
      this.configService.get<string>('app.anonymousSalt') ||
      this.configService.get<string>('ANON_SALT') ||
      'default_anon_salt';
    return this.careerReviewService.createForUser(user.userId, salt, createDto as any);
  }

  @Get()
  @ApiOperation({ summary: 'Get all career reviews' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('careerId') careerId?: string,
    @Query('reviewCategory') reviewCategory?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    const admin = isAdmin(user);
    const filters: any = {
      ...(careerId ? { careerId } : {}),
      ...(reviewCategory ? { reviewCategory } : {}),
    };

    if (admin) {
      if (status) filters.status = status;
    } else {
      // Public listing defaults to published only.
      filters.status = ReviewStatus.PUBLISHED;
    }

    return this.careerReviewService.findAll(page, limit, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get review statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  getStatistics(@Query('careerId') careerId?: string) {
    return this.careerReviewService.getStatistics(careerId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user reviews (by anonymousId)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  findMyReviews(@CurrentUser() user: any) {
    const salt =
      this.configService.get<string>('app.anonymousSalt') ||
      this.configService.get<string>('ANON_SALT') ||
      'default_anon_salt';
    const anonymousId = this.careerReviewService.buildAnonymousId(user.userId, salt);
    return this.careerReviewService.findByAnonymousId(anonymousId);
  }

  @Get('career/:careerId')
  @ApiOperation({ summary: 'Get reviews by career' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  findByCareer(
    @Param('careerId') careerId: string,
    @Query('published') published?: boolean,
  ) {
    return this.careerReviewService.findByCareer(careerId, published !== false);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get reviews by category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  findByCategory(@Param('category') category: string, @Query('published') published?: boolean) {
    return this.careerReviewService.findByCategory(category, published !== false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a career review by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const review = await this.careerReviewService.findOne(id);
    if (review.status === ReviewStatus.PUBLISHED || isAdmin(user)) return review;

    const salt =
      this.configService.get<string>('app.anonymousSalt') ||
      this.configService.get<string>('ANON_SALT') ||
      'default_anon_salt';
    const myAnonymousId = this.careerReviewService.buildAnonymousId(user.userId, salt);
    if (review.anonymousId !== myAnonymousId) {
      throw new ForbiddenException('Forbidden');
    }
    return review;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a career review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateCareerReviewDto, @CurrentUser() user: any) {
    const review = await this.careerReviewService.findOne(id);

    if (!isAdmin(user)) {
      const salt =
        this.configService.get<string>('app.anonymousSalt') ||
        this.configService.get<string>('ANON_SALT') ||
        'default_anon_salt';
      const myAnonymousId = this.careerReviewService.buildAnonymousId(user.userId, salt);
      if (review.anonymousId !== myAnonymousId) throw new ForbiddenException('Forbidden');
      if (review.status !== ReviewStatus.DRAFT && review.status !== ReviewStatus.SUBMITTED) {
        throw new ForbiddenException('Cannot update after moderation/publish');
      }
      // Non-admin cannot set status directly.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status, ...rest } = updateDto as any;
      return this.careerReviewService.update(id, rest);
    }

    return this.careerReviewService.update(id, updateDto as any);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update review status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.careerReviewService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a career review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const review = await this.careerReviewService.findOne(id);
    if (isAdmin(user)) return this.careerReviewService.remove(id);

    const salt =
      this.configService.get<string>('app.anonymousSalt') ||
      this.configService.get<string>('ANON_SALT') ||
      'default_anon_salt';
    const myAnonymousId = this.careerReviewService.buildAnonymousId(user.userId, salt);
    if (review.anonymousId !== myAnonymousId) throw new ForbiddenException('Forbidden');
    if (review.status !== ReviewStatus.DRAFT && review.status !== ReviewStatus.SUBMITTED) {
      throw new ForbiddenException('Cannot delete after moderation/publish');
    }
    return this.careerReviewService.remove(id);
  }
}
