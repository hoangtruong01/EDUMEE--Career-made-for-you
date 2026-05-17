'use client';

import { Button } from '@/components/ui/button';
import { useBookingChat } from '@/context/booking-chat-context';
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
import { authStorage } from '@/lib/auth-storage';
import { careerTagsService, type CareerTag, type SkillTag } from '@/lib/career-tags.service';
import { paymentService, type PaymentRecord, type PaymentStatus } from '@/lib/payment.service';
import { walletService, type WalletAccount } from '@/lib/wallet.service';
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
  AlertCircle,
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

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ xác nhận',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  refund_pending: 'Chờ hoàn tiền',
};

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'rescheduled'];

type RescheduleProposal = NonNullable<BookingSession['rescheduleProposals']>[number];

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
  payment?: PaymentRecord | null;
};

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
      payment,
    };
  }

  if (payment?.status === 'pending') {
    return {
      tone: 'warning',
      title: 'Thanh toán đang chờ xác nhận',
      description: 'SePay chưa trả kết quả cuối cùng. Bạn có thể làm mới lại sau ít phút.',
      payment,
    };
  }

  if (payment?.status === 'failed' || payment?.status === 'cancelled') {
    return {
      tone: 'error',
      title: 'Thanh toán chưa hoàn tất',
      description: 'Booking chưa được gửi sang mentor. Bạn có thể đặt lại khi sẵn sàng.',
      payment,
    };
  }

  if (payment?.status === 'refunded') {
    return {
      tone: 'warning',
      title: 'Thanh toán đã hoàn tiền',
      description: 'Giao dịch này đã được hoàn tiền và booking liên quan không còn hiệu lực.',
      payment,
    };
  }

  if (result === 'success') {
    return {
      tone: 'info',
      title: 'Đã quay lại từ SePay',
      description: 'Hệ thống đang chờ gateway xác nhận thanh toán.',
      payment,
    };
  }

  return {
    tone: 'error',
    title: result === 'cancel' ? 'Bạn đã hủy thanh toán' : 'Thanh toán gặp lỗi',
    description: 'Booking chưa được thanh toán. Bạn có thể tạo giao dịch mới trên trang mentor.',
    payment,
  };
}

function showPaymentToast(banner: MentorPaymentBanner, toastId: string): void {
  if (banner.tone === 'success') {
    toast.success(banner.title, { id: toastId });
    return;
  }
  if (banner.tone === 'warning') {
    toast.warning(banner.title, { id: toastId });
    return;
  }
  if (banner.tone === 'error') {
    toast.error(banner.title, { id: toastId });
    return;
  }
  toast.info(banner.title, { id: toastId });
}

function getPaymentStatusClassName(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'failed':
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'refunded':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
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

function getSessionTypes(profile: TutorProfile): MentorSessionType[] {
  const fromAvailability = profile.availability?.sessionPreferences?.sessionTypes || [];
  const fromPricing = profile.pricing?.sessionRates?.map((rate) => rate.sessionType) || [];
  return Array.from(new Set([...fromAvailability, ...fromPricing])).filter(Boolean);
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
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-11 w-full justify-between rounded-xl border-primary/20 bg-primary/5 px-3 text-left font-semibold text-foreground shadow-soft transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary disabled:border-border disabled:bg-muted disabled:text-muted-foreground dark:border-primary/25 dark:bg-primary/10 dark:hover:bg-primary/15',
              open && 'border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/20',
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
          className="glass-card w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-primary/20 p-1 shadow-elevated"
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
                          active && 'bg-gradient-hero border-transparent text-primary-foreground shadow-soft',
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

function PaymentReturnBanner({ banner }: { banner: MentorPaymentBanner }) {
  const Icon = banner.tone === 'success' ? CheckCircle2 : banner.tone === 'error' ? AlertCircle : Clock;
  const toneClass =
    banner.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : banner.tone === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : banner.tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:flex-row sm:items-start sm:justify-between ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-1 opacity-80">{banner.description}</p>
        </div>
      </div>
      {banner.payment ? (
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClassName(banner.payment.status)}`}>
          {PAYMENT_STATUS_LABELS[banner.payment.status]}
        </span>
      ) : null}
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex flex-col overflow-hidden rounded-2xl"
    >
      <div className="bg-gradient-hero h-20" />
      <div className="flex flex-1 flex-col p-5">
        <div className="-mt-12 mb-4 flex items-end justify-between">
          <MentorAvatar mentor={mentor} />
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Đã xác thực
          </span>
        </div>

        <div className="mb-3">
          <h3 className="font-display text-lg font-bold">{getMentorName(mentor)}</h3>
          <p className="text-muted-foreground text-sm">
            {getMentorTitle(mentor)}
            {' · '}
            {mentor.professionalBackground?.company || 'Độc lập'} -{' '}
            {mentor.professionalBackground?.yearsOfExperience || 0} năm kinh nghiệm
          </p>
        </div>

        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {careers.map((career) => (
            <span key={career.careerTitle} className="rounded-full bg-muted px-2.5 py-1">
              {career.careerTitle}
            </span>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill.skillName}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {skill.skillName}
            </span>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0">
              <RatingDisplay mentor={mentor} compact />
            </span>
            <span className="shrink-0 font-bold text-primary">
              {formatMoney(rate?.pricePerSession, mentor.pricing?.currency)}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Button className="min-w-0 w-full justify-center whitespace-nowrap" variant="outline" onClick={() => onViewProfile(mentor)}>
              <Eye className="h-4 w-4 shrink-0" />
              Xem profile
            </Button>
            <Button className="min-w-0 w-full justify-center whitespace-nowrap" variant="hero" onClick={() => onBook(mentor)}>
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
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
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
  wallet: WalletAccount | null;
  useEdumeeCredit: boolean;
  onUseEdumeeCreditChange: (value: boolean) => void;
}) {
  const token = authStorage.getAccessToken();
  const sessionTypes = getSessionTypes(mentor);
  const [slots, setSlots] = useState<MentorAvailabilitySlot[]>([]);
  const [sessionType, setSessionType] = useState<MentorSessionType>(sessionTypes[0] || 'general_mentoring');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [topics, setTopics] = useState('');
  const [currentSituation, setCurrentSituation] = useState('');
  const [desiredOutcomes, setDesiredOutcomes] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  useEffect(() => {
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
  }, [mentor.userId, token]);

  const submit = async () => {
    if (!selectedSlotId || !topics.trim() || !currentSituation.trim() || !desiredOutcomes.trim()) {
      setMessage('Vui lòng chọn khung giờ và nhập đủ nội dung cần trao đổi.');
      return;
    }

    const payload: CreateBookingPayload = {
      tutorProfileId: mentor.id,
      availabilitySlotId: selectedSlotId,
      sessionType,
      schedulingDetails: {
        requestedDateTime: new Date().toISOString(),
        duration: 0,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'platform_built_in',
      },
      bookingRequest: {
        topicsToDiscuss: topics.split(',').map((item) => item.trim()).filter(Boolean),
        currentSituation,
        desiredOutcomes: desiredOutcomes.split(',').map((item) => item.trim()).filter(Boolean),
        additionalNotes: message,
        isFirstSession: true,
        urgencyLevel: 'medium',
      },
      paymentReturnUrls: buildMentorPaymentReturnUrls(),
      useEdumeeCredit,
    };

    setIsSubmitting(true);
    setMessage('');
    try {
      const result = await mentorService.createBooking(token, payload);
      onBooked();
      if (result.payment?.redirectUrl) {
        window.location.href = result.payment.redirectUrl;
        return;
      }
      setMessage('Đặt lịch thành công. Mentor sẽ xác nhận lịch sớm.');
    } catch (error) {
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
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
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
              <p className="text-xs text-muted-foreground">Mỗi khung giờ chỉ có 1 học viên được giữ chỗ.</p>
            </div>
          </div>

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

          <label className="space-y-1 text-sm font-medium">
            Chủ đề cần trao đổi
            <input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder="Ví dụ: CV, phỏng vấn, lộ trình backend"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium">
            Tình huống hiện tại
            <textarea
              value={currentSituation}
              onChange={(event) => setCurrentSituation(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium">
            Kết quả mong muốn
            <textarea
              value={desiredOutcomes}
              onChange={(event) => setDesiredOutcomes(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <span>
              <span className="block font-semibold text-emerald-800 dark:text-emerald-200">Dùng Số dư Edumee</span>
              <span className="text-emerald-700/80 dark:text-emerald-200/80">
                Khả dụng {formatMoney(wallet?.availableBalance || 0, wallet?.currency || 'VND')}
              </span>
            </span>
            <input
              type="checkbox"
              checked={useEdumeeCredit}
              onChange={(event) => onUseEdumeeCreditChange(event.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
          </label>

          {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button className="flex-1" variant="hero" onClick={submit} disabled={isSubmitting || !selectedSlotId}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận và thanh toán
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
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
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
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
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
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="mb-4 font-display text-xl font-bold">Lịch của tôi</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có booking nào.</p>
      ) : (
        <div className="space-y-3">
          {bookings.slice(0, 5).map((booking) => {
            const meetingHref = booking.schedulingDetails.meetingLink || '';
            const reviewStatus = reviewStatuses[booking.id];
            const pendingProposal = getPendingRescheduleProposal(booking);
            const canOpenReschedule = ACTIVE_BOOKING_STATUSES.includes(booking.status);
            const rescheduleLabel = pendingProposal
              ? pendingProposal.proposedByRole === 'mentor'
                ? 'Phản hồi đổi lịch'
                : 'Xem đề xuất đổi lịch'
              : 'Đề xuất đổi lịch';

            return (
              <div key={booking.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{booking.sessionType.replace(/_/g, ' ')}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {statusLabel[booking.status] || booking.status}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {new Date(
                    booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
                  ).toLocaleString('vi-VN')}{' '}
                  - {booking.schedulingDetails.duration} phút
                </p>
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
              </div>
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
  const [mentors, setMentors] = useState<TutorProfile[]>([]);
  const [bookings, setBookings] = useState<BookingSession[]>([]);
  const [careerCatalog, setCareerCatalog] = useState<CareerTag[]>([]);
  const [skillTags, setSkillTags] = useState<SkillTag[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [selectedSkillSlug, setSelectedSkillSlug] = useState('');
  const [activeMentor, setActiveMentor] = useState<TutorProfile | null>(null);
  const [profileMentor, setProfileMentor] = useState<TutorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [paymentBanner, setPaymentBanner] = useState<MentorPaymentBanner | null>(null);
  const [syncingPaymentId, setSyncingPaymentId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
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
      setPaymentBanner(banner);
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

  const filteredMentors = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return mentors.filter((mentor) => {
      const careerMatch =
        !selectedCareerId ||
        mentor.mentoringExpertise?.careerExpertise?.some(
          (career) => career.careerId === selectedCareerId || career.careerTitle === selectedCareerId,
        );
      const selectedSkill = skillTags.find((skill) => skill.slug === selectedSkillSlug);
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
  }, [mentors, search, selectedCareerId, selectedSkillSlug, skillTags]);

  return (
    <>
      <div className="min-h-screen pb-20">
        <div className="bg-gradient-card">
          <div className="container py-10">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <GraduationCap className="h-4 w-4" />
                Mentor được admin xác thực
              </span>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Kết nối với mentor</h1>
              <p className="mt-2 text-muted-foreground">
                Đặt lịch 1-1, thanh toán qua SePay và theo dõi trạng thái xác nhận từ mentor.
              </p>
            </div>
          </div>
        </div>

        <div className="container mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Users, label: 'Mentor đang hoạt động', value: mentors.length.toString() },
              { icon: Calendar, label: 'Booking của tôi', value: bookings.length.toString() },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-card rounded-2xl p-4 text-center">
                <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {paymentBanner ? <PaymentReturnBanner banner={paymentBanner} /> : null}
          {syncingPaymentId ? (
            <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang đồng bộ thanh toán {syncingPaymentId}
            </div>
          ) : null}

          <section className="rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Muốn trở thành mentor?</h2>
                <p className="text-sm text-muted-foreground">
                  Tạo hồ sơ mentor riêng để admin duyệt và bắt đầu mở lịch tư vấn.
                </p>
              </div>
              <Link href="/mentor-dashboard/profile">
                <Button variant="outline">
                  Tạo hồ sơ mentor
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo vị trí, công ty, kỹ năng..."
                  className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <section className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">Lọc theo nghề và kỹ năng</h2>
                    <p className="text-xs text-muted-foreground">Tag được lấy từ bảng career và skill_tags.</p>
                  </div>
                  {(selectedCareerId || selectedSkillSlug) && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary"
                      onClick={() => {
                        setSelectedCareerId('');
                        setSelectedSkillSlug('');
                      }}
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
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
                </div>
              </section>

              {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

              {isLoading ? (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-border">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredMentors.length === 0 ? (
                <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
                  Chưa có mentor phù hợp.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
            </div>

            <aside className="space-y-5">
              <BookingList
                bookings={bookings}
                reviewStatuses={reviewStatuses}
                onReview={openReviewForBooking}
                onOpenChat={openBookingChat}
                onOpenReschedule={setRescheduleTarget}
              />
              <section className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="h-4 w-4" />
                  Quy trình thanh toán
                </div>
                Booking có phí sẽ ở trạng thái chờ thanh toán. Sau khi SePay xác nhận thành công, booking mới vào hàng chờ mentor xác nhận.
              </section>
            </aside>
          </div>
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
            onBooked={loadData}
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
