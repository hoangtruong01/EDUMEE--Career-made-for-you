import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserProfileService } from './user-profile.service';
import { 
  CreateUserProfileDto, 
  UpdateUserProfileDto, 
  UserProfileResponseDto 
} from './dto/user-profile.dto';
import type { IUser } from './schemas/user.schema';
import { EducationLevel, UserProfileDocument, Gender, BudgetLevel } from './schemas/user-profile.schema';

@ApiTags('User Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create user profile',
    description: 'Create a new profile for the authenticated user' 
  })
  @ApiBody({ type: CreateUserProfileDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Profile created successfully',
    type: UserProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Profile already exists' 
  })
  async createProfile(
    @CurrentUser() user: IUser,
    @Body() createProfileDto: CreateUserProfileDto
  ): Promise<UserProfileDocument> {
    return this.userProfileService.create(user.id, createProfileDto);
  }

  @Get('my-profile')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Get the profile of the authenticated user' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profile retrieved successfully',
    type: UserProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async getMyProfile(@CurrentUser() user: IUser): Promise<UserProfileDocument | null> {
    return this.userProfileService.findByUserId(user.id);
  }

  @Put('my-profile')
  @ApiOperation({ 
    summary: 'Update current user profile',
    description: 'Update the profile of the authenticated user' 
  })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profile updated successfully',
    type: UserProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async updateMyProfile(
    @CurrentUser() user: IUser,
    @Body() updateProfileDto: UpdateUserProfileDto
  ): Promise<UserProfileDocument> {
    return this.userProfileService.update(user.id, updateProfileDto);
  }

  @Delete('my-profile')
  @ApiOperation({ 
    summary: 'Delete current user profile',
    description: 'Delete the profile of the authenticated user' 
  })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Profile deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async deleteMyProfile(@CurrentUser() user: IUser): Promise<void> {
    return this.userProfileService.delete(user.id);
  }

  @Post('my-profile/update-constraints')
  @ApiOperation({ 
    summary: 'Update profile constraints',
    description: 'Update the constraints JSON for the current user profile' 
  })
  @ApiBody({ 
    description: 'Constraints JSON object',
    schema: {
      type: 'object',
      properties: {
        constraints: {
          type: 'object',
          example: {
            timePreferences: { availableDays: ['monday', 'wednesday'], preferredHours: 'evening' },
            learningStyle: { visual: true, audio: false }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Constraints updated successfully',
    type: UserProfileResponseDto 
  })
  async updateConstraints(
    @CurrentUser() user: IUser,
    @Body('constraints') constraints: Record<string, any>
  ): Promise<UserProfileDocument> {
    return this.userProfileService.updateConstraints(user.id, constraints);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all user profiles',
    description: 'Get all user profiles with optional filtering' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'educationLevel', required: false, enum: EducationLevel })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'budgetLevel', required: false, enum: BudgetLevel })
  @ApiQuery({ name: 'gender', required: false, enum: Gender })
  @ApiQuery({ name: 'minWeeklyHours', required: false, type: Number })
  @ApiQuery({ name: 'maxWeeklyHours', required: false, type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User profiles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        profiles: { type: 'array', items: { $ref: '#/components/schemas/UserProfileResponseDto' } },
        total: { type: 'number' }
      }
    }
  })
  async getAllProfiles(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('educationLevel') educationLevel?: EducationLevel,
    @Query('city') city?: string,
    @Query('budgetLevel') budgetLevel?: BudgetLevel,
    @Query('gender') gender?: Gender,
    @Query('minWeeklyHours') minWeeklyHours?: number,
    @Query('maxWeeklyHours') maxWeeklyHours?: number,
  ): Promise<{ profiles: UserProfileDocument[]; total: number }> {
    const weeklyHours = (minWeeklyHours !== undefined || maxWeeklyHours !== undefined) 
      ? { min: minWeeklyHours, max: maxWeeklyHours }
      : undefined;

    return this.userProfileService.findAll({
      page,
      limit,
      educationLevel,
      city,
      budgetLevel,
      gender,
      weeklyHours,
    });
  }

  @Get('search/by-city')
  @ApiOperation({ 
    summary: 'Search profiles by city',
    description: 'Search user profiles by city name' 
  })
  @ApiQuery({ name: 'city', required: true, type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully',
    type: [UserProfileResponseDto]
  })
  async searchByCity(@Query('city') city: string): Promise<UserProfileDocument[]> {
    return this.userProfileService.searchByCity(city);
  }

  @Get('filter/by-budget')
  @ApiOperation({ 
    summary: 'Get profiles by budget level',
    description: 'Get user profiles filtered by budget level' 
  })
  @ApiQuery({ name: 'budgetLevel', required: true, enum: BudgetLevel })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profiles retrieved successfully',
    type: [UserProfileResponseDto]
  })
  async getByBudgetLevel(@Query('budgetLevel') budgetLevel: BudgetLevel): Promise<UserProfileDocument[]> {
    return this.userProfileService.getProfilesByBudgetLevel(budgetLevel);
  }

  @Get('filter/by-gender')
  @ApiOperation({ 
    summary: 'Get profiles by gender',
    description: 'Get user profiles filtered by gender' 
  })
  @ApiQuery({ name: 'gender', required: true, enum: Gender })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profiles retrieved successfully',
    type: [UserProfileResponseDto]
  })
  async getByGender(@Query('gender') gender: Gender): Promise<UserProfileDocument[]> {
    return this.userProfileService.getProfilesByGender(gender);
  }

  @Get('analytics/profile-stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ 
    summary: 'Get profile statistics',
    description: 'Get statistical data about user profiles (Admin/HR only)' 
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalProfiles: { type: 'number' },
        educationDistribution: { type: 'object' },
        cityDistribution: { type: 'object' },
        genderDistribution: { type: 'object' },
        budgetDistribution: { type: 'object' }
      }
    }
  })
  async getProfileStats(): Promise<{
    totalProfiles: number;
    educationDistribution: Record<string, number>;
    cityDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    budgetDistribution: Record<string, number>;
  }> {
    return this.userProfileService.getProfileStats();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get profile by ID',
    description: 'Get a specific profile by its ID' 
  })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profile retrieved successfully',
    type: UserProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async getProfileById(@Param('id') id: string): Promise<UserProfileDocument> {
    return this.userProfileService.findById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ 
    summary: 'Update profile by ID',
    description: 'Update a specific profile by its ID (Admin/HR only)' 
  })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profile updated successfully',
    type: UserProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async updateProfileById(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateUserProfileDto
  ): Promise<UserProfileDocument> {
    // For admin updates, we need to find the profile first to get userId
    const profile = await this.userProfileService.findById(id);
    return this.userProfileService.update(profile.userId.toString(), updateProfileDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Delete profile by ID',
    description: 'Delete a specific profile by its ID (Admin only)' 
  })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Profile deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async deleteProfileById(@Param('id') id: string): Promise<void> {
    // For admin deletions, we need to find the profile first to get userId
    const profile = await this.userProfileService.findById(id);
    return this.userProfileService.delete(profile.userId.toString());
  }

  @Get('user/:userId')
  @ApiOperation({ 
    summary: 'Get profile by user ID',
    description: 'Get a profile by user ID' 
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Profile retrieved successfully',
    type: UserProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Profile not found' 
  })
  async getProfileByUserId(@Param('userId') userId: string): Promise<UserProfileDocument | null> {
    return this.userProfileService.findByUserId(userId);
  }
}