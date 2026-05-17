'use client';

import type { BookingSession } from '@/lib/mentor.service';

export const BOOKING_CHAT_OPEN_EVENT = 'edumee:open-booking-chat';

export type BookingChatOpenDetail = {
  booking?: BookingSession;
  bookingId?: string;
};

export function dispatchOpenBookingChat(detail: BookingChatOpenDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BookingChatOpenDetail>(BOOKING_CHAT_OPEN_EVENT, { detail }));
}
