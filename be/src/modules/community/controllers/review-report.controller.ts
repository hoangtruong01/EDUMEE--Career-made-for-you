import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateReviewReportDto } from '../dto';
import { ReviewReportService } from '../services/review-report.service';
import { ReportStatus } from '../schemas/review-interactions.schema';

@ApiTags('review-reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('review-reports')
export class ReviewReportController {
  constructor(private readonly reviewReportService: ReviewReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a report for a review' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Report created successfully' })
  create(@Body() dto: CreateReviewReportDto, @CurrentUser() user: any) {
    return this.reviewReportService.createForUser(user.userId, dto as any);
  }

  @Get()
  @ApiOperation({ summary: 'List reports (admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('reviewId') reviewId?: string,
    @Query('status') status?: ReportStatus,
  ) {
    const filters = {
      ...(reviewId ? { reviewId } : {}),
      ...(status ? { status } : {}),
    } as Parameters<ReviewReportService['findAll']>[2];
    return this.reviewReportService.findAll(page, limit, filters);
  }

  @Get('review/:reviewId')
  @ApiOperation({ summary: 'List reports by review (admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findByReview(@Param('reviewId') reviewId: string) {
    return this.reviewReportService.findByReview(reviewId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by id (admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.reviewReportService.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update report status (admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ReportStatus; resolution?: Record<string, unknown> },
  ) {
    return this.reviewReportService.updateStatus(id, body.status, body.resolution);
  }
}

