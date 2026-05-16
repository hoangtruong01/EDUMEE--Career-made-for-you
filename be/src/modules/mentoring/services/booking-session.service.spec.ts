import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BookingSession, BookingStatus, SessionType } from '../schemas/booking-session.schema';
import { TutorProfile, TutorStatus } from '../schemas/tutor-profile.schema';
import { BookingSessionService } from './booking-session.service';
import { MentorAvailabilityService } from './mentor-availability.service';
import { NotificationService } from '../../notifications/services';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

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

  const tutorProfileModel = {
    findById: jest.fn(),
  };
  const mentorAvailabilityService = {
    holdSlotForBooking: jest.fn(),
    attachBooking: jest.fn(),
    releaseHeldSlot: jest.fn(),
    markBooked: jest.fn(),
    releaseSlotForBooking: jest.fn(),
  };
  const notificationService = {
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    bookingSessionModel.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingSessionService,
        { provide: getModelToken(BookingSession.name), useValue: bookingSessionModel },
        { provide: getModelToken(TutorProfile.name), useValue: tutorProfileModel },
        { provide: MentorAvailabilityService, useValue: mentorAvailabilityService },
        { provide: NotificationService, useValue: notificationService },
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
        status: BookingStatus.AWAITING_PAYMENT,
        availabilitySlotId: slotId,
        paymentInfo: expect.objectContaining({
          sessionPrice: 200000,
          currency: 'VND',
          paymentStatus: 'pending',
        }),
      }),
    );
  });
});
