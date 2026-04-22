import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewInteractionsService } from '../services/review-interactions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UpsertReviewVoteDto, RemoveReviewVoteDto } from '../dto';
import { assertOwnerOrAdmin, getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('review-interactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('review-interactions')
export class ReviewInteractionsController {
  constructor(private readonly reviewInteractionsService: ReviewInteractionsService) { }

  @Post('vote')
  @ApiOperation({ summary: 'Add or update a vote' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vote added/updated successfully' })
  upsertVote(@Body() body: UpsertReviewVoteDto, @CurrentUser() user: AuthUserLike) {
    return this.reviewInteractionsService.upsertVote(body.reviewId, getAuthUserId(user), body.voteType, body.voteContext);
  }

  @Get()
  @ApiOperation({ summary: 'Get all votes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Votes retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('reviewId') reviewId?: string,
    @Query('voterId') voterId?: string,
  ) {
    const filters = {
      ...(reviewId ? { reviewId } : {}),
      ...(voterId ? { voterId } : {}),
    } as Parameters<ReviewInteractionsService['findAll']>[2];

    return this.reviewInteractionsService.findAll(page, limit, filters);
  }

  @Get('review/:reviewId')
  @ApiOperation({ summary: 'Get votes by review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Votes retrieved successfully' })
  findByReview(@Param('reviewId') reviewId: string) {
    return this.reviewInteractionsService.findByReview(reviewId);
  }

  @Get('review/:reviewId/statistics')
  @ApiOperation({ summary: 'Get vote statistics for a review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  getVoteStatistics(@Param('reviewId') reviewId: string) {
    return this.reviewInteractionsService.getVoteStatistics(reviewId);
  }

  @Get('voter/:voterId')
  @ApiOperation({ summary: 'Get votes by voter' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Votes retrieved successfully' })
  findByVoter(@Param('voterId') voterId: string, @CurrentUser() user: AuthUserLike) {
    assertOwnerOrAdmin(voterId, user);
    return this.reviewInteractionsService.findByVoter(voterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vote by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vote retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vote not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.reviewInteractionsService.findOne(id);
  }

  @Delete('vote')
  @ApiOperation({ summary: 'Remove a vote' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vote removed successfully' })
  removeVote(@Body() body: RemoveReviewVoteDto, @CurrentUser() user: AuthUserLike) {
    return this.reviewInteractionsService.removeVote(body.reviewId, getAuthUserId(user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vote' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vote deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vote not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.reviewInteractionsService.remove(id);
  }
}
