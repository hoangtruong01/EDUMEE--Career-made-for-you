import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import {
  BookingSession,
  BookingSessionDocument,
  BookingStatus,
} from '../schemas/booking-session.schema';
import { TutorProfile, TutorProfileDocument, TutorStatus } from '../schemas/tutor-profile.schema';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { MentorAvailabilityService } from './mentor-availability.service';
import { MentorAvailabilitySlotDocument } from '../schemas/mentor-availability-slot.schema';
import { NotificationService } from '../../notifications/services';
import { NotificationType } from '../../notifications/schemas';

interface CreateBookingInput {
  tutorProfileId: string;
  availabilitySlotId?: string;
  [key: string]: unknown;
}

@Injectable()
export class BookingSessionService {
  constructor(
    @InjectModel(BookingSession.name)
    private bookingSessionModel: Model<BookingSessionDocument>,
    @InjectModel(TutorProfile.name)
    private tutorProfileModel: Model<TutorProfileDocument>,
    private readonly mentorAvailabilityService: MentorAvailabilityService,
    private readonly notificationService: NotificationService,
  ) { }

  async createForMentee(menteeId: string, createDto: CreateBookingInput): Promise<BookingSessionDocument> {
    if (!Types.ObjectId.isValid(menteeId)) throw new BadRequestException('Invalid menteeId');
    if (!Types.ObjectId.isValid(createDto.tutorProfileId)) throw new BadRequestException('Invalid tutorProfileId');
    if (!createDto.availabilitySlotId || !Types.ObjectId.isValid(createDto.availabilitySlotId)) {
      throw new BadRequestException('availabilitySlotId is required');
    }

    const tutor = await this.tutorProfileModel.findById(createDto.tutorProfileId).exec();
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    if (tutor.status !== TutorStatus.ACTIVE) {
      throw new BadRequestException('Tutor is not active');
    }

    const slot = await this.mentorAvailabilityService.holdSlotForBooking(
      createDto.availabilitySlotId,
      createDto.tutorProfileId,
      menteeId,
    );

    try {
      const booking = new this.bookingSessionModel({
        ...createDto,
        schedulingDetails: this.buildSchedulingDetailsFromSlot(slot, createDto),
        availabilitySlotId: slot._id,
        menteeId: new Types.ObjectId(menteeId),
        tutorProfileId: tutor._id,
        mentorId: tutor.userId,
        status: BookingStatus.AWAITING_PAYMENT,
        paymentInfo: this.buildInitialPaymentInfo(tutor, createDto, slot),
      });
      const saved = await booking.save();
      await this.mentorAvailabilityService.attachBooking(slot._id.toString(), saved._id.toString());
      return saved;
    } catch (error) {
      await this.mentorAvailabilityService.releaseHeldSlot(slot._id.toString());
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<BookingSessionDocument> = {},
  ): Promise<{ data: BookingSessionDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.bookingSessionModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.bookingSessionModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BookingSessionDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid booking id');
    const booking = await this.bookingSessionModel.findById(id).exec();
    if (!booking) {
      throw new NotFoundException(`Booking session with ID ${id} not found`);
    }
    return booking;
  }

  async findByMentee(menteeId: string): Promise<BookingSessionDocument[]> {
    if (!Types.ObjectId.isValid(menteeId)) throw new BadRequestException('Invalid menteeId');
    return this.bookingSessionModel.find({ menteeId: new Types.ObjectId(menteeId) }).sort({ createdAt: -1 }).exec();
  }

  async findByMentor(mentorId: string): Promise<BookingSessionDocument[]> {
    if (!Types.ObjectId.isValid(mentorId)) throw new BadRequestException('Invalid mentorId');
    return this.bookingSessionModel.find({ mentorId: new Types.ObjectId(mentorId) }).sort({ createdAt: -1 }).exec();
  }

  async findPending(): Promise<BookingSessionDocument[]> {
    return this.bookingSessionModel.find({ status: BookingStatus.PENDING }).sort({ createdAt: 1 }).exec();
  }

  async markFreeBookingPending(id: string): Promise<BookingSessionDocument> {
    const updated = await this.update(id, {
      status: BookingStatus.PENDING,
      'paymentInfo.paymentStatus': 'free',
    });
    await this.notifyBookingParticipants(updated, NotificationType.MENTOR_BOOKING_PENDING);
    return updated;
  }

  async confirmBooking(
    id: string,
    actor: AuthUserLike,
    confirmedDateTime?: Date,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const actorId = getAuthUserId(actor);
    if (!actorId || !Types.ObjectId.isValid(actorId)) throw new ForbiddenException('Missing user context');

    const isMentor = booking.mentorId.toString() === actorId;
    if (!isMentor && !isAdmin(actor)) throw new ForbiddenException('Forbidden');

    // overlap check for mentor at confirmed time
    const requestedAt = new Date(booking.schedulingDetails.requestedDateTime);
    const candidateConfirmedAt = confirmedDateTime && !Number.isNaN(confirmedDateTime.getTime())
      ? confirmedDateTime
      : undefined;
    const confirmedAt = booking.schedulingDetails.confirmedDateTime || candidateConfirmedAt || requestedAt;
    await this.assertNoOverlap(booking.mentorId.toString(), confirmedAt, booking.schedulingDetails.duration, id);
    const meetingCode = booking.schedulingDetails.meetingCode || this.generateMeetingCode();

    const updated = await this.update(id, {
      status: BookingStatus.CONFIRMED,
      'schedulingDetails.confirmedDateTime': confirmedAt,
      'schedulingDetails.meetingPlatform': 'platform_built_in',
      'schedulingDetails.meetingCode': meetingCode,
      'schedulingDetails.meetingLink': `/mentor-call/${meetingCode}`,
    });
    if (booking.availabilitySlotId) {
      await this.mentorAvailabilityService.markBooked(booking.availabilitySlotId.toString(), booking._id.toString());
    }
    await this.notifyBookingParticipants(updated, NotificationType.MENTOR_BOOKING_CONFIRMED);
    return updated;
  }

  async cancelBooking(
    id: string,
    actor: AuthUserLike,
    reason?: string,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const actorId = getAuthUserId(actor);
    if (!actorId || !Types.ObjectId.isValid(actorId)) throw new ForbiddenException('Missing user context');

    const isMentee = booking.menteeId.toString() === actorId;
    const isMentor = booking.mentorId.toString() === actorId;
    if (!isMentee && !isMentor && !isAdmin(actor)) throw new ForbiddenException('Forbidden');

    const status = isMentor ? BookingStatus.CANCELLED_BY_MENTOR : BookingStatus.CANCELLED_BY_MENTEE;
    const updated = await this.update(id, { status, ...(reason ? { 'cancellationDetails.reason': reason } : {}) });
    await this.mentorAvailabilityService.releaseSlotForBooking(id);
    await this.notifyBookingParticipants(updated, NotificationType.MENTOR_BOOKING_CANCELLED);
    return updated;
  }

  async rescheduleBooking(
    id: string,
    newSchedule: BookingSession['schedulingDetails'],
    actor?: AuthUserLike,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    if (actor) {
      const actorId = getAuthUserId(actor);
      const isMentee = booking.menteeId.toString() === actorId;
      const isMentor = booking.mentorId.toString() === actorId;
      if (!isMentee && !isMentor && !isAdmin(actor)) throw new ForbiddenException('Forbidden');
    }

    if (newSchedule?.confirmedDateTime) {
      const duration = newSchedule.duration;
      if (typeof duration !== 'number') {
        throw new BadRequestException('Invalid duration');
      }
      await this.assertNoOverlap(
        booking.mentorId.toString(),
        newSchedule.confirmedDateTime,
        duration,
        id,
      );
    }
    const updated = await this.update(id, {
      status: BookingStatus.RESCHEDULED,
      schedulingDetails: newSchedule,
    });
    await this.notifyBookingParticipants(updated, NotificationType.MENTOR_BOOKING_RESCHEDULED);
    return updated;
  }

  async update(
    id: string,
    updateDto: Record<string, unknown>,
  ): Promise<BookingSessionDocument> {
    const booking = await this.bookingSessionModel
      .findByIdAndUpdate(id, updateDto as Partial<BookingSession>, { new: true })
      .exec();
    if (!booking) {
      throw new NotFoundException(`Booking session with ID ${id} not found`);
    }
    return booking;
  }

  async remove(id: string): Promise<BookingSessionDocument> {
    const booking = await this.bookingSessionModel.findByIdAndDelete(id).exec();
    if (!booking) {
      throw new NotFoundException(`Booking session with ID ${id} not found`);
    }
    return booking;
  }

  private async assertNoOverlap(
    mentorId: string,
    start: Date,
    durationMinutes: number,
    excludeBookingId?: string,
  ): Promise<void> {
    const startMs = new Date(start).getTime();
    if (Number.isNaN(startMs)) throw new BadRequestException('Invalid confirmedDateTime');
    if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
      throw new BadRequestException('Invalid duration');
    }
    const end = new Date(startMs + durationMinutes * 60_000);

    const query: Record<string, unknown> = {
      mentorId: new Types.ObjectId(mentorId),
      status: BookingStatus.CONFIRMED,
      'schedulingDetails.confirmedDateTime': { $ne: null },
    };
    if (excludeBookingId && Types.ObjectId.isValid(excludeBookingId)) {
      query._id = { $ne: new Types.ObjectId(excludeBookingId) };
    }

    const existing = await this.bookingSessionModel.find(query).exec();
    for (const b of existing) {
      const s = b.schedulingDetails.confirmedDateTime;
      if (!s) continue;
      const e = new Date(new Date(s).getTime() + b.schedulingDetails.duration * 60_000);
      const overlap = start < e && end > s;
      if (overlap) {
        throw new ConflictException('Booking overlaps with an existing confirmed session');
      }
    }
  }

  private buildInitialPaymentInfo(
    tutor: TutorProfileDocument,
    createDto: CreateBookingInput,
    slot: MentorAvailabilitySlotDocument,
  ): BookingSession['paymentInfo'] {
    const sessionType = String(createDto.sessionType || '');
    const duration = Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60_000);
    const rates = tutor.pricing?.sessionRates || [];
    const matchingRate =
      rates.find((rate) => rate.sessionType === sessionType && rate.duration === duration) ||
      rates.find((rate) => rate.sessionType === sessionType) ||
      rates[0];

    const sessionPrice = Number(matchingRate?.pricePerSession ?? 0);
    return {
      sessionPrice: Number.isFinite(sessionPrice) ? sessionPrice : 0,
      currency: tutor.pricing?.currency || 'VND',
      paymentMethod: sessionPrice > 0 ? 'bank_transfer' : 'free_session',
      paymentStatus: sessionPrice > 0 ? 'pending' : 'free',
    };
  }

  private buildSchedulingDetailsFromSlot(
    slot: MentorAvailabilitySlotDocument,
    createDto: CreateBookingInput,
  ): BookingSession['schedulingDetails'] {
    const duration = Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60_000);
    const provided = createDto.schedulingDetails as Partial<BookingSession['schedulingDetails']> | undefined;
    return {
      requestedDateTime: slot.startAt,
      duration,
      timeZone: provided?.timeZone || 'Asia/Ho_Chi_Minh',
      meetingPlatform: 'platform_built_in',
    };
  }

  private generateMeetingCode(): string {
    return `EDU-MT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  private async notifyBookingParticipants(
    booking: BookingSessionDocument,
    type: NotificationType,
  ): Promise<void> {
    const content = this.getBookingNotificationContent(type, booking);
    await this.notificationService.createMany([
      {
        recipientId: booking.mentorId,
        type,
        title: content.mentorTitle,
        body: content.mentorBody,
        payload: this.buildBookingNotificationPayload(booking),
      },
      {
        recipientId: booking.menteeId,
        type,
        title: content.menteeTitle,
        body: content.menteeBody,
        payload: this.buildBookingNotificationPayload(booking),
      },
    ]);
  }

  private getBookingNotificationContent(
    type: NotificationType,
    booking: BookingSessionDocument,
  ): {
    mentorTitle: string;
    mentorBody: string;
    menteeTitle: string;
    menteeBody: string;
  } {
    const start = new Date(
      booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
    ).toLocaleString('vi-VN');

    switch (type) {
      case NotificationType.MENTOR_BOOKING_CONFIRMED:
        return {
          mentorTitle: 'Booking đã được xác nhận',
          mentorBody: `Bạn đã xác nhận phiên mentor lúc ${start}.`,
          menteeTitle: 'Mentor đã xác nhận booking',
          menteeBody: `Phiên mentor của bạn lúc ${start} đã được xác nhận.`,
        };
      case NotificationType.MENTOR_BOOKING_CANCELLED:
        return {
          mentorTitle: 'Booking đã bị hủy',
          mentorBody: `Booking lúc ${start} đã bị hủy.`,
          menteeTitle: 'Booking đã bị hủy',
          menteeBody: `Phiên mentor lúc ${start} đã bị hủy.`,
        };
      case NotificationType.MENTOR_BOOKING_RESCHEDULED:
        return {
          mentorTitle: 'Booking được đề xuất đổi lịch',
          mentorBody: `Booking đã được chuyển sang trạng thái đổi lịch.`,
          menteeTitle: 'Booking được đề xuất đổi lịch',
          menteeBody: `Phiên mentor của bạn đang ở trạng thái đổi lịch.`,
        };
      case NotificationType.MENTOR_BOOKING_PENDING:
      default:
        return {
          mentorTitle: 'Có booking mới cần xác nhận',
          mentorBody: `Học viên đã đặt phiên mentor lúc ${start}.`,
          menteeTitle: 'Booking đang chờ mentor xác nhận',
          menteeBody: `Booking lúc ${start} đã được gửi tới mentor.`,
        };
    }
  }

  private buildBookingNotificationPayload(booking: BookingSessionDocument): Record<string, unknown> {
    return {
      bookingId: booking._id.toString(),
      status: booking.status,
      sessionType: booking.sessionType,
      meetingLink: booking.schedulingDetails.meetingLink,
      requestedDateTime: booking.schedulingDetails.requestedDateTime,
      confirmedDateTime: booking.schedulingDetails.confirmedDateTime,
    };
  }
}
