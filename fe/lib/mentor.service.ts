import { API_BASE_URL, apiClient } from '@/lib/api-client';

export type TutorStatus = 'pending_approval' | 'active' | 'inactive' | 'suspended' | 'rejected';
export type TutorLevel = 'junior_mentor' | 'senior_mentor' | 'expert_mentor' | 'master_mentor';
export type ExperienceLevel =
  | 'intern'
  | 'entry_level'
  | 'junior'
  | 'mid_level'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'director'
  | 'executive';
export type MentorSessionType =
  | 'career_guidance'
  | 'skill_coaching'
  | 'interview_preparation'
  | 'project_review'
  | 'general_mentoring';
export type MentorCommunicationMethod = 'video' | 'voice' | 'chat' | 'screen_sharing';
export type MentorSkillCategory = 'technical' | 'soft' | 'leadership' | 'industry_specific';
export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
export type BookingStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_mentee'
  | 'cancelled_by_mentor'
  | 'rescheduled'
  | 'completed'
  | 'no_show_mentee'
  | 'no_show_mentor';
export type MentorAvailabilitySlotStatus = 'available' | 'held' | 'booked' | 'blocked';

export interface TutorProfile {
  id: string;
  userId: string;
  status: TutorStatus;
  tutorLevel: TutorLevel;
  professionalBackground: {
    currentPosition?: string;
    company?: string;
    yearsOfExperience?: number;
    industries?: string[];
    seniority?: ExperienceLevel;
  };
  mentoringExpertise: {
    careerExpertise?: {
      careerId?: string;
      careerTitle: string;
      experienceLevel?: ExperienceLevel;
      yearsInField?: number;
      confidenceLevel?: number;
    }[];
    skillExpertise?: {
      skillName: string;
      skillCategory?: MentorSkillCategory;
      proficiencyLevel?: number;
      teachingExperience?: number;
    }[];
    specializations?: string[];
    targetMenteeLevels?: ExperienceLevel[];
  };
  availability: {
    timeZone?: string;
    weeklyAvailability?: {
      day: WeekDay;
      timeSlots: { startTime: string; endTime: string; available: boolean }[];
    }[];
    sessionPreferences?: {
      preferredDuration?: number[];
      sessionTypes?: MentorSessionType[];
      communicationMethods?: MentorCommunicationMethod[];
    };
  };
  pricing?: {
    currency?: string;
    sessionRates?: { sessionType: MentorSessionType; duration: number; pricePerSession: number }[];
    freeSessionOffered?: boolean;
  };
  performanceMetrics?: {
    totalSessions?: number;
    ratings?: {
      averageRating?: number;
      totalReviews?: number;
    };
  };
  adminInfo?: {
    rejectionReason?: string;
    approvalDate?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingSession {
  id: string;
  menteeId: string;
  mentorId: string;
  tutorProfileId: string;
  availabilitySlotId: string;
  sessionType: string;
  status: BookingStatus;
  schedulingDetails: {
    requestedDateTime: string;
    confirmedDateTime?: string;
    duration: number;
    timeZone: string;
    meetingPlatform: string;
    meetingLink?: string;
  };
  bookingRequest: {
    topicsToDiscuss: string[];
    specificQuestions?: string[];
    currentSituation: string;
    desiredOutcomes: string[];
    additionalNotes?: string;
    isFirstSession: boolean;
    urgencyLevel?: 'low' | 'medium' | 'high';
  };
  mentorResponse?: {
    responseDate?: string;
    accepted?: boolean;
    confirmationNotes?: string;
    preparationSuggestions?: string[];
    agendaSuggested?: string[];
    declineReason?: string;
  };
  paymentInfo?: {
    sessionPrice?: number;
    currency?: string;
    paymentStatus?: string;
    transactionId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MentorAvailabilitySlot {
  id: string;
  mentorId: string;
  tutorProfileId: string;
  startAt: string;
  endAt: string;
  status: MentorAvailabilitySlotStatus;
  bookingSessionId?: string;
  heldUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BulkAvailabilitySlotStart {
  dayIndex: number;
  startTime: string;
}

export interface CreateBulkAvailabilityPayload {
  tutorProfileId: string;
  weekStart: string;
  slotStarts: BulkAvailabilitySlotStart[];
  repeatWeeks: number;
}

export interface UpdateAvailabilitySlotPayload {
  startAt?: string;
  endAt?: string;
  status?: MentorAvailabilitySlotStatus;
}

export interface BulkAvailabilityResult {
  created: MentorAvailabilitySlot[];
  skipped: {
    dayIndex: number;
    startTime: string;
    startAt?: string;
    reason: string;
  }[];
}

export interface MentorNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  payload?: {
    bookingId?: string;
    meetingLink?: string;
    status?: string;
    [key: string]: unknown;
  };
  readAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateBookingResponse {
  booking: BookingSession;
  payment: null | {
    paymentId: string;
    checkoutReference: string;
    redirectUrl: string;
  };
}

export interface ApplyTutorProfilePayload {
  professionalBackground: {
    currentPosition: string;
    company: string;
    yearsOfExperience: number;
    industries: string[];
    seniority: ExperienceLevel;
  };
  mentoringExpertise: {
    careerExpertise: {
      careerId: string;
      careerTitle: string;
      experienceLevel: ExperienceLevel;
      yearsInField: number;
      confidenceLevel: number;
    }[];
    skillExpertise: {
      skillName: string;
      skillCategory: MentorSkillCategory;
      proficiencyLevel: number;
      teachingExperience: number;
    }[];
    specializations: string[];
    targetMenteeLevels: ExperienceLevel[];
  };
  availability: {
    timeZone: string;
    weeklyAvailability: {
      day: WeekDay;
      timeSlots: { startTime: string; endTime: string; available: boolean }[];
    }[];
    sessionPreferences: {
      preferredDuration: number[];
      sessionTypes: MentorSessionType[];
      communicationMethods: MentorCommunicationMethod[];
    };
  };
  pricing?: {
    currency: string;
    sessionRates: { sessionType: MentorSessionType; duration: number; pricePerSession: number }[];
    freeSessionOffered: boolean;
  };
  tutorLevel?: TutorLevel;
}

export interface CreateBookingPayload {
  tutorProfileId: string;
  availabilitySlotId: string;
  sessionType: string;
  schedulingDetails?: {
    requestedDateTime: string;
    duration: number;
    timeZone: string;
    meetingPlatform: string;
  };
  bookingRequest: BookingSession['bookingRequest'];
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const mentorService = {
  getActiveMentors(token: string) {
    return apiClient.get<TutorProfile[]>('/tutor-profiles/active', token);
  },

  searchMentors(token: string, expertise: string) {
    return apiClient.get<TutorProfile[]>(`/tutor-profiles/search${buildQuery({ expertise })}`, token);
  },

  applyTutorProfile(token: string, payload: ApplyTutorProfilePayload) {
    return apiClient.post<TutorProfile>('/tutor-profiles', payload, token);
  },

  getMyTutorProfile(token: string) {
    return apiClient.get<TutorProfile | null>('/tutor-profiles/me', token);
  },

  getAvailableSlots(token: string, mentorId: string) {
    return apiClient.get<MentorAvailabilitySlot[]>(
      `/mentor-availability/mentor/${mentorId}/available`,
      token,
    );
  },

  getMyAvailabilitySlots(token: string) {
    return apiClient.get<MentorAvailabilitySlot[]>('/mentor-availability/me', token);
  },

  createAvailabilitySlot(
    token: string,
    payload: { tutorProfileId: string; startAt: string; endAt: string; status?: MentorAvailabilitySlotStatus },
  ) {
    return apiClient.post<MentorAvailabilitySlot>('/mentor-availability/slots', payload, token);
  },

  deleteAvailabilitySlot(token: string, id: string) {
    return apiClient.delete<MentorAvailabilitySlot>(`/mentor-availability/slots/${id}`, token);
  },

  updateAvailabilitySlot(token: string, id: string, payload: UpdateAvailabilitySlotPayload) {
    return apiClient.patch<MentorAvailabilitySlot>(`/mentor-availability/slots/${id}`, payload, token);
  },

  createBulkAvailabilitySlots(token: string, payload: CreateBulkAvailabilityPayload) {
    return apiClient.post<BulkAvailabilityResult>('/mentor-availability/slots/bulk', payload, token);
  },

  createBooking(token: string, payload: CreateBookingPayload) {
    return apiClient.post<CreateBookingResponse>('/booking-sessions', payload, token);
  },

  getMyBookings(token: string) {
    return apiClient.get<{ asMentee: BookingSession[]; asMentor: BookingSession[] }>(
      '/booking-sessions/my',
      token,
    );
  },

  confirmBooking(token: string, id: string, confirmedDateTime?: string) {
    return apiClient.post<BookingSession>(`/booking-sessions/${id}/confirm`, { confirmedDateTime }, token);
  },

  cancelBooking(token: string, id: string, reason?: string) {
    return apiClient.post<BookingSession>(`/booking-sessions/${id}/cancel`, { reason }, token);
  },
};

export const notificationService = {
  getNotifications(token: string) {
    return apiClient.get<MentorNotification[]>('/notifications', token);
  },

  markRead(token: string, id: string) {
    return apiClient.patch<MentorNotification>(`/notifications/${id}/read`, undefined, token);
  },

  markAllRead(token: string) {
    return apiClient.patch<{ modifiedCount: number }>('/notifications/read-all', undefined, token);
  },

  subscribe(
    token: string,
    onNotification: (notification: MentorNotification) => void,
    onStatusChange?: (status: 'connecting' | 'live' | 'closed') => void,
  ) {
    const source = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
    onStatusChange?.('connecting');

    source.addEventListener('connected', () => {
      onStatusChange?.('live');
    });

    source.addEventListener('notification', (event) => {
      try {
        onNotification(JSON.parse((event as MessageEvent).data) as MentorNotification);
      } catch {
        // Ignore malformed realtime events and let the next fetch reconcile state.
      }
    });

    source.onerror = () => {
      onStatusChange?.('closed');
    };

    return () => source.close();
  },
};

export const adminMentorService = {
  getProfiles(token: string, status?: TutorStatus) {
    return apiClient.get<PaginatedResponse<TutorProfile>>(
      `/tutor-profiles${buildQuery({ page: 1, limit: 50, status })}`,
      token,
    );
  },

  getPendingProfiles(token: string) {
    return apiClient.get<PaginatedResponse<TutorProfile>>(
      `/tutor-profiles${buildQuery({ page: 1, limit: 50, status: 'pending_approval' })}`,
      token,
    );
  },

  updateProfileStatus(token: string, id: string, status: TutorStatus, reason?: string) {
    return apiClient.put<TutorProfile>(`/tutor-profiles/${id}/status`, { status, reason }, token);
  },

  getBookings(token: string, status?: BookingStatus) {
    return apiClient.get<PaginatedResponse<BookingSession>>(
      `/booking-sessions${buildQuery({ page: 1, limit: 50, status })}`,
      token,
    );
  },
};
