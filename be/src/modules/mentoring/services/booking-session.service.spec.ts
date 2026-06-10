import { BadRequestException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BookingSession, BookingStatus, BookingType, SessionType } from '../schemas/booking-session.schema';
import { TutorProfile, TutorStatus } from '../schemas/tutor-profile.schema';
import { TutoringSession } from '../schemas/tutoring-session.schema';
import { BookingSessionService } from './booking-session.service';
import { MentorAvailabilityService } from './mentor-availability.service';
import { NotificationService } from '../../notifications/services';
import { PaymentService } from '../../payment/services';
import { AiQuotaService } from '../../ai/services/ai-quota.service';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const createSortedExecMock = <T>(value: T) => {
  const exec = jest.fn().mockResolvedValue(value);
  return {
    sort: jest.fn().mockReturnValue({ exec }),
  };
};

const buildCreateDto = (tutorProfileId: Types.ObjectId, slotId: Types.ObjectId) => ({
  tutorProfileId: tutorProfileId.toString(),
  availabilitySlotId: slotId.toString(),
  sessionType: SessionType.CAREER_GUIDANCE,
  schedulingDetails: {
    requestedDateTime: new Date(),
    duration: 60,
    timeZone: 'Asia/Ho_Chi_Minh',
    meetingPlatform: 'google_meet',
  },
  bookingRequest: {
    topicsToDiscuss: ['CV'],
    currentSituation: 'Preparing',
    desiredOutcomes: ['Improve CV'],
    isFirstSession: true,
  },
});

const buildTutor = (tutorProfileId: Types.ObjectId, mentorId: Types.ObjectId) => ({
  _id: tutorProfileId,
  userId: mentorId,
  status: TutorStatus.ACTIVE,
  pricing: {
    currency: 'VND',
    sessionRates: [
      { sessionType: SessionType.CAREER_GUIDANCE, duration: 60, pricePerSession: 200000 },
    ],
  },
});

const buildSlot = (slotId: Types.ObjectId, tutorProfileId: Types.ObjectId, mentorId: Types.ObjectId) => {
  const startAt = new Date(Date.now() + 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  return {
    _id: slotId,
    tutorProfileId,
    mentorId,
    startAt,
    endAt,
  };
};

describe('BookingSessionService', () => {
  let service: BookingSessionService;

  const bookingSessionModel = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    _id: new Types.ObjectId(),
    ...data,
    save: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      ...data,
    }),
  })) as jest.Mock & Record<string, jest.Mock>;

  bookingSessionModel.findByIdAndUpdate = jest.fn();
  bookingSessionModel.findById = jest.fn();
  bookingSessionModel.find = jest.fn();
  bookingSessionModel.findOne = jest.fn();

  const tutorProfileModel = {
    findById: jest.fn(),
  };
  const tutoringSessionModel = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    _id: new Types.ObjectId(),
    ...data,
    save: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      ...data,
    }),
  })) as jest.Mock & Record<string, jest.Mock>;
  tutoringSessionModel.findById = jest.fn();
  tutoringSessionModel.findOne = jest.fn();
  tutoringSessionModel.findByIdAndUpdate = jest.fn();
  const mentorAvailabilityService = {
    getAvailableSlotForBooking: jest.fn(),
    holdSlotForBooking: jest.fn(),
    attachBooking: jest.fn(),
    releaseHeldSlot: jest.fn(),
    markBooked: jest.fn(),
    releaseSlotForBooking: jest.fn(),
    reserveSlotForRescheduleProposal: jest.fn(),
    releaseSpecificSlotForBooking: jest.fn(),
  };
  const notificationService = {
    create: jest.fn(),
    createMany: jest.fn(),
  };
  const paymentService = {
    handleMentorBookingCancellation: jest.fn(),
    settleMentorBookingPayment: jest.fn(),
  };
  const aiQuotaService = {
    checkQuota: jest.fn(),
    consumeQuota: jest.fn(),
    refundQuota: jest.fn(),
    getPlanForUserOrFree: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    bookingSessionModel.mockClear();
    tutoringSessionModel.mockClear();
    bookingSessionModel.findOne.mockReturnValue(createSortedExecMock(null));
    tutoringSessionModel.findById.mockReturnValue(createExecMock(null));
    tutoringSessionModel.findOne.mockReturnValue(createExecMock(null));
    tutoringSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock(null));
    paymentService.handleMentorBookingCancellation.mockResolvedValue({ status: 'none' });
    paymentService.settleMentorBookingPayment.mockResolvedValue(null);
    aiQuotaService.checkQuota.mockResolvedValue(undefined);
    aiQuotaService.consumeQuota.mockResolvedValue(undefined);
    aiQuotaService.refundQuota.mockResolvedValue(undefined);
    aiQuotaService.getPlanForUserOrFree.mockResolvedValue({ _id: new Types.ObjectId() });
    mentorAvailabilityService.getAvailableSlotForBooking.mockImplementation(
      (slotId: string, tutorProfileId: string) => Promise.resolve(
        buildSlot(new Types.ObjectId(slotId), new Types.ObjectId(tutorProfileId), new Types.ObjectId()),
      ),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingSessionService,
        { provide: getModelToken(BookingSession.name), useValue: bookingSessionModel },
        { provide: getModelToken(TutorProfile.name), useValue: tutorProfileModel },
        { provide: getModelToken(TutoringSession.name), useValue: tutoringSessionModel },
        { provide: MentorAvailabilityService, useValue: mentorAvailabilityService },
        { provide: NotificationService, useValue: notificationService },
        { provide: PaymentService, useValue: paymentService },
        { provide: AiQuotaService, useValue: aiQuotaService },
      ],
    }).compile();

    service = module.get(BookingSessionService);
  });

  it('creates paid mentor bookings in awaiting payment state', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    tutorProfileModel.findById.mockReturnValue(
      createExecMock({
        _id: tutorProfileId,
        userId: mentorId,
        status: TutorStatus.ACTIVE,
        pricing: {
          currency: 'VND',
          sessionRates: [
            { sessionType: SessionType.CAREER_GUIDANCE, duration: 60, pricePerSession: 200000 },
          ],
        },
      }),
    );
    mentorAvailabilityService.holdSlotForBooking.mockResolvedValue({
      _id: slotId,
      tutorProfileId,
      mentorId,
      startAt,
      endAt,
    });

    await service.createForMentee(menteeId.toString(), {
      tutorProfileId: tutorProfileId.toString(),
      availabilitySlotId: slotId.toString(),
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: new Date(),
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'google_meet',
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
        currentSituation: 'Preparing',
        desiredOutcomes: ['Improve CV'],
        isFirstSession: true,
      },
    });

    expect(bookingSessionModel).toHaveBeenCalledWith(
      expect.objectContaining({
        mentorId: expect.any(Types.ObjectId),
        status: BookingStatus.AWAITING_PAYMENT,
        availabilitySlotId: slotId,
        paymentInfo: expect.objectContaining({
          sessionPrice: 200000,
          currency: 'VND',
          paymentStatus: 'pending',
        }),
      }),
    );
    const createdPayload = bookingSessionModel.mock.calls[0][0];
    expect(createdPayload.mentorId.toString()).toBe(mentorId.toString());
    expect(mentorAvailabilityService.getAvailableSlotForBooking).toHaveBeenCalledWith(
      slotId.toString(),
      tutorProfileId.toString(),
    );
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.attachBooking).not.toHaveBeenCalled();
  });

  it('creates trial mentor bookings as free pending intro calls without consuming quota', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const sourcePlanId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const trialEndAt = new Date(startAt.getTime() + 15 * 60 * 1000);

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    aiQuotaService.getPlanForUserOrFree.mockResolvedValue({ _id: sourcePlanId });
    const menteeAvailabilityWindows = [
      {
        startAt: startAt.toISOString(),
        endAt: trialEndAt.toISOString(),
      },
    ];
    const createDto = {
      tutorProfileId: tutorProfileId.toString(),
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: startAt,
        duration: 15,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
        currentSituation: 'Preparing',
        desiredOutcomes: ['Improve CV'],
        menteeAvailabilityWindows,
        isFirstSession: true,
      },
    };

    await service.createForMentee(menteeId.toString(), {
      ...createDto,
      bookingType: BookingType.TRIAL,
    });

    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(menteeId.toString(), 'mentor_booking');
    expect(aiQuotaService.consumeQuota).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.getAvailableSlotForBooking).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingType: BookingType.TRIAL,
        status: BookingStatus.PENDING,
        schedulingDetails: expect.objectContaining({
          requestedDateTime: startAt,
          duration: 15,
          timeZone: 'Asia/Ho_Chi_Minh',
        }),
        paymentInfo: expect.objectContaining({
          sessionPrice: 0,
          paymentMethod: 'free_session',
          paymentStatus: 'free',
        }),
        trialInfo: expect.objectContaining({
          durationMinutes: 15,
          sourcePlanId,
        }),
        bookingRequest: expect.objectContaining({
          menteeAvailabilityWindows,
        }),
      }),
    );
    const createdPayload = bookingSessionModel.mock.calls[0][0];
    expect(createdPayload.availabilitySlotId).toBeUndefined();
  });

  it('derives trial booking ownership from the authenticated mentee and selected mentor profile', async () => {
    const menteeId = new Types.ObjectId();
    const maliciousMenteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const maliciousMentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const sourcePlanId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 60 * 60 * 1000);

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    aiQuotaService.getPlanForUserOrFree.mockResolvedValue({ _id: sourcePlanId });

    await service.createForMentee(menteeId.toString(), {
      tutorProfileId: tutorProfileId.toString(),
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: startAt,
        duration: 15,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
        currentSituation: 'Preparing',
        desiredOutcomes: ['Improve CV'],
        isFirstSession: true,
      },
      bookingType: BookingType.TRIAL,
      menteeId: maliciousMenteeId.toString(),
      mentorId: maliciousMentorId.toString(),
      status: BookingStatus.CONFIRMED,
      paymentInfo: {
        sessionPrice: 999999,
        currency: 'USD',
        paymentMethod: 'bank_transfer',
        paymentStatus: 'paid',
      },
      trialInfo: {
        durationMinutes: 999,
        quotaConsumedAt: new Date(),
      },
    });

    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(menteeId.toString(), 'mentor_booking');
    expect(mentorAvailabilityService.getAvailableSlotForBooking).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();

    const createdPayload = bookingSessionModel.mock.calls[0][0];
    expect(createdPayload.menteeId.toString()).toBe(menteeId.toString());
    expect(createdPayload.mentorId.toString()).toBe(mentorId.toString());
    expect(createdPayload.tutorProfileId.toString()).toBe(tutorProfileId.toString());
    expect(createdPayload.availabilitySlotId).toBeUndefined();
    expect(createdPayload.status).toBe(BookingStatus.PENDING);
    expect(createdPayload.paymentInfo).toEqual(
      expect.objectContaining({
        sessionPrice: 0,
        paymentMethod: 'free_session',
        paymentStatus: 'free',
      }),
    );
    expect(createdPayload.trialInfo).toEqual(
      expect.objectContaining({
        durationMinutes: 15,
        sourcePlanId,
      }),
    );
    expect(createdPayload.trialInfo).not.toHaveProperty('quotaConsumedAt');
  });

  it('rejects a trial requested time in the past', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const pastStartAt = new Date(Date.now() - 60 * 60 * 1000);
    const createDto = {
      tutorProfileId: tutorProfileId.toString(),
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: pastStartAt,
        duration: 15,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
        currentSituation: 'Preparing',
        desiredOutcomes: ['Improve CV'],
        isFirstSession: true,
      },
      bookingType: BookingType.TRIAL,
    };

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));

    await expect(service.createForMentee(menteeId.toString(), createDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(mentorAvailabilityService.getAvailableSlotForBooking).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).not.toHaveBeenCalled();
  });

  it('rejects a trial requested time that does not fit the mentee availability windows', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const trialStartAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const createDto = {
      tutorProfileId: tutorProfileId.toString(),
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: trialStartAt,
        duration: 15,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
        currentSituation: 'Preparing',
        desiredOutcomes: ['Improve CV'],
        menteeAvailabilityWindows: [
          {
            startAt: startAt.toISOString(),
            endAt: new Date(startAt.getTime() + 10 * 60 * 1000).toISOString(),
          },
        ],
        isFirstSession: true,
      },
      bookingType: BookingType.TRIAL,
    };

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));

    await expect(service.createForMentee(menteeId.toString(), createDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(mentorAvailabilityService.getAvailableSlotForBooking).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).not.toHaveBeenCalled();
  });

  it('reuses an existing awaiting payment booking for the same mentee and slot', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const existingBooking = {
      _id: new Types.ObjectId(),
      menteeId,
      availabilitySlotId: slotId,
      status: BookingStatus.AWAITING_PAYMENT,
    } as unknown as BookingSession;

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    bookingSessionModel.findOne.mockReturnValue(createSortedExecMock(existingBooking));

    await expect(
      service.createForMentee(menteeId.toString(), buildCreateDto(tutorProfileId, slotId)),
    ).resolves.toBe(existingBooking);

    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).not.toHaveBeenCalled();
  });

  it('allows another mentee to create a checkout while the slot only has an awaiting payment booking', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const slotId = new Types.ObjectId();

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    bookingSessionModel.findOne
      .mockReturnValueOnce(createSortedExecMock(null))
      .mockReturnValueOnce(createSortedExecMock(null));

    await service.createForMentee(menteeId.toString(), buildCreateDto(tutorProfileId, slotId));

    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).toHaveBeenCalled();
  });

  it('rejects an active paid or confirmed booking for the same slot from another mentee', async () => {
    const menteeId = new Types.ObjectId();
    const otherMenteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const existingBooking = {
      _id: new Types.ObjectId(),
      menteeId: otherMenteeId,
      availabilitySlotId: slotId,
      status: BookingStatus.PENDING,
    } as unknown as BookingSession;

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    bookingSessionModel.findOne.mockReturnValue(createSortedExecMock(existingBooking));

    await expect(
      service.createForMentee(menteeId.toString(), buildCreateDto(tutorProfileId, slotId)),
    ).rejects.toThrow(ConflictException);

    expect(mentorAvailabilityService.getAvailableSlotForBooking).not.toHaveBeenCalled();
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).not.toHaveBeenCalled();
  });

  it('converts duplicate availability slot insert errors into booking reuse', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const slot = buildSlot(slotId, tutorProfileId, mentorId);
    const existingBooking = {
      _id: new Types.ObjectId(),
      menteeId,
      availabilitySlotId: slotId,
      status: BookingStatus.AWAITING_PAYMENT,
    } as unknown as BookingSession;
    const duplicateError = {
      code: 11000,
      keyPattern: { availabilitySlotId: 1 },
      keyValue: { availabilitySlotId: slotId },
    };

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    bookingSessionModel.findOne
      .mockReturnValueOnce(createSortedExecMock(null))
      .mockReturnValueOnce(createSortedExecMock(null))
      .mockReturnValueOnce(createSortedExecMock(null))
      .mockReturnValueOnce(createSortedExecMock(existingBooking));
    mentorAvailabilityService.holdSlotForBooking.mockResolvedValue(slot);
    bookingSessionModel.mockImplementationOnce((data: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...data,
      save: jest.fn().mockRejectedValue(duplicateError),
    }));

    await expect(
      service.createForMentee(menteeId.toString(), buildCreateDto(tutorProfileId, slotId)),
    ).resolves.toBe(existingBooking);

    expect(mentorAvailabilityService.releaseHeldSlot).not.toHaveBeenCalled();
  });

  it('does not treat cancelled bookings as active slot blockers', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const slot = buildSlot(slotId, tutorProfileId, mentorId);
    const cancelledBooking = {
      _id: new Types.ObjectId(),
      menteeId: new Types.ObjectId(),
      availabilitySlotId: slotId,
      status: BookingStatus.CANCELLED_BY_MENTEE,
    } as unknown as BookingSession;

    tutorProfileModel.findById.mockReturnValue(createExecMock(buildTutor(tutorProfileId, mentorId)));
    bookingSessionModel.findOne
      .mockReturnValueOnce(createSortedExecMock(cancelledBooking))
      .mockReturnValueOnce(createSortedExecMock(null));
    mentorAvailabilityService.holdSlotForBooking.mockResolvedValue(slot);

    await service.createForMentee(menteeId.toString(), buildCreateDto(tutorProfileId, slotId));

    const query = bookingSessionModel.findOne.mock.calls[0][0];
    expect(query.status.$in).not.toContain(BookingStatus.AWAITING_PAYMENT);
    expect(query.status.$in).not.toContain(BookingStatus.CANCELLED_BY_MENTEE);
    expect(mentorAvailabilityService.getAvailableSlotForBooking).toHaveBeenCalledWith(
      slotId.toString(),
      tutorProfileId.toString(),
    );
    expect(mentorAvailabilityService.holdSlotForBooking).not.toHaveBeenCalled();
    expect(bookingSessionModel).toHaveBeenCalled();
  });

  it('finds mentor bookings stored with ObjectId or legacy string mentorId', async () => {
    const mentorId = new Types.ObjectId().toString();
    const bookings = [{ _id: new Types.ObjectId(), mentorId }] as unknown as BookingSession[];
    const exec = jest.fn().mockResolvedValue(bookings);
    const sort = jest.fn().mockReturnValue({ exec });
    bookingSessionModel.find
      .mockReturnValueOnce(createExecMock([]))
      .mockReturnValueOnce({ sort });

    await expect(service.findByMentor(mentorId)).resolves.toBe(bookings);

    const query = bookingSessionModel.find.mock.calls[1][0];
    expect(query.$or[0].mentorId).toBeInstanceOf(Types.ObjectId);
    expect(query.$or[0].mentorId.toString()).toBe(mentorId);
    expect(query.$or[1]).toEqual({ $expr: { $eq: ['$mentorId', mentorId] } });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(exec).toHaveBeenCalled();
  });

  it('creates a reschedule proposal and appends a thread message', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const newSlotId = new Types.ObjectId();
    const newDateTime = new Date(Date.now() + 72 * 60 * 60_000);
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      status: BookingStatus.CONFIRMED,
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: new Date(Date.now() + 48 * 60 * 60_000),
        confirmedDateTime: new Date(Date.now() + 48 * 60 * 60_000),
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      bookingRequest: {
        topicsToDiscuss: ['CV'],
      },
      rescheduleProposals: [],
      communicationThread: [],
    } as unknown as BookingSession;
    const updated = { ...booking, rescheduleProposals: [{ id: 'proposal-1' }] };
    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    bookingSessionModel.find.mockReturnValue(createExecMock([]));
    bookingSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock(updated));

    await expect(
      service.createRescheduleProposal(
        bookingId.toString(),
        { userId: mentorId.toString(), role: 'mentor' },
        {
          newDateTime: newDateTime.toISOString(),
          duration: 60,
          availabilitySlotId: newSlotId.toString(),
          reason: 'Need another slot',
        },
      ),
    ).resolves.toBe(updated);

    expect(mentorAvailabilityService.reserveSlotForRescheduleProposal).toHaveBeenCalledWith(
      newSlotId.toString(),
      bookingId.toString(),
      mentorId.toString(),
      expect.any(Date),
      60,
      mentorId.toString(),
    );
    expect(bookingSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
      bookingId.toString(),
      expect.objectContaining({
        $push: expect.objectContaining({
          rescheduleProposals: expect.objectContaining({
            availabilitySlotId: newSlotId,
            proposedByRole: 'mentor',
            status: 'pending',
          }),
          communicationThread: expect.objectContaining({
            messageType: 'reschedule_proposal',
          }),
        }),
      }),
      { new: true },
    );
    expect(notificationService.createMany).toHaveBeenCalled();
  });

  it('moves the booking to a reserved proposal slot when accepted', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const oldSlotId = new Types.ObjectId();
    const newSlotId = new Types.ObjectId();
    const newDateTime = new Date(Date.now() + 72 * 60 * 60_000);
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      availabilitySlotId: oldSlotId,
      status: BookingStatus.CONFIRMED,
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: new Date(Date.now() + 48 * 60 * 60_000),
        confirmedDateTime: new Date(Date.now() + 48 * 60 * 60_000),
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      bookingRequest: { topicsToDiscuss: ['CV'] },
      rescheduleProposals: [{
        id: 'proposal-1',
        proposedBy: mentorId,
        proposedByRole: 'mentor',
        status: 'pending',
        availabilitySlotId: newSlotId,
        newDateTime,
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
      }],
      communicationThread: [],
    } as unknown as BookingSession;
    const updated = {
      ...booking,
      availabilitySlotId: newSlotId,
      status: BookingStatus.RESCHEDULED,
      schedulingDetails: {
        ...booking.schedulingDetails,
        requestedDateTime: newDateTime,
        confirmedDateTime: newDateTime,
      },
    } as unknown as BookingSession;
    const bookingWithSession = {
      ...updated,
      tutoringSessionId: new Types.ObjectId(),
    } as unknown as BookingSession;

    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    bookingSessionModel.find.mockReturnValue(createExecMock([]));
    bookingSessionModel.findByIdAndUpdate
      .mockReturnValueOnce(createExecMock(updated))
      .mockReturnValueOnce(createExecMock(bookingWithSession));

    await expect(
      service.acceptRescheduleProposal(
        bookingId.toString(),
        'proposal-1',
        { userId: menteeId.toString(), role: 'user' },
      ),
    ).resolves.toBe(bookingWithSession);

    expect(mentorAvailabilityService.markBooked).toHaveBeenCalledWith(newSlotId.toString(), bookingId.toString());
    expect(mentorAvailabilityService.releaseSpecificSlotForBooking).toHaveBeenCalledWith(
      oldSlotId.toString(),
      bookingId.toString(),
    );
  });

  it('releases a reserved proposal slot when declined', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const newSlotId = new Types.ObjectId();
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      status: BookingStatus.CONFIRMED,
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: new Date(Date.now() + 48 * 60 * 60_000),
        confirmedDateTime: new Date(Date.now() + 48 * 60 * 60_000),
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      bookingRequest: { topicsToDiscuss: ['CV'] },
      rescheduleProposals: [{
        id: 'proposal-1',
        proposedBy: mentorId,
        proposedByRole: 'mentor',
        status: 'pending',
        availabilitySlotId: newSlotId,
        newDateTime: new Date(Date.now() + 72 * 60 * 60_000),
        duration: 60,
      }],
      communicationThread: [],
    } as unknown as BookingSession;
    const updated = {
      ...booking,
      rescheduleProposals: [{ ...booking.rescheduleProposals?.[0], status: 'declined' }],
    } as unknown as BookingSession;

    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    bookingSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock(updated));

    await expect(
      service.declineRescheduleProposal(
        bookingId.toString(),
        'proposal-1',
        { userId: menteeId.toString(), role: 'user' },
        'Cannot join',
      ),
    ).resolves.toBe(updated);

    expect(mentorAvailabilityService.releaseHeldSlot).toHaveBeenCalledWith(newSlotId.toString());
  });

  it('creates a tutoring session when a mentor confirms a booking', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const tutoringSessionId = new Types.ObjectId();
    const confirmedAt = new Date(Date.now() + 24 * 60 * 60_000);
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      status: BookingStatus.PENDING,
      sessionType: SessionType.CAREER_GUIDANCE,
      availabilitySlotId: new Types.ObjectId(),
      schedulingDetails: {
        requestedDateTime: confirmedAt,
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: { topicsToDiscuss: ['CV'] },
    } as unknown as BookingSession;
    const confirmedBooking = {
      ...booking,
      status: BookingStatus.CONFIRMED,
      schedulingDetails: {
        ...booking.schedulingDetails,
        confirmedDateTime: confirmedAt,
        meetingCode: 'EDU-MT-ABC123',
        meetingLink: '/mentor-call/EDU-MT-ABC123',
      },
    } as unknown as BookingSession;
    const bookingWithSession = {
      ...confirmedBooking,
      tutoringSessionId,
    } as unknown as BookingSession;

    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    bookingSessionModel.find.mockReturnValue(createExecMock([]));
    bookingSessionModel.findByIdAndUpdate
      .mockReturnValueOnce(createExecMock(confirmedBooking))
      .mockReturnValueOnce(createExecMock(bookingWithSession));
    tutoringSessionModel.mockImplementationOnce((data: Record<string, unknown>) => ({
      _id: tutoringSessionId,
      ...data,
      save: jest.fn().mockResolvedValue({ _id: tutoringSessionId, ...data }),
    }));

    await expect(
      service.confirmBooking(bookingId.toString(), { userId: mentorId.toString(), role: 'mentor' }),
    ).resolves.toBe(bookingWithSession);

    expect(tutoringSessionModel).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingSessionId: bookingId,
        menteeId,
        mentorId,
      }),
    );
    expect(bookingSessionModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      bookingId,
      { tutoringSessionId },
      { new: true },
    );
  });

  it('consumes trial quota when a mentor confirms a trial booking', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const tutoringSessionId = new Types.ObjectId();
    const confirmedAt = new Date(Date.now() + 24 * 60 * 60_000);
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      bookingType: BookingType.TRIAL,
      trialInfo: { durationMinutes: 15 },
      status: BookingStatus.PENDING,
      sessionType: SessionType.CAREER_GUIDANCE,
      availabilitySlotId: new Types.ObjectId(),
      schedulingDetails: {
        requestedDateTime: confirmedAt,
        duration: 15,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: { topicsToDiscuss: ['Intro'] },
    } as unknown as BookingSession;
    const confirmedBooking = {
      ...booking,
      status: BookingStatus.CONFIRMED,
      schedulingDetails: {
        ...booking.schedulingDetails,
        confirmedDateTime: confirmedAt,
      },
    } as unknown as BookingSession;
    const bookingWithSession = {
      ...confirmedBooking,
      tutoringSessionId,
    } as unknown as BookingSession;
    const bookingWithQuota = {
      ...bookingWithSession,
      trialInfo: {
        durationMinutes: 15,
        quotaConsumedAt: new Date(),
      },
    } as unknown as BookingSession;

    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    bookingSessionModel.find.mockReturnValue(createExecMock([]));
    bookingSessionModel.findByIdAndUpdate
      .mockReturnValueOnce(createExecMock(confirmedBooking))
      .mockReturnValueOnce(createExecMock(bookingWithSession))
      .mockReturnValueOnce(createExecMock(bookingWithQuota));
    tutoringSessionModel.mockImplementationOnce((data: Record<string, unknown>) => ({
      _id: tutoringSessionId,
      ...data,
      save: jest.fn().mockResolvedValue({ _id: tutoringSessionId, ...data }),
    }));

    await expect(
      service.confirmBooking(bookingId.toString(), { userId: mentorId.toString(), role: 'mentor' }),
    ).resolves.toBe(bookingWithQuota);

    expect(aiQuotaService.checkQuota).toHaveBeenCalledWith(menteeId.toString(), 'mentor_booking');
    expect(aiQuotaService.consumeQuota).toHaveBeenCalledWith(
      menteeId.toString(),
      'mentor_booking',
      { requestCount: 1, tokensUsed: 0 },
    );
    expect(bookingSessionModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      bookingId.toString(),
      expect.objectContaining({ 'trialInfo.quotaConsumedAt': expect.any(Date) }),
      { new: true },
    );
  });

  it('refunds consumed trial quota when the mentor cancels before the trial starts', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const quotaConsumedAt = new Date();
    const startAt = new Date(Date.now() + 24 * 60 * 60_000);
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      bookingType: BookingType.TRIAL,
      trialInfo: { durationMinutes: 15, quotaConsumedAt },
      status: BookingStatus.CONFIRMED,
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: startAt,
        confirmedDateTime: startAt,
        duration: 15,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      bookingRequest: { topicsToDiscuss: ['Intro'] },
    } as unknown as BookingSession;
    const cancelledBooking = {
      ...booking,
      status: BookingStatus.CANCELLED_BY_MENTOR,
    } as unknown as BookingSession;
    const refundedBooking = {
      ...cancelledBooking,
      trialInfo: { ...booking.trialInfo, quotaRefundedAt: new Date() },
    } as unknown as BookingSession;

    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    bookingSessionModel.findByIdAndUpdate
      .mockReturnValueOnce(createExecMock(cancelledBooking))
      .mockReturnValueOnce(createExecMock(refundedBooking));

    await expect(
      service.cancelBooking(bookingId.toString(), { userId: mentorId.toString(), role: 'mentor' }),
    ).resolves.toBe(refundedBooking);

    expect(aiQuotaService.refundQuota).toHaveBeenCalledWith(
      menteeId.toString(),
      'mentor_booking',
      { requestCount: 1, tokensUsed: 0 },
      quotaConsumedAt,
    );
    expect(paymentService.handleMentorBookingCancellation).not.toHaveBeenCalled();
  });

  it('completes a confirmed booking and its tutoring session', async () => {
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const tutoringSessionId = new Types.ObjectId();
    const startAt = new Date(Date.now() - 30 * 60_000);
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      tutoringSessionId,
      status: BookingStatus.CONFIRMED,
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: startAt,
        confirmedDateTime: startAt,
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: { topicsToDiscuss: ['CV'] },
    } as unknown as BookingSession;
    const tutoringSession = {
      _id: tutoringSessionId,
      bookingSessionId: bookingId,
      menteeId,
      mentorId,
      status: 'scheduled',
      sessionDetails: {
        scheduledStartTime: startAt,
        scheduledEndTime: new Date(startAt.getTime() + 60 * 60_000),
      },
    };
    const completedBooking = { ...booking, status: BookingStatus.COMPLETED } as unknown as BookingSession;

    bookingSessionModel.findById.mockReturnValue(createExecMock(booking));
    tutoringSessionModel.findById.mockReturnValue(createExecMock(tutoringSession));
    tutoringSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock({ ...tutoringSession, status: 'completed' }));
    bookingSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock(completedBooking));

    await expect(
      service.completeBooking(bookingId.toString(), { userId: menteeId.toString(), role: 'user' }),
    ).resolves.toBe(completedBooking);

    expect(tutoringSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
      tutoringSessionId,
      expect.objectContaining({ status: 'completed' }),
      { new: true },
    );
    expect(bookingSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
      bookingId,
      expect.objectContaining({ status: BookingStatus.COMPLETED, tutoringSessionId }),
      { new: true },
    );
    expect(paymentService.settleMentorBookingPayment).toHaveBeenCalledWith(bookingId);
    expect(notificationService.createMany).toHaveBeenCalled();
  });

  it('auto-completes overdue confirmed bookings idempotently', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-17T12:00:00.000Z'));
    const menteeId = new Types.ObjectId();
    const mentorId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const tutoringSessionId = new Types.ObjectId();
    const startAt = new Date('2026-05-17T09:00:00.000Z');
    const booking = {
      _id: bookingId,
      menteeId,
      mentorId,
      tutoringSessionId,
      status: BookingStatus.CONFIRMED,
      sessionType: SessionType.CAREER_GUIDANCE,
      schedulingDetails: {
        requestedDateTime: startAt,
        confirmedDateTime: startAt,
        duration: 60,
        timeZone: 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: { topicsToDiscuss: ['CV'] },
    } as unknown as BookingSession;

    bookingSessionModel.find.mockReturnValue(createExecMock([booking]));
    tutoringSessionModel.findById.mockReturnValue(createExecMock({
      _id: tutoringSessionId,
      bookingSessionId: bookingId,
      menteeId,
      mentorId,
      status: 'scheduled',
      sessionDetails: { scheduledStartTime: startAt },
    }));
    tutoringSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock({}));
    bookingSessionModel.findByIdAndUpdate.mockReturnValue(createExecMock({
      ...booking,
      status: BookingStatus.COMPLETED,
    }));

    await expect(service.sweepOverdueCompletedBookings()).resolves.toBe(1);
    await expect(service.completeOverdueBookingIfNeeded({
      ...booking,
      status: BookingStatus.COMPLETED,
    } as any)).resolves.toMatchObject({ status: BookingStatus.COMPLETED });

    expect(bookingSessionModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
