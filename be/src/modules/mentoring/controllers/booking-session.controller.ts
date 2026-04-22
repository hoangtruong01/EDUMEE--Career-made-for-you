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
import { BookingSessionService } from '../services/booking-session.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { CreateBookingSessionDto } from '../dto/booking-session.dto';

@ApiTags('booking-sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('booking-sessions')
export class BookingSessionController {
  constructor(private readonly bookingSessionService: BookingSessionService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new booking session' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Booking created successfully' })
  create(@Body() createDto: CreateBookingSessionDto, @CurrentUser() user: AuthUserLike) {
    return this.bookingSessionService.createForMentee(getAuthUserId(user), createDto as unknown as { tutorProfileId: string;[key: string]: unknown });
  }

  @Get()
  @ApiOperation({ summary: 'Get all booking sessions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bookings retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('menteeId') menteeId?: string,
    @Query('mentorId') mentorId?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      ...(menteeId ? { menteeId } : {}),
      ...(mentorId ? { mentorId } : {}),
      ...(status ? { status } : {}),
    } as Parameters<BookingSessionService['findAll']>[2];

    return this.bookingSessionService.findAll(page, limit, filters);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending booking sessions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pending bookings retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPending() {
    return this.bookingSessionService.findPending();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get bookings for current user (mentee and mentor)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bookings retrieved successfully' })
  async findMy(@CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const [asMentee, asMentor] = await Promise.all([
      this.bookingSessionService.findByMentee(userId),
      this.bookingSessionService.findByMentor(userId),
    ]);
    return { asMentee, asMentor };
  }

  @Get('mentee/:menteeId')
  @ApiOperation({ summary: 'Get bookings by mentee' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bookings retrieved successfully' })
  findByMentee(@Param('menteeId') menteeId: string, @CurrentUser() user: AuthUserLike) {
    if (!isAdmin(user) && menteeId !== getAuthUserId(user)) throw new ForbiddenException('Forbidden');
    return this.bookingSessionService.findByMentee(menteeId);
  }

  @Get('mentor/:mentorId')
  @ApiOperation({ summary: 'Get bookings by mentor' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bookings retrieved successfully' })
  findByMentor(@Param('mentorId') mentorId: string, @CurrentUser() user: AuthUserLike) {
    if (!isAdmin(user) && mentorId !== getAuthUserId(user)) throw new ForbiddenException('Forbidden');
    return this.bookingSessionService.findByMentor(mentorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking session by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const booking = await this.bookingSessionService.findOne(id);
    if (isAdmin(user)) return booking;
    const ok = booking.menteeId.toString() === userId || booking.mentorId.toString() === userId;
    if (!ok) throw new ForbiddenException('Forbidden');
    return booking;
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a booking session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking confirmed successfully' })
  confirmBooking(
    @Param('id') id: string,
    @Body() body: { confirmedDateTime: string },
    @CurrentUser() user: AuthUserLike,
  ) {
    return this.bookingSessionService.confirmBooking(id, { userId: getAuthUserId(user), role: user.role }, new Date(body.confirmedDateTime));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking cancelled successfully' })
  cancelBooking(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthUserLike,
  ) {
    return this.bookingSessionService.cancelBooking(id, { userId: getAuthUserId(user), role: user.role }, body.reason);
  }

  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule a booking session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking rescheduled successfully' })
  rescheduleBooking(@Param('id') id: string, @Body() body: { newSchedule: unknown }, @CurrentUser() user: AuthUserLike) {
    return this.bookingSessionService.rescheduleBooking(
      id,
      body.newSchedule as Parameters<BookingSessionService['rescheduleBooking']>[1],
      { userId: getAuthUserId(user), role: user.role },
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a booking session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  update(@Param('id') id: string, @Body() updateDto: Record<string, unknown>) {
    return this.bookingSessionService.update(
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    const userId = getAuthUserId(user);
    const booking = await this.bookingSessionService.findOne(id);
    if (!isAdmin(user)) {
      const ok = booking.menteeId.toString() === userId || booking.mentorId.toString() === userId;
      if (!ok) throw new ForbiddenException('Forbidden');
    }
    return this.bookingSessionService.remove(id);
  }
}
