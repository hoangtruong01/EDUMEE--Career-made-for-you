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
import { isAdmin } from '../../../common/auth';

@Injectable()
export class BookingSessionService {
  constructor(
    @InjectModel(BookingSession.name)
    private bookingSessionModel: Model<BookingSessionDocument>,
    @InjectModel(TutorProfile.name)
    private tutorProfileModel: Model<TutorProfileDocument>,
  ) {}

  async createForMentee(menteeId: string, createDto: any): Promise<BookingSessionDocument> {
    if (!Types.ObjectId.isValid(menteeId)) throw new BadRequestException('Invalid menteeId');
    if (!Types.ObjectId.isValid(createDto.tutorProfileId)) throw new BadRequestException('Invalid tutorProfileId');

    const tutor = await this.tutorProfileModel.findById(createDto.tutorProfileId).exec();
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    if (tutor.status !== TutorStatus.ACTIVE) {
      throw new BadRequestException('Tutor is not active');
    }

    const booking = new this.bookingSessionModel({
      ...createDto,
      menteeId: new Types.ObjectId(menteeId),
      tutorProfileId: tutor._id,
      mentorId: tutor.userId,
      status: BookingStatus.PENDING,
    });
    return booking.save();
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

  async confirmBooking(
    id: string,
    actor: { userId: string; role?: string },
    confirmedDateTime: Date,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const actorId = actor.userId;
    if (!Types.ObjectId.isValid(actorId)) throw new ForbiddenException('Missing user context');

    const isMentor = booking.mentorId.toString() === actorId;
    if (!isMentor && !isAdmin(actor as any)) throw new ForbiddenException('Forbidden');

    // overlap check for mentor at confirmed time
    await this.assertNoOverlap(booking.mentorId.toString(), confirmedDateTime, booking.schedulingDetails.duration, booking._id.toString());

    return this.update(id, {
      status: BookingStatus.CONFIRMED,
      'schedulingDetails.confirmedDateTime': confirmedDateTime,
    });
  }

  async cancelBooking(
    id: string,
    actor: { userId: string; role?: string },
    reason?: string,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const actorId = actor.userId;
    if (!Types.ObjectId.isValid(actorId)) throw new ForbiddenException('Missing user context');

    const isMentee = booking.menteeId.toString() === actorId;
    const isMentor = booking.mentorId.toString() === actorId;
    if (!isMentee && !isMentor && !isAdmin(actor as any)) throw new ForbiddenException('Forbidden');

    const status = isMentor ? BookingStatus.CANCELLED_BY_MENTOR : BookingStatus.CANCELLED_BY_MENTEE;
    return this.update(id, { status, ...(reason ? { 'cancellationDetails.reason': reason } : {}) });
  }

  async rescheduleBooking(
    id: string,
    newSchedule: BookingSession['schedulingDetails'],
    actor?: { userId: string; role?: string },
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    if (actor) {
      const actorId = actor.userId;
      const isMentee = booking.menteeId.toString() === actorId;
      const isMentor = booking.mentorId.toString() === actorId;
      if (!isMentee && !isMentor && !isAdmin(actor as any)) throw new ForbiddenException('Forbidden');
    }

    if (newSchedule?.confirmedDateTime) {
      await this.assertNoOverlap(
        booking.mentorId.toString(),
        newSchedule.confirmedDateTime,
        newSchedule.duration,
        booking._id.toString(),
      );
    }
    return this.update(id, {
      status: BookingStatus.RESCHEDULED,
      schedulingDetails: newSchedule,
    });
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

    const query: any = {
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
}
