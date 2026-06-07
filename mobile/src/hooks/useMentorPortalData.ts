import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, unwrapResponseData } from '../services/api';
import {
  type BookingSession,
  type MentorAvailabilitySlot,
  mentorService,
  type SessionReview,
  type TutorProfile,
} from '../services/mentor.service';
import { paymentService, type MentorIncomeResponse } from '../services/payment.service';

export interface AppUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface MentorPortalData {
  user: AppUser | null;
  profile: TutorProfile | null;
  bookings: BookingSession[];
  slots: MentorAvailabilitySlot[];
}

export const mentorPortalQueryKey = ['mentorPortal'] as const;
export const mentorReviewsQueryKey = ['mentorReviews'] as const;
export const mentorIncomeQueryKey = ['mentorIncome'] as const;

function isProfileMissing(error: unknown) {
  const status = (error as { response?: { status?: number; statusCode?: number } })?.response?.status;
  const statusCode = (error as { response?: { data?: { statusCode?: number } } })?.response?.data?.statusCode;
  return status === 404 || statusCode === 404;
}

async function getMe() {
  const response = await api.get('/users/me');
  return unwrapResponseData<AppUser>(response);
}

export async function fetchMentorPortalData(): Promise<MentorPortalData> {
  const [user, profile, bookingsPayload] = await Promise.all([
    getMe().catch(() => null),
    mentorService.getMyTutorProfile().catch((error) => {
      if (isProfileMissing(error)) return null;
      throw error;
    }),
    mentorService.getMyBookings(),
  ]);

  const slots = profile?.status === 'active' ? await mentorService.getMyAvailabilitySlots().catch(() => []) : [];

  return {
    user,
    profile,
    bookings: bookingsPayload.asMentor || [],
    slots,
  };
}

export function useMentorPortalData() {
  return useQuery({
    queryKey: mentorPortalQueryKey,
    queryFn: fetchMentorPortalData,
    staleTime: 20_000,
  });
}

export function useMentorReviews(enabled: boolean) {
  return useQuery({
    queryKey: mentorReviewsQueryKey,
    queryFn: () => mentorService.getMyReceivedReviews(),
    enabled,
    staleTime: 20_000,
  });
}

export function useMentorIncome(enabled: boolean) {
  return useQuery({
    queryKey: mentorIncomeQueryKey,
    queryFn: () => paymentService.getMentorIncome({ range: 'year', limit: 50 }),
    enabled,
    staleTime: 20_000,
  });
}

export function updateMentorPortalBookingCache(queryClient: QueryClient, updatedBooking: BookingSession) {
  queryClient.setQueryData<MentorPortalData>(mentorPortalQueryKey, (current) => {
    if (!current) return current;

    let didUpdate = false;
    const bookings = current.bookings.map((booking) => {
      if (booking.id !== updatedBooking.id && booking._id !== updatedBooking.id) return booking;
      didUpdate = true;
      return updatedBooking;
    });

    return { ...current, bookings: didUpdate ? bookings : [updatedBooking, ...bookings] };
  });
}

export function useRefreshMentorPortal() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey }),
      queryClient.invalidateQueries({ queryKey: mentorReviewsQueryKey }),
      queryClient.invalidateQueries({ queryKey: mentorIncomeQueryKey }),
    ]);
  }, [queryClient]);
}

export function summarizeReviews(reviews: SessionReview[]) {
  const ratings = reviews
    .map((review) => review.overallRatings?.overallSatisfaction)
    .filter((rating): rating is number => typeof rating === 'number' && Number.isFinite(rating));
  const average = ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0;
  const recommendAnswers = reviews
    .map((review) => review.overallRatings?.wouldRecommend)
    .filter((value): value is boolean => typeof value === 'boolean');

  return {
    average,
    total: reviews.length,
    fiveStarCount: ratings.filter((rating) => Math.round(rating) >= 5).length,
    recommendRate: recommendAnswers.length
      ? Math.round((recommendAnswers.filter(Boolean).length / recommendAnswers.length) * 100)
      : null,
  };
}

export function summarizeIncome(income?: MentorIncomeResponse) {
  return {
    grossRevenue: income?.summary?.grossRevenue || 0,
    mentorPayoutAmount: income?.summary?.mentorPayoutAmount || 0,
    readyPayoutAmount: income?.summary?.readyPayoutAmount || 0,
    pendingPayoutAmount: income?.summary?.pendingPayoutAmount || 0,
    platformFeeAmount: income?.summary?.platformFeeAmount || 0,
    currency: income?.summary?.currency || 'VND',
  };
}
