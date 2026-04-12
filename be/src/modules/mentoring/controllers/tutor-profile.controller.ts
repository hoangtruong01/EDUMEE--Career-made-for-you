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
import { TutorProfileService } from '../services/tutor-profile.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateTutorProfileDto, UpdateTutorProfileDto } from '../dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { isAdmin } from '../../../common/auth';

@ApiTags('tutor-profiles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tutor-profiles')
export class TutorProfileController {
  constructor(private readonly tutorProfileService: TutorProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tutor profile' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Profile created successfully' })
  create(@Body() createDto: CreateTutorProfileDto, @CurrentUser() user: any) {
    return this.tutorProfileService.create({ ...createDto, userId: user.userId });
  }

  @Get()
  @ApiOperation({ summary: 'Get all tutor profiles' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profiles retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('tutorLevel') tutorLevel?: string,
  ) {
    const filters = {
      ...(status ? { status } : {}),
      ...(tutorLevel ? { tutorLevel } : {}),
    } as Parameters<TutorProfileService['findAll']>[2];

    return this.tutorProfileService.findAll(page, limit, filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active tutor profiles' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active profiles retrieved successfully' })
  findActive() {
    return this.tutorProfileService.findActive();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tutor profiles by criteria' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Search results retrieved successfully' })
  searchTutors(@Query() criteria: { expertise?: string; industries?: string[] }) {
    return this.tutorProfileService.searchTutors(criteria);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get tutor profile by user ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  findByUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    if (!isAdmin(user) && userId !== user.userId) throw new ForbiddenException('Forbidden');
    return this.tutorProfileService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tutor profile by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  findOne(@Param('id') id: string) {
    return this.tutorProfileService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tutor profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateTutorProfileDto, @CurrentUser() user: any) {
    const profile = await this.tutorProfileService.findOne(id);
    if (!isAdmin(user) && profile.userId.toString() !== user.userId) throw new ForbiddenException('Forbidden');

    if (!isAdmin(user)) {
      // Non-admin cannot update status directly.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status, ...rest } = updateDto as any;
      return this.tutorProfileService.update(id, rest);
    }

    return this.tutorProfileService.update(id, updateDto as any);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update tutor profile status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.tutorProfileService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tutor profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const profile = await this.tutorProfileService.findOne(id);
    if (!isAdmin(user) && profile.userId.toString() !== user.userId) throw new ForbiddenException('Forbidden');
    return this.tutorProfileService.remove(id);
  }
}
