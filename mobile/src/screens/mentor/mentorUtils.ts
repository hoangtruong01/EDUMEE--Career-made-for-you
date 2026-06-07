import { Linking, Platform } from 'react-native';
import type {
  BookingSession,
  BookingStatus,
  MentorAvailabilitySlot,
  TutorProfile,
  TutorStatus,
} from '../../services/mentor.service';

const DEV_WEB_HOST = '192.168.101.87';
export const WEB_BASE_URL = Platform.OS === 'web' ? 'http://localhost:3000' : `http://${DEV_WEB_HOST}:3000`;

export const profileStatusLabel: Record<TutorStatus | string, string> = {
  pending_approval: 'Chờ admin duyệt',
  active: 'Đang hoạt động',
  inactive: 'Tạm ẩn',
  suspended: 'Bị tạm khóa',
  rejected: 'Bị từ chối',
  missing: 'Chưa có hồ sơ',
};

export const bookingStatusLabel: Record<BookingStatus | string, string> = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled_by_mentee: 'Học viên hủy',
  cancelled_by_mentor: 'Mentor hủy',
  rescheduled: 'Đã đổi lịch',
  no_show_mentee: 'Học viên vắng',
  no_show_mentor: 'Mentor vắng',
};

export const sessionTypeLabel: Record<string, string> = {
  career_guidance: 'Định hướng nghề nghiệp',
  skill_coaching: 'Huấn luyện kỹ năng',
  interview_preparation: 'Luyện phỏng vấn',
  project_review: 'Review dự án',
  resume_review: 'Review CV',
  general_mentoring: 'Tư vấn chung',
};

export const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
export const SLOT_START_MINUTE = 8 * 60;
export const SLOT_END_MINUTE = 23 * 60;
export const SLOT_BLOCK_MINUTES = 90;

export const SLOT_STARTS = Array.from(
  { length: Math.floor((SLOT_END_MINUTE - SLOT_START_MINUTE) / SLOT_BLOCK_MINUTES) },
  (_, index) => SLOT_START_MINUTE + index * SLOT_BLOCK_MINUTES,
);

export function getId(value: { id?: string; _id?: string }) {
  return value.id || value._id || '';
}

export function getMentorName(profile?: TutorProfile | null) {
  return profile?.mentorUser?.name || profile?.professionalBackground?.currentPosition || 'Mentor EDUMEE';
}

export function getMentorTitle(profile?: TutorProfile | null) {
  const position = profile?.professionalBackground?.currentPosition?.trim();
  const company = profile?.professionalBackground?.company?.trim();
  if (position && company) return `${position} tại ${company}`;
  return position || 'Mentor EDUMEE';
}

export function formatCurrency(amount?: number, currency = 'VND') {
  const value = Number(amount || 0);
  if (!value) return currency === 'VND' ? '0 đ' : '0';
  if (currency.toUpperCase() === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatMinute(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function dateAtMinutes(day: Date, minute: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minute / 60), minute % 60);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date) {
  const day = date.getDay();
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(normalized, day === 0 ? -6 : 1 - day);
}

export function sameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function getBookingStart(booking: BookingSession) {
  return new Date(booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime);
}

export function getBookingDuration(booking: BookingSession) {
  return booking.bookingType === 'trial'
    ? booking.trialInfo?.durationMinutes || booking.schedulingDetails.duration || 15
    : booking.schedulingDetails.duration;
}

export function getBookingEnd(booking: BookingSession, start = getBookingStart(booking)) {
  return new Date(start.getTime() + getBookingDuration(booking) * 60_000);
}

export function getPendingRescheduleProposal(booking: BookingSession) {
  return booking.rescheduleProposals?.find((proposal) => proposal.status === 'pending') || null;
}

export function isActiveBooking(booking: BookingSession) {
  return ['pending', 'confirmed', 'rescheduled'].includes(booking.status);
}

export function isBookingCancelled(booking: BookingSession) {
  return booking.status.startsWith('cancelled');
}

export function getBookingPaymentSummary(booking: BookingSession) {
  if (booking.bookingType === 'trial') return 'Trial miễn phí, không phát sinh doanh thu';
  const price = formatCurrency(booking.paymentInfo?.sessionPrice, booking.paymentInfo?.currency || 'VND');
  return `${price}, ${booking.paymentInfo?.paymentStatus || 'chờ thanh toán'}`;
}

export function getTrialNote(booking: BookingSession) {
  if (booking.bookingType !== 'trial') return '';
  if (booking.trialInfo?.quotaRefundedAt) return 'Quota trial của học viên đã được hoàn lại.';
  if (booking.trialInfo?.quotaConsumedAt) return 'Quota trial đã được trừ khi booking được xác nhận.';
  if (booking.status === 'pending') return 'Xác nhận booking sẽ trừ 1 lượt mentor booking trong gói AI của học viên.';
  return 'Trial miễn phí theo quota gói AI của học viên.';
}

export function normalizeMeetingUrl(link?: string) {
  if (!link) return '';
  if (link.startsWith('http')) return link;
  return `${WEB_BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
}

export async function openMeetingLink(booking: BookingSession) {
  const url = normalizeMeetingUrl(booking.schedulingDetails.meetingLink);
  if (!url) throw new Error('Phòng call sẽ hiển thị sau khi booking được xác nhận.');
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
    return;
  }
  await Linking.openURL(url);
}

export function getSlotDate(slot: MentorAvailabilitySlot) {
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  return { start, end };
}
