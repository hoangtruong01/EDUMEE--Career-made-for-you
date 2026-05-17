import { apiClient } from '@/lib/api-client';
import type { BookingStatus } from '@/lib/mentor.service';

export type MentorCallRole = 'mentor' | 'mentee';
export type MentorCallJoinReason = 'not_confirmed' | 'not_open' | 'ended' | null;

export interface MentorCallSummary {
  bookingId: string;
  tutoringSessionId?: string;
  meetingCode: string;
  meetingLink: string;
  roomName: string;
  status: BookingStatus;
  sessionType: string;
  userRole: MentorCallRole;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  joinWindow: {
    opensAt: string;
    closesAt: string;
    canJoin: boolean;
    reason: MentorCallJoinReason;
  };
  livekitConfigured: boolean;
}

export interface MentorCallTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  expiresAt: string;
}

const encodeMeetingCode = (meetingCode: string) => encodeURIComponent(meetingCode.trim());

export const mentorCallService = {
  getSummary(token: string, meetingCode: string) {
    return apiClient.get<MentorCallSummary>(`/mentor-calls/${encodeMeetingCode(meetingCode)}`, token);
  },

  createToken(token: string, meetingCode: string) {
    return apiClient.post<MentorCallTokenResponse>(
      `/mentor-calls/${encodeMeetingCode(meetingCode)}/token`,
      undefined,
      token,
    );
  },
};
