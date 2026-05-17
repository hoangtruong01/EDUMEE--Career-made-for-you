import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../common/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schemas';
import type { UploadedImageFile } from '../media/services/media.service';

export interface RequestUser {
  userId: string;
  sub: string;
  email: string;
  role: string;
  verify: number;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =======================================================================
  //! 1. NHÓM API user
  // =======================================================================
  @ApiOperation({ summary: 'Lấy thông tin cá nhân của người đang đăng nhập' })
  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return await this.usersService.getMe(user.userId);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @Patch('me')
  async updateMe(@CurrentUser() user: RequestUser, @Body() updateData: UpdateMeDto) {
    return await this.usersService.updateMe(user.userId, updateData);
  }

  @ApiOperation({ summary: 'Cập nhật ảnh đại diện' })
  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file ảnh');
    }
    try {
      return await this.usersService.updateAvatar(user.userId, file);
    } catch (error) {
      console.error('Update avatar failed:', error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Đổi mật khẩu (Yêu cầu mật khẩu cũ)' })
  @Post('change-password')
  async changePassword(@CurrentUser() user: RequestUser, @Body() body: ChangePasswordDto) {
    const dbUser = await this.usersService.findById(user.userId);
    if (!dbUser) throw new BadRequestException('Người dùng không tồn tại');

    const isMatch = await this.usersService.validatePassword(
      dbUser as UserDocument,
      body.currentPassword,
    );

    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    // 3. Tiến hành đổi mật khẩu
    await this.usersService.changePassword(user.userId, body.newPassword);
    return { message: 'Đổi mật khẩu thành công' };
  }

  // =======================================================================
  //! API QUẢN TRỊ (CHỈ DÀNH CHO ADMIN)
  // =======================================================================
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng (Admin)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.usersService.findAll(page, limit);
  }

  @ApiOperation({ summary: 'Sửa thông tin người dùng nào (Admin)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Xóa người dùng (Admin)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'Xóa người dùng thành công' };
  }
}
