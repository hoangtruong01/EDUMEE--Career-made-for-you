import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUserLike } from '../../../common/auth';
import { CreateBulkAvailabilitySlotsDto } from '../dto';
import { MentorAvailabilityService } from '../services/mentor-availability.service';
import { MentorAvailabilitySlotStatus } from '../schemas/mentor-availability-slot.schema';

interface CreateSlotDto {
  tutorProfileId: string;
  startAt: string;
  endAt: string;
  status?: MentorAvailabilitySlotStatus;
}

interface UpdateSlotDto {
  startAt?: string;
  endAt?: string;
  status?: MentorAvailabilitySlotStatus;
}

@ApiTags('mentor-availability')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('mentor-availability')
export class MentorAvailabilityController {
  constructor(private readonly mentorAvailabilityService: MentorAvailabilityService) {}

  @Post('slots')
  @ApiOperation({ summary: 'Create a concrete availability slot for the current mentor' })
  createSlot(@Body() dto: CreateSlotDto, @CurrentUser() user: AuthUserLike) {
    return this.mentorAvailabilityService.createSlot(user, dto);
  }

  @Post('slots/bulk')
  @ApiOperation({ summary: 'Create concrete 90-minute availability slots across one or more weeks' })
  createBulkSlots(@Body() dto: CreateBulkAvailabilitySlotsDto, @CurrentUser() user: AuthUserLike) {
    return this.mentorAvailabilityService.createBulkSlots(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'List availability slots for the current mentor' })
  findMine(@CurrentUser() user: AuthUserLike) {
    return this.mentorAvailabilityService.findMine(user);
  }

  @Get('mentor/:mentorId/available')
  @ApiOperation({ summary: 'List future available slots for a mentor' })
  findAvailableByMentor(@Param('mentorId') mentorId: string) {
    return this.mentorAvailabilityService.findAvailableByMentor(mentorId);
  }

  @Patch('slots/:id')
  @ApiOperation({ summary: 'Update an availability slot if it is not booked' })
  updateSlot(@Param('id') id: string, @Body() dto: UpdateSlotDto, @CurrentUser() user: AuthUserLike) {
    return this.mentorAvailabilityService.updateSlot(id, user, dto);
  }

  @Delete('slots/:id')
  @ApiOperation({ summary: 'Delete an availability slot if it is not booked' })
  removeSlot(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.mentorAvailabilityService.removeSlot(id, user);
  }
}
