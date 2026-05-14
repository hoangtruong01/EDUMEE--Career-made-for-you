import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Lấy thống kê dashboard' })
  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @Get('users')
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('loginType') loginType?: string,
  ) {
    return this.adminService.getAllUsers(Number(page) || 1, Number(limit) || 10, loginType);
  }

  @ApiOperation({ summary: 'Xóa nhiều người dùng' })
  @Delete('users/bulk-delete')
  async bulkDeleteUsers(@Body('ids') ids: string[]) {
    return this.adminService.bulkDeleteUsers(ids);
  }

  @ApiOperation({ summary: 'Xóa người dùng' })
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }



  @ApiOperation({ summary: 'Cập nhật trạng thái người dùng' })
  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @ApiOperation({ summary: 'Cập nhật vai trò người dùng' })
  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.updateUserRole(id, role);
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
  async createCareer(@Body() data: Record<string, any>) {
    return this.adminService.createCareer(data);
  }

  @ApiOperation({ summary: 'Cập nhật nghề nghiệp' })
  @Patch('careers/:id')
  async updateCareer(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.adminService.updateCareer(id, data);
  }

  @ApiOperation({ summary: 'Xóa nghề nghiệp' })
  @Delete('careers/:id')
  async deleteCareer(@Param('id') id: string) {
    return this.adminService.deleteCareer(id);
  }

  @ApiOperation({ summary: 'Bổ sung thông tin thiếu bằng AI' })
  @Post('careers/:id/fill-missing')
  async fillMissingData(@Param('id') id: string): Promise<unknown> {
    return this.adminService.fillMissingData(id);
  }
}
