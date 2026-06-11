import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import {
  ACTIVE_SLOT_BOOKING_STATUSES,
  BookingSession,
  BookingSessionDocument,
  BookingStatus,
  BookingType,
} from '../schemas/booking-session.schema';
import { TutorProfile, TutorProfileDocument, TutorStatus } from '../schemas/tutor-profile.schema';
import {
  SessionStatus,
  TutoringSession,
  TutoringSessionDocument,
} from '../schemas/tutoring-session.schema';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { MentorAvailabilityService } from './mentor-availability.service';
import { MentorAvailabilitySlotDocument } from '../schemas/mentor-availability-slot.schema';
import { NotificationService } from '../../notifications/services';
import { NotificationType } from '../../notifications/schemas';
import { PaymentService } from '../../payment/services';
import { AiQuotaService } from '../../ai/services/ai-quota.service';
import { AiFeature } from '../../ai/schema/ai-usage-logs.schema';

interface CreateBookingInput {
  tutorProfileId: string;
  availabilitySlotId?: string;
  [key: string]: unknown;
}

interface BookingSchedulingInput {
  requestedDateTime?: string | Date;
  timeZone?: string;
}

interface MenteeAvailabilityWindowInput {
  startAt?: string | Date;
  endAt?: string | Date;
}

interface BookingRequestInput {
  menteeAvailabilityWindows?: MenteeAvailabilityWindowInput[];
}

const SAME_MENTEE_BLOCKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.RESCHEDULED,
];
const TRIAL_BOOKING_DURATION_MINUTES = 15;
const SESSION_COMPLETE_GRACE_MINUTES = 30;
const SESSION_COMPLETION_SWEEP_INTERVAL_MS = 5 * 60_000;

type PopulatableQuery<T> = T & {
  populate: (path: string, select?: string) => PopulatableQuery<T>;
};

type PopulatableBookingDocument = BookingSessionDocument & {
  populate?: (paths: { path: string; select: string }[]) => Promise<BookingSessionDocument>;
};

type BookingParticipantSummary = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
};

@Injectable()
export class BookingSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingSessionService.name);
  private completionSweepTimer?: NodeJS.Timeout;

  constructor(
    @InjectModel(BookingSession.name)
    private bookingSessionModel: Model<BookingSessionDocument>,
    @InjectModel(TutorProfile.name)
    private tutorProfileModel: Model<TutorProfileDocument>,
    @InjectModel(TutoringSession.name)
    private tutoringSessionModel: Model<TutoringSessionDocument>,
    private readonly mentorAvailabilityService: MentorAvailabilityService,
    private readonly notificationService: NotificationService,
    private readonly paymentService: PaymentService,
    private readonly aiQuotaService: AiQuotaService,
  ) { }

  onModuleInit(): void {
    this.completionSweepTimer = setInterval(() => {
      this.sweepOverdueCompletedBookings().catch((error) => {
        this.logger.warn(`Mentor booking completion sweep failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, SESSION_COMPLETION_SWEEP_INTERVAL_MS);
    this.completionSweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.completionSweepTimer) {
      clearInterval(this.completionSweepTimer);
    }
  }

  private withParticipantSummaries<T>(query: T): T {
    const populatable = query as PopulatableQuery<T>;
    if (typeof populatable.populate !== 'function') return query;
    return populatable
      .populate('mentorUser', 'name email avatar')
      .populate('menteeUser', 'name email avatar') as T;
  }

  private async populateParticipantSummaries(
    booking: BookingSessionDocument,
  ): Promise<BookingSessionDocument> {
    const populatable = booking as PopulatableBookingDocument;
    if (typeof populatable.populate !== 'function') return booking;
    return populatable.populate([
      { path: 'mentorUser', select: 'name email avatar' },
      { path: 'menteeUser', select: 'name email avatar' },
    ]);
  }

  async createForMentee(menteeId: string, createDto: CreateBookingInput): Promise<BookingSessionDocument> {
    if (!Types.ObjectId.isValid(menteeId)) throw new BadRequestException('Invalid menteeId');
    if (!Types.ObjectId.isValid(createDto.tutorProfileId)) throw new BadRequestException('Invalid tutorProfileId');
    const bookingType = createDto.bookingType === BookingType.TRIAL ? BookingType.TRIAL : BookingType.PAID;
    if (bookingType !== BookingType.TRIAL && (!createDto.availabilitySlotId || !Types.ObjectId.isValid(createDto.availabilitySlotId))) {
      throw new BadRequestException('availabilitySlotId is required');
    }
    if (bookingType === BookingType.TRIAL && createDto.availabilitySlotId && !Types.ObjectId.isValid(createDto.availabilitySlotId)) {
      throw new BadRequestException('Invalid availabilitySlotId');
    }

    const tutor = await this.tutorProfileModel.findById(createDto.tutorProfileId).exec();
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    if (tutor.status !== TutorStatus.ACTIVE) {
      throw new BadRequestException('Tutor is not active');
    }

    const trialSourcePlan = bookingType === BookingType.TRIAL
      ? await this.resolveTrialSourcePlan(menteeId)
      : null;
    const bookingInput = this.sanitizeCreateBookingInput(createDto);

    if (bookingType === BookingType.TRIAL) {
      const trialStartAt = this.resolveTrialStartAt(createDto);
      const booking = new this.bookingSessionModel({
        ...bookingInput,
        bookingType,
        schedulingDetails: this.buildTrialSchedulingDetails(trialStartAt, createDto),
        menteeId: new Types.ObjectId(menteeId),
        tutorProfileId: tutor._id,
        mentorId: this.toObjectId(tutor.userId.toString()),
        status: BookingStatus.PENDING,
        paymentInfo: this.buildTrialPaymentInfo(tutor),
        trialInfo: {
          durationMinutes: TRIAL_BOOKING_DURATION_MINUTES,
          ...(trialSourcePlan?._id ? { sourcePlanId: trialSourcePlan._id } : {}),
        },
      });
      const saved = await booking.save();
      return this.populateParticipantSummaries(saved);
    }

    const availabilitySlotId = createDto.availabilitySlotId as string;
    const existingBooking = await this.resolveExistingSlotBooking(availabilitySlotId, menteeId);
    if (existingBooking) return existingBooking;

    const availableSlot = await this.mentorAvailabilityService.getAvailableSlotForBooking(
      availabilitySlotId,
      createDto.tutorProfileId,
    );
    const initialPaymentInfo = this.buildInitialPaymentInfo(tutor, createDto, availableSlot);
    const requiresPositivePayment =
      Number(initialPaymentInfo?.sessionPrice ?? 0) > 0;
    const slot = requiresPositivePayment
      ? availableSlot
      : await this.mentorAvailabilityService.holdSlotForBooking(
          availabilitySlotId,
          createDto.tutorProfileId,
          menteeId,
          { expires: false },
        );

    try {
      const booking = new this.bookingSessionModel({
        ...bookingInput,
        bookingType,
        schedulingDetails: this.buildSchedulingDetailsFromSlot(slot, createDto),
        availabilitySlotId: slot._id,
        menteeId: new Types.ObjectId(menteeId),
        tutorProfileId: tutor._id,
        mentorId: this.toObjectId(tutor.userId.toString()),
        status: requiresPositivePayment ? BookingStatus.AWAITING_PAYMENT : BookingStatus.PENDING,
        paymentInfo: initialPaymentInfo,
      });
      const saved = await booking.save();
      if (!requiresPositivePayment) {
        await this.mentorAvailabilityService.attachBooking(slot._id.toString(), saved._id.toString());
      }
      return this.populateParticipantSummaries(saved);
    } catch (error) {
      if (!requiresPositivePayment) {
        await this.mentorAvailabilityService.releaseHeldSlot(slot._id.toString());
      }
      if (this.isDuplicateAvailabilitySlotError(error)) {
        const existing = await this.resolveExistingSlotBooking(slot._id.toString(), menteeId);
        if (existing) return existing;
        throw new ConflictException('Khung gio nay dang bi khoa boi booking cu. Vui long chay migration index roi thu lai.');
      }
      throw error;
    }
  }

  private sanitizeCreateBookingInput(input: CreateBookingInput): Record<string, unknown> {
    const sanitized: Record<string, unknown> = { ...input };
    delete sanitized.availabilitySlotId;
    delete sanitized.tutorProfileId;
    delete sanitized.menteeId;
    delete sanitized.mentorId;
    delete sanitized.status;
    delete sanitized.paymentInfo;
    delete sanitized.trialInfo;
    delete sanitized.bookingType;
    return sanitized;
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<BookingSessionDocument> = {},
  ): Promise<{ data: BookingSessionDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.withParticipantSummaries(
        this.bookingSessionModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
      ).exec(),
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
    const booking = await this.withParticipantSummaries(this.bookingSessionModel.findById(id)).exec();
    if (!booking) {
      throw new NotFoundException(`Booking session with ID ${id} not found`);
    }
    return booking;
  }

  async findByMentee(menteeId: string): Promise<BookingSessionDocument[]> {
    if (!Types.ObjectId.isValid(menteeId)) throw new BadRequestException('Invalid menteeId');
    await this.sweepOverdueCompletedBookingsForUser(menteeId);
    return this.withParticipantSummaries(
      this.bookingSessionModel.find({ menteeId: new Types.ObjectId(menteeId) }).sort({ createdAt: -1 }),
    ).exec();
  }

  async findByMentor(mentorId: string): Promise<BookingSessionDocument[]> {
    if (Types.ObjectId.isValid(mentorId)) {
      await this.sweepOverdueCompletedBookingsForUser(mentorId);
    }
    return this.withParticipantSummaries(
      this.bookingSessionModel.find(this.buildMentorIdFilter(mentorId)).sort({ createdAt: -1 }),
    ).exec();
  }

  async findPending(): Promise<BookingSessionDocument[]> {
    return this.withParticipantSummaries(
      this.bookingSessionModel.find({ status: BookingStatus.PENDING }).sort({ createdAt: 1 }),
    ).exec();
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

    const shouldConsumeTrialQuota = this.isTrialBooking(booking) && !booking.trialInfo?.quotaConsumedAt;
    if (shouldConsumeTrialQuota) {
      await this.aiQuotaService.checkQuota(booking.menteeId.toString(), AiFeature.MENTOR_BOOKING);
    }

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
    let bookingWithSession = await this.ensureTutoringSessionForBooking(updated);
    if (shouldConsumeTrialQuota) {
      await this.aiQuotaService.consumeQuota(
        booking.menteeId.toString(),
        AiFeature.MENTOR_BOOKING,
        { requestCount: 1, tokensUsed: 0 },
      );
      bookingWithSession = await this.update(id, {
        'trialInfo.quotaConsumedAt': new Date(),
      });
    }
    await this.notifyBookingParticipants(bookingWithSession, NotificationType.MENTOR_BOOKING_CONFIRMED);
    return bookingWithSession;
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
    const shouldRefundTrialQuota = this.shouldRefundTrialQuotaOnMentorCancel(booking, isMentor);
    let updated = await this.update(id, { status, ...(reason ? { 'cancellationDetails.reason': reason } : {}) });
    await this.mentorAvailabilityService.releaseSlotForBooking(id);
    if (this.isTrialBooking(booking)) {
      if (shouldRefundTrialQuota) {
        await this.aiQuotaService.refundQuota(
          booking.menteeId.toString(),
          AiFeature.MENTOR_BOOKING,
          { requestCount: 1, tokensUsed: 0 },
          booking.trialInfo?.quotaConsumedAt,
        );
        updated = await this.update(id, { 'trialInfo.quotaRefundedAt': new Date() });
      }
    } else {
      await this.paymentService.handleMentorBookingCancellation(booking, isMentor ? 'mentor' : 'mentee', reason);
    }
    await this.notifyBookingParticipants(updated, NotificationType.MENTOR_BOOKING_CANCELLED);
    return updated;
  }

  async completeBooking(
    id: string,
    actor: AuthUserLike,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const participant = this.getBookingParticipant(booking, actor);
    return this.completeBookingLifecycle(booking, participant.role);
  }

  async completeOverdueBookingIfNeeded(
    booking: BookingSessionDocument,
  ): Promise<BookingSessionDocument> {
    if (!this.isCompletableBookingStatus(booking.status) || !this.isPastCompletionGrace(booking)) {
      return booking;
    }
    return this.completeBookingLifecycle(booking, 'system');
  }

  async sweepOverdueCompletedBookings(): Promise<number> {
    const candidates = await this.findCompletionSweepCandidates();
    let completed = 0;
    for (const booking of candidates) {
      if (!this.isPastCompletionGrace(booking)) continue;
      await this.completeBookingLifecycle(booking, 'system');
      completed += 1;
    }
    return completed;
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
    const bookingWithSession = await this.ensureTutoringSessionForBooking(updated);
    await this.notifyBookingParticipants(bookingWithSession, NotificationType.MENTOR_BOOKING_RESCHEDULED);
    return bookingWithSession;
  }

  async addMessage(
    id: string,
    actor: AuthUserLike,
    input: { message: string; messageType?: NonNullable<BookingSession['communicationThread']>[number]['messageType'] },
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const participant = this.getBookingParticipant(booking, actor);
    const message = this.buildThreadMessage(
      participant.userId,
      participant.role,
      input.message,
      input.messageType || 'chat',
    );

    const updated = await this.pushBookingThreadMessage(id, message);
    await this.notifyBookingMessage(booking, participant.role, input.message);
    return updated;
  }

  async createRescheduleProposal(
    id: string,
    actor: AuthUserLike,
    input: {
      newDateTime: string | Date;
      duration: number;
      timeZone?: string;
      availabilitySlotId?: string;
      reason?: string;
      message?: string;
    },
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    if (![BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED].includes(booking.status)) {
      throw new ConflictException('Only paid or confirmed bookings can be rescheduled by proposal');
    }

    const participant = this.getBookingParticipant(booking, actor);
    const newDateTime = new Date(input.newDateTime);
    if (Number.isNaN(newDateTime.getTime())) throw new BadRequestException('Invalid newDateTime');
    if (!Number.isFinite(input.duration) || input.duration <= 0) throw new BadRequestException('Invalid duration');
    if (input.availabilitySlotId && !Types.ObjectId.isValid(input.availabilitySlotId)) {
      throw new BadRequestException('Invalid availabilitySlotId');
    }
    await this.assertNoOverlap(booking.mentorId.toString(), newDateTime, input.duration, id);

    if (input.availabilitySlotId) {
      await this.mentorAvailabilityService.reserveSlotForRescheduleProposal(
        input.availabilitySlotId,
        id,
        booking.mentorId.toString(),
        newDateTime,
        input.duration,
        participant.userId,
      );
    }

    const proposal = {
      id: new Types.ObjectId().toString(),
      proposedBy: new Types.ObjectId(participant.userId),
      proposedByRole: participant.role === 'mentor' ? 'mentor' : 'mentee',
      status: 'pending',
      ...(input.availabilitySlotId ? { availabilitySlotId: new Types.ObjectId(input.availabilitySlotId) } : {}),
      newDateTime,
      duration: input.duration,
      timeZone: input.timeZone || booking.schedulingDetails.timeZone,
      reason: input.reason,
      message: input.message,
      createdAt: new Date(),
    };
    const threadMessage = this.buildThreadMessage(
      participant.userId,
      participant.role,
      input.message || input.reason || 'Đề xuất đổi lịch mới',
      'reschedule_proposal',
    );

    let updated: BookingSessionDocument;
    try {
      updated = await this.update(id, {
        $push: {
          rescheduleProposals: proposal,
          communicationThread: threadMessage,
        },
      });
    } catch (error) {
      if (input.availabilitySlotId) {
        await this.mentorAvailabilityService.releaseHeldSlot(input.availabilitySlotId).catch(() => undefined);
      }
      throw error;
    }

    await this.notifyBookingParticipants(
      updated,
      NotificationType.MENTOR_BOOKING_RESCHEDULE_REQUESTED,
      participant.role,
    );
    return updated;
  }

  async acceptRescheduleProposal(
    id: string,
    proposalId: string,
    actor: AuthUserLike,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const participant = this.getBookingParticipant(booking, actor);
    const proposal = this.findPendingProposal(booking, proposalId);
    if (proposal.proposedBy.toString() === participant.userId && !isAdmin(actor)) {
      throw new ForbiddenException('Only the other participant can accept this proposal');
    }

    await this.assertNoOverlap(booking.mentorId.toString(), proposal.newDateTime, proposal.duration, id);
    const originalDateTime = booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime;
    const nextProposals = (booking.rescheduleProposals || []).map((item) => (
      item.id === proposalId
        ? { ...item, status: 'accepted', respondedAt: new Date(), respondedBy: new Types.ObjectId(participant.userId) }
        : item
    ));
    const threadMessage = this.buildThreadMessage(
      participant.userId,
      participant.role,
      'Đã đồng ý đổi sang lịch mới',
      'reschedule_accept',
    );
    const update: Record<string, unknown> = {
      status: BookingStatus.RESCHEDULED,
      'schedulingDetails.requestedDateTime': proposal.newDateTime,
      'schedulingDetails.confirmedDateTime': proposal.newDateTime,
      'schedulingDetails.duration': proposal.duration,
      'schedulingDetails.timeZone': proposal.timeZone || booking.schedulingDetails.timeZone,
      rescheduleProposals: nextProposals,
      $push: {
        communicationThread: threadMessage,
        reschedulingHistory: {
          originalDateTime,
          newDateTime: proposal.newDateTime,
          rescheduledBy: proposal.proposedByRole,
          reason: proposal.reason || proposal.message || 'Reschedule proposal accepted',
          rescheduledAt: new Date(),
        },
      },
    };

    if (proposal.availabilitySlotId) {
      const currentSlotId = booking.availabilitySlotId?.toString();
      const proposalSlotId = proposal.availabilitySlotId.toString();
      await this.mentorAvailabilityService.markBooked(proposalSlotId, id);
      if (currentSlotId && currentSlotId !== proposalSlotId) {
        await this.mentorAvailabilityService.releaseSpecificSlotForBooking(currentSlotId, id);
      }
      update.availabilitySlotId = proposal.availabilitySlotId;
    }

    const updated = await this.update(id, update);
    const bookingWithSession = await this.ensureTutoringSessionForBooking(updated);
    await this.notifyBookingParticipants(bookingWithSession, NotificationType.MENTOR_BOOKING_RESCHEDULE_ACCEPTED, participant.role);
    return bookingWithSession;
  }

  async declineRescheduleProposal(
    id: string,
    proposalId: string,
    actor: AuthUserLike,
    reason?: string,
  ): Promise<BookingSessionDocument> {
    const booking = await this.findOne(id);
    const participant = this.getBookingParticipant(booking, actor);
    const proposal = this.findPendingProposal(booking, proposalId);
    if (proposal.proposedBy.toString() === participant.userId && !isAdmin(actor)) {
      throw new ForbiddenException('Only the other participant can decline this proposal');
    }

    const nextProposals = (booking.rescheduleProposals || []).map((item) => (
      item.id === proposalId
        ? { ...item, status: 'declined', respondedAt: new Date(), respondedBy: new Types.ObjectId(participant.userId) }
        : item
    ));
    const threadMessage = this.buildThreadMessage(
      participant.userId,
      participant.role,
      reason || 'Đã từ chối đề xuất đổi lịch',
      'reschedule_decline',
    );

    const updated = await this.update(id, {
      rescheduleProposals: nextProposals,
      $push: { communicationThread: threadMessage },
    });
    if (proposal.availabilitySlotId) {
      await this.mentorAvailabilityService.releaseHeldSlot(proposal.availabilitySlotId.toString());
    }
    await this.notifyBookingParticipants(updated, NotificationType.MENTOR_BOOKING_RESCHEDULE_DECLINED, participant.role);
    return updated;
  }

  async update(
    id: string | Types.ObjectId,
    updateDto: Record<string, unknown>,
  ): Promise<BookingSessionDocument> {
    const populatedBooking = await this.withParticipantSummaries(
      this.bookingSessionModel.findByIdAndUpdate(id, updateDto as Partial<BookingSession>, { new: true }),
    ).exec();
    if (!populatedBooking) {
      throw new NotFoundException(`Booking session with ID ${String(id)} not found`);
    }
    return populatedBooking;
  }

  async remove(id: string): Promise<BookingSessionDocument> {
    const booking = await this.bookingSessionModel.findByIdAndDelete(id).exec();
    if (!booking) {
      throw new NotFoundException(`Booking session with ID ${id} not found`);
    }
    return booking;
  }

  private async completeBookingLifecycle(
    booking: BookingSessionDocument,
    completedBy: 'mentee' | 'mentor' | 'system',
  ): Promise<BookingSessionDocument> {
    if (booking.status === BookingStatus.COMPLETED) return booking;
    if (!this.isCompletableBookingStatus(booking.status)) {
      throw new ConflictException('Only confirmed or rescheduled bookings can be completed');
    }

    const session = await this.findOrCreateTutoringSessionForBooking(booking);
    const actualEndTime = new Date();
    const sessionStart = this.getBookingStart(booking);
    const actualStartTime = session.sessionDetails?.actualStartTime || sessionStart;
    const actualDuration = Math.max(
      0,
      Math.round((actualEndTime.getTime() - new Date(actualStartTime).getTime()) / 60_000),
    );

    await this.tutoringSessionModel
      .findByIdAndUpdate(
        session._id,
        {
          status: SessionStatus.COMPLETED,
          'sessionDetails.actualEndTime': actualEndTime,
          'sessionDetails.actualDuration': actualDuration,
        },
        { new: true },
      )
      .exec();

    const updated = await this.update(booking._id, {
      status: BookingStatus.COMPLETED,
      tutoringSessionId: session._id,
    });

    await this.paymentService.settleMentorBookingPayment(updated._id);
    await this.notifySessionCompleted(updated, completedBy);
    return updated;
  }

  private async ensureTutoringSessionForBooking(
    booking: BookingSessionDocument,
  ): Promise<BookingSessionDocument> {
    const session = await this.findOrCreateTutoringSessionForBooking(booking);
    if (booking.tutoringSessionId?.toString() === session._id.toString()) return booking;

    return this.update(booking._id, { tutoringSessionId: session._id });
  }

  private async findOrCreateTutoringSessionForBooking(
    booking: BookingSessionDocument,
  ): Promise<TutoringSessionDocument> {
    const schedulePayload = this.buildTutoringSessionPayload(booking);

    if (booking.tutoringSessionId) {
      const existingById = await this.tutoringSessionModel.findById(booking.tutoringSessionId).exec();
      if (existingById) return this.refreshTutoringSessionSchedule(existingById, schedulePayload);
    }

    const existing = await this.tutoringSessionModel
      .findOne({ bookingSessionId: booking._id })
      .exec();
    if (existing) return this.refreshTutoringSessionSchedule(existing, schedulePayload);

    const session = new this.tutoringSessionModel(schedulePayload);
    return session.save();
  }

  private async refreshTutoringSessionSchedule(
    session: TutoringSessionDocument,
    schedulePayload: Partial<TutoringSession>,
  ): Promise<TutoringSessionDocument> {
    if ([SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.NO_SHOW].includes(session.status)) {
      return session;
    }

    const updated = await this.tutoringSessionModel
      .findByIdAndUpdate(session._id, schedulePayload, { new: true })
      .exec();
    return updated || session;
  }

  private buildTutoringSessionPayload(booking: BookingSessionDocument): Partial<TutoringSession> {
    const scheduledStartTime = this.getBookingStart(booking);
    const duration = Number(booking.schedulingDetails.duration || 0);
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const scheduledEndTime = new Date(scheduledStartTime.getTime() + safeDuration * 60_000);

    return {
      bookingSessionId: booking._id,
      menteeId: booking.menteeId,
      mentorId: booking.mentorId,
      status: SessionStatus.SCHEDULED,
      sessionDetails: {
        scheduledStartTime,
        scheduledEndTime,
        sessionFormat: 'video',
        recordingEnabled: false,
      },
    };
  }

  private async findCompletionSweepCandidates(): Promise<BookingSessionDocument[]> {
    const cutoff = new Date(Date.now() - SESSION_COMPLETE_GRACE_MINUTES * 60_000);
    return this.bookingSessionModel
      .find({
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] },
        $or: [
          { 'schedulingDetails.confirmedDateTime': { $lte: cutoff } },
          {
            'schedulingDetails.confirmedDateTime': { $exists: false },
            'schedulingDetails.requestedDateTime': { $lte: cutoff },
          },
        ],
      })
      .exec();
  }

  private async sweepOverdueCompletedBookingsForUser(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    const userObjectId = new Types.ObjectId(userId);
    const cutoff = new Date(Date.now() - SESSION_COMPLETE_GRACE_MINUTES * 60_000);
    const candidates = await this.bookingSessionModel
      .find({
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] },
        $or: [
          { menteeId: userObjectId },
          { mentorId: userObjectId },
          { $expr: { $eq: ['$mentorId', userId] } },
        ],
        $and: [
          {
            $or: [
              { 'schedulingDetails.confirmedDateTime': { $lte: cutoff } },
              {
                'schedulingDetails.confirmedDateTime': { $exists: false },
                'schedulingDetails.requestedDateTime': { $lte: cutoff },
              },
            ],
          },
        ],
      })
      .exec();

    for (const booking of candidates) {
      await this.completeOverdueBookingIfNeeded(booking);
    }
  }

  private isPastCompletionGrace(booking: BookingSessionDocument): boolean {
    const sessionEnd = this.getBookingEnd(booking);
    const autoCompleteAt = sessionEnd.getTime() + SESSION_COMPLETE_GRACE_MINUTES * 60_000;
    return Date.now() >= autoCompleteAt;
  }

  private getBookingStart(booking: BookingSessionDocument): Date {
    const rawStart = booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime;
    const start = new Date(rawStart);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid booking schedule');
    return start;
  }

  private getBookingEnd(booking: BookingSessionDocument): Date {
    const start = this.getBookingStart(booking);
    const duration = Number(booking.schedulingDetails.duration || 0);
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    return new Date(start.getTime() + safeDuration * 60_000);
  }

  private isCompletableBookingStatus(status: BookingStatus): boolean {
    return [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED].includes(status);
  }

  private getBookingParticipant(
    booking: BookingSessionDocument,
    actor: AuthUserLike,
  ): { userId: string; role: 'mentee' | 'mentor' | 'system' } {
    const actorId = getAuthUserId(actor);
    if (!actorId || !Types.ObjectId.isValid(actorId)) throw new ForbiddenException('Missing user context');
    if (booking.menteeId.toString() === actorId) return { userId: actorId, role: 'mentee' };
    if (booking.mentorId.toString() === actorId) return { userId: actorId, role: 'mentor' };
    if (isAdmin(actor)) return { userId: actorId, role: 'system' };
    throw new ForbiddenException('Forbidden');
  }

  private buildThreadMessage(
    senderId: string,
    senderType: 'mentee' | 'mentor' | 'system',
    message: string,
    messageType: NonNullable<BookingSession['communicationThread']>[number]['messageType'],
  ): NonNullable<BookingSession['communicationThread']>[number] {
    const trimmed = message?.trim();
    if (!trimmed) throw new BadRequestException('Message is required');
    return {
      messageId: new Types.ObjectId().toString(),
      senderId: new Types.ObjectId(senderId),
      senderType,
      message: trimmed,
      timestamp: new Date(),
      messageType,
    };
  }

  private async pushBookingThreadMessage(
    id: string,
    message: NonNullable<BookingSession['communicationThread']>[number],
  ): Promise<BookingSessionDocument> {
    return this.update(id, { $push: { communicationThread: message } });
  }

  private findPendingProposal(
    booking: BookingSessionDocument,
    proposalId: string,
  ): NonNullable<BookingSession['rescheduleProposals']>[number] {
    const proposal = (booking.rescheduleProposals || []).find((item) => item.id === proposalId);
    if (!proposal) throw new NotFoundException('Reschedule proposal not found');
    if (proposal.status !== 'pending') throw new ConflictException('Reschedule proposal is no longer pending');
    return proposal;
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

    const query: FilterQuery<BookingSessionDocument> = {
      ...this.buildMentorIdFilter(mentorId),
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] },
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

  private toObjectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException('Invalid mentorId');
    return new Types.ObjectId(value);
  }

  private buildMentorIdFilter(mentorId: string): FilterQuery<BookingSessionDocument> {
    const mentorObjectId = this.toObjectId(mentorId);
    return {
      $or: [
        { mentorId: mentorObjectId },
        { $expr: { $eq: ['$mentorId', mentorId] } },
      ],
    } as FilterQuery<BookingSessionDocument>;
  }

  private async resolveExistingSlotBooking(
    availabilitySlotId: string,
    menteeId: string,
  ): Promise<BookingSessionDocument | null> {
    const existing = await this.findActiveBookingBySlot(availabilitySlotId);
    if (existing && this.isActiveSlotBookingStatus(existing.status)) {
      if (existing.menteeId.toString() !== menteeId) {
        throw new ConflictException('Khung gio da co nguoi dat');
      }

      if (SAME_MENTEE_BLOCKING_STATUSES.includes(existing.status)) {
        throw new ConflictException('Ban da co booking dang xu ly cho khung gio nay');
      }
    }

    return this.findAwaitingPaymentBookingBySlotForMentee(availabilitySlotId, menteeId);
  }

  private async findActiveBookingBySlot(availabilitySlotId: string): Promise<BookingSessionDocument | null> {
    return this.withParticipantSummaries(
      this.bookingSessionModel
        .findOne({
          availabilitySlotId: new Types.ObjectId(availabilitySlotId),
          status: { $in: [...ACTIVE_SLOT_BOOKING_STATUSES] },
        })
        .sort({ createdAt: -1 }),
    ).exec();
  }

  private async findAwaitingPaymentBookingBySlotForMentee(
    availabilitySlotId: string,
    menteeId: string,
  ): Promise<BookingSessionDocument | null> {
    return this.withParticipantSummaries(
      this.bookingSessionModel
        .findOne({
          availabilitySlotId: new Types.ObjectId(availabilitySlotId),
          menteeId: new Types.ObjectId(menteeId),
          status: BookingStatus.AWAITING_PAYMENT,
        })
        .sort({ createdAt: -1 }),
    ).exec();
  }

  private isDuplicateAvailabilitySlotError(error: unknown): boolean {
    const mongoError = error as {
      code?: number;
      message?: string;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };
    const isDuplicate = mongoError.code === 11000 || mongoError.message?.includes('E11000');
    if (!isDuplicate) return false;
    return Boolean(
      mongoError.keyPattern?.availabilitySlotId ||
      mongoError.keyValue?.availabilitySlotId ||
      mongoError.message?.includes('availabilitySlotId'),
    );
  }

  private isActiveSlotBookingStatus(status: BookingStatus): boolean {
    return (ACTIVE_SLOT_BOOKING_STATUSES as readonly BookingStatus[]).includes(status);
  }

  private async resolveTrialSourcePlan(menteeId: string) {
    await this.aiQuotaService.checkQuota(menteeId, AiFeature.MENTOR_BOOKING);
    return this.aiQuotaService.getPlanForUserOrFree(menteeId);
  }

  private resolveTrialStartAt(createDto: CreateBookingInput): Date {
    const requestedStartAt = this.parseRequestedTrialStartAt(createDto);
    if (!requestedStartAt) {
      throw new BadRequestException('Trial requestedDateTime is required');
    }
    if (requestedStartAt < new Date()) {
      throw new BadRequestException('Trial requestedDateTime must be in the future');
    }
    const requestedEndAt = new Date(requestedStartAt.getTime() + TRIAL_BOOKING_DURATION_MINUTES * 60_000);

    const menteeWindows = this.parseMenteeAvailabilityWindows(createDto);
    if (
      menteeWindows.length > 0 &&
      !menteeWindows.some((window) => this.isRangeInside(requestedStartAt, requestedEndAt, window.startAt, window.endAt))
    ) {
      throw new BadRequestException('Trial time must match a mentee availability window');
    }

    return requestedStartAt;
  }

  private parseRequestedTrialStartAt(createDto: CreateBookingInput): Date | undefined {
    const schedulingDetails = createDto.schedulingDetails as BookingSchedulingInput | undefined;
    if (!schedulingDetails?.requestedDateTime) return undefined;

    const requestedStartAt = new Date(schedulingDetails.requestedDateTime);
    if (Number.isNaN(requestedStartAt.getTime())) {
      throw new BadRequestException('Invalid trial requestedDateTime');
    }
    return requestedStartAt;
  }

  private parseMenteeAvailabilityWindows(
    createDto: CreateBookingInput,
  ): { startAt: Date; endAt: Date }[] {
    const bookingRequest = createDto.bookingRequest as BookingRequestInput | undefined;
    const windows = bookingRequest?.menteeAvailabilityWindows;
    if (windows === undefined) return [];
    if (!Array.isArray(windows)) {
      throw new BadRequestException('menteeAvailabilityWindows must be an array');
    }
    if (windows.length > 3) {
      throw new BadRequestException('Only up to 3 mentee availability windows are allowed');
    }

    return windows.map((window, index) => {
      const startAt = new Date(window?.startAt || '');
      const endAt = new Date(window?.endAt || '');
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
        throw new BadRequestException(`Invalid mentee availability window at index ${index}`);
      }
      return { startAt, endAt };
    });
  }

  private isRangeInside(start: Date, end: Date, containerStart: Date, containerEnd: Date): boolean {
    return start.getTime() >= containerStart.getTime() && end.getTime() <= containerEnd.getTime();
  }

  private isTrialBooking(booking: Pick<BookingSession, 'bookingType'>): boolean {
    return booking.bookingType === BookingType.TRIAL;
  }

  private shouldRefundTrialQuotaOnMentorCancel(
    booking: BookingSessionDocument,
    isMentorCancellation: boolean,
  ): boolean {
    if (!isMentorCancellation || !this.isTrialBooking(booking)) return false;
    if (!booking.trialInfo?.quotaConsumedAt || booking.trialInfo?.quotaRefundedAt) return false;

    const start = new Date(
      booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
    );
    return !Number.isNaN(start.getTime()) && start.getTime() > Date.now();
  }

  private buildTrialPaymentInfo(tutor: TutorProfileDocument): BookingSession['paymentInfo'] {
    return {
      sessionPrice: 0,
      currency: tutor.pricing?.currency || 'VND',
      paymentMethod: 'free_session',
      paymentStatus: 'free',
    };
  }

  private buildInitialPaymentInfo(
    tutor: TutorProfileDocument,
    createDto: CreateBookingInput,
    slot: MentorAvailabilitySlotDocument,
  ): BookingSession['paymentInfo'] {
    const sessionType = typeof createDto.sessionType === 'string' ? createDto.sessionType : '';
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

  private buildTrialSchedulingDetails(
    requestedStartAt: Date,
    createDto: CreateBookingInput,
  ): BookingSession['schedulingDetails'] {
    const provided = createDto.schedulingDetails as Partial<BookingSession['schedulingDetails']> | undefined;
    return {
      requestedDateTime: requestedStartAt,
      duration: TRIAL_BOOKING_DURATION_MINUTES,
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
    _initiatedBy?: 'mentee' | 'mentor' | 'system',
  ): Promise<void> {
    void _initiatedBy;
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

  private async notifySessionCompleted(
    booking: BookingSessionDocument,
    completedBy: 'mentee' | 'mentor' | 'system',
  ): Promise<void> {
    const start = new Date(
      booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
    ).toLocaleString('vi-VN');
    const payload = {
      ...this.buildBookingNotificationPayload(booking),
      tutoringSessionId: booking.tutoringSessionId?.toString(),
      completedBy,
      reviewUrl: `/mentor-matching?reviewBooking=${booking._id.toString()}`,
    };

    await this.notificationService.createMany([
      {
        recipientId: booking.mentorId,
        type: NotificationType.MENTOR_SESSION_COMPLETED,
        title: 'Buổi mentor đã kết thúc',
        body: `Booking lúc ${start} đã được đánh dấu hoàn thành.`,
        payload,
      },
      {
        recipientId: booking.menteeId,
        type: NotificationType.MENTOR_REVIEW_REQUESTED,
        title: 'Đánh giá mentor của bạn',
        body: `Buổi mentor lúc ${start} đã kết thúc. Hãy để lại đánh giá để giúp mentor cải thiện.`,
        payload,
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

    const localizedContent = this.getLocalizedBookingNotificationContent(type, start);
    if (localizedContent) return localizedContent;

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
      case NotificationType.MENTOR_BOOKING_RESCHEDULE_REQUESTED:
        return {
          mentorTitle: 'Có đề xuất đổi lịch',
          mentorBody: `Booking lúc ${start} có đề xuất đổi lịch mới.`,
          menteeTitle: 'Có đề xuất đổi lịch',
          menteeBody: `Phiên mentor lúc ${start} có đề xuất đổi lịch mới.`,
        };
      case NotificationType.MENTOR_BOOKING_RESCHEDULE_ACCEPTED:
        return {
          mentorTitle: 'Đề xuất đổi lịch đã được đồng ý',
          mentorBody: `Booking đã chuyển sang lịch ${start}.`,
          menteeTitle: 'Đề xuất đổi lịch đã được đồng ý',
          menteeBody: `Phiên mentor đã chuyển sang lịch ${start}.`,
        };
      case NotificationType.MENTOR_BOOKING_RESCHEDULE_DECLINED:
        return {
          mentorTitle: 'Đề xuất đổi lịch bị từ chối',
          mentorBody: `Đề xuất đổi lịch cho booking lúc ${start} đã bị từ chối.`,
          menteeTitle: 'Đề xuất đổi lịch bị từ chối',
          menteeBody: `Đề xuất đổi lịch cho phiên mentor lúc ${start} đã bị từ chối.`,
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

  private getLocalizedBookingNotificationContent(
    type: NotificationType,
    start: string,
  ): {
    mentorTitle: string;
    mentorBody: string;
    menteeTitle: string;
    menteeBody: string;
  } | null {
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
          mentorBody: 'Booking đã được chuyển sang trạng thái đổi lịch.',
          menteeTitle: 'Booking được đề xuất đổi lịch',
          menteeBody: 'Phiên mentor của bạn đang ở trạng thái đổi lịch.',
        };
      case NotificationType.MENTOR_BOOKING_RESCHEDULE_REQUESTED:
        return {
          mentorTitle: 'Có đề xuất đổi lịch',
          mentorBody: `Booking lúc ${start} có đề xuất đổi lịch mới.`,
          menteeTitle: 'Có đề xuất đổi lịch',
          menteeBody: `Phiên mentor lúc ${start} có đề xuất đổi lịch mới.`,
        };
      case NotificationType.MENTOR_BOOKING_RESCHEDULE_ACCEPTED:
        return {
          mentorTitle: 'Đề xuất đổi lịch đã được đồng ý',
          mentorBody: `Booking đã chuyển sang lịch ${start}.`,
          menteeTitle: 'Đề xuất đổi lịch đã được đồng ý',
          menteeBody: `Phiên mentor đã chuyển sang lịch ${start}.`,
        };
      case NotificationType.MENTOR_BOOKING_RESCHEDULE_DECLINED:
        return {
          mentorTitle: 'Đề xuất đổi lịch bị từ chối',
          mentorBody: `Đề xuất đổi lịch cho booking lúc ${start} đã bị từ chối.`,
          menteeTitle: 'Đề xuất đổi lịch bị từ chối',
          menteeBody: `Đề xuất đổi lịch cho phiên mentor lúc ${start} đã bị từ chối.`,
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
      tutoringSessionId: booking.tutoringSessionId?.toString(),
      status: booking.status,
      bookingType: booking.bookingType || BookingType.PAID,
      sessionType: booking.sessionType,
      meetingLink: booking.schedulingDetails.meetingLink,
      requestedDateTime: booking.schedulingDetails.requestedDateTime,
      confirmedDateTime: booking.schedulingDetails.confirmedDateTime,
    };
  }

  private getParticipantSummaryFromBooking(
    booking: BookingSessionDocument,
    role: 'mentee' | 'mentor' | 'system',
  ): BookingParticipantSummary {
    if (role === 'system') {
      return {
        id: 'system',
        name: 'Hệ thống',
      };
    }

    const bookingJson = typeof booking.toJSON === 'function'
      ? booking.toJSON() as Record<string, unknown>
      : booking as unknown as Record<string, unknown>;
    const key = role === 'mentor' ? 'mentorUser' : 'menteeUser';
    const rawUser = bookingJson[key] as Record<string, unknown> | undefined;
    const fallbackId = role === 'mentor' ? booking.mentorId.toString() : booking.menteeId.toString();
    const rawId = rawUser?.id || rawUser?._id;

    return {
      id: rawId?.toString() || fallbackId,
      name: typeof rawUser?.name === 'string' && rawUser.name.trim()
        ? rawUser.name.trim()
        : role === 'mentor' ? 'Mentor' : 'Học viên',
      email: typeof rawUser?.email === 'string' ? rawUser.email : undefined,
      avatar: typeof rawUser?.avatar === 'string' ? rawUser.avatar : undefined,
    };
  }

  private async notifyBookingMessage(
    booking: BookingSessionDocument,
    senderRole: 'mentee' | 'mentor' | 'system',
    message: string,
  ): Promise<void> {
    const recipientId = senderRole === 'mentor' ? booking.menteeId : booking.mentorId;
    const sender = this.getParticipantSummaryFromBooking(booking, senderRole);

    await this.notificationService.create({
      recipientId,
      type: NotificationType.MENTOR_BOOKING_MESSAGE,
      title: `${sender.name} đã nhắn tin cho bạn`,
      body: message.length > 120 ? `${message.slice(0, 117)}...` : message,
      payload: {
        ...this.buildBookingNotificationPayload(booking),
        openChat: true,
        senderId: sender.id,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        senderRole,
      },
    });

  }
}
