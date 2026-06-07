import { api, unwrapResponseData } from './api';

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
export type BookingType = 'paid' | 'trial';
export type MentorAvailabilitySlotStatus = 'available' | 'held' | 'booked' | 'blocked';

export interface TutorProfile {
  id: string;
  _id?: string;
  userId: string;
  mentorUser?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
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
  _id?: string;
  tutoringSessionId?: string;
  menteeId: string;
  mentorId: string;
  mentorUser?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  menteeUser?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  tutorProfileId: string;
  availabilitySlotId: string;
  sessionType: string;
  status: BookingStatus;
  bookingType?: BookingType;
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
  trialInfo?: {
    durationMinutes?: number;
    sourcePlanId?: string;
    quotaConsumedAt?: string;
    quotaRefundedAt?: string;
  };
  communicationThread?: {
    messageId: string;
    senderId: string;
    senderType: 'mentee' | 'mentor' | 'system';
    message: string;
    timestamp: string;
    messageType: string;
  }[];
  rescheduleProposals?: {
    id: string;
    proposedBy: string;
    proposedByRole: 'mentee' | 'mentor';
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    availabilitySlotId?: string;
    newDateTime: string;
    duration: number;
    timeZone?: string;
    reason?: string;
    message?: string;
    createdAt?: string;
    respondedAt?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MentorAvailabilitySlot {
  id: string;
  _id?: string;
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

export interface CreateBulkAvailabilityPayload {
  tutorProfileId: string;
  weekStart: string;
  slotStarts: { dayIndex: number; startTime: string }[];
  repeatWeeks: number;
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

export type UpdateTutorProfilePayload = ApplyTutorProfilePayload;

export interface SessionReview {
  id?: string;
  _id?: string;
  tutoringSessionId?: string;
  reviewerId?:
    | string
    | {
        id?: string;
        _id?: string;
        name?: string;
        avatar?: string;
      };
  reviewerType?: 'mentee' | 'mentor' | string;
  reviewedUserId?: string;
  status?: string;
  isAnonymous?: boolean;
  overallRatings?: {
    overallSatisfaction?: number;
    wouldRecommend?: boolean;
    likelyToBookAgain?: boolean;
    communication?: number;
    expertise?: number;
    helpfulness?: number;
    professionalism?: number;
    punctuality?: number;
  };
  writtenFeedback?: {
    comment?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const mentorService = {
  async getMyTutorProfile() {
    const response = await api.get('/tutor-profiles/me');
    return unwrapResponseData<TutorProfile | null>(response);
  },

  async applyTutorProfile(payload: ApplyTutorProfilePayload) {
    const response = await api.post('/tutor-profiles', payload);
    return unwrapResponseData<TutorProfile>(response);
  },

  async updateTutorProfile(profileId: string, payload: UpdateTutorProfilePayload) {
    const response = await api.put(`/tutor-profiles/${profileId}`, payload);
    return unwrapResponseData<TutorProfile>(response);
  },

  async getMyAvailabilitySlots() {
    const response = await api.get('/mentor-availability/me');
    return unwrapResponseData<MentorAvailabilitySlot[]>(response);
  },

  async createAvailabilitySlot(payload: {
    tutorProfileId: string;
    startAt: string;
    endAt: string;
    status?: MentorAvailabilitySlotStatus;
  }) {
    const response = await api.post('/mentor-availability/slots', payload);
    return unwrapResponseData<MentorAvailabilitySlot>(response);
  },

  async updateAvailabilitySlot(
    id: string,
    payload: { startAt?: string; endAt?: string; status?: MentorAvailabilitySlotStatus },
  ) {
    const response = await api.patch(`/mentor-availability/slots/${id}`, payload);
    return unwrapResponseData<MentorAvailabilitySlot>(response);
  },

  async deleteAvailabilitySlot(id: string) {
    const response = await api.delete(`/mentor-availability/slots/${id}`);
    return unwrapResponseData<MentorAvailabilitySlot>(response);
  },

  async createBulkAvailabilitySlots(payload: CreateBulkAvailabilityPayload) {
    const response = await api.post('/mentor-availability/slots/bulk', payload);
    return unwrapResponseData<BulkAvailabilityResult>(response);
  },

  async getMyBookings() {
    const response = await api.get('/booking-sessions/my');
    return unwrapResponseData<{ asMentee: BookingSession[]; asMentor: BookingSession[] }>(response);
  },

  async getBooking(id: string) {
    const response = await api.get(`/booking-sessions/${id}`);
    return unwrapResponseData<BookingSession>(response);
  },

  async confirmBooking(id: string, confirmedDateTime?: string) {
    const response = await api.post(`/booking-sessions/${id}/confirm`, { confirmedDateTime });
    return unwrapResponseData<BookingSession>(response);
  },

  async cancelBooking(id: string, reason?: string) {
    const response = await api.post(`/booking-sessions/${id}/cancel`, { reason });
    return unwrapResponseData<BookingSession>(response);
  },

  async completeBooking(id: string) {
    const response = await api.post(`/booking-sessions/${id}/complete`, {});
    return unwrapResponseData<BookingSession>(response);
  },

  async sendBookingMessage(id: string, message: string) {
    const response = await api.post(`/booking-sessions/${id}/messages`, { message, messageType: 'chat' });
    return unwrapResponseData<BookingSession>(response);
  },

  async createRescheduleProposal(
    id: string,
    payload: {
      newDateTime: string;
      duration: number;
      timeZone?: string;
      availabilitySlotId?: string;
      reason?: string;
      message?: string;
    },
  ) {
    const response = await api.post(`/booking-sessions/${id}/reschedule-proposals`, payload);
    return unwrapResponseData<BookingSession>(response);
  },

  async acceptRescheduleProposal(id: string, proposalId: string) {
    const response = await api.post(`/booking-sessions/${id}/reschedule-proposals/${proposalId}/accept`, {});
    return unwrapResponseData<BookingSession>(response);
  },

  async declineRescheduleProposal(id: string, proposalId: string, reason?: string) {
    const response = await api.post(`/booking-sessions/${id}/reschedule-proposals/${proposalId}/decline`, { reason });
    return unwrapResponseData<BookingSession>(response);
  },

  async getMyReceivedReviews() {
    const response = await api.get('/session-reviews/me/received');
    return unwrapResponseData<SessionReview[]>(response);
  },
};
