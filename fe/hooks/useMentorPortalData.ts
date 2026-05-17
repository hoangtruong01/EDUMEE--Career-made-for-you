'use client';

import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import {
  type BookingSession,
  type MentorAvailabilitySlot,
  mentorService,
  type SessionReview,
  type TutorProfile,
} from '@/lib/mentor.service';
import { useQuery, type QueryClient } from '@tanstack/react-query';

export interface MentorPortalData {
  profile: TutorProfile | null;
  bookings: BookingSession[];
  slots: MentorAvailabilitySlot[];
}

export const mentorPortalQueryKey = (accessToken: string) => ['mentorPortal', accessToken] as const;
export const mentorPortalReviewsQueryKey = (accessToken: string) => ['mentorPortalReviews', accessToken] as const;

function isProfileMissing(error: unknown) {
  return error instanceof ApiError && error.statusCode === 404;
}

export async function fetchMentorPortalData(accessToken: string): Promise<MentorPortalData> {
  const [profile, myBookings] = await Promise.all([
    mentorService.getMyTutorProfile(accessToken).catch((error) => {
      if (isProfileMissing(error)) return null;
      throw error;
    }),
    mentorService.getMyBookings(accessToken),
  ]);

  const slots = profile ? await mentorService.getMyAvailabilitySlots(accessToken) : [];

  return {
    profile,
    bookings: myBookings.asMentor,
    slots,
  };
}

export async function fetchMentorPortalReviews(accessToken: string): Promise<SessionReview[]> {
  return mentorService.getMyReceivedReviews(accessToken);
}

export function useMentorPortalData() {
  const { accessToken, isAuthenticated, isHydrated } = useAuth();

  return useQuery({
    queryKey: mentorPortalQueryKey(accessToken),
    queryFn: () => fetchMentorPortalData(accessToken),
    enabled: isHydrated && isAuthenticated && Boolean(accessToken),
  });
}

export function useMentorPortalReviews(enabled: boolean) {
  const { accessToken, isAuthenticated, isHydrated } = useAuth();

  return useQuery({
    queryKey: mentorPortalReviewsQueryKey(accessToken),
    queryFn: () => fetchMentorPortalReviews(accessToken),
    enabled: enabled && isHydrated && isAuthenticated && Boolean(accessToken),
  });
}

export function updateMentorPortalBookingCache(
  queryClient: QueryClient,
  accessToken: string,
  updatedBooking: BookingSession,
) {
  if (!accessToken) return;

  queryClient.setQueryData<MentorPortalData>(mentorPortalQueryKey(accessToken), (current) => {
    if (!current) return current;

    let didUpdate = false;
    const bookings = current.bookings.map((booking) => {
      if (booking.id !== updatedBooking.id) return booking;
      didUpdate = true;
      return updatedBooking;
    });

    return { ...current, bookings: didUpdate ? bookings : [updatedBooking, ...bookings] };
  });
}
