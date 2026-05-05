import { UserRole } from '@common/enums';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReportService } from '../services/report.service';
import { CommunityPostService } from '../services/community-post.service';
import { ReportStatus } from '../schemas/report.schema';
import { PostStatus } from '../schemas/community-post.schema';

interface RequestUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Controller('community/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly communityPostService: CommunityPostService,
  ) {}

  @Post()
  async createReport(
    @Req() req: Request & { user: RequestUser },
    @Body() body: {
      targetId: string;
      targetType: 'post' | 'comment';
      reason: string;
      postId?: string;
      details?: string;
    },
  ) {
    return this.reportService.createReport(
      req.user.userId,
      body.targetId,
      body.targetType,
      body.reason,
      body.postId,
      body.details,
    );
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllReports() {
    return this.reportService.findAllReports();
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
    @Body('status') status: ReportStatus,
  ) {
    return this.reportService.updateReportStatus(id, status, req.user.userId);
  }

  @Patch('admin/posts/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updatePostStatus(
    @Param('id') id: string,
    @Body('status') status: PostStatus,
  ) {
    return this.communityPostService.updateStatus(id, status);
  }
}
