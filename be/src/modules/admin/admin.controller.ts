import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '../../common/enums';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditLogCategory, AuditLogStatus } from '../audit/schema/audit-log.schema';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateMentorPlatformFeeConfigDto } from '../payment/dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @ApiOperation({ summary: 'Lấy thống kê dashboard' })
  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @ApiOperation({ summary: 'Lấy tổng quan tài chính' })
  @Get('finance/summary')
  async getFinanceSummary(@Query('range') range?: string) {
    return this.adminService.getFinanceSummary(range);
  }

  @ApiOperation({ summary: 'Lấy danh sách giao dịch tài chính' })
  @Get('finance/payments')
  async getFinancePayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('purpose') purpose?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getFinancePayments({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      status,
      purpose,
      plan,
      search,
    });
  }

  @ApiOperation({ summary: 'Lấy tổng quan phí mentor' })
  @Get('finance/fees/summary')
  async getFinanceFeesSummary(@Query('range') range?: string) {
    return this.adminService.getFinanceFeesSummary(range);
  }

  @ApiOperation({ summary: 'Lấy danh sách settlement phí mentor' })
  @Get('finance/fees/settlements')
  async getFinanceFeeSettlements(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getFinanceFeeSettlements({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      status,
      search,
    });
  }

  @ApiOperation({ summary: 'Cập nhật tỷ lệ phí nền tảng cho booking mentor' })
  @Patch('finance/fees/config')
  async updateFinanceFeeConfig(
    @Body() dto: UpdateMentorPlatformFeeConfigDto,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'finance.fees.update_config',
        resource: 'payment_setting',
        metadata: { mentorPlatformFeePercent: dto.mentorPlatformFeePercent },
      },
      () => this.adminService.updateMentorPlatformFeeConfig(dto.mentorPlatformFeePercent),
    );
  }

  @ApiOperation({ summary: 'Lấy dữ liệu phân tích admin' })
  @Get('analytics')
  async getAnalytics(@Query('range') range?: string) {
    return this.adminService.getAnalytics(range);
  }

  @ApiOperation({ summary: 'Lấy tracking events cho admin analytics' })
  @Get('analytics/tracking-events')
  async getTrackingEvents(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('eventType') eventType?: string,
    @Query('path') path?: string,
  ) {
    return this.adminService.getTrackingEvents({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      eventType,
      path,
    });
  }

  @ApiOperation({ summary: 'Lấy nhật ký audit log' })
  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditLogService.list({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category,
      search,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'Lấy nhật ký hoạt động hợp nhất' })
  @Get('activity-logs')
  async getActivityLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('source') source?: 'all' | 'audit' | 'tracking',
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditLogService.listActivityLogs({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category,
      source,
      search,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @Get('users')
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('loginType') loginType?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
  ) {
    return this.adminService.getAllUsers(Number(page) || 1, Number(limit) || 10, {
      loginType,
      search,
      role,
      status,
      plan,
    });
  }

  @ApiOperation({ summary: 'Xóa nhiều người dùng' })
  @Delete('users/bulk-delete')
  async bulkDeleteUsers(
    @Body('ids') ids: string[],
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'users.bulk_delete',
        resource: 'user',
        metadata: { ids },
      },
      () => this.adminService.bulkDeleteUsers(ids),
    );
  }

  @ApiOperation({ summary: 'Xóa người dùng' })
  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'users.delete',
        resource: 'user',
        resourceId: id,
      },
      () => this.adminService.deleteUser(id),
    );
  }



  @ApiOperation({ summary: 'Cập nhật trạng thái người dùng' })
  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'users.update_status',
        resource: 'user',
        resourceId: id,
        metadata: { status },
      },
      () => this.adminService.updateUserStatus(id, status),
    );
  }

  @ApiOperation({ summary: 'Cập nhật vai trò người dùng' })
  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'users.update_role',
        resource: 'user',
        resourceId: id,
        metadata: { role },
      },
      () => this.adminService.updateUserRole(id, role),
    );
  }

  // Career Management
  @ApiOperation({ summary: 'Lấy danh sách nghề nghiệp' })
  @Get('careers')
  async getAllCareers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ): Promise<{ careers: any[]; total: number }> {
    return this.adminService.getAllCareers(Number(page) || 1, Number(limit) || 10, search, category);
  }

  @ApiOperation({ summary: 'Kiểm tra tên nghề nghiệp trùng' })
  @Get('careers/check-duplicate')
  async checkCareerTitleDuplicate(@Query('title') title: string) {
    return { exists: await this.adminService.checkCareerTitleDuplicate(title) };
  }

  @ApiOperation({ summary: 'Tạo nghề nghiệp bằng AI' })
  @Post('careers/generate-ai')
  async generateCareerWithAI(@Body('title') title: string): Promise<unknown> {
    return this.adminService.generateCareerWithAI(title);
  }

  @ApiOperation({ summary: 'Thêm nghề nghiệp mới' })
  @Post('careers')
  async createCareer(
    @Body() data: Record<string, any>,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'careers.create',
        resource: 'career',
        metadata: { title: data.title },
      },
      () => this.adminService.createCareer(data),
    );
  }

  @ApiOperation({ summary: 'Cập nhật nghề nghiệp' })
  @Patch('careers/:id')
  async updateCareer(
    @Param('id') id: string,
    @Body() data: Record<string, any>,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'careers.update',
        resource: 'career',
        resourceId: id,
        metadata: { title: data.title },
      },
      () => this.adminService.updateCareer(id, data),
    );
  }

  @ApiOperation({ summary: 'Xóa nghề nghiệp' })
  @Delete('careers/:id')
  async deleteCareer(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
    @Req() request: Request,
  ) {
    return this.withAudit(
      {
        actor,
        request,
        action: 'careers.delete',
        resource: 'career',
        resourceId: id,
      },
      () => this.adminService.deleteCareer(id),
    );
  }

  @ApiOperation({ summary: 'Bổ sung thông tin thiếu bằng AI' })
  @Post('careers/:id/fill-missing')
  async fillMissingData(@Param('id') id: string): Promise<unknown> {
    return this.adminService.fillMissingData(id);
  }

  private async withAudit<T>(
    params: {
      actor: RequestUser;
      request: Request;
      action: string;
      resource: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
      category?: AuditLogCategory;
    },
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await callback();
      await this.auditLogService.record({
        ...params,
        status: AuditLogStatus.SUCCESS,
        category: params.category || AuditLogCategory.USER_ACTION,
      });
      return result;
    } catch (error) {
      await this.auditLogService.record({
        ...params,
        status: AuditLogStatus.FAILED,
        category: params.category || AuditLogCategory.USER_ACTION,
        metadata: {
          ...(params.metadata || {}),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }
}
