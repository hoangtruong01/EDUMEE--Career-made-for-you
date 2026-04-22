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
import { SessionReviewService } from '../services/session-review.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';

@ApiTags('session-reviews')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('session-reviews')
export class SessionReviewController {
  constructor(private readonly sessionReviewService: SessionReviewService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new session review' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Review created successfully' })
  create(
    @Body() createDto: { tutoringSessionId: string } & Record<string, unknown>,
    @CurrentUser() user: AuthUserLike,
  ) {
    return this.sessionReviewService.createForReviewer(getAuthUserId(user), createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all session reviews' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('tutoringSessionId') tutoringSessionId?: string,
    @Query('reviewerId') reviewerId?: string,
    @Query('revieweeId') revieweeId?: string,
  ) {
    const filters = {
      ...(tutoringSessionId ? { tutoringSessionId } : {}),
      ...(reviewerId ? { reviewerId } : {}),
      ...(revieweeId ? { revieweeId } : {}),
    } as Parameters<SessionReviewService['findAll']>[2];

    return this.sessionReviewService.findAll(page, limit, filters);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get reviews by session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  findBySession(@Param('sessionId') sessionId: string) {
    return this.sessionReviewService.findBySession(sessionId);
  }

  @Get('reviewer/:reviewerId')
  @ApiOperation({ summary: 'Get reviews by reviewer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  findByReviewer(@Param('reviewerId') reviewerId: string, @CurrentUser() user: AuthUserLike) {
    if (!isAdmin(user) && reviewerId !== getAuthUserId(user)) throw new ForbiddenException('Forbidden');
    return this.sessionReviewService.findByReviewer(reviewerId);
  }

  @Get('reviewee/:revieweeId')
  @ApiOperation({ summary: 'Get reviews by reviewee' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findByReviewee(@Param('revieweeId') revieweeId: string) {
    return this.sessionReviewService.findByReviewee(revieweeId);
  }

  @Get('reviewee/:revieweeId/average-rating')
  @ApiOperation({ summary: 'Get average rating for a reviewee' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Average rating retrieved successfully' })
  getAverageRating(@Param('revieweeId') revieweeId: string) {
    return this.sessionReviewService.getAverageRating(revieweeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a session review by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const review = await this.sessionReviewService.findOne(id);
    if (isAdmin(user)) return review;
    const ok = review.reviewerId.toString() === userId || review.reviewedUserId.toString() === userId;
    if (!ok) throw new ForbiddenException('Forbidden');
    return review;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a session review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async update(@Param('id') id: string, @Body() updateDto: Record<string, unknown>, @CurrentUser() user: AuthUserLike) {
    const review = await this.sessionReviewService.findOne(id);
    if (!isAdmin(user) && review.reviewerId.toString() !== getAuthUserId(user)) throw new ForbiddenException('Forbidden');
    return this.sessionReviewService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a session review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    const review = await this.sessionReviewService.findOne(id);
    if (!isAdmin(user) && review.reviewerId.toString() !== getAuthUserId(user)) throw new ForbiddenException('Forbidden');
    return this.sessionReviewService.remove(id);
  }
}
