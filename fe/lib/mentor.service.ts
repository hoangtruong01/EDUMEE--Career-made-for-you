import { apiClient } from '@/lib/api-client';

export type TutorStatus = 'pending_approval' | 'active' | 'inactive' | 'suspended' | 'rejected';
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

export interface TutorProfile {
  id: string;
  userId: string;
  status: TutorStatus;
  tutorLevel: string;
  professionalBackground: {
    currentPosition?: string;
    company?: string;
    yearsOfExperience?: number;
    industries?: string[];
    seniority?: string;
  };
  mentoringExpertise: {
    careerExpertise?: { careerTitle: string; yearsInField?: number; confidenceLevel?: number }[];
    skillExpertise?: { skillName: string; skillCategory?: string; proficiencyLevel?: number }[];
    specializations?: string[];
    targetMenteeLevels?: string[];
  };
  availability: {
    timeZone?: string;
    weeklyAvailability?: {
      day: string;
      timeSlots: { startTime: string; endTime: string; available: boolean }[];
    }[];
    sessionPreferences?: {
      preferredDuration?: number[];
      sessionTypes?: string[];
      communicationMethods?: string[];
    };
  };
  pricing?: {
    currency?: string;
    sessionRates?: { sessionType: string; duration: number; pricePerSession: number }[];
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
  professionalBackground: TutorProfile['professionalBackground'];
  mentoringExpertise: TutorProfile['mentoringExpertise'];
  availability: TutorProfile['availability'];
  pricing?: TutorProfile['pricing'];
  tutorLevel?: string;
}

export interface CreateBookingPayload {
  tutorProfileId: string;
  sessionType: string;
  schedulingDetails: {
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

  getMyTutorProfile(token: string, userId: string) {
    return apiClient.get<TutorProfile | null>(`/tutor-profiles/user/${userId}`, token);
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

  confirmBooking(token: string, id: string, confirmedDateTime: string) {
    return apiClient.post<BookingSession>(`/booking-sessions/${id}/confirm`, { confirmedDateTime }, token);
  },

  cancelBooking(token: string, id: string, reason?: string) {
    return apiClient.post<BookingSession>(`/booking-sessions/${id}/cancel`, { reason }, token);
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
