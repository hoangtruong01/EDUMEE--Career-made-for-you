'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useBookingChat } from '@/context/booking-chat-context';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  type MentorPortalData,
  mentorPortalQueryKey,
  mentorPortalReviewsQueryKey,
  updateMentorPortalBookingCache,
  useMentorPortalData,
  useMentorPortalReviews,
} from '@/hooks/useMentorPortalData';
import { useBookingRealtimeSync } from '@/hooks/useBookingRealtimeSync';
import { authStorage } from '@/lib/auth-storage';
import { careerTagsService, type CareerTag, type SkillTag } from '@/lib/career-tags.service';
import {
  BookingSession,
  ApplyTutorProfilePayload,
  MentorAvailabilitySlot,
  mentorService,
  SessionReview,
  TutorProfile,
} from '@/lib/mentor.service';
import { paymentService, type MentorIncomeEntry, type MentorIncomeResponse } from '@/lib/payment.service';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  HandCoins,
  Loader2,
  MessageSquare,
  Percent,
  Plus,
  Repeat,
  ReceiptText,
  Star,
  Trash2,
  UserCheck,
  Video,
  WalletCards,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

const profileStatusLabel: Record<string, string> = {
  pending_approval: 'Chờ admin duyệt',
  active: 'Đang hoạt động',
  inactive: 'Tạm ẩn',
  suspended: 'Bị tạm khóa',
  rejected: 'Bị từ chối',
};

const statusTone: Record<string, string> = {
  awaiting_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  pending: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled_by_mentee: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  cancelled_by_mentor: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  rescheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
};

const EMPTY_MENTOR_BOOKINGS: BookingSession[] = [];
const EMPTY_MENTOR_SLOTS: MentorAvailabilitySlot[] = [];
const EMPTY_MENTOR_REVIEWS: SessionReview[] = [];

const mentorIncomeQueryKey = (accessToken: string) => ['mentorIncome', accessToken] as const;

function formatMoney(amount?: number, currency = 'VND') {
  if (!amount) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMentorName(profile?: TutorProfile | null) {
  return profile?.professionalBackground?.currentPosition || 'Hồ sơ mentor';
}

function getPrimaryRate(profile?: TutorProfile | null) {
  return profile?.pricing?.sessionRates?.[0];
}

function useMentorIncome(enabled: boolean) {
  const { accessToken, isAuthenticated, isHydrated } = useAuth();

  return useQuery({
    queryKey: mentorIncomeQueryKey(accessToken),
    queryFn: () => paymentService.getMentorIncome(accessToken, { range: 'year', limit: 50 }),
    enabled: enabled && isHydrated && isAuthenticated && Boolean(accessToken),
  });
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCareerId(career: CareerTag) {
  return career.id || career._id || career.title;
}

function createMentorApplicationForm(profile?: TutorProfile | null) {
  const firstRate = profile?.pricing?.sessionRates?.[0];
  return {
    currentPosition: profile?.professionalBackground?.currentPosition || '',
    company: profile?.professionalBackground?.company || '',
    yearsOfExperience: String(profile?.professionalBackground?.yearsOfExperience ?? 3),
    industries: profile?.professionalBackground?.industries?.join(', ') || '',
    specializations: profile?.mentoringExpertise?.specializations?.join(', ') || '',
    price: String(firstRate?.pricePerSession ?? 200000),
  };
}

function PortalPanel({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">{title}</h2>}
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-white', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{value}</p>
    </article>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-sky-500/10"
      />
    </label>
  );
}

function TagPicker({
  label,
  emptyText,
  options,
  selected,
  onToggle,
}: {
  label: string;
  emptyText: string;
  options: { value: string; label: string; meta?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const triggerLabel =
    selectedOptions.length === 0
      ? 'Chọn mục phù hợp'
      : selectedOptions.length <= 2
        ? selectedOptions.map((option) => option.label).join(', ')
        : `${selectedOptions.length} mục đã chọn`;

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyText}
        </div>
      ) : (
        <>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-11 w-full min-w-0 justify-between rounded-xl border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-700 focus-visible:text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-200 dark:focus-visible:text-slate-200"
              >
                <span className={cn('truncate', selectedOptions.length === 0 && 'text-slate-400')}>
                  {triggerLabel}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] origin-[var(--radix-popover-content-transform-origin)] overflow-hidden rounded-xl border-slate-200 p-0 shadow-lg duration-300 ease-out will-change-[transform,opacity] data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300 data-[side=bottom]:slide-in-from-top-3 data-[side=bottom]:data-[state=closed]:slide-out-to-top-2 dark:border-slate-700"
            >
              <Command>
                <CommandInput placeholder={`Tìm ${label.toLowerCase()}...`} />
                <CommandList className="max-h-72">
                  <CommandEmpty>Không tìm thấy mục phù hợp.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => {
                      const active = selected.includes(option.value);
                      return (
                        <CommandItem
                          key={option.value}
                          value={`${option.label} ${option.meta || ''}`}
                          onSelect={() => onToggle(option.value)}
                          className={cn(
                            "gap-2 transition-[background-color,color,transform] duration-200 ease-out data-[selected='true']:translate-x-0.5 data-[selected='true']:bg-primary/10 data-[selected='true']:text-primary data-[selected=true]:translate-x-0.5 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
                            active && 'bg-primary/5 text-primary',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded border transition-all duration-200 ease-out',
                              active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-slate-300 text-transparent dark:border-slate-600',
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{option.label}</span>
                            {option.meta && (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                {option.meta}
                              </span>
                            )}
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/10 dark:text-primary"
                  title={option.meta}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ApplyMentorForm({
  onSubmitted,
  profile = null,
}: {
  onSubmitted: () => void;
  profile?: TutorProfile | null;
}) {
  const token = authStorage.getAccessToken();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(() => createMentorApplicationForm(profile));
  const [careerCatalog, setCareerCatalog] = useState<CareerTag[]>([]);
  const [skillTags, setSkillTags] = useState<SkillTag[]>([]);
  const [selectedCareerIds, setSelectedCareerIds] = useState<string[]>([]);
  const [selectedSkillSlugs, setSelectedSkillSlugs] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const isEditing = Boolean(profile?.id);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let active = true;
    setIsLoadingTags(true);
    Promise.all([careerTagsService.getCareers(token), careerTagsService.getSkillTags(token)])
      .then(([careers, skills]) => {
        if (!active) return;
        setCareerCatalog(careers.data);
        setSkillTags(skills);
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách nghề và kỹ năng.');
      })
      .finally(() => {
        if (active) setIsLoadingTags(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!profile) return;

    setForm(createMentorApplicationForm(profile));

    const careerIds = (profile.mentoringExpertise?.careerExpertise || [])
      .map((item) => {
        const matchedCareer = careerCatalog.find((career) => career.title === item.careerTitle);
        return item.careerId || (matchedCareer ? getCareerId(matchedCareer) : item.careerTitle);
      })
      .filter(Boolean) as string[];
    const skillSlugs = (profile.mentoringExpertise?.skillExpertise || [])
      .map((item) => skillTags.find((skill) => skill.name === item.skillName)?.slug)
      .filter(Boolean) as string[];

    setSelectedCareerIds(careerIds);
    setSelectedSkillSlugs(skillSlugs);
  }, [careerCatalog, profile, skillTags]);

  const selectedCareers = useMemo(
    () => careerCatalog.filter((career) => selectedCareerIds.includes(getCareerId(career))),
    [careerCatalog, selectedCareerIds],
  );

  const availableSkillTags = useMemo(() => {
    if (selectedCareerIds.length === 0) return skillTags;
    return skillTags.filter((skill) => skill.careerIds?.some((careerId) => selectedCareerIds.includes(careerId)));
  }, [selectedCareerIds, skillTags]);

  const selectedSkillTags = useMemo(
    () => skillTags.filter((skill) => selectedSkillSlugs.includes(skill.slug)),
    [selectedSkillSlugs, skillTags],
  );

  const toggleCareer = (careerId: string) => {
    setSelectedCareerIds((prev) =>
      prev.includes(careerId) ? prev.filter((id) => id !== careerId) : [...prev, careerId],
    );
  };

  const toggleSkill = (slug: string) => {
    setSelectedSkillSlugs((prev) =>
      prev.includes(slug) ? prev.filter((id) => id !== slug) : [...prev, slug],
    );
  };

  const checklist = [
    { label: 'Thông tin nghề nghiệp', done: !!form.currentPosition && !!form.company },
    { label: 'Chuyên môn mentor', done: selectedCareerIds.length > 0 && selectedSkillSlugs.length > 0 },
    { label: 'Giá & phiên tư vấn', done: !!form.price },
  ];

  const submit = async () => {
    if (!form.currentPosition || !form.company || selectedCareers.length === 0 || selectedSkillTags.length === 0) {
      setMessage('Vui lòng nhập đủ vị trí, công ty, nghề và kỹ năng mentor.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const payload: ApplyTutorProfilePayload = {
        professionalBackground: {
          currentPosition: form.currentPosition,
          company: form.company,
          yearsOfExperience: Number(form.yearsOfExperience) || 0,
          industries: splitList(form.industries),
          seniority: 'mid_level',
        },
        mentoringExpertise: {
          careerExpertise: selectedCareers.map((career) => ({
            careerId: getCareerId(career),
            careerTitle: career.title,
            experienceLevel: 'mid_level',
            yearsInField: Number(form.yearsOfExperience) || 0,
            confidenceLevel: 4,
          })),
          skillExpertise: selectedSkillTags.map((skill) => ({
            skillName: skill.name,
            skillCategory: skill.category,
            proficiencyLevel: 4,
            teachingExperience: 1,
          })),
          specializations: splitList(form.specializations),
          targetMenteeLevels: ['entry_level', 'mid_level'],
        },
        availability: {
          timeZone: 'Asia/Ho_Chi_Minh',
          weeklyAvailability: [
            {
              day: 'saturday',
              timeSlots: [{ startTime: '09:00', endTime: '17:00', available: true }],
            },
          ],
          sessionPreferences: {
            preferredDuration: [60, 90],
            sessionTypes: ['career_guidance', 'skill_coaching', 'interview_preparation'],
            communicationMethods: ['video'],
          },
        },
        pricing: {
          currency: 'VND',
          sessionRates: [
            { sessionType: 'career_guidance', duration: 60, pricePerSession: Number(form.price) || 0 },
            { sessionType: 'skill_coaching', duration: 60, pricePerSession: Number(form.price) || 0 },
          ],
          freeSessionOffered: false,
        },
      };
      if (profile?.id) {
        await mentorService.updateTutorProfile(token, profile.id, payload);
      } else {
        await mentorService.applyTutorProfile(token, payload);
      }
      setMessage(
        isEditing
          ? 'Đã gửi lại hồ sơ mentor. Admin sẽ duyệt trước khi mở portal.'
          : 'Đã gửi hồ sơ mentor. Admin sẽ duyệt trước khi hồ sơ hiển thị công khai.',
      );
      onSubmitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi hồ sơ mentor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <PortalPanel
          id="profile"
          title={isEditing ? 'Cập nhật hồ sơ mentor' : 'Đăng ký làm mentor'}
          description={
            isEditing
              ? 'Cập nhật thông tin rồi gửi lại để admin xét duyệt hồ sơ mentor.'
              : 'Hoàn thiện hồ sơ để admin xét duyệt. Sau khi được duyệt, bạn có thể mở lịch và nhận booking từ học viên.'
          }
        >
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Thông tin nghề nghiệp
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Vị trí hiện tại"
                  value={form.currentPosition}
                  placeholder="Ví dụ: Senior Frontend Engineer"
                  onChange={(value) => updateField('currentPosition', value)}
                />
                <TextInput
                  label="Công ty"
                  value={form.company}
                  placeholder="Ví dụ: Edumee"
                  onChange={(value) => updateField('company', value)}
                />
                <TextInput
                  label="Số năm kinh nghiệm"
                  type="number"
                  value={form.yearsOfExperience}
                  onChange={(value) => updateField('yearsOfExperience', value)}
                />
                <TextInput
                  label="Lĩnh vực, cách nhau bởi dấu phẩy"
                  value={form.industries}
                  placeholder="Công nghệ, giáo dục, sản phẩm"
                  onChange={(value) => updateField('industries', value)}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Chuyên môn mentor
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <TagPicker
                  label="Nghề có thể mentor"
                  emptyText={isLoadingTags ? 'Đang tải danh sách nghề...' : 'Chưa có dữ liệu nghề để chọn.'}
                  options={careerCatalog.map((career) => ({
                    value: getCareerId(career),
                    label: career.title,
                    meta: career.category,
                  }))}
                  selected={selectedCareerIds}
                  onToggle={toggleCareer}
                />
                <TagPicker
                  label="Kỹ năng mentor"
                  emptyText={
                    isLoadingTags
                      ? 'Đang tải danh sách kỹ năng...'
                      : selectedCareerIds.length === 0
                        ? 'Chọn nghề trước để xem kỹ năng gợi ý.'
                        : 'Các nghề đã chọn chưa có kỹ năng gợi ý.'
                  }
                  options={availableSkillTags.map((skill) => ({
                    value: skill.slug,
                    label: skill.name,
                    meta: skill.careerTitles?.join(', '),
                  }))}
                  selected={selectedSkillSlugs}
                  onToggle={toggleSkill}
                />
                <div className="lg:col-span-2">
                  <TextInput
                    label="Chuyên đề mentor"
                    value={form.specializations}
                    placeholder="CV, portfolio, roadmap, mock interview"
                    onChange={(value) => updateField('specializations', value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Giá & phiên tư vấn
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Giá mỗi buổi 60 phút"
                  type="number"
                  value={form.price}
                  onChange={(value) => updateField('price', value)}
                />
              </div>
            </div>
          </div>

          {message && (
            <p className="mt-5 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {message}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Gửi lại hồ sơ cho admin duyệt' : 'Gửi hồ sơ cho admin duyệt'}
            </Button>
          </div>
        </PortalPanel>
      </div>

      <aside className="space-y-5">
        <PortalPanel title="Tiến độ hồ sơ" description="Checklist giúp bạn biết phần nào đã sẵn sàng.">
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    item.done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        </PortalPanel>

        <PortalPanel title="Sau khi gửi hồ sơ" description="Admin sẽ kiểm tra thông tin và kích hoạt vai trò mentor nếu hồ sơ phù hợp." />
      </aside>
    </div>
  );
}

function ProfileStatusCard({ profile, onSubmitted }: { profile: TutorProfile; onSubmitted: () => void }) {
  const rejectedReason = profile.adminInfo?.rejectionReason;
  const isRejected = profile.status === 'rejected';
  const [isEditingRejectedProfile, setIsEditingRejectedProfile] = useState(false);

  return (
    <div className="space-y-6">
      <PortalPanel id="profile" title="Trạng thái xét duyệt" description="Portal mentor sẽ mở sau khi admin duyệt hồ sơ của bạn.">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-start">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              isRejected
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
            )}
          >
            {isRejected ? <XCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">
              {profileStatusLabel[profile.status] || profile.status}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hồ sơ {getMentorName(profile)} hiện chưa thể mở lịch tư vấn công khai. Bạn sẽ truy cập được portal sau khi hồ sơ được duyệt.
            </p>
            {rejectedReason && (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Lý do từ chối: {rejectedReason}
              </p>
            )}
            {isRejected && (
              <Button
                type="button"
                className="mt-4 bg-sky-600 hover:bg-sky-700"
                onClick={() => setIsEditingRejectedProfile((value) => !value)}
              >
                {isEditingRejectedProfile ? 'Ẩn form chỉnh sửa' : 'Cập nhật và gửi lại hồ sơ'}
              </Button>
            )}
          </div>
        </div>
      </PortalPanel>
      {isRejected && isEditingRejectedProfile ? <ApplyMentorForm profile={profile} onSubmitted={onSubmitted} /> : null}
    </div>
  );
}

const SLOT_MINUTES = 30;
const ROW_HEIGHT = 44;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 22;
const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'rescheduled'];
const SLOT_DURATION_OPTIONS = [30, 60, 90, 120] as const;

type ScheduleEntry = {
  id: string;
  slot?: MentorAvailabilitySlot;
  booking?: BookingSession;
  start: Date;
  end: Date;
  dayIndex: number;
  startIndex: number;
  span: number;
};

type SelectedCell = {
  dayIndex: number;
  rowIndex: number;
};

type MentorDataRefresh = (silent?: boolean) => Promise<MentorAvailabilitySlot[] | void>;
type BookingUpdateHandler = (booking: BookingSession) => void;

type BookingActionDialogState =
  | { type: 'cancel_booking'; booking: BookingSession }
  | { type: 'complete_booking'; booking: BookingSession }
  | { type: 'delete_slot'; slot: MentorAvailabilitySlot }
  | { type: 'decline_reschedule'; booking: BookingSession; proposalId: string };

function getBookingActionCopy(action: BookingActionDialogState) {
  switch (action.type) {
    case 'cancel_booking':
      return {
        title: 'Hủy booking này?',
        description: 'Booking sẽ được cập nhật ngay và slot liên quan sẽ được làm mới nhẹ.',
        confirmLabel: 'Hủy booking',
        reasonLabel: 'Lý do hủy booking',
        reasonPlaceholder: 'Nhập lý do để học viên hiểu rõ hơn...',
        icon: XCircle,
        destructive: true,
      };
    case 'complete_booking':
      return {
        title: 'Kết thúc buổi tư vấn?',
        description: 'Buổi tư vấn sẽ chuyển sang trạng thái đã hoàn thành và học viên có thể đánh giá mentor.',
        confirmLabel: 'Kết thúc buổi học',
        icon: CheckCircle2,
        destructive: false,
      };
    case 'delete_slot':
      return {
        title: 'Xóa slot lịch rảnh?',
        description: 'Slot trống này sẽ biến mất khỏi lịch làm việc của bạn.',
        confirmLabel: 'Xóa slot',
        icon: Trash2,
        destructive: true,
      };
    case 'decline_reschedule':
      return {
        title: 'Từ chối đề xuất đổi lịch?',
        description: 'Học viên sẽ nhận được phản hồi của bạn trong phần trao đổi booking.',
        confirmLabel: 'Từ chối đề xuất',
        reasonLabel: 'Lý do từ chối',
        reasonPlaceholder: 'Ví dụ: Khung giờ này chưa phù hợp, mình đề xuất giờ khác...',
        icon: XCircle,
        destructive: true,
      };
  }
}

function BookingActionDialog({
  action,
  reason,
  busy,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  action: BookingActionDialogState | null;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!action) return null;

  const copy = getBookingActionCopy(action);
  const Icon = copy.icon;
  const needsReason = action.type === 'cancel_booking' || action.type === 'decline_reschedule';

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div
            className={cn(
              'mb-2 flex h-11 w-11 items-center justify-center rounded-xl',
              copy.destructive
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {needsReason && (
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>{copy.reasonLabel}</span>
            <Textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              className="min-h-28 rounded-xl border-slate-200 bg-white text-slate-950 focus-visible:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-sky-500/10"
            />
          </label>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="button"
            variant={copy.destructive ? 'destructive' : 'default'}
            onClick={() => {
              void onConfirm();
            }}
            disabled={busy}
            className={copy.destructive ? undefined : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return startOfDay(addDays(date, day === 0 ? -6 : 1 - day));
}

function sameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function minutesFromMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function dateAtMinutes(day: Date, minutes: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
}

function formatScheduleTime(date: Date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatScheduleDate(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getBookingStart(booking: BookingSession) {
  return new Date(booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime);
}

function getBookingEnd(booking: BookingSession, start = getBookingStart(booking)) {
  return new Date(start.getTime() + booking.schedulingDetails.duration * 60_000);
}

type RescheduleProposal = NonNullable<BookingSession['rescheduleProposals']>[number];

function getPendingRescheduleProposal(booking: BookingSession): RescheduleProposal | null {
  return booking.rescheduleProposals?.find((proposal) => proposal.status === 'pending') || null;
}

function getProposalRoleLabel(role: RescheduleProposal['proposedByRole']) {
  return role === 'mentor' ? 'mentor' : 'học viên';
}

function getScheduleRange(slots: MentorAvailabilitySlot[], bookings: BookingSession[]) {
  const dates = [
    ...slots.flatMap((slot) => [new Date(slot.startAt), new Date(slot.endAt)]),
    ...bookings.flatMap((booking) => {
      const start = getBookingStart(booking);
      return [start, getBookingEnd(booking, start)];
    }),
  ].filter((date) => !Number.isNaN(date.getTime()));

  if (dates.length === 0) {
    return { startMinute: DEFAULT_START_HOUR * 60, endMinute: DEFAULT_END_HOUR * 60 };
  }

  const minMinute = Math.min(...dates.map(minutesFromMidnight));
  const maxMinute = Math.max(...dates.map(minutesFromMidnight));
  return {
    startMinute: Math.min(DEFAULT_START_HOUR * 60, Math.floor(minMinute / SLOT_MINUTES) * SLOT_MINUTES),
    endMinute: Math.max(DEFAULT_END_HOUR * 60, Math.ceil(maxMinute / SLOT_MINUTES) * SLOT_MINUTES),
  };
}

function buildTimeRows(startMinute: number, endMinute: number) {
  const rows: number[] = [];
  for (let minute = startMinute; minute < endMinute; minute += SLOT_MINUTES) rows.push(minute);
  return rows;
}

function rangesOverlap(start: Date, end: Date, entries: ScheduleEntry[]) {
  return entries.some((entry) => start < entry.end && end > entry.start);
}

function mapScheduleEntries(
  weekDays: Date[],
  slots: MentorAvailabilitySlot[],
  bookings: BookingSession[],
  startMinute: number,
) {
  const bookingsBySlot = new Map(bookings.map((booking) => [booking.availabilitySlotId, booking]));
  const mappedBookingIds = new Set<string>();
  const entries: ScheduleEntry[] = [];

  slots.forEach((slot) => {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    const dayIndex = weekDays.findIndex((day) => sameDay(day, start));
    if (dayIndex < 0 || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    const booking = bookingsBySlot.get(slot.id);
    if (booking) mappedBookingIds.add(booking.id);
    entries.push({
      id: `slot-${slot.id}`,
      slot,
      booking,
      start,
      end,
      dayIndex,
      startIndex: Math.max(0, Math.floor((minutesFromMidnight(start) - startMinute) / SLOT_MINUTES)),
      span: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINUTES * 60_000))),
    });
  });

  bookings.forEach((booking) => {
    if (mappedBookingIds.has(booking.id)) return;
    const start = getBookingStart(booking);
    const end = getBookingEnd(booking, start);
    const dayIndex = weekDays.findIndex((day) => sameDay(day, start));
    if (dayIndex < 0 || Number.isNaN(start.getTime())) return;

    entries.push({
      id: `booking-${booking.id}`,
      booking,
      start,
      end,
      dayIndex,
      startIndex: Math.max(0, Math.floor((minutesFromMidnight(start) - startMinute) / SLOT_MINUTES)),
      span: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINUTES * 60_000))),
    });
  });

  return entries.sort((first, second) => first.start.getTime() - second.start.getTime());
}

function getScheduleEntryTone(entry: ScheduleEntry) {
  if (entry.booking?.status === 'pending') {
    return 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200';
  }
  if (entry.booking?.status === 'confirmed') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200';
  }
  if (entry.booking) {
    return 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200';
  }
  if (entry.slot?.status === 'held') {
    return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200';
  }
  if (entry.slot?.status === 'booked') {
    return 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200';
  }
  if (entry.slot?.status === 'blocked') {
    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
  return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200';
}

function getScheduleEntryTitle(entry: ScheduleEntry) {
  if (entry.booking) return entry.booking.sessionType.replace(/_/g, ' ');
  if (entry.slot?.status === 'available') return 'Khung giờ trống';
  if (entry.slot?.status === 'held') return 'Đang giữ chỗ';
  if (entry.slot?.status === 'booked') return 'Đã có booking';
  return entry.slot?.status || 'Khung giờ';
}

function MentorScheduleTimetable({
  profile,
  slots,
  bookings,
  onChanged,
}: {
  profile: TutorProfile;
  slots: MentorAvailabilitySlot[];
  bookings: BookingSession[];
  onChanged: () => void | Promise<MentorAvailabilitySlot[] | void>;
}) {
  const token = authStorage.getAccessToken();
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const scheduleRange = useMemo(() => getScheduleRange(slots, bookings), [bookings, slots]);
  const timeRows = useMemo(
    () => buildTimeRows(scheduleRange.startMinute, scheduleRange.endMinute),
    [scheduleRange.endMinute, scheduleRange.startMinute],
  );
  const entries = useMemo(
    () => mapScheduleEntries(weekDays, slots, bookings, scheduleRange.startMinute),
    [bookings, scheduleRange.startMinute, slots, weekDays],
  );
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<(typeof SLOT_DURATION_OPTIONS)[number]>(60);
  const [createError, setCreateError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [actionDialog, setActionDialog] = useState<BookingActionDialogState | null>(null);
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const selectedEntry = selectedEntryId ? entries.find((entry) => entry.id === selectedEntryId) || null : null;
  const gridHeight = timeRows.length * ROW_HEIGHT;
  const selectedCellStart = selectedCell
    ? dateAtMinutes(weekDays[selectedCell.dayIndex], scheduleRange.startMinute + selectedCell.rowIndex * SLOT_MINUTES)
    : null;
  const selectedCellEnd = selectedCellStart
    ? new Date(selectedCellStart.getTime() + selectedDuration * 60_000)
    : null;
  const selectedCellEntries = selectedCell ? entries.filter((entry) => entry.dayIndex === selectedCell.dayIndex) : [];
  const selectedCellOverlaps =
    !!selectedCellStart && !!selectedCellEnd && rangesOverlap(selectedCellStart, selectedCellEnd, selectedCellEntries);
  const selectedCellInPast = !!selectedCellStart && selectedCellStart < new Date();
  const nowMinute = minutesFromMidnight(now);
  const showNowLine = nowMinute >= scheduleRange.startMinute && nowMinute <= scheduleRange.endMinute;
  const nowTop = ((nowMinute - scheduleRange.startMinute) / SLOT_MINUTES) * ROW_HEIGHT;

  const openCreatePopover = (cell: SelectedCell) => {
    const start = dateAtMinutes(weekDays[cell.dayIndex], scheduleRange.startMinute + cell.rowIndex * SLOT_MINUTES);
    if (start < new Date() || isSaving) return;

    setSelectedEntryId('');
    setSelectedCell(cell);
    setSelectedDuration(60);
    setCreateError('');
    setMessage('');
  };

  const createSlotFromCell = async () => {
    if (!selectedCell || !selectedCellStart || !selectedCellEnd) return;

    if (selectedCellInPast) {
      setCreateError('Không thể tạo khung giờ trong quá khứ.');
      return;
    }

    if (selectedCellOverlaps) {
      setCreateError('Khung giờ này đang trùng với lịch đã có.');
      return;
    }

    setIsSaving(true);
    setCreateError('');
    setMessage('');
    try {
      await mentorService.createAvailabilitySlot(token, {
        tutorProfileId: profile.id,
        startAt: selectedCellStart.toISOString(),
        endAt: selectedCellEnd.toISOString(),
        status: 'available',
      });
      setSelectedCell(null);
      setSelectedDuration(60);
      setMessage('Đã tạo khung giờ trống.');
      onChanged();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Không thể tạo khung giờ.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSlot = async (id: string) => {
    setBusyId(id);
    try {
      await mentorService.deleteAvailabilitySlot(token, id);
      setSelectedEntryId('');
      setMessage('Đã xóa khung giờ.');
      onChanged();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa khung giờ.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const confirmBooking = async (booking: BookingSession) => {
    setBusyId(booking.id);
    try {
      await mentorService.confirmBooking(token, booking.id);
      setMessage('Đã xác nhận booking.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xác nhận booking.');
    } finally {
      setBusyId('');
    }
  };

  const cancelBooking = async (booking: BookingSession, reason?: string) => {
    setBusyId(booking.id);
    try {
      await mentorService.cancelBooking(token, booking.id, reason);
      setMessage('Đã hủy booking.');
      onChanged();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy booking.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const closeActionDialog = () => {
    setActionDialog(null);
    setActionReason('');
  };

  const handleActionDialogConfirm = async () => {
    if (!actionDialog) return;

    let succeeded = false;
    if (actionDialog.type === 'cancel_booking') {
      succeeded = await cancelBooking(actionDialog.booking, actionReason.trim() || undefined);
    }
    if (actionDialog.type === 'delete_slot') {
      succeeded = await deleteSlot(actionDialog.slot.id);
    }

    if (succeeded) closeActionDialog();
  };

  return (
    <PortalPanel
      id="availability"
      title="Lịch làm việc"
      description="Click vào ô giờ trống để tạo khung giờ; booking và lịch trống được gom theo từng ngày, từng giờ."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold">Cách thêm lịch trống</p>
              <p className="mt-1 text-sky-700 dark:text-sky-200">
                Click vào ô giờ trống, chọn thời lượng, rồi bấm Tạo lịch trống.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white px-2.5 py-1 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
              Không chọn quá khứ
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
              Không chồng lịch
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
              Bấm tạo để lưu
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            Trống
          </span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            Chờ xác nhận
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Đang giữ
          </span>
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            Đổi lịch
          </span>
          {isSaving && (
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang lưu
            </span>
          )}
        </div>

        {message && (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {message}
          </p>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[72px_repeat(7,minmax(112px,1fr))] border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Giờ</div>
                {weekDays.map((day, index) => (
                  <div key={day.toISOString()} className="border-l border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{WEEKDAY_LABELS[index]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatScheduleDate(day)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[72px_repeat(7,minmax(112px,1fr))]">
                <div>
                  {timeRows.map((minute) => (
                    <div
                      key={minute}
                      className="border-b border-slate-100 px-2 py-1 text-right text-[11px] text-slate-400 dark:border-slate-800"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {minute % 60 === 0 ? `${String(Math.floor(minute / 60)).padStart(2, '0')}:00` : ''}
                    </div>
                  ))}
                </div>

                {weekDays.map((day, dayIndex) => (
                  <div
                    key={day.toISOString()}
                    className="relative border-l border-slate-200 dark:border-slate-800"
                    style={{ height: gridHeight }}
                  >
                    {timeRows.map((minute, rowIndex) => {
                      const isPast = dateAtMinutes(day, minute) < new Date();
                      const isSelected = selectedCell?.dayIndex === dayIndex && selectedCell.rowIndex === rowIndex;
                      return (
                        <Popover
                          key={minute}
                          open={isSelected}
                          onOpenChange={(open) => {
                            if (!open && isSelected) {
                              setSelectedCell(null);
                              setCreateError('');
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isPast || isSaving}
                              className={cn(
                                'block w-full border-b border-slate-100 transition dark:border-slate-800',
                                isPast
                                  ? 'cursor-not-allowed bg-slate-50/70 dark:bg-slate-950/60'
                                  : 'hover:bg-sky-50 dark:hover:bg-sky-500/5',
                                isSelected && 'bg-sky-100 dark:bg-sky-500/10',
                              )}
                              style={{ height: ROW_HEIGHT }}
                              onClick={() => openCreatePopover({ dayIndex, rowIndex })}
                              aria-label={`Tạo lịch ${WEEKDAY_LABELS[dayIndex]} ${formatScheduleTime(dateAtMinutes(day, minute))}`}
                            />
                          </PopoverTrigger>
                          {isSelected && selectedCellStart && selectedCellEnd && (
                            <PopoverContent
                              align="start"
                              side="right"
                              sideOffset={8}
                              collisionPadding={12}
                              className="z-50 w-72 rounded-2xl border-slate-200 p-4 shadow-xl dark:border-slate-700"
                            >
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Tạo lịch trống
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                                    {WEEKDAY_LABELS[dayIndex]}, {formatScheduleDate(day)}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Bắt đầu {formatScheduleTime(selectedCellStart)}
                                  </p>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Thời lượng
                                  </p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {SLOT_DURATION_OPTIONS.map((duration) => (
                                      <button
                                        key={duration}
                                        type="button"
                                        className={cn(
                                          'rounded-lg border px-2 py-2 text-xs font-bold transition',
                                          selectedDuration === duration
                                            ? 'border-sky-600 bg-sky-600 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-sky-500/10',
                                        )}
                                        onClick={() => {
                                          setSelectedDuration(duration);
                                          setCreateError('');
                                        }}
                                      >
                                        {duration}
                                      </button>
                                    ))}
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-400">phút</p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-500 dark:text-slate-400">Kết thúc</span>
                                    <span className="font-bold text-slate-950 dark:text-slate-50">
                                      {formatScheduleTime(selectedCellEnd)}
                                    </span>
                                  </div>
                                </div>

                                {(createError || selectedCellOverlaps) && (
                                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                                    {createError || 'Khung giờ này đang trùng với lịch đã có.'}
                                  </p>
                                )}

                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full bg-sky-600 hover:bg-sky-700"
                                  disabled={isSaving || selectedCellOverlaps || selectedCellInPast}
                                  onClick={createSlotFromCell}
                                >
                                  {isSaving ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Đang tạo
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="mr-2 h-4 w-4" />
                                      Tạo lịch trống
                                    </>
                                  )}
                                </Button>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      );
                    })}

                    {entries
                      .filter((entry) => entry.dayIndex === dayIndex)
                      .map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className={cn(
                            'absolute left-1 right-1 z-10 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs shadow-sm transition hover:shadow-md',
                            getScheduleEntryTone(entry),
                            selectedEntry?.id === entry.id && 'ring-2 ring-sky-400',
                          )}
                          style={{
                            top: entry.startIndex * ROW_HEIGHT + 3,
                            height: Math.max(34, entry.span * ROW_HEIGHT - 6),
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => {
                            setSelectedCell(null);
                            setCreateError('');
                            setSelectedEntryId(entry.id);
                          }}
                        >
                          <span className="block truncate font-bold">{getScheduleEntryTitle(entry)}</span>
                          <span className="block truncate opacity-80">
                            {formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)}
                          </span>
                          {entry.booking?.bookingRequest.topicsToDiscuss?.[0] && (
                            <span className="block truncate opacity-80">
                              {entry.booking.bookingRequest.topicsToDiscuss[0]}
                            </span>
                          )}
                        </button>
                      ))}

                    {showNowLine && sameDay(day, now) && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-20"
                        style={{ top: nowTop }}
                        aria-hidden="true"
                      >
                        <div className="relative h-0.5 bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]">
                          <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-500/20" />
                          <span className="absolute right-1 -top-3 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            {formatScheduleTime(now)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            {!selectedEntry ? (
              <div className="flex min-h-48 flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="mb-2 h-6 w-6" />
                Chọn một khung giờ hoặc click ô trống trên lịch để tạo slot mới.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Chi tiết lịch
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
                    {getScheduleEntryTitle(selectedEntry)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedEntry.start.toLocaleDateString('vi-VN')} · {formatScheduleTime(selectedEntry.start)} -{' '}
                    {formatScheduleTime(selectedEntry.end)}
                  </p>
                </div>

                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                    selectedEntry.booking
                      ? statusTone[selectedEntry.booking.status] || statusTone.pending
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                  )}
                >
                  {selectedEntry.booking
                    ? statusLabel[selectedEntry.booking.status] || selectedEntry.booking.status
                    : selectedEntry.slot?.status || 'available'}
                </span>

                {selectedEntry.booking && (
                  <div className="space-y-3 rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nội dung</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {selectedEntry.booking.bookingRequest.topicsToDiscuss?.join(', ') || 'Chưa có chủ đề'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tình huống hiện tại</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        {selectedEntry.booking.bookingRequest.currentSituation || 'Chưa có thông tin'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mục tiêu</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        {selectedEntry.booking.bookingRequest.desiredOutcomes?.join(', ') || 'Chưa có thông tin'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedEntry.booking?.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => confirmBooking(selectedEntry.booking as BookingSession)}
                      disabled={busyId === selectedEntry.booking.id}
                      className="bg-sky-600 hover:bg-sky-700"
                    >
                      {busyId === selectedEntry.booking.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      Xác nhận
                    </Button>
                  )}
                  {selectedEntry.booking && ACTIVE_BOOKING_STATUSES.includes(selectedEntry.booking.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionReason('');
                        setActionDialog({ type: 'cancel_booking', booking: selectedEntry.booking as BookingSession });
                      }}
                      disabled={busyId === selectedEntry.booking.id}
                    >
                      Hủy booking
                    </Button>
                  )}
                  {!selectedEntry.booking && selectedEntry.slot?.status === 'available' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedEntry.slot) {
                          setActionReason('');
                          setActionDialog({ type: 'delete_slot', slot: selectedEntry.slot });
                        }
                      }}
                      disabled={!selectedEntry.slot || busyId === selectedEntry.slot.id}
                    >
                      {busyId === selectedEntry.slot?.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Xóa slot
                    </Button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
        <BookingActionDialog
          action={actionDialog}
          reason={actionReason}
          busy={Boolean(busyId)}
          onReasonChange={setActionReason}
          onClose={closeActionDialog}
          onConfirm={handleActionDialogConfirm}
        />
      </div>
    </PortalPanel>
  );
}

function MentorAvailabilityManager({
  profile,
  slots,
  onChanged,
}: {
  profile: TutorProfile;
  slots: MentorAvailabilitySlot[];
  onChanged: () => void;
}) {
  const token = authStorage.getAccessToken();
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const createSlot = async () => {
    if (!startAt || !endAt) {
      setMessage('Vui lòng chọn giờ bắt đầu và kết thúc.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      await mentorService.createAvailabilitySlot(token, {
        tutorProfileId: profile.id,
        startAt,
        endAt,
        status: 'available',
      });
      setStartAt('');
      setEndAt('');
      setMessage('Đã tạo khung giờ trống.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo khung giờ.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSlot = async (id: string) => {
    try {
      await mentorService.deleteAvailabilitySlot(token, id);
      setMessage('Đã xóa khung giờ.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa khung giờ.');
    }
  };

  return (
    <PortalPanel
      id="availability"
      title="Lịch làm việc"
      description="Tạo khung giờ trống để học viên có thể đặt lịch. Mỗi slot chỉ dành cho một booking."
    >
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-3">
            <TextInput label="Bắt đầu" type="datetime-local" value={startAt} onChange={setStartAt} />
            <TextInput label="Kết thúc" type="datetime-local" value={endAt} onChange={setEndAt} />
            <Button onClick={createSlot} disabled={isSaving} className="bg-sky-600 hover:bg-sky-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tạo khung giờ trống
            </Button>
          </div>
          {message && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{message}</p>}
        </div>

        <div className="space-y-2">
          {slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Chưa có khung giờ trống nào.
            </div>
          ) : (
            slots.slice(0, 8).map((slot) => {
              const start = new Date(slot.startAt);
              const end = new Date(slot.endAt);
              return (
                <div
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-slate-50">
                      {start.toLocaleDateString('vi-VN')} ·{' '}
                      {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{slot.status}</p>
                  </div>
                  {slot.status !== 'booked' && (
                    <Button variant="outline" size="sm" onClick={() => deleteSlot(slot.id)}>
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </PortalPanel>
  );
}

function MentorBookingList({
  bookings,
  onChanged,
  onBookingUpdated,
  onOpenChat,
}: {
  bookings: BookingSession[];
  onChanged: MentorDataRefresh;
  onBookingUpdated: BookingUpdateHandler;
  onOpenChat: (booking: BookingSession) => void;
}) {
  const token = authStorage.getAccessToken();
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [actionDialog, setActionDialog] = useState<BookingActionDialogState | null>(null);
  const [actionReason, setActionReason] = useState('');

  const confirmBooking = async (booking: BookingSession) => {
    setBusyId(booking.id);
    setMessage('');
    try {
      const updatedBooking = await mentorService.confirmBooking(token, booking.id);
      onBookingUpdated(updatedBooking);
      setMessage('Đã xác nhận booking.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xác nhận booking.');
    } finally {
      setBusyId('');
    }
  };

  const cancelBooking = async (booking: BookingSession, reason?: string) => {
    setBusyId(booking.id);
    setMessage('');
    try {
      const updatedBooking = await mentorService.cancelBooking(token, booking.id, reason);
      onBookingUpdated(updatedBooking);
      setMessage('Đã hủy booking.');
      void onChanged(true);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy booking.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const completeBooking = async (booking: BookingSession) => {
    setBusyId(booking.id);
    setMessage('');
    try {
      const updatedBooking = await mentorService.completeBooking(token, booking.id);
      onBookingUpdated(updatedBooking);
      setMessage('Đã kết thúc buổi tư vấn.');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể kết thúc buổi tư vấn.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const closeActionDialog = () => {
    setActionDialog(null);
    setActionReason('');
  };

  const handleActionDialogConfirm = async () => {
    if (!actionDialog) return;

    let succeeded = false;
    if (actionDialog.type === 'cancel_booking') {
      succeeded = await cancelBooking(actionDialog.booking, actionReason.trim() || undefined);
    }
    if (actionDialog.type === 'complete_booking') {
      succeeded = await completeBooking(actionDialog.booking);
    }

    if (succeeded) closeActionDialog();
  };

  return (
    <PortalPanel id="bookings" title="Booking cần xử lý" description="Theo dõi các buổi tư vấn học viên đã đặt với bạn.">
      {message && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message}</p>}
      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Chưa có booking nào.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="hidden grid-cols-[1fr_160px_150px_260px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400 lg:grid">
            <span>Nội dung</span>
            <span>Thời gian</span>
            <span>Trạng thái</span>
            <span className="text-right">Thao tác</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {bookings.map((booking) => {
              const canConfirm = booking.status === 'pending';
              const canCancel = ['pending', 'confirmed', 'rescheduled'].includes(booking.status);
              const canComplete = ['confirmed', 'rescheduled'].includes(booking.status);
              const meetingHref = getBookingMeetingHref(booking);
              const date = new Date(
                booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
              );

              return (
                <div key={booking.id} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1fr_160px_150px_260px] lg:items-center">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-slate-50">{booking.sessionType.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      {booking.bookingRequest.topicsToDiscuss?.join(', ') || 'Chưa có chủ đề'}
                    </p>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    {date.toLocaleString('vi-VN')} · {booking.schedulingDetails.duration} phút
                  </p>
                  <div>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', statusTone[booking.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
                      {statusLabel[booking.status] || booking.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    {meetingHref && ['confirmed', 'rescheduled'].includes(booking.status) && (
                      <Button size="sm" asChild className="bg-sky-600 hover:bg-sky-700">
                        <Link href={meetingHref}>
                          <Video className="h-4 w-4" />
                          Vào phòng call
                        </Link>
                      </Button>
                    )}
                    {canConfirm && (
                      <Button size="sm" onClick={() => confirmBooking(booking)} disabled={busyId === booking.id} className="bg-sky-600 hover:bg-sky-700">
                        {busyId === booking.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        Xác nhận
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="outline" onClick={() => onOpenChat(booking)}>
                        <MessageSquare className="h-4 w-4" />
                        Nhắn tin với học viên
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActionReason('');
                          setActionDialog({ type: 'complete_booking', booking });
                        }}
                        disabled={busyId === booking.id}
                        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        {busyId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Kết thúc
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActionReason('');
                          setActionDialog({ type: 'cancel_booking', booking });
                        }}
                        disabled={busyId === booking.id}
                      >
                        Hủy booking
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <BookingActionDialog
        action={actionDialog}
        reason={actionReason}
        busy={Boolean(busyId)}
        onReasonChange={setActionReason}
        onClose={closeActionDialog}
        onConfirm={handleActionDialogConfirm}
      />
    </PortalPanel>
  );
}

const MENTOR_SLOT_MINUTES = 90;
const MENTOR_WORK_START_MINUTE = 8 * 60;
const MENTOR_WORK_END_MINUTE = 23 * 60;
const MENTOR_SLOT_STARTS = Array.from(
  { length: Math.floor((MENTOR_WORK_END_MINUTE - MENTOR_WORK_START_MINUTE) / MENTOR_SLOT_MINUTES) },
  (_, index) => MENTOR_WORK_START_MINUTE + index * MENTOR_SLOT_MINUTES,
);
const BOOKING_TIMETABLE_STATUSES = ['awaiting_payment', 'pending', 'confirmed', 'rescheduled'];

function getSlotKey(dayIndex: number, minute: number) {
  return `${dayIndex}-${minute}`;
}

function parseSlotKey(key: string) {
  const [dayIndex, minute] = key.split('-').map(Number);
  return { dayIndex, minute };
}

function formatMinuteLabel(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateOnlyInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function getWeekRangeLabel(weekStart: Date) {
  return `${formatScheduleDate(weekStart)} - ${formatScheduleDate(addDays(weekStart, 6))}`;
}

const bulkSkipReasonLabel: Record<string, string> = {
  past_slot: 'đã qua thời gian nên backend không tạo',
  overlap: 'trùng với lịch đã có',
  duplicate: 'đã tồn tại trong hệ thống',
  duplicate_in_request: 'bị chọn trùng trong lần lưu này',
};

function formatBulkSkippedSlot(skipped: { dayIndex: number; startTime: string; startAt?: string; reason: string }) {
  const startAt = skipped.startAt ? new Date(skipped.startAt) : null;
  const when = startAt && !Number.isNaN(startAt.getTime())
    ? `${startAt.toLocaleDateString('vi-VN')} ${formatScheduleTime(startAt)}`
    : `${WEEKDAY_LABELS[skipped.dayIndex] || `Ngày ${skipped.dayIndex + 1}`} ${skipped.startTime}`;
  return `${when}: ${bulkSkipReasonLabel[skipped.reason] || skipped.reason}`;
}

function getBookingMeetingHref(booking: BookingSession) {
  const link = booking.schedulingDetails.meetingLink;
  if (!link) return '';
  return link.startsWith('http') ? link : link;
}

function MentorSchedulingWorkspace({
  profile,
  slots,
  bookings,
  onChanged,
  onBookingUpdated,
  onOpenChat,
}: {
  profile: TutorProfile;
  slots: MentorAvailabilitySlot[];
  bookings: BookingSession[];
  onChanged: MentorDataRefresh;
  onBookingUpdated: BookingUpdateHandler;
  onOpenChat: (booking: BookingSession) => void;
}) {
  const token = authStorage.getAccessToken();
  const currentCalendarWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeek(new Date()));
  const calendarWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(calendarWeekStart, index)),
    [calendarWeekStart],
  );
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [isFixedSchedule, setIsFixedSchedule] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(8);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedAvailabilitySlotId, setSelectedAvailabilitySlotId] = useState('');
  const [editDate, setEditDate] = useState(() => formatDateOnly(new Date()));
  const [editStartMinute, setEditStartMinute] = useState(MENTOR_WORK_START_MINUTE);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [proposalDate, setProposalDate] = useState(() => formatDateOnly(new Date()));
  const [proposalStartMinute, setProposalStartMinute] = useState(MENTOR_WORK_START_MINUTE);
  const [proposalReason, setProposalReason] = useState('');
  const [actionDialog, setActionDialog] = useState<BookingActionDialogState | null>(null);
  const [actionReason, setActionReason] = useState('');
  const now = new Date();

  const slotsByCell = useMemo(() => {
    const map = new Map<string, MentorAvailabilitySlot>();
    slots.forEach((slot) => {
      const start = new Date(slot.startAt);
      const dayIndex = calendarWeekDays.findIndex((day) => sameDay(day, start));
      const minute = minutesFromMidnight(start);
      if (dayIndex >= 0 && MENTOR_SLOT_STARTS.includes(minute)) {
        map.set(getSlotKey(dayIndex, minute), slot);
      }
    });
    return map;
  }, [calendarWeekDays, slots]);

  const visibleBookings = useMemo(
    () =>
      bookings
        .filter((booking) => BOOKING_TIMETABLE_STATUSES.includes(booking.status))
        .map((booking) => {
          const start = getBookingStart(booking);
          const end = getBookingEnd(booking, start);
          const dayIndex = calendarWeekDays.findIndex((day) => sameDay(day, start));
          return { booking, start, end, dayIndex };
        })
        .filter((entry) => entry.dayIndex >= 0 && !Number.isNaN(entry.start.getTime()))
        .sort((first, second) => first.start.getTime() - second.start.getTime()),
    [calendarWeekDays, bookings],
  );

  const bookingsBySlotId = useMemo(
    () => new Map(visibleBookings.map(({ booking }) => [booking.availabilitySlotId, booking])),
    [visibleBookings],
  );

  const bookingsByCell = useMemo(() => {
    const map = new Map<string, BookingSession>();
    visibleBookings.forEach(({ booking, start, dayIndex }) => {
      const minute = minutesFromMidnight(start);
      if (MENTOR_SLOT_STARTS.includes(minute)) {
        map.set(getSlotKey(dayIndex, minute), booking);
      }
    });
    return map;
  }, [visibleBookings]);

  const selectedBooking = selectedBookingId
    ? bookings.find((booking) => booking.id === selectedBookingId) || null
    : null;
  const selectedMeetingHref = selectedBooking ? getBookingMeetingHref(selectedBooking) : '';
  const selectedPendingProposal = selectedBooking ? getPendingRescheduleProposal(selectedBooking) : null;
  const canRespondToSelectedProposal = selectedPendingProposal?.proposedByRole === 'mentee';
  const proposalDuration = Math.max(1, selectedBooking?.schedulingDetails.duration || MENTOR_SLOT_MINUTES);
  const proposalDateValue = parseDateOnlyInput(proposalDate);
  const proposalStartAt = proposalDateValue
    ? dateAtMinutes(proposalDateValue, proposalStartMinute)
    : new Date(Number.NaN);
  const proposalEndAt = new Date(proposalStartAt.getTime() + proposalDuration * 60_000);
  const proposalDateInvalid = !proposalDateValue || Number.isNaN(proposalStartAt.getTime());
  const proposalInPast = !proposalDateInvalid && proposalStartAt <= now;

  useEffect(() => {
    if (selectedBooking) {
      const bookingStart = getBookingStart(selectedBooking);
      const defaultStart = bookingStart > new Date()
        ? bookingStart
        : dateAtMinutes(addDays(new Date(), 1), MENTOR_WORK_START_MINUTE);
      const startMinute = minutesFromMidnight(defaultStart);
      setProposalDate(formatDateOnly(defaultStart));
      setProposalStartMinute(
        MENTOR_SLOT_STARTS.includes(startMinute) ? startMinute : MENTOR_WORK_START_MINUTE,
      );
    }
    setProposalReason('');
  }, [selectedBooking?.id]);
  const selectedAvailabilitySlot = selectedAvailabilitySlotId
    ? slots.find((slot) => slot.id === selectedAvailabilitySlotId) || null
    : null;
  const selectedAvailabilityStart = selectedAvailabilitySlot ? new Date(selectedAvailabilitySlot.startAt) : null;
  const selectedAvailabilityEnd = selectedAvailabilitySlot ? new Date(selectedAvailabilitySlot.endAt) : null;
  const canEditSelectedAvailability =
    !!selectedAvailabilitySlot &&
    selectedAvailabilitySlot.status === 'available' &&
    !!selectedAvailabilityStart &&
    selectedAvailabilityStart >= now;
  const editDateValue = parseDateOnlyInput(editDate);
  const editStartAt = editDateValue ? dateAtMinutes(editDateValue, editStartMinute) : new Date(Number.NaN);
  const editEndAt = new Date(editStartAt.getTime() + MENTOR_SLOT_MINUTES * 60_000);
  const editSlotDateInvalid = !editDateValue || Number.isNaN(editStartAt.getTime());
  const editSlotInPast = !editSlotDateInvalid && editStartAt < now;

  const changeCalendarWeek = (days: number) => {
    setCalendarWeekStart((current) => addDays(current, days));
    setSelectedSlotKeys([]);
    setSelectedAvailabilitySlotId('');
    setSelectedBookingId('');
    setMessage('');
  };

  const openAvailabilitySlot = (slot: MentorAvailabilitySlot) => {
    const start = new Date(slot.startAt);
    setSelectedSlotKeys([]);
    setSelectedAvailabilitySlotId(slot.id);
    setSelectedBookingId('');
    setEditDate(formatDateOnly(start));
    setEditStartMinute(MENTOR_SLOT_STARTS.includes(minutesFromMidnight(start)) ? minutesFromMidnight(start) : MENTOR_WORK_START_MINUTE);
    setMessage('');
  };

  const toggleSlot = (key: string) => {
    setSelectedSlotKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
    setMessage('');
  };

  const createSelectedSlots = async () => {
    if (selectedSlotKeys.length === 0) {
      setMessage('Vui lòng chọn ít nhất một slot.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      const slotStarts = selectedSlotKeys
        .map(parseSlotKey)
        .sort((first, second) => first.dayIndex - second.dayIndex || first.minute - second.minute)
        .map(({ dayIndex, minute }) => ({
          dayIndex,
          startTime: formatMinuteLabel(minute),
        }));
      const result = await mentorService.createBulkAvailabilitySlots(token, {
        tutorProfileId: profile.id,
        weekStart: formatDateOnly(calendarWeekStart),
        slotStarts,
        repeatWeeks: isFixedSchedule ? repeatWeeks : 1,
      });
      setSelectedSlotKeys([]);
      const refreshedSlots = await onChanged();
      const createdIds = new Set(result.created.map((slot) => slot.id).filter(Boolean));
      const refreshedIds = Array.isArray(refreshedSlots)
        ? new Set(refreshedSlots.map((slot) => slot.id).filter(Boolean))
        : null;
      const missingAfterReload =
        refreshedIds && createdIds.size > 0 && [...createdIds].some((id) => !refreshedIds.has(id));
      const skippedDetails = result.skipped
        .slice(0, 4)
        .map(formatBulkSkippedSlot)
        .join('\n');
      const moreSkipped = result.skipped.length > 4 ? `\n...và ${result.skipped.length - 4} slot khác.` : '';
      const createdMessage =
        result.created.length > 0
          ? `Đã tạo ${result.created.length} slot.`
          : 'Không tạo được slot mới nào.';
      const skippedMessage =
        result.skipped.length > 0 ? `\nBỏ qua ${result.skipped.length} slot:\n${skippedDetails}${moreSkipped}` : '';
      const reloadMessage = missingAfterReload
        ? '\nĐã lưu nhưng chưa tải lại được lịch, vui lòng refresh trang để kiểm tra lại.'
        : '';
      setMessage(`${createdMessage}${skippedMessage}${reloadMessage}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo lịch trống.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSelectedAvailabilitySlot = async () => {
    if (!selectedAvailabilitySlot || !canEditSelectedAvailability) return;

    if (editSlotDateInvalid) {
      setMessage('Vui lòng chọn ngày hợp lệ.');
      return;
    }

    if (editSlotInPast) {
      setMessage('Không thể chuyển slot sang thời gian trong quá khứ.');
      return;
    }

    setBusyId(selectedAvailabilitySlot.id);
    setMessage('');
    try {
      await mentorService.updateAvailabilitySlot(token, selectedAvailabilitySlot.id, {
        startAt: editStartAt.toISOString(),
        endAt: editEndAt.toISOString(),
        status: 'available',
      });
      setSelectedAvailabilitySlotId('');
      setMessage('Đã cập nhật slot lịch rảnh.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật slot lịch rảnh.');
    } finally {
      setBusyId('');
    }
  };

  const deleteAvailabilitySlot = async (slot: MentorAvailabilitySlot) => {
    setBusyId(slot.id);
    setMessage('');
    try {
      await mentorService.deleteAvailabilitySlot(token, slot.id);
      setSelectedAvailabilitySlotId('');
      setMessage('Đã xóa slot lịch rảnh.');
      onChanged();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa slot lịch rảnh.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const confirmBooking = async (booking: BookingSession) => {
    setBusyId(booking.id);
    setMessage('');
    try {
      const updatedBooking = await mentorService.confirmBooking(token, booking.id);
      onBookingUpdated(updatedBooking);
      setMessage('Đã xác nhận booking và tạo link video call.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xác nhận booking.');
    } finally {
      setBusyId('');
    }
  };

  const cancelBooking = async (booking: BookingSession, reason?: string) => {
    setBusyId(booking.id);
    setMessage('');
    try {
      const updatedBooking = await mentorService.cancelBooking(token, booking.id, reason);
      onBookingUpdated(updatedBooking);
      setMessage('Đã hủy booking.');
      void onChanged(true);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy booking.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const proposeReschedule = async (booking: BookingSession) => {
    if (getPendingRescheduleProposal(booking)) {
      setMessage('Booking này đang có đề xuất đổi lịch chờ phản hồi.');
      return;
    }

    if (proposalDateInvalid) {
      setMessage('Vui lòng chọn ngày và giờ hợp lệ để đề xuất đổi lịch.');
      return;
    }

    if (proposalInPast) {
      setMessage('Khung giờ đổi lịch phải nằm trong tương lai.');
      return;
    }

    setBusyId(`reschedule-${booking.id}`);
    setMessage('');
    let createdSlot: MentorAvailabilitySlot | null = null;
    try {
      createdSlot = await mentorService.createAvailabilitySlot(token, {
        tutorProfileId: profile.id,
        startAt: proposalStartAt.toISOString(),
        endAt: proposalEndAt.toISOString(),
        status: 'available',
      });

      const updatedBooking = await mentorService.createRescheduleProposal(token, booking.id, {
        newDateTime: proposalStartAt.toISOString(),
        duration: proposalDuration,
        timeZone: booking.schedulingDetails.timeZone,
        availabilitySlotId: createdSlot.id,
        reason: proposalReason,
        message: proposalReason,
      });
      onBookingUpdated(updatedBooking);
      void onChanged(true);
      setProposalReason('');
      setMessage('Đã gửi đề xuất đổi lịch cho học viên.');
    } catch (error) {
      if (createdSlot?.id) {
        await mentorService.deleteAvailabilitySlot(token, createdSlot.id).catch(() => undefined);
      }
      setMessage(error instanceof Error ? error.message : 'Không thể gửi đề xuất đổi lịch.');
    } finally {
      setBusyId('');
    }
  };

  const acceptProposal = async (booking: BookingSession, proposalId: string) => {
    setBusyId(`accept-${proposalId}`);
    setMessage('');
    try {
      const updatedBooking = await mentorService.acceptRescheduleProposal(token, booking.id, proposalId);
      onBookingUpdated(updatedBooking);
      setMessage('Đã đồng ý đổi lịch.');
      void onChanged(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đồng ý đề xuất.');
    } finally {
      setBusyId('');
    }
  };

  const declineProposal = async (booking: BookingSession, proposalId: string, reason?: string) => {
    setBusyId(`decline-${proposalId}`);
    setMessage('');
    try {
      const updatedBooking = await mentorService.declineRescheduleProposal(token, booking.id, proposalId, reason);
      onBookingUpdated(updatedBooking);
      void onChanged(true);
      setMessage('Đã từ chối đề xuất đổi lịch.');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể từ chối đề xuất.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const closeActionDialog = () => {
    setActionDialog(null);
    setActionReason('');
  };

  const handleActionDialogConfirm = async () => {
    if (!actionDialog) return;

    let succeeded = false;
    if (actionDialog.type === 'cancel_booking') {
      succeeded = await cancelBooking(actionDialog.booking, actionReason.trim() || undefined);
    }
    if (actionDialog.type === 'delete_slot') {
      succeeded = await deleteAvailabilitySlot(actionDialog.slot);
    }
    if (actionDialog.type === 'decline_reschedule') {
      succeeded = await declineProposal(
        actionDialog.booking,
        actionDialog.proposalId,
        actionReason.trim() || undefined,
      );
    }

    if (succeeded) closeActionDialog();
  };
  return (
    <div className="space-y-6">
      <PortalPanel
        id="availability"
        title="Lịch làm việc của tôi"
        description="Tạo lịch rảnh và theo dõi toàn bộ slot đã mở, đang giữ, đã booking trong cùng một thời khóa biểu."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-slate-50">
                Tuần {getWeekRangeLabel(calendarWeekStart)}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Slot bắt đầu từ 08:00 đến 21:30, mỗi slot kéo dài đến tối đa 23:00.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => changeCalendarWeek(-7)}>
                  <ChevronLeft className="h-4 w-4" />
                  Tuần trước
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCalendarWeekStart(currentCalendarWeekStart);
                    setSelectedSlotKeys([]);
                    setSelectedAvailabilitySlotId('');
                    setSelectedBookingId('');
                    setMessage('');
                  }}
                >
                  Tuần này
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => changeCalendarWeek(7)}>
                  Tuần tới
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isFixedSchedule}
                  onChange={(event) => setIsFixedSchedule(event.target.checked)}
                  className="h-4 w-4 accent-sky-600"
                />
                <Repeat className="h-4 w-4" />
                Lịch cố định
              </label>
              {isFixedSchedule && (
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Lặp
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={repeatWeeks}
                    onChange={(event) =>
                      setRepeatWeeks(Math.min(12, Math.max(1, Number(event.target.value) || 1)))
                    }
                    className="h-10 w-20 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-sky-500/10"
                  />
                  tuần
                </label>
              )}
              <Button
                type="button"
                onClick={createSelectedSlots}
                disabled={isSaving || selectedSlotKeys.length === 0}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Lưu lịch rảnh
              </Button>
            </div>
          </div>

          {message && (
            <p
              className={cn(
                'whitespace-pre-line rounded-xl px-3 py-2 text-sm',
                message.startsWith('Không tạo được') || message.includes('Bỏ qua')
                  ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
              Trống: click để chọn tạo lịch
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Đã mở
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              Chờ xác nhận
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Đang giữ / chờ thanh toán
            </span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              Đã booking
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[88px_repeat(7,minmax(112px,1fr))] border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Giờ</div>
                {calendarWeekDays.map((day, index) => (
                  <div key={day.toISOString()} className="border-l border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{WEEKDAY_LABELS[index]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatScheduleDate(day)}</p>
                  </div>
                ))}
              </div>

              {MENTOR_SLOT_STARTS.map((minute) => (
                <div
                  key={minute}
                  className="grid grid-cols-[88px_repeat(7,minmax(112px,1fr))] border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                >
                  <div className="flex items-center justify-end px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatMinuteLabel(minute)}
                  </div>
                  {calendarWeekDays.map((day, dayIndex) => {
                    const key = getSlotKey(dayIndex, minute);
                    const start = dateAtMinutes(day, minute);
                    const end = new Date(start.getTime() + MENTOR_SLOT_MINUTES * 60_000);
                    const existingSlot = slotsByCell.get(key);
                    const booking = existingSlot
                      ? bookingsBySlotId.get(existingSlot.id)
                      : bookingsByCell.get(key);
                    const isPast = start < now;
                    const isSelected = selectedSlotKeys.includes(key);
                    const disabled = isSaving || (!booking && !existingSlot && isPast);
                    const slotLabel = existingSlot
                      ? existingSlot.status === 'available'
                        ? 'Đã mở'
                        : existingSlot.status === 'held'
                          ? 'Đang giữ'
                          : existingSlot.status === 'booked'
                            ? 'Đã booking'
                            : 'Đã chặn'
                      : isPast
                        ? 'Đã qua'
                        : isSelected
                          ? 'Đã chọn'
                          : 'Trống';
                    const slotClass = existingSlot
                      ? existingSlot.status === 'available'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : existingSlot.status === 'held'
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                          : existingSlot.status === 'booked'
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
                            : 'border-slate-300 bg-slate-100 text-slate-700 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      : isPast
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600'
                        : isSelected
                          ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-sky-500/10';
                    const bookingClass =
                      booking?.status === 'pending'
                        ? 'border-sky-300 bg-sky-50 text-sky-800 hover:shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'
                        : booking?.status === 'confirmed'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                          : booking?.status === 'rescheduled'
                            ? 'border-violet-300 bg-violet-50 text-violet-800 hover:shadow-sm dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200'
                            : booking?.status === 'awaiting_payment'
                              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                              : 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200';
                    const calendarLabel = booking
                      ? statusLabel[booking.status] || booking.status
                      : existingSlot?.status === 'available' && isPast
                        ? 'Đã qua'
                        : slotLabel;
                    const calendarClass = booking
                      ? bookingClass
                      : existingSlot?.status === 'available' && isPast
                        ? 'border-slate-200 bg-slate-50 text-slate-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500'
                        : slotClass;

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (booking) {
                            setSelectedAvailabilitySlotId('');
                            setSelectedBookingId(booking.id);
                            return;
                          }
                          if (existingSlot) {
                            openAvailabilitySlot(existingSlot);
                            return;
                          }
                          toggleSlot(key);
                        }}
                        className={cn(
                          'm-1 flex h-12 flex-col justify-center rounded-lg border px-2 text-left text-xs transition',
                          calendarClass,
                        )}
                      >
                        <span className="truncate font-bold">{calendarLabel}</span>
                        <span className="opacity-80">
                          {formatScheduleTime(start)} - {formatScheduleTime(end)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PortalPanel>

      <Dialog
        open={!!selectedAvailabilitySlot || !!selectedBooking}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAvailabilitySlotId('');
            setSelectedBookingId('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedBooking ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBooking.sessionType.replace(/_/g, ' ')}</DialogTitle>
                <DialogDescription>
                  {new Date(
                    selectedBooking.schedulingDetails.confirmedDateTime ||
                      selectedBooking.schedulingDetails.requestedDateTime,
                  ).toLocaleString('vi-VN')}{' '}
                  · {selectedBooking.schedulingDetails.duration} phút
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                    statusTone[selectedBooking.status] || statusTone.pending,
                  )}
                >
                  {statusLabel[selectedBooking.status] || selectedBooking.status}
                </span>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chủ đề</p>
                    <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                      {selectedBooking.bookingRequest.topicsToDiscuss?.join(', ') || 'Chưa có chủ đề'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mục tiêu</p>
                    <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                      {selectedBooking.bookingRequest.desiredOutcomes?.join(', ') || 'Chưa có thông tin'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900 md:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tình huống hiện tại</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      {selectedBooking.bookingRequest.currentSituation || 'Chưa có thông tin'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900 md:col-span-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Link video call</p>
                    {selectedMeetingHref ? (
                      <a
                        href={selectedMeetingHref}
                        className="mt-1 inline-flex items-center gap-2 font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-300"
                      >
                        <Video className="h-4 w-4" />
                        {selectedMeetingHref}
                      </a>
                    ) : (
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Link sẽ tự tạo sau khi mentor xác nhận.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {ACTIVE_BOOKING_STATUSES.includes(selectedBooking.status) && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => onOpenChat(selectedBooking)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Nhắn tin với học viên
                    </Button>
                    {(selectedBooking.communicationThread || []).length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {(selectedBooking.communicationThread || []).length} tin nhắn trong booking này.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-500/20 dark:bg-violet-500/10">
                    <p className="text-sm font-bold text-violet-900 dark:text-violet-100">Đề xuất đổi lịch</p>
                    {selectedPendingProposal ? (
                      <div className="mt-3 space-y-3 rounded-lg bg-white p-3 text-sm ring-1 ring-violet-100 dark:bg-slate-900 dark:ring-violet-500/20">
                        <div>
                          <p className="font-semibold text-slate-950 dark:text-slate-50">
                            {getProposalRoleLabel(selectedPendingProposal.proposedByRole)} đề xuất:{' '}
                            {new Date(selectedPendingProposal.newDateTime).toLocaleString('vi-VN')}
                          </p>
                          <p className="mt-1 text-slate-500 dark:text-slate-400">
                            Thời lượng {selectedPendingProposal.duration} phút
                          </p>
                          {(selectedPendingProposal.reason || selectedPendingProposal.message) && (
                            <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-violet-800 dark:bg-violet-500/10 dark:text-violet-100">
                              {selectedPendingProposal.reason || selectedPendingProposal.message}
                            </p>
                          )}
                        </div>
                        {canRespondToSelectedProposal ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActionReason('');
                                setActionDialog({
                                  type: 'decline_reschedule',
                                  booking: selectedBooking,
                                  proposalId: selectedPendingProposal.id,
                                });
                              }}
                              disabled={busyId === `decline-${selectedPendingProposal.id}`}
                            >
                              Từ chối
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => acceptProposal(selectedBooking, selectedPendingProposal.id)}
                              disabled={busyId === `accept-${selectedPendingProposal.id}`}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {busyId === `accept-${selectedPendingProposal.id}` && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              Đồng ý
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-200">
                            Đang chờ học viên phản hồi. Bạn chưa thể tạo đề xuất mới cho booking này.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1.5 text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                            <span>Chọn ngày</span>
                            <input
                              type="date"
                              value={proposalDate}
                              min={formatDateOnly(new Date())}
                              onChange={(event) => setProposalDate(event.target.value)}
                              className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-900 dark:border-violet-500/30 dark:bg-slate-900 dark:text-slate-50"
                            />
                          </label>
                          <label className="space-y-1.5 text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                            <span>Chọn giờ</span>
                            <select
                              value={proposalStartMinute}
                              onChange={(event) => setProposalStartMinute(Number(event.target.value))}
                              className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-900 dark:border-violet-500/30 dark:bg-slate-900 dark:text-slate-50"
                            >
                              {MENTOR_SLOT_STARTS.map((minute) => (
                                <option key={minute} value={minute}>
                                  {formatMinuteLabel(minute)} - {formatMinuteLabel(minute + proposalDuration)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <p className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-violet-700 ring-1 ring-violet-100 dark:bg-slate-900 dark:text-violet-200 dark:ring-violet-500/20">
                          Hệ thống sẽ tạo lịch trống mới: {' '}
                          {proposalDateInvalid
                            ? 'Chưa chọn thời gian hợp lệ'
                            : `${proposalStartAt.toLocaleDateString('vi-VN')} · ${formatScheduleTime(proposalStartAt)} - ${formatScheduleTime(proposalEndAt)}`}
                        </p>
                        <input
                          value={proposalReason}
                          onChange={(event) => setProposalReason(event.target.value)}
                          placeholder="Lý do / lời nhắn"
                          className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm dark:border-violet-500/30 dark:bg-slate-900"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => proposeReschedule(selectedBooking)}
                          disabled={
                            busyId === `reschedule-${selectedBooking.id}` ||
                            proposalDateInvalid ||
                            proposalInPast
                          }
                        >
                          {busyId === `reschedule-${selectedBooking.id}` && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Gửi đề xuất
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                {selectedBooking.status === 'pending' && (
                  <Button
                    type="button"
                    onClick={() => confirmBooking(selectedBooking)}
                    disabled={busyId === selectedBooking.id}
                    className="bg-sky-600 hover:bg-sky-700"
                  >
                    {busyId === selectedBooking.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Xác nhận
                  </Button>
                )}
                {ACTIVE_BOOKING_STATUSES.includes(selectedBooking.status) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActionReason('');
                      setActionDialog({ type: 'cancel_booking', booking: selectedBooking });
                    }}
                    disabled={busyId === selectedBooking.id}
                  >
                    Hủy booking
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : selectedAvailabilitySlot && selectedAvailabilityStart && selectedAvailabilityEnd ? (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết slot lịch rảnh</DialogTitle>
                <DialogDescription>
                  {selectedAvailabilityStart.toLocaleDateString('vi-VN')} ·{' '}
                  {formatScheduleTime(selectedAvailabilityStart)} - {formatScheduleTime(selectedAvailabilityEnd)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trạng thái</p>
                    <p className="mt-1 font-bold text-slate-950 dark:text-slate-50">
                      {selectedAvailabilitySlot.status}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời lượng</p>
                    <p className="mt-1 font-bold text-slate-950 dark:text-slate-50">
                      {Math.round((selectedAvailabilityEnd.getTime() - selectedAvailabilityStart.getTime()) / 60_000)} phút
                    </p>
                  </div>
                </div>

                {canEditSelectedAvailability ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>Ngày</span>
                      <input
                        type="date"
                        value={editDate}
                        min={formatDateOnly(now)}
                        onChange={(event) => setEditDate(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-sky-500/10"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>Giờ bắt đầu</span>
                      <select
                        value={editStartMinute}
                        onChange={(event) => setEditStartMinute(Number(event.target.value))}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-sky-500/10"
                      >
                        {MENTOR_SLOT_STARTS.map((minute) => (
                          <option key={minute} value={minute}>
                            {formatMinuteLabel(minute)} - {formatMinuteLabel(minute + MENTOR_SLOT_MINUTES)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900 md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Sau khi sửa</span>
                        <span className="font-bold text-slate-950 dark:text-slate-50">
                          {editSlotDateInvalid
                            ? 'Chọn ngày hợp lệ'
                            : `${editStartAt.toLocaleDateString('vi-VN')} · ${formatScheduleTime(editStartAt)} - ${formatScheduleTime(editEndAt)}`}
                        </span>
                      </div>
                    </div>
                    {editSlotDateInvalid && (
                      <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-200 md:col-span-2">
                        Vui lòng chọn ngày hợp lệ.
                      </p>
                    )}
                    {editSlotInPast && (
                      <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-200 md:col-span-2">
                        Không thể chuyển slot sang thời gian trong quá khứ.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Slot này không thể sửa hoặc xóa vì đã qua thời gian, đang giữ chỗ, hoặc đã có booking.
                  </p>
                )}
              </div>

              {canEditSelectedAvailability && (
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setActionReason('');
                      setActionDialog({ type: 'delete_slot', slot: selectedAvailabilitySlot });
                    }}
                    disabled={busyId === selectedAvailabilitySlot.id}
                  >
                    {busyId === selectedAvailabilitySlot.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Xóa slot
                  </Button>
                  <Button
                    type="button"
                    onClick={updateSelectedAvailabilitySlot}
                    disabled={busyId === selectedAvailabilitySlot.id || editSlotDateInvalid || editSlotInPast}
                    className="bg-sky-600 hover:bg-sky-700"
                  >
                    {busyId === selectedAvailabilitySlot.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Lưu thay đổi
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <BookingActionDialog
        action={actionDialog}
        reason={actionReason}
        busy={Boolean(busyId)}
        onReasonChange={setActionReason}
        onClose={closeActionDialog}
        onConfirm={handleActionDialogConfirm}
      />
    </div>
  );
}

function ProfileSummary({ profile, activeBookings }: { profile: TutorProfile; activeBookings: number }) {
  return (
    <PortalPanel id="profile" title="Hồ sơ mentor" description="Thông tin đang dùng trong cổng mentor.">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">{getMentorName(profile)}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {profile.professionalBackground?.company || 'Independent'} ·{' '}
            {profile.professionalBackground?.yearsOfExperience || 0} năm kinh nghiệm
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.mentoringExpertise?.skillExpertise?.slice(0, 8).map((skill) => (
            <span
              key={skill.skillName}
              className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
            >
              {skill.skillName}
            </span>
          ))}
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">Booking đang theo dõi</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-50">{activeBookings}</p>
        </div>
      </div>
    </PortalPanel>
  );
}

const reviewMetricLabels = [
  { key: 'communication', label: 'Giao tiếp' },
  { key: 'expertise', label: 'Chuyên môn' },
  { key: 'helpfulness', label: 'Hữu ích' },
  { key: 'professionalism', label: 'Chuyên nghiệp' },
  { key: 'punctuality', label: 'Đúng giờ' },
] as const;

function getReviewRating(review: SessionReview) {
  const rating = review.overallRatings?.overallSatisfaction;
  return typeof rating === 'number' && Number.isFinite(rating) ? rating : 0;
}

function formatRating(rating: number) {
  if (!rating) return '--';
  return Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
}

function formatReviewDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function getReviewComment(review: SessionReview) {
  const comment = review.writtenFeedback?.comment;
  return typeof comment === 'string' ? comment.trim() : '';
}

function getReviewAuthorName(review: SessionReview) {
  if (review.isAnonymous === true) return 'Học viên ẩn danh';
  const reviewer = typeof review.reviewerId === 'object' && review.reviewerId ? review.reviewerId : null;
  const name = typeof reviewer?.name === 'string' ? reviewer.name.trim() : '';
  return name || 'Học viên';
}

function RatingStars({ rating }: { rating: number }) {
  const roundedRating = Math.round(rating);
  return (
    <div className="flex items-center gap-1" aria-label={`${formatRating(rating)} sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= roundedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700',
          )}
        />
      ))}
    </div>
  );
}

function MentorReviewsPanel({ reviews }: { reviews: SessionReview[] }) {
  const ratings = reviews.map(getReviewRating).filter((rating) => rating > 0);
  const averageRating = ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0;
  const fiveStarCount = ratings.filter((rating) => Math.round(rating) >= 5).length;
  const recommendAnswers = reviews
    .map((review) => review.overallRatings?.wouldRecommend)
    .filter((value): value is boolean => typeof value === 'boolean');
  const recommendRate = recommendAnswers.length
    ? Math.round((recommendAnswers.filter(Boolean).length / recommendAnswers.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Điểm trung bình</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-slate-50">
            {formatRating(averageRating)}
            <span className="text-base font-bold text-slate-400">/5</span>
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tổng đánh giá</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-slate-50">{reviews.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Đánh giá 5 sao</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-slate-50">{fiveStarCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tỷ lệ giới thiệu</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-slate-50">
            {recommendRate === null ? '--' : `${recommendRate}%`}
          </p>
        </article>
      </div>

      <PortalPanel
        title="Phản hồi học viên"
        description="Các đánh giá đã gửi sau khi buổi tư vấn hoàn thành."
      >
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            Chưa có đánh giá nào. Đánh giá sẽ xuất hiện sau khi học viên hoàn thành feedback.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review, index) => {
              const rating = getReviewRating(review);
              const comment = getReviewComment(review);
              const metrics = reviewMetricLabels
                .map(({ key, label }) => ({ label, value: review.overallRatings?.[key] }))
                .filter((item) => typeof item.value === 'number') as Array<{ label: string; value: number }>;

              return (
                <article
                  key={review.id || review._id || `${review.createdAt || 'review'}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={rating} />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {formatRating(rating)}/5
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {getReviewAuthorName(review)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      {formatReviewDate(review.createdAt)}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {comment || 'Học viên chưa để lại nhận xét.'}
                  </p>

                  {metrics.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900"
                        >
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{metric.label}</p>
                          <p className="mt-1 font-bold text-slate-950 dark:text-slate-50">{metric.value}/5</p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </PortalPanel>
    </div>
  );
}

const EMPTY_MENTOR_INCOME_ENTRIES: MentorIncomeEntry[] = [];

function formatIncomeMoney(amount?: number, currency = 'VND') {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatIncomeDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatIncomePercent(value?: number) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(value || 0) * 100)}%`;
}

function settlementLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Đang chờ',
    ready: 'Sẵn sàng nhận',
    withheld: 'Tạm giữ',
    refunded: 'Đã hoàn tiền',
  };
  return labels[status] || status;
}

function settlementTone(status: string) {
  const tones: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    withheld: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  };
  return tones[status] || tones.pending;
}

function MentorIncomePanel({ income }: { income?: MentorIncomeResponse }) {
  const summary = income?.summary;
  const entries = income?.entries ?? EMPTY_MENTOR_INCOME_ENTRIES;
  const currency = summary?.currency || 'VND';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Doanh thu booking"
          value={formatIncomeMoney(summary?.grossRevenue, currency)}
          icon={ReceiptText}
          tone="bg-sky-600"
        />
        <StatCard
          title="Thu nhập của tôi"
          value={formatIncomeMoney(summary?.mentorPayoutAmount, currency)}
          icon={HandCoins}
          tone="bg-emerald-600"
        />
        <StatCard
          title="Sẵn sàng nhận"
          value={formatIncomeMoney(summary?.readyPayoutAmount, currency)}
          icon={WalletCards}
          tone="bg-violet-600"
        />
        <StatCard
          title="Phí nền tảng"
          value={formatIncomeMoney(summary?.platformFeeAmount, currency)}
          icon={Percent}
          tone="bg-amber-500"
        />
      </div>

      <PortalPanel
        title="Chi tiết thu nhập"
        description="Chỉ hiển thị các khoản đã hoàn thành và sẵn sàng nhận."
      >
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Đang chờ</p>
            <p className="mt-1 text-xl font-black text-slate-950 dark:text-slate-50">
              {formatIncomeMoney(summary?.pendingPayoutAmount, currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phiên hoàn thành</p>
            <p className="mt-1 text-xl font-black text-slate-950 dark:text-slate-50">
              {summary?.completedSessionCount || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bản ghi thu nhập</p>
            <p className="mt-1 text-xl font-black text-slate-950 dark:text-slate-50">{income?.total || 0}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Học viên</th>
                <th className="px-4 py-3 text-left">Giá phiên</th>
                <th className="px-4 py-3 text-left">Phí nền tảng</th>
                <th className="px-4 py-3 text-left">Tôi nhận</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                    Chưa có thu nhập mentor trong kỳ này.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.paymentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-950">
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-bold text-slate-500">
                        {entry.checkoutReference || entry.bookingSessionId || entry.paymentId}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatIncomeDate(entry.paidAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{entry.menteeName}</p>
                      <p className="text-xs text-slate-500">{entry.sessionType.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-950 dark:text-slate-50">
                      {formatIncomeMoney(entry.settlementBaseAmount, entry.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-amber-600">
                        {formatIncomeMoney(entry.platformFeeAmount, entry.currency)}
                      </p>
                      <p className="text-xs text-slate-500">{formatIncomePercent(entry.platformFeeRate)}</p>
                    </td>
                    <td className="px-4 py-4 font-bold text-emerald-600">
                      {formatIncomeMoney(entry.mentorPayoutAmount, entry.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-bold', settlementTone(entry.settlementStatus))}>
                        {settlementLabel(entry.settlementStatus)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PortalPanel>
    </div>
  );
}

export type MentorDashboardView = 'overview' | 'profile' | 'availability' | 'bookings' | 'income' | 'reviews';

export default function MentorDashboard({ view = 'overview' }: { view?: MentorDashboardView }) {
  const { accessToken } = useAuth();
  const { openBookingChat } = useBookingChat();
  const queryClient = useQueryClient();
  const mentorPortalQuery = useMentorPortalData();

  const portalData = mentorPortalQuery.data;
  const myProfile = portalData?.profile ?? null;
  const isActiveProfile = myProfile?.status === 'active';
  const mentorUserId = myProfile?.userId || '';
  const mentorReviewsQuery = useMentorPortalReviews(view === 'reviews' && isActiveProfile);
  const mentorIncomeQuery = useMentorIncome(view === 'income' && isActiveProfile);
  const mySlots = useMemo(() => portalData?.slots ?? EMPTY_MENTOR_SLOTS, [portalData?.slots]);
  const bookings = useMemo(() => portalData?.bookings ?? EMPTY_MENTOR_BOOKINGS, [portalData?.bookings]);
  const reviews = useMemo(
    () => mentorReviewsQuery.data ?? EMPTY_MENTOR_REVIEWS,
    [mentorReviewsQuery.data],
  );
  const income = mentorIncomeQuery.data;
  const queryError =
    mentorPortalQuery.error instanceof Error ? mentorPortalQuery.error.message : '';
  const reviewsError =
    view === 'reviews' && mentorReviewsQuery.error instanceof Error ? mentorReviewsQuery.error.message : '';
  const incomeError =
    view === 'income' && mentorIncomeQuery.error instanceof Error ? mentorIncomeQuery.error.message : '';
  const isLoading =
    mentorPortalQuery.isLoading ||
    (view === 'reviews' && mentorReviewsQuery.isLoading) ||
    (view === 'income' && mentorIncomeQuery.isLoading);

  const refreshMentorPortalData = useCallback(async () => {
    if (!accessToken) {
      return [];
    }

    await queryClient.invalidateQueries({
      queryKey: mentorPortalQueryKey(accessToken),
      exact: true,
    });

    if (view === 'reviews') {
      void queryClient.invalidateQueries({
        queryKey: mentorPortalReviewsQueryKey(accessToken),
        exact: true,
      });
    }
    if (view === 'income') {
      void queryClient.invalidateQueries({
        queryKey: mentorIncomeQueryKey(accessToken),
        exact: true,
      });
    }

    return queryClient.getQueryData<{
      slots: MentorAvailabilitySlot[];
    }>(mentorPortalQueryKey(accessToken))?.slots ?? [];
  }, [accessToken, queryClient, view]);

  const refreshSlotsOnly = useCallback(async (_silent = true) => {
    if (!accessToken || !myProfile?.id) {
      return [];
    }

    try {
      const slots = await mentorService.getMyAvailabilitySlots(accessToken);
      queryClient.setQueryData<MentorPortalData>(mentorPortalQueryKey(accessToken), (current) =>
        current ? { ...current, slots } : current,
      );
      return slots;
    } catch {
      return [];
    }
  }, [accessToken, myProfile?.id, queryClient]);

  const applyBookingUpdate = useCallback((updatedBooking: BookingSession) => {
    if (mentorUserId && updatedBooking.mentorId !== mentorUserId) return;
    updateMentorPortalBookingCache(queryClient, accessToken, updatedBooking);
  }, [accessToken, mentorUserId, queryClient]);

  useBookingRealtimeSync({
    enabled: isActiveProfile,
    onBookingUpdated: applyBookingUpdate,
    onRefresh: refreshMentorPortalData,
  });

  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['pending', 'confirmed', 'rescheduled'].includes(booking.status)),
    [bookings],
  );
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length;
  const rate = getPrimaryRate(myProfile);
  const pageTitle: Record<MentorDashboardView, string> = {
    overview: 'Tổng quan mentor',
    profile: 'Hồ sơ mentor',
    availability: 'Lịch làm việc',
    bookings: 'Booking cần xử lý',
    income: 'Thu nhập của tôi',
    reviews: 'Đánh giá của tôi',
  };
  const pageDescription: Record<MentorDashboardView, string> = {
    overview: 'Theo dõi nhanh trạng thái hồ sơ, lịch trống và booking 1-1.',
    profile: 'Kiểm tra hồ sơ mentor và thông tin làm việc trong cổng mentor.',
    availability: 'Quản lý khung giờ trống bằng thời khóa biểu theo từng ngày và từng giờ.',
    bookings: 'Theo dõi và xử lý các buổi tư vấn học viên đã đặt với bạn.',
    income: 'Theo dõi doanh thu, phí nền tảng và khoản mentor được nhận.',
    reviews: 'Theo dõi phản hồi học viên gửi sau các buổi tư vấn.',
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {queryError}
        </p>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            <BadgeCheck className="h-4 w-4" />
            Đăng ký mentor
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 md:text-4xl">
            Hoàn thiện hồ sơ mentor
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Điền thông tin chuyên môn để admin xét duyệt trước khi mở portal mentor.
          </p>
        </section>
        <ApplyMentorForm onSubmitted={refreshMentorPortalData} />
      </div>
    );
  }

  if (!isActiveProfile) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="h-4 w-4" />
            Chờ duyệt mentor
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 md:text-4xl">
            Hồ sơ mentor chưa được mở portal
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Admin cần duyệt hồ sơ trước khi bạn quản lý lịch trống, booking, thu nhập và đánh giá.
          </p>
        </section>
        <ProfileStatusCard profile={myProfile} onSubmitted={refreshMentorPortalData} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section id="overview" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            <BadgeCheck className="h-4 w-4" />
            Cổng mentor
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 md:text-4xl">
            {pageTitle[view]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {pageDescription[view]}
          </p>
        </div>
      </section>

      {(reviewsError || incomeError) && (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {reviewsError || incomeError}
        </p>
      )}

      {view === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Trạng thái hồ sơ"
              value={profileStatusLabel[myProfile.status] || myProfile.status}
              icon={UserCheck}
              tone="bg-sky-600"
            />
            <StatCard title="Slot đã tạo" value={mySlots.length.toString()} icon={Calendar} tone="bg-indigo-600" />
            <StatCard title="Chờ xác nhận" value={pendingBookings.toString()} icon={Clock} tone="bg-amber-500" />
            <StatCard
              title="Giá từ"
              value={formatMoney(rate?.pricePerSession, myProfile.pricing?.currency)}
              icon={WalletCards}
              tone="bg-emerald-600"
            />
          </div>
      )}

      {view === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <ProfileSummary profile={myProfile} activeBookings={activeBookings.length} />
          <PortalPanel title="Chất lượng phiên tư vấn" description="Giữ lịch rõ ràng, xác nhận nhanh và chuẩn bị trước nội dung học viên gửi.">
            <div className="flex items-center gap-2 text-amber-500">
              <Star className="h-5 w-5 fill-current" />
              <span className="font-bold">Sẵn sàng nhận đánh giá tốt</span>
            </div>
          </PortalPanel>
        </div>
      )}
      {view === 'profile' && <ProfileSummary profile={myProfile} activeBookings={activeBookings.length} />}
      {view === 'availability' && (
        <MentorSchedulingWorkspace
          profile={myProfile}
          slots={mySlots}
          bookings={bookings}
          onChanged={refreshSlotsOnly}
          onBookingUpdated={applyBookingUpdate}
          onOpenChat={openBookingChat}
        />
      )}
      {view === 'bookings' && (
        <MentorBookingList
          bookings={bookings}
          onChanged={refreshSlotsOnly}
          onBookingUpdated={applyBookingUpdate}
          onOpenChat={openBookingChat}
        />
      )}
      {view === 'income' && <MentorIncomePanel income={income} />}
      {view === 'reviews' && <MentorReviewsPanel reviews={reviews} />}
    </div>
  );
}
