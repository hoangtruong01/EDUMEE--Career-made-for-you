'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookingChat } from '@/context/booking-chat-context';
import { usePlanGate } from '@/context/plan-gate-context';
import { useBookingRealtimeSync } from '@/hooks/useBookingRealtimeSync';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type MyAiSubscription, type QuotaView } from '@/lib/ai-billing.service';
import { authStorage } from '@/lib/auth-storage';
import { careerTagsService, type CareerTag, type SkillTag } from '@/lib/career-tags.service';
import { normalizePaymentCheckoutRedirectUrl } from '@/lib/payment-redirect';
import { paymentService, type PaymentRecord } from '@/lib/payment.service';
import { getWalletAccount, walletService, type WalletSummary } from '@/lib/wallet.service';
import {
  BookingSession,
  BookingReviewStatus,
  CreateBookingPayload,
  MentorAvailabilitySlot,
  MentorSessionType,
  mentorService,
  PublicMentorReview,
  TutorProfile,
} from '@/lib/mentor.service';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Eye,
  GraduationCap,
  Loader2,
  MessageSquare,
  Repeat,
  Search,
  Star,
  Users,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function getCareerId(career: CareerTag) {
  return career.id || career._id || career.title;
}

const statusLabel: Record<string, string> = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ mentor xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Đã hoàn thành',
  cancelled_by_mentee: 'Học viên đã hủy',
  cancelled_by_mentor: 'Mentor đã hủy',
  rescheduled: 'Đã đổi lịch',
  no_show_mentee: 'Học viên vắng',
  no_show_mentor: 'Mentor vắng',
};

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'rescheduled'];

const BOOKING_TOPIC_SUGGESTIONS = ['CV / portfolio', 'Phỏng vấn', 'Lộ trình học', 'Review dự án'];
const BOOKING_NOTE_HINTS = ['Đang phân vân hướng đi', 'Cần review tài liệu', 'Muốn luyện câu hỏi'];
const TRIAL_BOOKING_DURATION_MINUTES = 15;
const TRIAL_BOOKING_DURATION_MS = TRIAL_BOOKING_DURATION_MINUTES * 60_000;

type RescheduleProposal = NonNullable<BookingSession['rescheduleProposals']>[number];

type ParsedMenteeAvailabilityWindow = {
  startAt: Date;
  endAt: Date;
};

function parseBookingTopics(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendCommaSeparatedValue(current: string, nextValue: string) {
  const values = parseBookingTopics(current);
  if (values.some((value) => value.toLowerCase() === nextValue.toLowerCase())) {
    return values.join(', ');
  }
  return [...values, nextValue].join(', ');
}

function parseDateTimeInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildTrialAvailabilityWindow(startAt: Date): ParsedMenteeAvailabilityWindow {
  return {
    startAt,
    endAt: new Date(startAt.getTime() + TRIAL_BOOKING_DURATION_MS),
  };
}

function toDateTimeLocalInputValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function getPendingRescheduleProposal(booking: BookingSession): RescheduleProposal | null {
  return booking.rescheduleProposals?.find((proposal) => proposal.status === 'pending') || null;
}

function getProposalRoleLabel(role: RescheduleProposal['proposedByRole']) {
  return role === 'mentor' ? 'mentor' : 'học viên';
}

function getBookingDate(booking: BookingSession) {
  return new Date(booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime);
}

function getSlotDurationMinutes(slot: MentorAvailabilitySlot, fallbackDuration: number) {
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  const duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration;
}

function formatAvailabilitySlotLabel(slot: MentorAvailabilitySlot) {
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Slot không hợp lệ';
  return `${start.toLocaleDateString('vi-VN')} · ${start.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

type MentorPaymentBanner = {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
};

type MentorUserTab = 'browse' | 'schedule';

function formatMoney(amount?: number, currency = 'VND') {
  if (!amount) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildMentorPaymentReturnUrls() {
  const makeUrl = (result: 'success' | 'error' | 'cancel') => {
    const url = new URL('/mentor-matching', window.location.origin);
    url.searchParams.set('payment', result);
    return url.toString();
  };

  return {
    success: makeUrl('success'),
    error: makeUrl('error'),
    cancel: makeUrl('cancel'),
  };
}

function buildPaymentReturnBanner(result: string, payment: PaymentRecord | null): MentorPaymentBanner {
  if (payment?.status === 'paid') {
    return {
      tone: 'success',
      title: 'Thanh toán thành công',
      description: 'Booking đã được chuyển sang hàng chờ mentor xác nhận.',
    };
  }

  if (payment?.status === 'pending') {
    return {
      tone: 'warning',
      title: 'Thanh toán đang chờ xác nhận',
      description: 'SePay chưa trả kết quả cuối cùng. Bạn có thể làm mới lại sau ít phút.',
    };
  }

  if (payment?.status === 'failed' || payment?.status === 'cancelled') {
    return {
      tone: 'error',
      title: 'Thanh toán chưa hoàn tất',
      description: 'Booking chưa được gửi sang mentor. Bạn có thể đặt lại khi sẵn sàng.',
    };
  }

  if (payment?.status === 'refunded') {
    return {
      tone: 'warning',
      title: 'Thanh toán đã hoàn tiền',
      description: 'Giao dịch này đã được hoàn tiền và booking liên quan không còn hiệu lực.',
    };
  }

  if (result === 'success') {
    return {
      tone: 'info',
      title: 'Đã quay lại từ SePay',
      description: 'Hệ thống đang chờ gateway xác nhận thanh toán.',
    };
  }

  return {
    tone: 'error',
    title: result === 'cancel' ? 'Bạn đã hủy thanh toán' : 'Thanh toán gặp lỗi',
    description: 'Booking chưa được thanh toán. Bạn có thể tạo giao dịch mới trên trang mentor.',
  };
}

function showPaymentToast(banner: MentorPaymentBanner, toastId: string): void {
  const options = { id: toastId, description: banner.description };
  if (banner.tone === 'success') {
    toast.success(banner.title, options);
    return;
  }
  if (banner.tone === 'warning') {
    toast.warning(banner.title, options);
    return;
  }
  if (banner.tone === 'error') {
    toast.error(banner.title, options);
    return;
  }
  toast.info(banner.title, options);
}

type TrialQuotaView = {
  value: string;
  detail: string;
  modalText: string;
  resetLabel?: string;
  isBookable: boolean;
};

function getVisibleQuotaUsed(quota: QuotaView): number {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return Math.max(0, quota.used || 0);
  return Math.min(Math.max(0, quota.used || 0), quota.limit);
}

function formatTrialQuotaResetLabel(quota?: QuotaView): string | undefined {
  if (!quota || quota.resetPolicy === 'unlimited') return undefined;
  if (quota.resetPolicy === 'lifetime') return 'Không reset theo tháng';
  if (!quota.nextResetAt) return 'Làm mới theo chu kỳ';

  const resetDate = new Date(quota.nextResetAt);
  if (Number.isNaN(resetDate.getTime())) return 'Làm mới theo chu kỳ';

  return `Làm mới ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(resetDate)}`;
}

function buildTrialQuotaView(subscription: MyAiSubscription | null): TrialQuotaView {
  if (!subscription) {
    return {
      value: 'Đang cập nhật',
      detail: 'Đang kiểm tra gói AI của bạn.',
      modalText: 'Đang kiểm tra số lượt trial trong gói AI.',
      isBookable: false,
    };
  }

  const hasTrialFeature = subscription.features?.mentorBooking === true;
  if (!hasTrialFeature) {
    return {
      value: 'Chưa hỗ trợ',
      detail: 'Gói AI hiện tại chưa hỗ trợ trial mentor.',
      modalText: 'Gói AI hiện tại chưa hỗ trợ trial mentor.',
      isBookable: false,
    };
  }

  const quota = subscription.quotas?.mentorBooking;
  if (!quota || quota.resetPolicy === 'unlimited' || !quota.limit) {
    return {
      value: 'Không giới hạn',
      detail: 'Trial mentor đang bật trong gói AI.',
      modalText: 'Không giới hạn lượt trial trong gói AI. Mentor xác nhận trước khi trừ lượt.',
      isBookable: true,
    };
  }

  const used = getVisibleQuotaUsed(quota);
  const remaining = Math.max(0, Number(quota.remaining || 0));
  const isBookable = remaining > 0;

  return {
    value: `${remaining}/${quota.limit}`,
    detail: isBookable ? `Đã dùng ${used}/${quota.limit}` : `Đã dùng hết ${used}/${quota.limit}`,
    modalText: isBookable
      ? `${remaining} lượt trial còn lại trong gói AI. Mentor xác nhận trước khi trừ lượt.`
      : 'Bạn đã dùng hết lượt trial trong kỳ này.',
    resetLabel: formatTrialQuotaResetLabel(quota),
    isBookable,
  };
}

function getMentorName(profile?: TutorProfile) {
  if (!profile) return 'Mentor';
  return profile.mentorUser?.name || profile.professionalBackground?.currentPosition || 'Mentor';
}

function getMentorTitle(profile?: TutorProfile) {
  if (!profile) return 'Mentor';
  return profile.professionalBackground?.currentPosition || 'Mentor';
}

function getMentorAvatar(profile?: TutorProfile) {
  return profile?.mentorUser?.avatar?.trim() || '';
}

function getMentorInitials(profile?: TutorProfile) {
  const source = profile?.mentorUser?.name || profile?.professionalBackground?.currentPosition || 'Mentor';
  const parts = source.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getRatingSummary(profile: TutorProfile) {
  const rating = profile.performanceMetrics?.ratings?.averageRating || 0;
  const reviews = profile.performanceMetrics?.ratings?.totalReviews || 0;
  return { rating, reviews, hasReviews: rating > 0 && reviews > 0 };
}

function getPrimaryRate(profile: TutorProfile) {
  return profile.pricing?.sessionRates?.[0];
}

function getRateForSessionType(profile: TutorProfile, sessionType: MentorSessionType) {
  return (
    profile.pricing?.sessionRates?.find((rate) => rate.sessionType === sessionType) ||
    getPrimaryRate(profile)
  );
}

function getSessionTypes(profile: TutorProfile): MentorSessionType[] {
  const fromAvailability = profile.availability?.sessionPreferences?.sessionTypes || [];
  const fromPricing = profile.pricing?.sessionRates?.map((rate) => rate.sessionType) || [];
  return Array.from(new Set([...fromAvailability, ...fromPricing])).filter(Boolean);
}

function formatSessionTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    career_guidance: 'Định hướng nghề nghiệp',
    skill_coaching: 'Coaching kỹ năng',
    interview_preparation: 'Luyện phỏng vấn',
    project_review: 'Review dự án',
    general_mentoring: 'Mentoring tổng quát',
  };
  return labels[value || ''] || value?.replace(/_/g, ' ') || 'Buổi mentoring';
}

function getBookingStatusClassName(status: string) {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'pending':
    case 'awaiting_payment':
    case 'rescheduled':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'cancelled_by_mentee':
    case 'cancelled_by_mentor':
    case 'no_show_mentee':
    case 'no_show_mentor':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function isTrialBooking(booking: BookingSession) {
  return booking.bookingType === 'trial';
}

function FilterDropdown({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  options: { value: string; label: string; meta?: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-11 w-full justify-between rounded-lg border-input bg-background px-3 text-left font-medium text-foreground transition-all hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-primary disabled:border-border disabled:bg-muted disabled:text-muted-foreground',
              open && 'border-primary/40 text-primary ring-2 ring-primary/20',
            )}
          >
            <span className={selectedOption ? 'truncate' : 'truncate text-muted-foreground'}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-primary opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border-border bg-popover p-1 shadow-lg"
        >
          <Command className="bg-transparent text-foreground">
            <CommandInput
              placeholder={searchPlaceholder}
              className="placeholder:text-muted-foreground"
            />
            <CommandList className="max-h-72">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">{emptyText}</CommandEmpty>
              <CommandGroup className="p-1">
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.meta || ''}`}
                      onSelect={() => {
                        onChange(active ? '' : option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "gap-2 rounded-xl px-2.5 py-2.5 transition-all duration-200 ease-out data-[selected='true']:bg-primary/10 data-[selected='true']:text-primary data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
                        active && 'bg-primary/10 text-primary',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/20 text-transparent transition-all',
                          active && 'border-transparent bg-primary text-primary-foreground',
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.meta ? (
                          <span
                            className={cn(
                              'block truncate text-xs text-muted-foreground transition-colors',
                              active && 'text-primary/80',
                            )}
                          >
                            {option.meta}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MentorAvatar({
  mentor,
  size = 'md',
}: {
  mentor: TutorProfile;
  size?: 'md' | 'lg';
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatar = getMentorAvatar(mentor);
  const sizeClass = size === 'lg' ? 'h-24 w-24 rounded-3xl text-3xl' : 'h-16 w-16 rounded-2xl text-xl';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border-4 border-background bg-gradient-hero font-black text-primary-foreground shadow-lg',
        sizeClass,
      )}
    >
      {avatar && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={`Ảnh đại diện ${getMentorName(mentor)}`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getMentorInitials(mentor)}</span>
      )}
    </div>
  );
}

function RatingDisplay({
  mentor,
  compact = false,
}: {
  mentor: TutorProfile;
  compact?: boolean;
}) {
  const { rating, reviews, hasReviews } = getRatingSummary(mentor);
  const roundedRating = Math.round(rating);

  if (!hasReviews) {
    return (
      <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
        <Star className="h-4 w-4 fill-current" />
        Chưa có đánh giá
      </span>
    );
  }

  return (
    <span className={cn('flex items-center gap-1 text-sm font-semibold text-amber-500', !compact && 'flex-wrap')}>
      <span>{rating.toFixed(1)}</span>
      <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} sao`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn('h-4 w-4', star <= roundedRating ? 'fill-current' : 'text-amber-200')}
          />
        ))}
      </span>
      <span className="text-muted-foreground">({reviews} đánh giá)</span>
    </span>
  );
}

function formatPublicReviewDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function ReviewStars({ rating }: { rating: number }) {
  const roundedRating = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn('h-4 w-4', star <= roundedRating ? 'fill-current text-amber-500' : 'text-amber-200')}
        />
      ))}
    </span>
  );
}

function ReviewAuthorAvatar({ review }: { review: PublicMentorReview }) {
  const name = review.reviewer?.name || 'Học viên';
  const avatar = review.reviewer?.isAnonymous ? '' : review.reviewer?.avatar?.trim();
  const initial = name.trim().charAt(0).toUpperCase() || 'H';

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={`Ảnh đại diện ${name}`} className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function MentorPublicReviews({
  reviews,
  isLoading,
  message,
}: {
  reviews: PublicMentorReview[];
  isLoading: boolean;
  message: string;
}) {
  const visibleReviews = reviews.filter((review) => review.reviewer?.isAnonymous !== true);

  return (
    <section className="mt-4 rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Đánh giá học viên</p>
          <p className="text-xs text-muted-foreground">Phản hồi sau các buổi tư vấn đã hoàn thành.</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {visibleReviews.length} đánh giá
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : message ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>
      ) : visibleReviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Chưa có đánh giá nào cho mentor này.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ReviewAuthorAvatar review={review} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{review.reviewer?.name || 'Học viên ẩn danh'}</p>
                    <p className="text-xs text-muted-foreground">{formatPublicReviewDate(review.createdAt)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <ReviewStars rating={review.rating || 0} />
                  <p className="mt-1 text-xs font-semibold text-amber-600">{(review.rating || 0).toFixed(1)}/5</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {review.comment?.trim() || 'Học viên chưa để lại nhận xét.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MentorCard({
  mentor,
  onBook,
  onViewProfile,
}: {
  mentor: TutorProfile;
  onBook: (mentor: TutorProfile) => void;
  onViewProfile: (mentor: TutorProfile) => void;
}) {
  const skills = mentor.mentoringExpertise?.skillExpertise?.slice(0, 4) || [];
  const careers = mentor.mentoringExpertise?.careerExpertise?.slice(0, 2) || [];
  const rate = getPrimaryRate(mentor);
  const sessionTypes = getSessionTypes(mentor).slice(0, 2);
  const experienceYears = mentor.professionalBackground?.yearsOfExperience || 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex h-full flex-col rounded-xl border border-border bg-background transition-colors hover:border-primary/40"
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MentorAvatar mentor={mentor} />
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-bold">{getMentorName(mentor)}</h3>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{getMentorTitle(mentor)}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Đã xác thực
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Kinh nghiệm</p>
            <p className="mt-1 font-bold">{experienceYears} năm</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Công ty</p>
            <p className="mt-1 truncate font-bold">{mentor.professionalBackground?.company || 'Độc lập'}</p>
          </div>
        </div>

        {(careers.length > 0 || sessionTypes.length > 0) && (
          <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {careers.map((career) => (
              <span key={career.careerTitle} className="rounded-full bg-muted px-2.5 py-1">
                {career.careerTitle}
              </span>
            ))}
            {sessionTypes.map((type) => (
              <span key={type} className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {formatSessionTypeLabel(type)}
              </span>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill.skillName}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {skill.skillName}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3 text-sm">
            <span className="min-w-0">
              <RatingDisplay mentor={mentor} compact />
            </span>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{rate?.duration || 60} phút</p>
              <p className="font-bold text-primary">{formatMoney(rate?.pricePerSession, mentor.pricing?.currency)}</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Button className="min-w-0 w-full justify-center whitespace-nowrap rounded-lg" variant="outline" onClick={() => onViewProfile(mentor)}>
              <Eye className="h-4 w-4 shrink-0" />
              Xem hồ sơ
            </Button>
            <Button className="min-w-0 w-full justify-center whitespace-nowrap rounded-lg" onClick={() => onBook(mentor)}>
              <Calendar className="h-4 w-4 shrink-0" />
              Đặt lịch
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function MentorProfileModal({
  mentor,
  onClose,
  onBook,
}: {
  mentor: TutorProfile;
  onClose: () => void;
  onBook: (mentor: TutorProfile) => void;
}) {
  const careers = mentor.mentoringExpertise?.careerExpertise || [];
  const skills = mentor.mentoringExpertise?.skillExpertise || [];
  const specializations = mentor.mentoringExpertise?.specializations || [];
  const sessionTypes = getSessionTypes(mentor);
  const rate = getPrimaryRate(mentor);
  const token = authStorage.getAccessToken();
  const [reviews, setReviews] = useState<PublicMentorReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(Boolean(token));
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    let active = true;
    const loadReviews = async () => {
      setIsLoadingReviews(true);
      setReviewMessage('');
      try {
        const data = await mentorService.getPublicMentorReviews(token, mentor.userId);
        if (!active) return;
        setReviews(data);
      } catch (error) {
        if (!active) return;
        setReviewMessage(error instanceof Error ? error.message : 'Không thể tải đánh giá mentor.');
      } finally {
        if (active) setIsLoadingReviews(false);
      }
    };

    void loadReviews();

    return () => {
      active = false;
    };
  }, [mentor.userId, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Đóng" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="edumee-scrollbar relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
      >
        <div className="bg-gradient-hero h-28" />
        <button
          className="absolute right-4 top-4 rounded-full bg-background/90 p-2 text-foreground shadow-soft hover:bg-background"
          onClick={onClose}
          aria-label="Đóng modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-5">
          <div className="-mt-12">
            <div className="flex">
              <MentorAvatar mentor={mentor} size="lg" />
            </div>
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="min-w-0">
              <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Đã xác thực
                </span>
                <span className="max-w-full rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {mentor.tutorLevel.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="font-display break-words text-2xl font-bold leading-tight">{getMentorName(mentor)}</h2>
              <p className="mt-2 break-words text-sm text-muted-foreground">
                {getMentorTitle(mentor)} · {mentor.professionalBackground?.company || 'Độc lập'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-left lg:w-[220px] lg:justify-self-end lg:text-right">
              <div className="flex justify-start lg:justify-end">
                <RatingDisplay mentor={mentor} />
              </div>
              <p className="mt-2 text-lg font-bold text-primary">
                {formatMoney(rate?.pricePerSession, mentor.pricing?.currency)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kinh nghiệm</p>
              <p className="mt-1 font-bold">{mentor.professionalBackground?.yearsOfExperience || 0} năm</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phiên</p>
              <p className="mt-1 font-bold">{rate?.duration || 60} phút</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hình thức</p>
              <p className="mt-1 font-bold">Video / Chat</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-bold">Chuyên môn nghề</p>
              <div className="flex flex-wrap gap-2">
                {careers.length > 0 ? (
                  careers.map((career) => (
                    <span key={career.careerTitle} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {career.careerTitle}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Mentor chưa khai báo chuyên môn nghề.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-bold">Kỹ năng</p>
              <div className="flex flex-wrap gap-2">
                {skills.length > 0 ? (
                  skills.map((skill) => (
                    <span key={skill.skillName} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {skill.skillName}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Mentor chưa khai báo kỹ năng.</p>
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-bold">Loại phiên hỗ trợ</p>
              <div className="flex flex-wrap gap-2">
                {sessionTypes.length > 0 ? (
                  sessionTypes.map((type) => (
                    <span key={type} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có cấu hình loại phiên.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-bold">Điểm mạnh</p>
              <div className="flex flex-wrap gap-2">
                {specializations.length > 0 ? (
                  specializations.map((item) => (
                    <span key={item} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Mentor chưa thêm điểm mạnh nổi bật.</p>
                )}
              </div>
            </section>
          </div>

          <MentorPublicReviews reviews={reviews} isLoading={isLoadingReviews} message={reviewMessage} />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button className="flex-1" variant="hero" onClick={() => onBook(mentor)}>
              <Calendar className="h-4 w-4" />
              Đặt lịch với mentor
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BookingModal({
  mentor,
  onClose,
  onBooked,
  wallet,
  useEdumeeCredit,
  onUseEdumeeCreditChange,
}: {
  mentor: TutorProfile;
  onClose: () => void;
  onBooked: () => void;
  wallet: WalletSummary | null;
  useEdumeeCredit: boolean;
  onUseEdumeeCreditChange: (value: boolean) => void;
}) {
  const token = authStorage.getAccessToken();
  const { subscription, ensureFeatureAvailable, handlePlanError } = usePlanGate();
  const sessionTypes = getSessionTypes(mentor);
  const [slots, setSlots] = useState<MentorAvailabilitySlot[]>([]);
  const [sessionType, setSessionType] = useState<MentorSessionType>(sessionTypes[0] || 'general_mentoring');
  const [bookingType, setBookingType] = useState<'trial' | 'paid'>('paid');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [trialStartAt, setTrialStartAt] = useState('');
  const [topics, setTopics] = useState('');
  const [mentorNote, setMentorNote] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const edumeeCreditAccount = getWalletAccount(wallet, 'edumee_credit');
  const trialQuotaView = buildTrialQuotaView(subscription);
  const hasTrialQuota = trialQuotaView.isBookable;
  const selectedRate = getRateForSessionType(mentor, sessionType);
  const topicsToDiscuss = useMemo(() => parseBookingTopics(topics), [topics]);
  const normalizedMentorNote = mentorNote.trim();
  const nowInputValue = useMemo(() => toDateTimeLocalInputValue(new Date()), []);
  const parsedTrialStartAt = useMemo(() => parseDateTimeInput(trialStartAt), [trialStartAt]);
  const trialAvailabilityWindow = useMemo(
    () => (parsedTrialStartAt ? buildTrialAvailabilityWindow(parsedTrialStartAt) : null),
    [parsedTrialStartAt],
  );
  const selectedBookingSlotId = bookingType === 'paid' ? selectedSlotId : '';

  const addTopicSuggestion = (suggestion: string) => {
    setTopics((current) => appendCommaSeparatedValue(current, suggestion));
  };

  const addNoteHint = (hint: string) => {
    setMentorNote((current) => (current.trim() ? `${current.trim()}\n${hint}` : hint));
  };

  useEffect(() => {
    setBookingType(hasTrialQuota ? 'trial' : 'paid');
  }, [hasTrialQuota, mentor.id]);

  useEffect(() => {
    if (bookingType === 'paid' && !selectedSlotId && slots[0]?.id) {
      setSelectedSlotId(slots[0].id);
    }
  }, [bookingType, selectedSlotId, slots]);

  useEffect(() => {
    if (bookingType !== 'paid') {
      setIsLoadingSlots(false);
      return;
    }
    let active = true;
    setIsLoadingSlots(true);
    mentorService
      .getAvailableSlots(token, mentor.userId)
      .then((data) => {
        if (!active) return;
        setSlots(data);
        setSelectedSlotId(data[0]?.id || '');
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Không thể tải lịch trống của mentor.');
      })
      .finally(() => {
        if (active) setIsLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [bookingType, mentor.userId, token]);

  const submit = async () => {
    if ((bookingType === 'paid' && !selectedBookingSlotId) || topicsToDiscuss.length === 0 || !normalizedMentorNote) {
      setMessage(
        bookingType === 'paid'
          ? 'Vui lòng chọn khung giờ, nhập chủ đề và thêm ghi chú ngắn cho mentor.'
          : 'Vui lòng nhập chủ đề và thêm ghi chú ngắn cho mentor.',
      );
      return;
    }

    if (bookingType === 'trial') {
      if (!parsedTrialStartAt || !trialAvailabilityWindow) {
        setMessage('Vui lòng nhập thời gian bắt đầu hợp lệ cho trial 15 phút.');
        return;
      }
      if (parsedTrialStartAt < new Date()) {
        setMessage('Vui lòng chọn thời gian trial trong tương lai.');
        return;
      }
      const allowed = await ensureFeatureAvailable('mentorBooking');
      if (!allowed) return;
    }

    const payload: CreateBookingPayload = {
      tutorProfileId: mentor.id,
      ...(bookingType === 'paid' ? { availabilitySlotId: selectedBookingSlotId } : {}),
      sessionType,
      bookingType,
      schedulingDetails: {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
        ...(bookingType === 'trial' && trialAvailabilityWindow
          ? { requestedDateTime: trialAvailabilityWindow.startAt.toISOString(), duration: TRIAL_BOOKING_DURATION_MINUTES }
          : {}),
      },
      bookingRequest: {
        topicsToDiscuss,
        currentSituation: normalizedMentorNote,
        desiredOutcomes: topicsToDiscuss.map((topic) => `Trao đổi rõ về ${topic}`),
        additionalNotes: normalizedMentorNote,
        ...(bookingType === 'trial'
          ? {
              menteeAvailabilityWindows: trialAvailabilityWindow
                ? [
                    {
                      startAt: trialAvailabilityWindow.startAt.toISOString(),
                      endAt: trialAvailabilityWindow.endAt.toISOString(),
                    },
                  ]
                : [],
            }
          : {}),
        isFirstSession: true,
        urgencyLevel: 'medium',
      },
      ...(bookingType === 'paid'
        ? {
            paymentReturnUrls: buildMentorPaymentReturnUrls(),
            useEdumeeCredit,
          }
        : {}),
    };

    setIsSubmitting(true);
    setMessage('');
    try {
      const result = await mentorService.createBooking(token, payload);
      onBooked();
      if (result.payment?.redirectUrl) {
        window.location.href = normalizePaymentCheckoutRedirectUrl(result.payment.redirectUrl);
        return;
      }
      setMessage(
        bookingType === 'trial'
          ? 'Đã gửi yêu cầu trial 15 phút. Mentor sẽ xác nhận lịch sớm.'
          : 'Đặt lịch thành công. Mentor sẽ xác nhận lịch sớm.',
      );
    } catch (error) {
      if (handlePlanError(error, 'mentorBooking')) {
        return;
      }
      setMessage(error instanceof Error ? error.message : 'Không thể tạo booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Đóng" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="edumee-scrollbar relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">Đặt lịch với mentor</h2>
            <p className="text-sm text-muted-foreground">{getMentorName(mentor)}</p>
          </div>
          <button className="rounded-full p-2 hover:bg-muted" onClick={onClose} aria-label="Đóng modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => hasTrialQuota && setBookingType('trial')}
              disabled={!hasTrialQuota}
              className={cn(
                'rounded-xl border p-3 text-left text-sm transition',
                bookingType === 'trial'
                  ? 'border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-500/10 dark:text-violet-100'
                  : 'border-border hover:bg-muted',
                !hasTrialQuota && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="block font-bold">Trial 15 phút miễn phí</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {trialQuotaView.modalText}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBookingType('paid')}
              className={cn(
                'rounded-xl border p-3 text-left text-sm transition',
                bookingType === 'paid'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              <span className="block font-bold">Đặt buổi trả phí</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatMoney(selectedRate?.pricePerSession, mentor.pricing?.currency)} · thanh toán rồi chờ mentor xác nhận.
              </span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Loại buổi
              <select
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value as MentorSessionType)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">Quy tắc đặt lịch</p>
              <p className="text-xs text-muted-foreground">
                {bookingType === 'trial'
                  ? 'Trial là buổi giới thiệu miễn phí 15 phút. Bạn đề xuất giờ bắt đầu, mentor xác nhận nếu nhận lịch này. Lượt chỉ trừ khi mentor xác nhận.'
                  : 'Slot chỉ được giữ sau khi thanh toán thành công; ai thanh toán trước được ưu tiên.'}
              </p>
            </div>
          </div>

          {bookingType === 'trial' ? (
            <>
              <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Giờ trial bạn đề xuất</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Chỉ cần chọn giờ bắt đầu. Mentor sẽ xác nhận theo lịch bạn gửi.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  Bắt đầu
                  <input
                    type="datetime-local"
                    value={trialStartAt}
                    min={nowInputValue}
                    onChange={(event) => setTrialStartAt(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {trialAvailabilityWindow
                      ? `Kết thúc tự động: ${trialAvailabilityWindow.endAt.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : `Trial kéo dài ${TRIAL_BOOKING_DURATION_MINUTES} phút từ thời điểm này.`}
                  </span>
                </label>
              </section>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Chọn khung giờ trống của mentor</p>
              {isLoadingSlots ? (
                <div className="flex h-20 items-center justify-center rounded-xl border border-border">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                  Mentor hiện chưa có khung giờ trống.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {slots.map((slot) => {
                    const start = new Date(slot.startAt);
                    const end = new Date(slot.endAt);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`rounded-xl border p-3 text-left text-sm transition ${
                          selectedSlotId === slot.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <span className="block font-semibold">{start.toLocaleDateString('vi-VN')}</span>
                        <span className="text-xs text-muted-foreground">
                          {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Nội dung gửi mentor</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Viết như một tin nhắn ngắn. Mentor sẽ dùng phần này để chuẩn bị trước buổi hẹn.
                </p>
              </div>
            </div>

            <label htmlFor="booking-topics" className="block space-y-2 text-sm font-medium">
              <span>Nội dung muốn trao đổi</span>
              <input
                id="booking-topics"
                value={topics}
                onChange={(event) => setTopics(event.target.value)}
                placeholder="Ví dụ: CV, phỏng vấn backend, review portfolio"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:placeholder:text-slate-400"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {BOOKING_TOPIC_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTopicSuggestion(suggestion)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    topicsToDiscuss.some((topic) => topic.toLowerCase() === suggestion.toLowerCase())
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <label htmlFor="booking-note" className="block space-y-2 text-sm font-medium">
              <span className="flex items-center justify-between gap-3">
                <span>Ghi chú cho mentor</span>
                <span className="text-xs font-medium text-muted-foreground">{mentorNote.length}/600</span>
              </span>
              <textarea
                id="booking-note"
                value={mentorNote}
                onChange={(event) => setMentorNote(event.target.value)}
                maxLength={600}
                placeholder="Ví dụ: Mình đang học React được 2 tháng, muốn mentor xem CV và góp ý phần dự án trước khi ứng tuyển thực tập."
                className="min-h-28 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm leading-6 outline-none transition placeholder:text-slate-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:placeholder:text-slate-400"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {BOOKING_NOTE_HINTS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => addNoteHint(hint)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {hint}
                </button>
              ))}
            </div>
          </section>

          {bookingType === 'paid' ? (
            <label className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <span>
                <span className="block font-semibold text-emerald-800 dark:text-emerald-200">Dùng Số dư Edumee</span>
                <span className="text-emerald-700/80 dark:text-emerald-200/80">
                  Khả dụng {formatMoney(edumeeCreditAccount?.availableBalance || 0, wallet?.currency || 'VND')}
                </span>
              </span>
              <input
                type="checkbox"
                checked={useEdumeeCredit}
                onChange={(event) => onUseEdumeeCreditChange(event.target.checked)}
                className="h-5 w-5 accent-emerald-600"
              />
            </label>
          ) : null}

          {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              className="flex-1"
              variant="hero"
              onClick={submit}
              disabled={isSubmitting || (bookingType === 'paid' ? !selectedBookingSlotId : !parsedTrialStartAt)}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {bookingType === 'trial' ? 'Gửi yêu cầu trial' : 'Xác nhận và thanh toán'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReviewModal({
  booking,
  reviewStatus,
  onClose,
  onSubmitted,
}: {
  booking: BookingSession;
  reviewStatus: BookingReviewStatus | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const token = authStorage.getAccessToken();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const tutoringSessionId = reviewStatus?.tutoringSessionId || booking.tutoringSessionId;

  const submitReview = async () => {
    if (!tutoringSessionId) {
      setMessage('Booking này chưa có mã buổi học để đánh giá.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      await mentorService.createSessionReview(token, {
        tutoringSessionId,
        rating,
        comment,
        isAnonymous,
        wouldRecommend: rating >= 4,
      });
      toast.success('Cảm ơn bạn đã đánh giá mentor.');
      onSubmitted();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Không thể gửi đánh giá mentor.';
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Đóng" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-lg rounded-2xl bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Đánh giá mentor</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.sessionType.replace(/_/g, ' ')} -{' '}
              {new Date(
                booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
              ).toLocaleString('vi-VN')}
            </p>
          </div>
          <button className="rounded-full p-2 hover:bg-muted" onClick={onClose} aria-label="Đóng modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Điểm đánh giá</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="rounded-lg p-1 text-amber-500 transition hover:bg-amber-50"
                  aria-label={`${star} sao`}
                >
                  <Star className={`h-8 w-8 ${star <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-2 text-sm font-semibold">
            Nhận xét
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Mentor đã hỗ trợ bạn như thế nào?"
              className="min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block font-semibold">Đăng ẩn danh trên hồ sơ mentor</span>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Hệ thống vẫn lưu tài khoản của bạn để chống đánh giá trùng và phục vụ kiểm tra nội bộ.
              </span>
            </span>
          </label>

          {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={onClose}>
              Để sau
            </Button>
            <Button className="flex-1" variant="hero" onClick={submitReview} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi đánh giá
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MenteeRescheduleModal({
  booking,
  onClose,
  onUpdated,
  onRefresh,
}: {
  booking: BookingSession;
  onClose: () => void;
  onUpdated: (booking: BookingSession) => void;
  onRefresh: () => void | Promise<void>;
}) {
  const token = authStorage.getAccessToken();
  const pendingProposal = getPendingRescheduleProposal(booking);
  const canRespondToProposal = pendingProposal?.proposedByRole === 'mentor';
  const canCreateProposal = ACTIVE_BOOKING_STATUSES.includes(booking.status) && !pendingProposal;
  const [slots, setSlots] = useState<MentorAvailabilitySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [message, setMessage] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;

  useEffect(() => {
    if (!token || !canCreateProposal) {
      setSlots([]);
      setSelectedSlotId('');
      return;
    }

    let active = true;
    setIsLoadingSlots(true);
    setMessage('');
    mentorService
      .getAvailableSlots(token, booking.mentorId)
      .then((data) => {
        if (!active) return;
        const nextSlots = data
          .filter((slot) => {
            const start = new Date(slot.startAt);
            return (
              slot.status === 'available' &&
              slot.id !== booking.availabilitySlotId &&
              !Number.isNaN(start.getTime()) &&
              start.getTime() > Date.now()
            );
          })
          .sort((first, second) => new Date(first.startAt).getTime() - new Date(second.startAt).getTime());
        setSlots(nextSlots);
        setSelectedSlotId(nextSlots[0]?.id || '');
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Không thể tải slot trống của mentor.');
      })
      .finally(() => {
        if (active) setIsLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [booking.availabilitySlotId, booking.mentorId, canCreateProposal, token]);

  const submitProposal = async () => {
    if (!token || !selectedSlot) return;

    const nextDate = new Date(selectedSlot.startAt);
    if (selectedSlot.status !== 'available' || Number.isNaN(nextDate.getTime()) || nextDate <= new Date()) {
      setMessage('Slot đổi lịch không hợp lệ hoặc đã qua.');
      return;
    }

    setBusyAction('create');
    setMessage('');
    try {
      const updatedBooking = await mentorService.createRescheduleProposal(token, booking.id, {
        availabilitySlotId: selectedSlot.id,
        newDateTime: nextDate.toISOString(),
        duration: getSlotDurationMinutes(selectedSlot, booking.schedulingDetails.duration),
        timeZone: booking.schedulingDetails.timeZone,
        reason: proposalMessage.trim() || undefined,
        message: proposalMessage.trim() || undefined,
      });
      onUpdated(updatedBooking);
      setProposalMessage('');
      setMessage('Đã gửi đề xuất đổi lịch cho mentor.');
      toast.success('Đã gửi đề xuất đổi lịch.');
      void onRefresh();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Không thể gửi đề xuất đổi lịch.';
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setBusyAction('');
    }
  };

  const acceptProposal = async () => {
    if (!token || !pendingProposal) return;

    setBusyAction(`accept-${pendingProposal.id}`);
    setMessage('');
    try {
      const updatedBooking = await mentorService.acceptRescheduleProposal(token, booking.id, pendingProposal.id);
      onUpdated(updatedBooking);
      toast.success('Đã đồng ý đổi lịch.');
      void onRefresh();
      onClose();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Không thể đồng ý đề xuất đổi lịch.';
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setBusyAction('');
    }
  };

  const declineProposal = async () => {
    if (!token || !pendingProposal) return;

    setBusyAction(`decline-${pendingProposal.id}`);
    setMessage('');
    try {
      const updatedBooking = await mentorService.declineRescheduleProposal(
        token,
        booking.id,
        pendingProposal.id,
        declineReason.trim() || undefined,
      );
      onUpdated(updatedBooking);
      toast.success('Đã từ chối đề xuất đổi lịch.');
      void onRefresh();
      onClose();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Không thể từ chối đề xuất đổi lịch.';
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Đóng" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="edumee-scrollbar relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">Đổi lịch booking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lịch hiện tại: {getBookingDate(booking).toLocaleString('vi-VN')} ·{' '}
              {booking.schedulingDetails.duration} phút
            </p>
          </div>
          <button className="rounded-full p-2 hover:bg-muted" onClick={onClose} aria-label="Đóng modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {pendingProposal ? (
            <section className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-violet-900">
              <p className="font-bold">
                {getProposalRoleLabel(pendingProposal.proposedByRole)} đề xuất:{' '}
                {new Date(pendingProposal.newDateTime).toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-violet-700">Thời lượng {pendingProposal.duration} phút</p>
              {(pendingProposal.reason || pendingProposal.message) && (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-violet-800">
                  {pendingProposal.reason || pendingProposal.message}
                </p>
              )}

              {canRespondToProposal ? (
                <div className="mt-4 space-y-3">
                  <label className="block space-y-1 text-sm font-semibold">
                    Lý do từ chối nếu có
                    <textarea
                      value={declineReason}
                      onChange={(event) => setDeclineReason(event.target.value)}
                      placeholder="Ví dụ: Khung giờ này chưa phù hợp với mình."
                      className="min-h-20 w-full rounded-xl border border-violet-200 bg-white p-3 text-sm text-foreground"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={declineProposal}
                      disabled={busyAction === `decline-${pendingProposal.id}`}
                    >
                      {busyAction === `decline-${pendingProposal.id}` && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Từ chối
                    </Button>
                    <Button
                      type="button"
                      variant="hero"
                      onClick={acceptProposal}
                      disabled={busyAction === `accept-${pendingProposal.id}`}
                    >
                      {busyAction === `accept-${pendingProposal.id}` && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Đồng ý
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-violet-700">
                  Đang chờ mentor phản hồi. Bạn chưa thể tạo đề xuất mới cho booking này.
                </p>
              )}
            </section>
          ) : canCreateProposal ? (
            <section className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold">Chọn slot trống mới</p>
                {isLoadingSlots ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-border">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    Mentor hiện chưa có slot trống phù hợp để đổi lịch.
                  </p>
                ) : (
                  <div className="edumee-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={cn(
                          'w-full rounded-xl border p-3 text-left text-sm transition',
                          selectedSlotId === slot.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        <span className="block font-semibold">{formatAvailabilitySlotLabel(slot)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block space-y-1 text-sm font-semibold">
                Lý do / lời nhắn
                <textarea
                  value={proposalMessage}
                  onChange={(event) => setProposalMessage(event.target.value)}
                  placeholder="Ví dụ: Mình muốn đổi sang khung giờ này vì lịch học bị trùng."
                  className="min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm"
                />
              </label>

              <Button
                type="button"
                variant="hero"
                onClick={submitProposal}
                disabled={busyAction === 'create' || !selectedSlot}
                className="w-full"
              >
                {busyAction === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                Gửi đề xuất đổi lịch
              </Button>
            </section>
          ) : (
            <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Booking này chưa thể đổi lịch.
            </p>
          )}

          {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

          <Button type="button" className="w-full" variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function BookingList({
  bookings,
  reviewStatuses,
  onReview,
  onOpenChat,
  onOpenReschedule,
}: {
  bookings: BookingSession[];
  reviewStatuses: Record<string, BookingReviewStatus | undefined>;
  onReview: (booking: BookingSession) => void;
  onOpenChat: (booking: BookingSession) => void;
  onOpenReschedule: (booking: BookingSession) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
        <div>
          <h2 className="font-display text-xl font-bold">Lịch của tôi</h2>
          <p className="text-sm text-muted-foreground">Theo dõi trạng thái các buổi mentoring đã đặt.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {bookings.length} booking
        </span>
      </div>
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Calendar className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold">Chưa có booking nào</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Khi bạn đặt lịch với mentor, các buổi tư vấn sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bookings.slice(0, 5).map((booking) => {
            const meetingHref = booking.schedulingDetails.meetingLink || '';
            const reviewStatus = reviewStatuses[booking.id];
            const pendingProposal = getPendingRescheduleProposal(booking);
            const canOpenReschedule = ACTIVE_BOOKING_STATUSES.includes(booking.status);
            const bookingDate = getBookingDate(booking);
            const rescheduleLabel = pendingProposal
              ? pendingProposal.proposedByRole === 'mentor'
                ? 'Phản hồi đổi lịch'
                : 'Xem đề xuất đổi lịch'
              : 'Đề xuất đổi lịch';

            return (
              <article key={booking.id} className="p-5 text-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{formatSessionTypeLabel(booking.sessionType)}</p>
                      <p className="mt-1 text-muted-foreground">
                        {Number.isNaN(bookingDate.getTime()) ? 'Chưa xác định thời gian' : bookingDate.toLocaleString('vi-VN')}
                        {' · '}
                        {booking.schedulingDetails.duration} phút
                      </p>
                      {booking.mentorUser?.name && (
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Mentor: {booking.mentorUser.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isTrialBooking(booking) ? (
                      <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                        Trial 15 phút
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'w-fit rounded-full border px-3 py-1 text-xs font-bold',
                        getBookingStatusClassName(booking.status),
                      )}
                    >
                      {statusLabel[booking.status] || booking.status}
                    </span>
                  </div>
                </div>

                {pendingProposal && (
                  <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                    Đề xuất đang chờ: {new Date(pendingProposal.newDateTime).toLocaleString('vi-VN')}
                  </p>
                )}
                {(meetingHref && ['confirmed', 'rescheduled'].includes(booking.status)) ||
                canOpenReschedule ||
                booking.status === 'completed' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meetingHref && ['confirmed', 'rescheduled'].includes(booking.status) && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={meetingHref}>
                          <Video className="h-4 w-4" />
                          Vào phòng call
                        </Link>
                      </Button>
                    )}
                    {canOpenReschedule && (
                      <Button type="button" size="sm" variant="outline" onClick={() => onOpenChat(booking)}>
                        <MessageSquare className="h-4 w-4" />
                        Nhắn tin với mentor
                      </Button>
                    )}
                    {canOpenReschedule && (
                      <Button type="button" size="sm" variant="outline" onClick={() => onOpenReschedule(booking)}>
                        <Repeat className="h-4 w-4" />
                        {rescheduleLabel}
                      </Button>
                    )}
                    {booking.status === 'completed' && (
                      <Button
                        type="button"
                        size="sm"
                        variant={reviewStatus?.reviewed ? 'outline' : 'hero'}
                        disabled={reviewStatus?.reviewed}
                        onClick={() => onReview(booking)}
                      >
                        <Star className="h-4 w-4" />
                        {reviewStatus?.reviewed ? 'Đã đánh giá' : 'Đánh giá mentor'}
                      </Button>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function MentorMatching() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get('payment');
  const paymentId = searchParams.get('paymentId');
  const reviewBookingId = searchParams.get('reviewBooking');
  const { openBookingChat } = useBookingChat();
  const { subscription } = usePlanGate();
  const [mentors, setMentors] = useState<TutorProfile[]>([]);
  const [bookings, setBookings] = useState<BookingSession[]>([]);
  const [careerCatalog, setCareerCatalog] = useState<CareerTag[]>([]);
  const [skillTags, setSkillTags] = useState<SkillTag[]>([]);
  const [activeTab, setActiveTab] = useState<MentorUserTab>('browse');
  const [search, setSearch] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [selectedSkillSlug, setSelectedSkillSlug] = useState('');
  const [activeMentor, setActiveMentor] = useState<TutorProfile | null>(null);
  const [profileMentor, setProfileMentor] = useState<TutorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [syncingPaymentId, setSyncingPaymentId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useEdumeeCredit, setUseEdumeeCredit] = useState(true);
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, BookingReviewStatus | undefined>>({});
  const [reviewTarget, setReviewTarget] = useState<BookingSession | null>(null);
  const [reviewTargetStatus, setReviewTargetStatus] = useState<BookingReviewStatus | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingSession | null>(null);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    if (!options?.silent) setIsLoading(true);
    try {
      const [profiles, myBookings, walletAccount] = await Promise.all([
        mentorService.getActiveMentors(token),
        mentorService.getMyBookings(token),
        walletService.getMine(token),
      ]);
      setMentors(profiles);
      setBookings(myBookings.asMentee);
      setWallet(walletAccount);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu mentor.');
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const completedBookings = bookings.filter((booking) => booking.status === 'completed');
    if (completedBookings.length === 0) {
      setReviewStatuses({});
      return;
    }

    let active = true;
    Promise.all(
      completedBookings.map(async (booking) => {
        try {
          const status = await mentorService.getBookingReviewStatus(token, booking.id);
          return [booking.id, status] as const;
        } catch {
          return [booking.id, undefined] as const;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setReviewStatuses(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [bookings]);

  useEffect(() => {
    if (!paymentResult || !['success', 'error', 'cancel'].includes(paymentResult)) return;

    const handlePaymentReturn = async () => {
      const token = authStorage.getAccessToken();
      let payment: PaymentRecord | null = null;

      if (token && paymentId) {
        setSyncingPaymentId(paymentId);
        try {
          const synced = await paymentService.syncPayment(token, paymentId);
          payment = synced.payment;
        } catch {
          try {
            const detail = await paymentService.getPayment(token, paymentId);
            payment = detail.payment;
          } catch {
            payment = null;
          }
        } finally {
          setSyncingPaymentId(null);
        }
      }

      const toastId = `payment-return:${paymentId || paymentResult}`;
      const banner = buildPaymentReturnBanner(paymentResult, payment);
      setActiveTab('schedule');
      showPaymentToast(banner, toastId);
      void loadData();
      router.replace('/mentor-matching', { scroll: false });
    };

    void handlePaymentReturn();
  }, [loadData, paymentId, paymentResult, router]);

  const openReviewForBooking = useCallback(async (booking: BookingSession) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    try {
      const status = await mentorService.getBookingReviewStatus(token, booking.id);
      setReviewStatuses((current) => ({ ...current, [booking.id]: status }));
      if (status.reviewed) {
        toast.info('Bạn đã đánh giá mentor cho buổi học này.');
        return;
      }
      if (!status.eligible) {
        toast.warning(status.reason || 'Chưa thể đánh giá buổi học này.');
        return;
      }
      setReviewTarget(booking);
      setReviewTargetStatus(status);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở form đánh giá.');
    }
  }, []);

  const applyBookingUpdate = useCallback((updatedBooking: BookingSession) => {
    setBookings((current) => {
      let didUpdate = false;
      const nextBookings = current.map((booking) => {
        if (booking.id !== updatedBooking.id) return booking;
        didUpdate = true;
        return updatedBooking;
      });
      return didUpdate ? nextBookings : [updatedBooking, ...nextBookings];
    });
    setRescheduleTarget((current) => (current?.id === updatedBooking.id ? updatedBooking : current));
    setReviewTarget((current) => (current?.id === updatedBooking.id ? updatedBooking : current));
  }, []);

  const refreshSilently = useCallback(() => loadData({ silent: true }), [loadData]);

  useBookingRealtimeSync({
    onBookingUpdated: applyBookingUpdate,
    onRefresh: refreshSilently,
  });

  useEffect(() => {
    if (!reviewBookingId || bookings.length === 0) return;
    const booking = bookings.find((item) => item.id === reviewBookingId);
    if (!booking) return;
    setActiveTab('schedule');
    void openReviewForBooking(booking);
    router.replace('/mentor-matching', { scroll: false });
  }, [bookings, openReviewForBooking, reviewBookingId, router]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    let active = true;
    Promise.all([careerTagsService.getCareers(token), careerTagsService.getSkillTags(token)])
      .then(([careers, skills]) => {
        if (!active) return;
        setCareerCatalog(careers.data);
        setSkillTags(skills);
      })
      .catch(() => {
        if (!active) return;
        setCareerCatalog([]);
        setSkillTags([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleSkillTags = useMemo(() => {
    if (!selectedCareerId) return skillTags.slice(0, 24);
    return skillTags.filter((skill) => skill.careerIds?.includes(selectedCareerId));
  }, [selectedCareerId, skillTags]);

  const selectedCareer = useMemo(
    () => careerCatalog.find((career) => getCareerId(career) === selectedCareerId),
    [careerCatalog, selectedCareerId],
  );

  const selectedSkill = useMemo(
    () => skillTags.find((skill) => skill.slug === selectedSkillSlug),
    [selectedSkillSlug, skillTags],
  );
  const trialQuotaView = useMemo(() => buildTrialQuotaView(subscription), [subscription]);

  const activeFilterCount = Number(Boolean(selectedCareerId)) + Number(Boolean(selectedSkillSlug));

  const filteredMentors = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return mentors.filter((mentor) => {
      const careerMatch =
        !selectedCareerId ||
        mentor.mentoringExpertise?.careerExpertise?.some(
          (career) => career.careerId === selectedCareerId || career.careerTitle === selectedCareerId,
        );
      const skillMatch =
        !selectedSkillSlug ||
        mentor.mentoringExpertise?.skillExpertise?.some((skill) => skill.skillName === selectedSkill?.name);
      if (!careerMatch || !skillMatch) return false;
      if (!keyword) return true;
      const text = [
        mentor.professionalBackground?.currentPosition,
        mentor.professionalBackground?.company,
        mentor.mentorUser?.name,
        mentor.mentorUser?.email,
        mentor.mentoringExpertise?.careerExpertise?.map((item) => item.careerTitle).join(' '),
        mentor.mentoringExpertise?.skillExpertise?.map((item) => item.skillName).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(keyword);
    });
  }, [mentors, search, selectedCareerId, selectedSkillSlug, selectedSkill]);

  return (
    <>
      <div className="min-h-screen bg-muted/20 pb-20">
        <section className="border-b border-border bg-background">
          <div className="container py-5 md:py-7">
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <GraduationCap className="h-4 w-4" />
                  Mentor được admin xác thực
                </span>
                <h1 className="font-display text-2xl font-bold leading-tight md:text-4xl">Kết nối với mentor</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  Đặt lịch 1-1, thanh toán qua SePay và theo dõi trạng thái xác nhận từ mentor.
                </p>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      icon: Users,
                      label: 'Mentor đang hoạt động',
                      value: mentors.length.toString(),
                      detail: 'Sẵn sàng nhận lịch',
                      meta: undefined,
                    },
                    {
                      icon: Calendar,
                      label: 'Booking của tôi',
                      value: bookings.length.toString(),
                      detail: 'Theo dõi trong lịch',
                      meta: undefined,
                    },
                    {
                      icon: CheckCircle2,
                      label: 'Trial còn lại',
                      value: trialQuotaView.value,
                      detail: trialQuotaView.detail,
                      meta: trialQuotaView.resetLabel,
                    },
                  ].map(({ icon: Icon, label, value, detail, meta }) => (
                    <div key={label} className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-muted-foreground">{label}</p>
                          <p className={cn('mt-1 font-bold leading-none text-foreground', value.length > 8 ? 'text-base' : 'text-xl')}>
                            {value}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
                          {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <p className="mt-3 font-display text-lg font-bold">Muốn trở thành mentor?</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tạo hồ sơ để admin duyệt, mở lịch tư vấn và nhận booking từ học viên phù hợp.
                </p>
                <Button asChild className="mt-4 w-full justify-center rounded-lg">
                  <Link href="/mentor-dashboard/profile">
                    Tạo hồ sơ mentor
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </aside>
            </div>
          </div>
        </section>

        <div className="container mt-4 space-y-4">
          {syncingPaymentId ? (
            <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang đồng bộ thanh toán {syncingPaymentId}
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MentorUserTab)} className="space-y-4">
            <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-lg border border-border bg-background p-1">
              <TabsTrigger
                value="browse"
                className="gap-2 rounded-md py-2 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Users className="h-4 w-4" />
                Khám phá mentor
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="gap-2 rounded-md py-2 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Calendar className="h-4 w-4" />
                Lịch của tôi
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {bookings.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-3 pt-0">
              <section className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">Tìm mentor phù hợp</h2>
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? 'Đang tải danh sách mentor...' : `${filteredMentors.length} mentor phù hợp bộ lọc`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] lg:items-end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Tìm kiếm</p>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Vị trí, công ty, kỹ năng..."
                        className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <FilterDropdown
                    label="Nghề"
                    placeholder="Chọn nghề"
                    searchPlaceholder="Tìm nghề..."
                    emptyText="Không tìm thấy nghề phù hợp."
                    options={careerCatalog.map((career) => ({
                      value: getCareerId(career),
                      label: career.title,
                      meta: career.category,
                    }))}
                    value={selectedCareerId}
                    onChange={(value) => {
                      setSelectedCareerId(value);
                      setSelectedSkillSlug('');
                    }}
                  />
                  <FilterDropdown
                    label="Kỹ năng"
                    placeholder="Chọn kỹ năng"
                    searchPlaceholder="Tìm kỹ năng..."
                    emptyText="Không tìm thấy kỹ năng phù hợp."
                    options={visibleSkillTags.map((skill) => ({
                      value: skill.slug,
                      label: skill.name,
                      meta: skill.careerTitles?.join(', '),
                    }))}
                    value={selectedSkillSlug}
                    onChange={setSelectedSkillSlug}
                    disabled={visibleSkillTags.length === 0}
                  />
                  <div className="flex lg:pt-7">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-lg lg:w-auto"
                      disabled={!activeFilterCount && !search.trim()}
                      onClick={() => {
                        setSearch('');
                        setSelectedCareerId('');
                        setSelectedSkillSlug('');
                      }}
                    >
                      Xóa lọc
                    </Button>
                  </div>
                </div>

                {(search.trim() || selectedCareer || selectedSkill) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {search.trim() && (
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        Từ khóa: {search.trim()}
                      </span>
                    )}
                    {selectedCareer && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        Nghề: {selectedCareer.title}
                      </span>
                    )}
                    {selectedSkill && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        Kỹ năng: {selectedSkill.name}
                      </span>
                    )}
                  </div>
                )}
              </section>

              {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

              {isLoading ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-background">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredMentors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
                  <p className="font-semibold">Chưa có mentor phù hợp</p>
                  <p className="mt-1 text-sm text-muted-foreground">Thử đổi từ khóa hoặc bỏ bớt bộ lọc để xem thêm mentor.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredMentors.map((mentor) => (
                    <MentorCard
                      key={mentor.id}
                      mentor={mentor}
                      onBook={setActiveMentor}
                      onViewProfile={setProfileMentor}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 pt-0">
              <BookingList
                bookings={bookings}
                reviewStatuses={reviewStatuses}
                onReview={openReviewForBooking}
                onOpenChat={openBookingChat}
                onOpenReschedule={setRescheduleTarget}
              />
              <section className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Quy trình thanh toán
                </div>
                Booking có phí sẽ ở trạng thái chờ thanh toán. Sau khi SePay xác nhận thành công, booking mới vào hàng chờ mentor xác nhận.
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AnimatePresence>
        {profileMentor && (
          <MentorProfileModal
            mentor={profileMentor}
            onClose={() => setProfileMentor(null)}
            onBook={(mentor) => {
              setProfileMentor(null);
              setActiveMentor(mentor);
            }}
          />
        )}
        {activeMentor && (
          <BookingModal
            mentor={activeMentor}
            onClose={() => setActiveMentor(null)}
            onBooked={() => {
              setActiveTab('schedule');
              void loadData();
            }}
            wallet={wallet}
            useEdumeeCredit={useEdumeeCredit}
            onUseEdumeeCreditChange={setUseEdumeeCredit}
          />
        )}
        {reviewTarget && (
          <ReviewModal
            booking={reviewTarget}
            reviewStatus={reviewTargetStatus}
            onClose={() => {
              setReviewTarget(null);
              setReviewTargetStatus(null);
            }}
            onSubmitted={() => {
              setReviewTarget(null);
              setReviewTargetStatus(null);
              void loadData();
            }}
          />
        )}
        {rescheduleTarget && (
          <MenteeRescheduleModal
            booking={rescheduleTarget}
            onClose={() => setRescheduleTarget(null)}
            onUpdated={applyBookingUpdate}
            onRefresh={() => loadData({ silent: true })}
          />
        )}
      </AnimatePresence>
    </>
  );
}
