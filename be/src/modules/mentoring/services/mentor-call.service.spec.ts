import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { Model, Types } from 'mongoose';
import { BookingSessionDocument, BookingStatus, SessionType } from '../schemas/booking-session.schema';
import { MentorCallService } from './mentor-call.service';

const mockAddGrant = jest.fn();
const mockToJwt = jest.fn();

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn().mockImplementation(() => ({
    addGrant: mockAddGrant,
    toJwt: mockToJwt,
  })),
}));

const meetingCode = 'EDU-MT-ABC123';
const bookingId = new Types.ObjectId();
const mentorId = new Types.ObjectId();
const menteeId = new Types.ObjectId();
const startsAt = new Date('2026-05-17T10:00:00.000Z');

const buildBooking = (
  overrides: Partial<BookingSessionDocument> = {},
): BookingSessionDocument =>
  ({
    _id: bookingId,
    mentorId,
    menteeId,
    mentorUser: {
      id: mentorId.toString(),
      name: 'Nguyễn Mentor',
      email: 'mentor@example.com',
    },
    menteeUser: {
      id: menteeId.toString(),
      name: 'Trần Học Viên',
      email: 'mentee@example.com',
    },
    status: BookingStatus.CONFIRMED,
    sessionType: SessionType.CAREER_GUIDANCE,
    schedulingDetails: {
      requestedDateTime: startsAt,
      confirmedDateTime: startsAt,
      duration: 60,
      timeZone: 'Asia/Ho_Chi_Minh',
      meetingPlatform: 'platform_built_in',
      meetingCode,
      meetingLink: `/mentor-call/${meetingCode}`,
    },
    ...overrides,
  }) as unknown as BookingSessionDocument;

describe('MentorCallService', () => {
  let service: MentorCallService;
  let execMock: jest.Mock;
  let model: Pick<Model<BookingSessionDocument>, 'findOne'>;
  let configValues: Record<string, string | number | undefined>;
  let bookingSessionService: { completeOverdueBookingIfNeeded: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-17T09:50:00.000Z'));
    execMock = jest.fn().mockResolvedValue(buildBooking());
    model = {
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
    } as unknown as Pick<Model<BookingSessionDocument>, 'findOne'>;
    configValues = {
      LIVEKIT_URL: 'wss://livekit.example.com',
      LIVEKIT_API_KEY: 'api-key',
      LIVEKIT_API_SECRET: 'api-secret',
      LIVEKIT_TOKEN_TTL_SECONDS: 1800,
    };
    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    bookingSessionService = {
      completeOverdueBookingIfNeeded: jest.fn(async (booking: BookingSessionDocument) => booking),
    };
    service = new MentorCallService(
      model as Model<BookingSessionDocument>,
      configService,
      bookingSessionService as any,
    );
    mockToJwt.mockResolvedValue('signed-livekit-token');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns a call summary for a booking participant', async () => {
    await expect(
      service.getSummary('edu-mt-abc123', { userId: menteeId.toString() }),
    ).resolves.toMatchObject({
      bookingId: bookingId.toString(),
      meetingCode,
      roomName: `mentor-call-${bookingId.toString()}`,
      status: BookingStatus.CONFIRMED,
      userRole: 'mentee',
      livekitConfigured: true,
      joinWindow: {
        canJoin: true,
        reason: null,
      },
    });

    expect(model.findOne).toHaveBeenCalledWith({
      $or: [
        { 'schedulingDetails.meetingCode': meetingCode },
        { 'schedulingDetails.meetingLink': `/mentor-call/${meetingCode}` },
      ],
    });
  });

  it('does not allow admins or other users to inspect a participant call', async () => {
    await expect(
      service.getSummary(meetingCode, { userId: new Types.ObjectId().toString(), role: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for an unknown meeting code', async () => {
    execMock.mockResolvedValueOnce(null);

    await expect(
      service.getSummary(meetingCode, { userId: menteeId.toString() }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects token creation before the booking is confirmed', async () => {
    execMock.mockResolvedValueOnce(buildBooking({ status: BookingStatus.PENDING }));

    await expect(
      service.createJoinToken(meetingCode, { userId: mentorId.toString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects token creation outside the join window', async () => {
    jest.setSystemTime(new Date('2026-05-17T09:40:00.000Z'));

    await expect(
      service.createJoinToken(meetingCode, { userId: mentorId.toString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a clear error when LiveKit is not configured', async () => {
    configValues.LIVEKIT_API_SECRET = undefined;

    await expect(
      service.createJoinToken(meetingCode, { userId: mentorId.toString() }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates a LiveKit token with room join grants', async () => {
    await expect(
      service.createJoinToken(meetingCode, { userId: mentorId.toString() }),
    ).resolves.toMatchObject({
      token: 'signed-livekit-token',
      livekitUrl: 'wss://livekit.example.com',
      roomName: `mentor-call-${bookingId.toString()}`,
    });

    expect(AccessToken).toHaveBeenCalledWith(
      'api-key',
      'api-secret',
      expect.objectContaining({
        identity: mentorId.toString(),
        name: 'Nguyễn Mentor',
        metadata: JSON.stringify({
          userId: mentorId.toString(),
          role: 'mentor',
        }),
        ttl: 1800,
      }),
    );
    expect(mockAddGrant).toHaveBeenCalledWith({
      room: `mentor-call-${bookingId.toString()}`,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });
  });
});
