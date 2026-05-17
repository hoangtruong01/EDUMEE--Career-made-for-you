import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { AccessToken } from 'livekit-server-sdk';
import { Model } from 'mongoose';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import {
  BookingSession,
  BookingSessionDocument,
  BookingStatus,
} from '../schemas/booking-session.schema';
import { BookingSessionService } from './booking-session.service';

const JOIN_WINDOW_OPEN_MINUTES = 15;
const JOIN_WINDOW_CLOSE_MINUTES = 30;
const DEFAULT_LIVEKIT_TOKEN_TTL_SECONDS = 60 * 60;

type CallParticipantRole = 'mentor' | 'mentee';
type JoinWindowReason = 'not_confirmed' | 'not_open' | 'ended' | null;

export interface MentorCallJoinWindow {
  opensAt: string;
  closesAt: string;
  canJoin: boolean;
  reason: JoinWindowReason;
}

export interface MentorCallSummary {
  bookingId: string;
  tutoringSessionId?: string;
  meetingCode: string;
  meetingLink: string;
  roomName: string;
  status: BookingStatus;
  sessionType: string;
  userRole: CallParticipantRole;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  joinWindow: MentorCallJoinWindow;
  livekitConfigured: boolean;
}

export interface MentorCallTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  expiresAt: string;
}

@Injectable()
export class MentorCallService {
  constructor(
    @InjectModel(BookingSession.name)
    private readonly bookingSessionModel: Model<BookingSessionDocument>,
    private readonly configService: ConfigService,
    private readonly bookingSessionService: BookingSessionService,
  ) {}

  async getSummary(meetingCode: string, user: AuthUserLike): Promise<MentorCallSummary> {
    const booking = await this.findBookingByMeetingCode(meetingCode);
    const userRole = this.getParticipantRole(booking, user);
    const currentBooking = await this.bookingSessionService.completeOverdueBookingIfNeeded(booking);
    return this.buildSummary(currentBooking, this.normalizeMeetingCode(meetingCode), userRole);
  }

  async createJoinToken(meetingCode: string, user: AuthUserLike): Promise<MentorCallTokenResponse> {
    const booking = await this.findBookingByMeetingCode(meetingCode);
    const userId = this.requireUserId(user);
    const userRole = this.getParticipantRole(booking, user);
    const currentBooking = await this.bookingSessionService.completeOverdueBookingIfNeeded(booking);
    const summary = this.buildSummary(currentBooking, this.normalizeMeetingCode(meetingCode), userRole);

    this.assertJoinable(summary.joinWindow);

    const livekit = this.getLiveKitConfig();
    if (!livekit) {
      throw new ServiceUnavailableException('LiveKit is not configured');
    }

    const expiresAt = new Date(Date.now() + livekit.ttlSeconds * 1000);
    const accessToken = new AccessToken(livekit.apiKey, livekit.apiSecret, {
      identity: userId,
      name: `${userRole}-${userId}`,
      ttl: livekit.ttlSeconds,
    });

    accessToken.addGrant({
      room: summary.roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    return {
      token: await accessToken.toJwt(),
      livekitUrl: livekit.url,
      roomName: summary.roomName,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async findBookingByMeetingCode(meetingCode: string): Promise<BookingSessionDocument> {
    const normalizedCode = this.normalizeMeetingCode(meetingCode);

    const booking = await this.bookingSessionModel
      .findOne({
        $or: [
          { 'schedulingDetails.meetingCode': normalizedCode },
          { 'schedulingDetails.meetingLink': `/mentor-call/${normalizedCode}` },
        ],
      })
      .exec();

    if (!booking) {
      throw new NotFoundException('Mentor call not found');
    }

    return booking;
  }

  private buildSummary(
    booking: BookingSessionDocument,
    meetingCode: string,
    userRole: CallParticipantRole,
  ): MentorCallSummary {
    const startsAt = this.getSessionStart(booking);
    const durationMinutes = Number(booking.schedulingDetails.duration || 0);
    const safeDuration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 0;
    const endsAt = new Date(startsAt.getTime() + safeDuration * 60_000);

    return {
      bookingId: booking._id.toString(),
      tutoringSessionId: booking.tutoringSessionId?.toString(),
      meetingCode,
      meetingLink: booking.schedulingDetails.meetingLink || `/mentor-call/${meetingCode}`,
      roomName: this.getRoomName(booking),
      status: booking.status,
      sessionType: booking.sessionType,
      userRole,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: safeDuration,
      joinWindow: this.getJoinWindow(booking.status, startsAt, endsAt),
      livekitConfigured: this.isLiveKitConfigured(),
    };
  }

  private getJoinWindow(status: BookingStatus, startsAt: Date, endsAt: Date): MentorCallJoinWindow {
    const opensAt = new Date(startsAt.getTime() - JOIN_WINDOW_OPEN_MINUTES * 60_000);
    const closesAt = new Date(endsAt.getTime() + JOIN_WINDOW_CLOSE_MINUTES * 60_000);
    const now = new Date();
    let reason: JoinWindowReason = null;

    if (status === BookingStatus.COMPLETED) {
      reason = 'ended';
    } else if (![BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED].includes(status)) {
      reason = 'not_confirmed';
    } else if (now < opensAt) {
      reason = 'not_open';
    } else if (now > closesAt) {
      reason = 'ended';
    }

    return {
      opensAt: opensAt.toISOString(),
      closesAt: closesAt.toISOString(),
      canJoin: reason === null,
      reason,
    };
  }

  private assertJoinable(joinWindow: MentorCallJoinWindow): void {
    if (joinWindow.canJoin) return;

    if (joinWindow.reason === 'not_open') {
      throw new BadRequestException(`Mentor call opens at ${joinWindow.opensAt}`);
    }

    if (joinWindow.reason === 'ended') {
      throw new BadRequestException('Mentor call has ended');
    }

    throw new BadRequestException('Mentor call is only available after booking is confirmed');
  }

  private getParticipantRole(booking: BookingSessionDocument, user: AuthUserLike): CallParticipantRole {
    const userId = this.requireUserId(user);
    if (booking.mentorId.toString() === userId) return 'mentor';
    if (booking.menteeId.toString() === userId) return 'mentee';
    throw new ForbiddenException('Forbidden');
  }

  private requireUserId(user: AuthUserLike): string {
    const userId = getAuthUserId(user);
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return userId;
  }

  private normalizeMeetingCode(meetingCode: string): string {
    let normalized = '';
    try {
      normalized = decodeURIComponent(meetingCode || '').trim().toUpperCase();
    } catch {
      throw new BadRequestException('Invalid meeting code');
    }

    if (!normalized || normalized.length > 80) {
      throw new BadRequestException('Invalid meeting code');
    }
    return normalized;
  }

  private getSessionStart(booking: BookingSessionDocument): Date {
    const rawStart = booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime;
    const startsAt = new Date(rawStart);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid mentor call schedule');
    }
    return startsAt;
  }

  private getRoomName(booking: BookingSessionDocument): string {
    return `mentor-call-${booking._id.toString()}`;
  }

  private isLiveKitConfigured(): boolean {
    return Boolean(this.getLiveKitConfig());
  }

  private getLiveKitConfig(): { url: string; apiKey: string; apiSecret: string; ttlSeconds: number } | null {
    const url = this.configService.get<string>('LIVEKIT_URL')?.trim();
    const apiKey = this.configService.get<string>('LIVEKIT_API_KEY')?.trim();
    const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET')?.trim();

    if (!url || !apiKey || !apiSecret) return null;

    const configuredTtl = Number(this.configService.get<string | number>('LIVEKIT_TOKEN_TTL_SECONDS'));
    const ttlSeconds =
      Number.isFinite(configuredTtl) && configuredTtl > 0
        ? configuredTtl
        : DEFAULT_LIVEKIT_TOKEN_TTL_SECONDS;

    return { url, apiKey, apiSecret, ttlSeconds };
  }
}
