import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { NotificationService } from '../../notifications/services';
import { NotificationType } from '../../notifications/schemas';
import { TutorProfile, TutorProfileDocument, TutorStatus } from '../schemas/tutor-profile.schema';
import {
  MentorAvailabilitySlot,
  MentorAvailabilitySlotDocument,
  MentorAvailabilitySlotStatus,
} from '../schemas/mentor-availability-slot.schema';

const DEFAULT_HOLD_TTL_MS = 15 * 60 * 1000;
const BULK_SLOT_DURATION_MINUTES = 90;
const BULK_SLOT_START_MINUTE = 8 * 60;
const BULK_SLOT_END_MINUTE = 23 * 60;
const BULK_SLOT_MAX_REPEAT_WEEKS = 12;

interface CreateSlotInput {
  tutorProfileId: string;
  startAt: string | Date;
  endAt: string | Date;
  status?: MentorAvailabilitySlotStatus;
}

interface UpdateSlotInput {
  startAt?: string | Date;
  endAt?: string | Date;
  status?: MentorAvailabilitySlotStatus;
}

interface BulkSlotStartInput {
  dayIndex: number;
  startTime: string;
}

interface CreateBulkSlotsInput {
  tutorProfileId: string;
  weekStart: string | Date;
  slotStarts: BulkSlotStartInput[];
  repeatWeeks: number;
}

export interface SkippedBulkSlot {
  dayIndex: number;
  startTime: string;
  startAt?: Date;
  reason: string;
}

@Injectable()
export class MentorAvailabilityService {
  constructor(
    @InjectModel(MentorAvailabilitySlot.name)
    private readonly slotModel: Model<MentorAvailabilitySlotDocument>,
    @InjectModel(TutorProfile.name)
    private readonly tutorProfileModel: Model<TutorProfileDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async createSlot(actor: AuthUserLike, input: CreateSlotInput): Promise<MentorAvailabilitySlotDocument> {
    const profile = await this.getOwnedActiveProfile(input.tutorProfileId, actor);
    const { startAt, endAt } = this.parseSlotRange(input.startAt, input.endAt);
    await this.assertNoSlotOverlap(profile.userId.toString(), startAt, endAt);

    const slot = new this.slotModel({
      tutorProfileId: profile._id,
      mentorId: profile.userId,
      startAt,
      endAt,
      status: input.status || MentorAvailabilitySlotStatus.AVAILABLE,
    });
    return slot.save();
  }

  async createBulkSlots(
    actor: AuthUserLike,
    input: CreateBulkSlotsInput,
  ): Promise<{ created: MentorAvailabilitySlotDocument[]; skipped: SkippedBulkSlot[] }> {
    const profile = await this.getOwnedActiveProfile(input.tutorProfileId, actor);
    const weekStart = this.startOfDay(new Date(input.weekStart));
    if (Number.isNaN(weekStart.getTime())) throw new BadRequestException('Invalid weekStart');
    if (!Number.isInteger(input.repeatWeeks) || input.repeatWeeks < 1 || input.repeatWeeks > BULK_SLOT_MAX_REPEAT_WEEKS) {
      throw new BadRequestException('repeatWeeks must be between 1 and 12');
    }
    if (!input.slotStarts?.length) throw new BadRequestException('slotStarts is required');

    const created: MentorAvailabilitySlotDocument[] = [];
    const skipped: SkippedBulkSlot[] = [];
    const seenCandidates = new Set<string>();
    const now = new Date();

    for (let weekOffset = 0; weekOffset < input.repeatWeeks; weekOffset += 1) {
      for (const slotStart of input.slotStarts) {
        const startMinute = this.parseBulkSlotStart(slotStart.startTime);
        if (!Number.isInteger(slotStart.dayIndex) || slotStart.dayIndex < 0 || slotStart.dayIndex > 6) {
          throw new BadRequestException('dayIndex must be between 0 and 6');
        }

        const startAt = this.dateAtMinutes(
          this.addDays(weekStart, weekOffset * 7 + slotStart.dayIndex),
          startMinute,
        );
        const endAt = new Date(startAt.getTime() + BULK_SLOT_DURATION_MINUTES * 60_000);
        const candidateKey = `${startAt.toISOString()}-${endAt.toISOString()}`;

        if (seenCandidates.has(candidateKey)) {
          skipped.push({ ...slotStart, startAt, reason: 'duplicate_in_request' });
          continue;
        }
        seenCandidates.add(candidateKey);

        if (startAt < now) {
          skipped.push({ ...slotStart, startAt, reason: 'past_slot' });
          continue;
        }

        if (await this.hasSlotOverlap(profile.userId.toString(), startAt, endAt)) {
          skipped.push({ ...slotStart, startAt, reason: 'overlap' });
          continue;
        }

        try {
          const slot = await new this.slotModel({
            tutorProfileId: profile._id,
            mentorId: profile.userId,
            startAt,
            endAt,
            status: MentorAvailabilitySlotStatus.AVAILABLE,
          }).save();
          created.push(slot);
        } catch (error) {
          if (this.isDuplicateKeyError(error)) {
            skipped.push({ ...slotStart, startAt, reason: 'duplicate' });
            continue;
          }
          throw error;
        }
      }
    }

    await this.notificationService.create({
      recipientId: profile.userId,
      type: NotificationType.MENTOR_AVAILABILITY_BULK_CREATED,
      title: 'Lịch trống đã được cập nhật',
      body: `Đã tạo ${created.length} slot 90 phút, bỏ qua ${skipped.length} slot.`,
      payload: {
        createdCount: created.length,
        skippedCount: skipped.length,
        repeatWeeks: input.repeatWeeks,
      },
    });

    return { created, skipped };
  }

  async findMine(actor: AuthUserLike): Promise<MentorAvailabilitySlotDocument[]> {
    const actorId = getAuthUserId(actor);
    if (!Types.ObjectId.isValid(actorId)) throw new ForbiddenException('Missing user context');
    await this.releaseExpiredHeldSlots({ mentorId: new Types.ObjectId(actorId) });
    return this.slotModel.find({ mentorId: new Types.ObjectId(actorId) }).sort({ startAt: 1 }).exec();
  }

  async findAvailableByMentor(mentorId: string): Promise<MentorAvailabilitySlotDocument[]> {
    if (!Types.ObjectId.isValid(mentorId)) throw new BadRequestException('Invalid mentorId');
    await this.releaseExpiredHeldSlots({ mentorId: new Types.ObjectId(mentorId) });
    return this.slotModel
      .find({
        mentorId: new Types.ObjectId(mentorId),
        status: MentorAvailabilitySlotStatus.AVAILABLE,
        startAt: { $gte: new Date() },
      })
      .sort({ startAt: 1 })
      .exec();
  }

  async updateSlot(
    id: string,
    actor: AuthUserLike,
    input: UpdateSlotInput,
  ): Promise<MentorAvailabilitySlotDocument> {
    const slot = await this.findOwnedMutableSlot(id, actor);
    if (slot.status !== MentorAvailabilitySlotStatus.AVAILABLE) {
      throw new ConflictException('Only available slots can be updated');
    }
    const update: Record<string, unknown> = {};

    if (input.status) {
      if (input.status !== MentorAvailabilitySlotStatus.AVAILABLE) {
        throw new BadRequestException('Only available status can be set from this endpoint');
      }
      update.status = input.status;
    }

    if (input.startAt || input.endAt) {
      const { startAt, endAt } = this.parseSlotRange(input.startAt || slot.startAt, input.endAt || slot.endAt);
      await this.assertNoSlotOverlap(slot.mentorId.toString(), startAt, endAt, slot._id.toString());
      update.startAt = startAt;
      update.endAt = endAt;
    }

    const updated = await this.slotModel.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!updated) throw new NotFoundException('Availability slot not found');
    return updated;
  }

  async removeSlot(id: string, actor: AuthUserLike): Promise<MentorAvailabilitySlotDocument> {
    const slot = await this.findOwnedMutableSlot(id, actor);
    if (slot.status !== MentorAvailabilitySlotStatus.AVAILABLE) {
      throw new ConflictException('Only available slots can be deleted');
    }
    const deleted = await this.slotModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Availability slot not found');
    return deleted;
  }

  async holdSlotForBooking(
    slotId: string,
    tutorProfileId: string,
    menteeId: string,
  ): Promise<MentorAvailabilitySlotDocument> {
    if (!Types.ObjectId.isValid(slotId)) throw new BadRequestException('Invalid availabilitySlotId');
    if (!Types.ObjectId.isValid(tutorProfileId)) throw new BadRequestException('Invalid tutorProfileId');
    if (!Types.ObjectId.isValid(menteeId)) throw new BadRequestException('Invalid menteeId');

    await this.releaseExpiredHeldSlots({ _id: new Types.ObjectId(slotId) });

    const heldUntil = new Date(Date.now() + DEFAULT_HOLD_TTL_MS);
    const slot = await this.slotModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(slotId),
          tutorProfileId: new Types.ObjectId(tutorProfileId),
          status: MentorAvailabilitySlotStatus.AVAILABLE,
          startAt: { $gte: new Date() },
        },
        {
          status: MentorAvailabilitySlotStatus.HELD,
          heldBy: new Types.ObjectId(menteeId),
          heldUntil,
        },
        { new: true },
      )
      .exec();

    if (!slot) throw new ConflictException('Khung gio da co nguoi dat');
    return slot;
  }

  async attachBooking(slotId: string, bookingSessionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(slotId) || !Types.ObjectId.isValid(bookingSessionId)) return;
    await this.slotModel
      .findByIdAndUpdate(slotId, { bookingSessionId: new Types.ObjectId(bookingSessionId) })
      .exec();
  }

  async markBooked(slotId: string, bookingSessionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(slotId) || !Types.ObjectId.isValid(bookingSessionId)) return;
    await this.slotModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(slotId),
          bookingSessionId: new Types.ObjectId(bookingSessionId),
          status: { $in: [MentorAvailabilitySlotStatus.HELD, MentorAvailabilitySlotStatus.AVAILABLE] },
        },
        {
          $set: { status: MentorAvailabilitySlotStatus.BOOKED },
          $unset: { heldUntil: 1, heldBy: 1 },
        },
      )
      .exec();
  }

  async releaseHeldSlot(slotId: string): Promise<void> {
    if (!Types.ObjectId.isValid(slotId)) return;
    await this.slotModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(slotId),
          status: MentorAvailabilitySlotStatus.HELD,
        },
        {
          $set: { status: MentorAvailabilitySlotStatus.AVAILABLE },
          $unset: { bookingSessionId: 1, heldBy: 1, heldUntil: 1 },
        },
      )
      .exec();
  }

  async releaseSlotForBooking(bookingSessionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(bookingSessionId)) return;
    await this.slotModel
      .findOneAndUpdate(
        {
          bookingSessionId: new Types.ObjectId(bookingSessionId),
          status: MentorAvailabilitySlotStatus.HELD,
        },
        {
          $set: { status: MentorAvailabilitySlotStatus.AVAILABLE },
          $unset: { bookingSessionId: 1, heldBy: 1, heldUntil: 1 },
        },
      )
      .exec();
  }

  private async getOwnedActiveProfile(
    tutorProfileId: string,
    actor: AuthUserLike,
  ): Promise<TutorProfileDocument> {
    if (!Types.ObjectId.isValid(tutorProfileId)) throw new BadRequestException('Invalid tutorProfileId');
    const profile = await this.tutorProfileModel.findById(tutorProfileId).exec();
    if (!profile) throw new NotFoundException('Tutor profile not found');
    if (profile.status !== TutorStatus.ACTIVE) throw new BadRequestException('Tutor profile is not active');
    if (!isAdmin(actor) && profile.userId.toString() !== getAuthUserId(actor)) {
      throw new ForbiddenException('Forbidden');
    }
    return profile;
  }

  private async findOwnedMutableSlot(id: string, actor: AuthUserLike): Promise<MentorAvailabilitySlotDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid slot id');
    const slot = await this.slotModel.findById(id).exec();
    if (!slot) throw new NotFoundException('Availability slot not found');
    if (!isAdmin(actor) && slot.mentorId.toString() !== getAuthUserId(actor)) {
      throw new ForbiddenException('Forbidden');
    }
    return slot;
  }

  private parseSlotRange(
    startValue: string | Date,
    endValue: string | Date,
  ): { startAt: Date; endAt: Date } {
    const startAt = new Date(startValue);
    const endAt = new Date(endValue);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid slot date range');
    }
    if (endAt <= startAt) throw new BadRequestException('Slot end time must be after start time');
    if (startAt < new Date()) throw new BadRequestException('Slot must be in the future');
    return { startAt, endAt };
  }

  private async assertNoSlotOverlap(
    mentorId: string,
    startAt: Date,
    endAt: Date,
    excludeSlotId?: string,
  ): Promise<void> {
    const query: FilterQuery<MentorAvailabilitySlotDocument> = {
      mentorId: new Types.ObjectId(mentorId),
      status: { $ne: MentorAvailabilitySlotStatus.BLOCKED },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    };
    if (excludeSlotId && Types.ObjectId.isValid(excludeSlotId)) {
      query._id = { $ne: new Types.ObjectId(excludeSlotId) };
    }

    const overlapping = await this.slotModel.exists(query).exec();
    if (overlapping) throw new ConflictException('Slot overlaps with another mentor slot');
  }

  private async hasSlotOverlap(
    mentorId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<boolean> {
    const overlapping = await this.slotModel
      .exists({
        mentorId: new Types.ObjectId(mentorId),
        status: { $ne: MentorAvailabilitySlotStatus.BLOCKED },
        startAt: { $lt: endAt },
        endAt: { $gt: startAt },
      })
      .exec();
    return !!overlapping;
  }

  private parseBulkSlotStart(value: string): number {
    const [hourText, minuteText] = value.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new BadRequestException('Invalid slot start time');
    }
    const startMinute = hour * 60 + minute;
    const isAllowed =
      startMinute >= BULK_SLOT_START_MINUTE &&
      startMinute + BULK_SLOT_DURATION_MINUTES <= BULK_SLOT_END_MINUTE &&
      (startMinute - BULK_SLOT_START_MINUTE) % BULK_SLOT_DURATION_MINUTES === 0;
    if (!isAllowed) {
      throw new BadRequestException('Slot start time must be a 90-minute slot between 08:00 and 23:00');
    }
    return startMinute;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private dateAtMinutes(day: Date, minutes: number): Date {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;
  }

  private async releaseExpiredHeldSlots(filter: FilterQuery<MentorAvailabilitySlotDocument> = {}): Promise<void> {
    await this.slotModel
      .updateMany(
        {
          ...filter,
          status: MentorAvailabilitySlotStatus.HELD,
          heldUntil: { $lte: new Date() },
        },
        {
          $set: { status: MentorAvailabilitySlotStatus.AVAILABLE },
          $unset: { bookingSessionId: 1, heldBy: 1, heldUntil: 1 },
        },
      )
      .exec();
  }
}
