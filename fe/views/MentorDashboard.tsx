'use client';

import { Button } from '@/components/ui/button';
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
import { ApiError } from '@/lib/api-client';
import { authStorage } from '@/lib/auth-storage';
import { careerTagsService, type CareerTag, type SkillTag } from '@/lib/career-tags.service';
import {
  BookingSession,
  MentorNotification,
  MentorAvailabilitySlot,
  mentorService,
  notificationService,
  TutorProfile,
} from '@/lib/mentor.service';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  Calendar,
  CalendarCheck2,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Link as LinkIcon,
  Loader2,
  Plus,
  Repeat,
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

const statusLabel: Record<string, string> = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ mentor xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Đã hoàn thành',
  cancelled_by_mentee: 'Học viên đã hủy',
  cancelled_by_mentor: 'Mentor đã hủy',
  rescheduled: 'Đề xuất đổi lịch',
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

function isProfileMissing(error: unknown) {
  return error instanceof ApiError && error.statusCode === 404;
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

function ApplyMentorForm({ onSubmitted }: { onSubmitted: () => void }) {
  const token = authStorage.getAccessToken();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    currentPosition: '',
    company: '',
    yearsOfExperience: '3',
    industries: '',
    specializations: '',
    price: '200000',
  });
  const [careerCatalog, setCareerCatalog] = useState<CareerTag[]>([]);
  const [skillTags, setSkillTags] = useState<SkillTag[]>([]);
  const [selectedCareerIds, setSelectedCareerIds] = useState<string[]>([]);
  const [selectedSkillSlugs, setSelectedSkillSlugs] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

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
      await mentorService.applyTutorProfile(token, {
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
      });
      setMessage('Đã gửi hồ sơ mentor. Admin sẽ duyệt trước khi hồ sơ hiển thị công khai.');
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
          title="Đăng ký làm mentor"
          description="Hoàn thiện hồ sơ để admin xét duyệt. Sau khi được duyệt, bạn có thể mở lịch và nhận booking từ học viên."
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
              Gửi hồ sơ cho admin duyệt
            </Button>
            <Link href="/mentor-matching">
              <Button variant="outline">Xem danh sách mentor</Button>
            </Link>
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

function ProfileStatusCard({ profile }: { profile: TutorProfile }) {
  const rejectedReason = profile.adminInfo?.rejectionReason;
  const isRejected = profile.status === 'rejected';

  return (
    <PortalPanel id="profile" title="Trạng thái xét duyệt" description="Hồ sơ của bạn đang được theo dõi trong cổng mentor.">
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
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">
            {profileStatusLabel[profile.status] || profile.status}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Hồ sơ {getMentorName(profile)} hiện chưa thể mở lịch tư vấn công khai. Bạn có thể theo dõi trạng thái tại đây.
          </p>
          {rejectedReason && (
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Lý do từ chối: {rejectedReason}
            </p>
          )}
        </div>
      </div>
    </PortalPanel>
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
  onChanged: () => void;
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa khung giờ.');
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

  const cancelBooking = async (booking: BookingSession) => {
    const reason = window.prompt('Lý do hủy booking?') || undefined;
    setBusyId(booking.id);
    try {
      await mentorService.cancelBooking(token, booking.id, reason);
      setMessage('Đã hủy booking.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy booking.');
    } finally {
      setBusyId('');
    }
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
                      onClick={() => cancelBooking(selectedEntry.booking as BookingSession)}
                      disabled={busyId === selectedEntry.booking.id}
                    >
                      Hủy booking
                    </Button>
                  )}
                  {!selectedEntry.booking && selectedEntry.slot?.status === 'available' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSlot(selectedEntry.slot?.id || '')}
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
}: {
  bookings: BookingSession[];
  onChanged: () => void;
}) {
  const token = authStorage.getAccessToken();
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const confirmBooking = async (booking: BookingSession) => {
    setBusyId(booking.id);
    setMessage('');
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

  const cancelBooking = async (booking: BookingSession) => {
    const reason = window.prompt('Lý do hủy booking?') || undefined;
    setBusyId(booking.id);
    setMessage('');
    try {
      await mentorService.cancelBooking(token, booking.id, reason);
      setMessage('Đã hủy booking.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy booking.');
    } finally {
      setBusyId('');
    }
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
          <div className="hidden grid-cols-[1fr_160px_150px_180px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400 lg:grid">
            <span>Nội dung</span>
            <span>Thời gian</span>
            <span>Trạng thái</span>
            <span className="text-right">Thao tác</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {bookings.map((booking) => {
              const canConfirm = booking.status === 'pending';
              const canCancel = ['pending', 'confirmed', 'rescheduled'].includes(booking.status);
              const date = new Date(
                booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
              );

              return (
                <div key={booking.id} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1fr_160px_150px_180px] lg:items-center">
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
                    {canConfirm && (
                      <Button size="sm" onClick={() => confirmBooking(booking)} disabled={busyId === booking.id} className="bg-sky-600 hover:bg-sky-700">
                        {busyId === booking.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        Xác nhận
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="outline" onClick={() => cancelBooking(booking)} disabled={busyId === booking.id}>
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
    </PortalPanel>
  );
}

const MENTOR_SLOT_MINUTES = 90;
const MENTOR_WORK_START_MINUTE = 8 * 60;
const MENTOR_WORK_END_MINUTE = 23 * 60;
const MENTOR_SLOT_ROW_HEIGHT = 58;
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

function getWeekRangeLabel(weekStart: Date) {
  return `${formatScheduleDate(weekStart)} - ${formatScheduleDate(addDays(weekStart, 6))}`;
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
}: {
  profile: TutorProfile;
  slots: MentorAvailabilitySlot[];
  bookings: BookingSession[];
  onChanged: () => void;
}) {
  const token = authStorage.getAccessToken();
  const currentAvailabilityWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const [availabilityWeekStart, setAvailabilityWeekStart] = useState(() => startOfWeek(new Date()));
  const availabilityWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(availabilityWeekStart, index)),
    [availabilityWeekStart],
  );
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [isFixedSchedule, setIsFixedSchedule] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(8);
  const [bookingWeekStart, setBookingWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedAvailabilitySlotId, setSelectedAvailabilitySlotId] = useState('');
  const [editDayIndex, setEditDayIndex] = useState(0);
  const [editStartMinute, setEditStartMinute] = useState(MENTOR_WORK_START_MINUTE);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const now = new Date();

  const slotsByCell = useMemo(() => {
    const map = new Map<string, MentorAvailabilitySlot>();
    slots.forEach((slot) => {
      const start = new Date(slot.startAt);
      const dayIndex = availabilityWeekDays.findIndex((day) => sameDay(day, start));
      const minute = minutesFromMidnight(start);
      if (dayIndex >= 0 && MENTOR_SLOT_STARTS.includes(minute)) {
        map.set(getSlotKey(dayIndex, minute), slot);
      }
    });
    return map;
  }, [availabilityWeekDays, slots]);

  const bookingWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(bookingWeekStart, index)),
    [bookingWeekStart],
  );

  const visibleBookings = useMemo(
    () =>
      bookings
        .filter((booking) => BOOKING_TIMETABLE_STATUSES.includes(booking.status))
        .map((booking) => {
          const start = getBookingStart(booking);
          const end = getBookingEnd(booking, start);
          const dayIndex = bookingWeekDays.findIndex((day) => sameDay(day, start));
          return { booking, start, end, dayIndex };
        })
        .filter((entry) => entry.dayIndex >= 0 && !Number.isNaN(entry.start.getTime()))
        .sort((first, second) => first.start.getTime() - second.start.getTime()),
    [bookingWeekDays, bookings],
  );

  const selectedBooking = selectedBookingId
    ? bookings.find((booking) => booking.id === selectedBookingId) || null
    : null;
  const selectedMeetingHref = selectedBooking ? getBookingMeetingHref(selectedBooking) : '';
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
  const editStartAt = dateAtMinutes(availabilityWeekDays[editDayIndex] || availabilityWeekStart, editStartMinute);
  const editEndAt = new Date(editStartAt.getTime() + MENTOR_SLOT_MINUTES * 60_000);
  const editSlotInPast = editStartAt < now;

  const changeAvailabilityWeek = (days: number) => {
    setAvailabilityWeekStart((current) => addDays(current, days));
    setSelectedSlotKeys([]);
    setSelectedAvailabilitySlotId('');
    setMessage('');
  };

  const openAvailabilitySlot = (slot: MentorAvailabilitySlot) => {
    const start = new Date(slot.startAt);
    const dayIndex = availabilityWeekDays.findIndex((day) => sameDay(day, start));
    setSelectedSlotKeys([]);
    setSelectedAvailabilitySlotId(slot.id);
    setEditDayIndex(Math.max(0, dayIndex));
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
        weekStart: availabilityWeekStart.toISOString(),
        slotStarts,
        repeatWeeks: isFixedSchedule ? repeatWeeks : 1,
      });
      setSelectedSlotKeys([]);
      setMessage(`Đã tạo ${result.created.length} slot, bỏ qua ${result.skipped.length} slot.`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo lịch trống.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSelectedAvailabilitySlot = async () => {
    if (!selectedAvailabilitySlot || !canEditSelectedAvailability) return;

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

  const deleteSelectedAvailabilitySlot = async () => {
    if (!selectedAvailabilitySlot || !canEditSelectedAvailability) return;
    if (!window.confirm('Xóa slot lịch rảnh này?')) return;

    setBusyId(selectedAvailabilitySlot.id);
    setMessage('');
    try {
      await mentorService.deleteAvailabilitySlot(token, selectedAvailabilitySlot.id);
      setSelectedAvailabilitySlotId('');
      setMessage('Đã xóa slot lịch rảnh.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa slot lịch rảnh.');
    } finally {
      setBusyId('');
    }
  };

  const confirmBooking = async (booking: BookingSession) => {
    setBusyId(booking.id);
    setMessage('');
    try {
      await mentorService.confirmBooking(token, booking.id);
      setMessage('Đã xác nhận booking và tạo link video call.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xác nhận booking.');
    } finally {
      setBusyId('');
    }
  };

  const cancelBooking = async (booking: BookingSession) => {
    const reason = window.prompt('Lý do hủy booking?') || undefined;
    setBusyId(booking.id);
    setMessage('');
    try {
      await mentorService.cancelBooking(token, booking.id, reason);
      setMessage('Đã hủy booking.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy booking.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <PortalPanel
        id="availability"
        title="Nhập thời gian rảnh"
        description="Chọn các slot 90 phút mentor có thể nhận video call trong tuần hiện tại."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-slate-50">
                Tuần {getWeekRangeLabel(availabilityWeekStart)}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Slot bắt đầu từ 08:00 đến 21:30, mỗi slot kéo dài đến tối đa 23:00.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => changeAvailabilityWeek(-7)}>
                  <ChevronLeft className="h-4 w-4" />
                  Tuần trước
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAvailabilityWeekStart(currentAvailabilityWeekStart);
                    setSelectedSlotKeys([]);
                    setSelectedAvailabilitySlotId('');
                    setMessage('');
                  }}
                >
                  Tuần này
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => changeAvailabilityWeek(7)}>
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
            <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {message}
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[88px_repeat(7,minmax(112px,1fr))] border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Giờ</div>
                {availabilityWeekDays.map((day, index) => (
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
                  {availabilityWeekDays.map((day, dayIndex) => {
                    const key = getSlotKey(dayIndex, minute);
                    const start = dateAtMinutes(day, minute);
                    const end = new Date(start.getTime() + MENTOR_SLOT_MINUTES * 60_000);
                    const existingSlot = slotsByCell.get(key);
                    const isPast = start < now;
                    const isSelected = selectedSlotKeys.includes(key);
                    const disabled = isSaving || (!existingSlot && isPast);
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

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (existingSlot) {
                            openAvailabilitySlot(existingSlot);
                            return;
                          }
                          toggleSlot(key);
                        }}
                        className={cn(
                          'm-1 flex h-12 flex-col justify-center rounded-lg border px-2 text-left text-xs transition',
                          slotClass,
                        )}
                      >
                        <span className="font-bold">{slotLabel}</span>
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

      <Dialog open={!!selectedAvailabilitySlot} onOpenChange={(open) => !open && setSelectedAvailabilitySlotId('')}>
        <DialogContent className="max-w-xl">
          {selectedAvailabilitySlot && selectedAvailabilityStart && selectedAvailabilityEnd && (
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
                      <span>Ngày trong tuần đang xem</span>
                      <select
                        value={editDayIndex}
                        onChange={(event) => setEditDayIndex(Number(event.target.value))}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:ring-sky-500/10"
                      >
                        {availabilityWeekDays.map((day, index) => (
                          <option key={day.toISOString()} value={index}>
                            {WEEKDAY_LABELS[index]} - {formatScheduleDate(day)}
                          </option>
                        ))}
                      </select>
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
                          {editStartAt.toLocaleDateString('vi-VN')} · {formatScheduleTime(editStartAt)} -{' '}
                          {formatScheduleTime(editEndAt)}
                        </span>
                      </div>
                    </div>
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
                    onClick={deleteSelectedAvailabilitySlot}
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
                    disabled={busyId === selectedAvailabilitySlot.id || editSlotInPast}
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
          )}
        </DialogContent>
      </Dialog>

      <PortalPanel
        id="booked-timetable"
        title="Thời khóa biểu booking"
        description="Theo dõi các slot học viên đã booking và xử lý xác nhận video call."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <CalendarCheck2 className="h-4 w-4 text-sky-600" />
              Tuần {getWeekRangeLabel(bookingWeekStart)}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setBookingWeekStart((current) => addDays(current, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
                Tuần trước
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setBookingWeekStart((current) => addDays(current, 7))}
              >
                Tuần tới
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[88px_repeat(7,minmax(112px,1fr))] border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <div className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">Giờ</div>
                {bookingWeekDays.map((day, index) => (
                  <div key={day.toISOString()} className="border-l border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{WEEKDAY_LABELS[index]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatScheduleDate(day)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[88px_repeat(7,minmax(112px,1fr))]">
                <div>
                  {MENTOR_SLOT_STARTS.map((minute) => (
                    <div
                      key={minute}
                      className="border-b border-slate-100 px-3 py-1 text-right text-xs font-semibold text-slate-400 dark:border-slate-800"
                      style={{ height: MENTOR_SLOT_ROW_HEIGHT }}
                    >
                      {formatMinuteLabel(minute)}
                    </div>
                  ))}
                </div>

                {bookingWeekDays.map((day, dayIndex) => (
                  <div
                    key={day.toISOString()}
                    className="relative border-l border-slate-200 dark:border-slate-800"
                    style={{ height: MENTOR_SLOT_STARTS.length * MENTOR_SLOT_ROW_HEIGHT }}
                  >
                    {MENTOR_SLOT_STARTS.map((minute) => (
                      <div
                        key={minute}
                        className="border-b border-slate-100 dark:border-slate-800"
                        style={{ height: MENTOR_SLOT_ROW_HEIGHT }}
                      />
                    ))}

                    {visibleBookings
                      .filter((entry) => entry.dayIndex === dayIndex)
                      .map(({ booking, start, end }) => {
                        const top =
                          ((minutesFromMidnight(start) - MENTOR_WORK_START_MINUTE) / MENTOR_SLOT_MINUTES) *
                          MENTOR_SLOT_ROW_HEIGHT;
                        const height = Math.max(
                          44,
                          ((end.getTime() - start.getTime()) / (MENTOR_SLOT_MINUTES * 60_000)) *
                            MENTOR_SLOT_ROW_HEIGHT -
                            8,
                        );
                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => setSelectedBookingId(booking.id)}
                            className={cn(
                              'absolute left-1 right-1 z-10 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs shadow-sm transition hover:shadow-md',
                              statusTone[booking.status] || statusTone.pending,
                            )}
                            style={{ top: Math.max(2, top + 4), height }}
                          >
                            <span className="block truncate font-bold">{booking.sessionType.replace(/_/g, ' ')}</span>
                            <span className="block truncate opacity-80">
                              {formatScheduleTime(start)} - {formatScheduleTime(end)}
                            </span>
                            <span className="block truncate opacity-80">
                              {statusLabel[booking.status] || booking.status}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {visibleBookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Tuần này chưa có booking nào.
            </div>
          )}
        </div>
      </PortalPanel>

      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBookingId('')}>
        <DialogContent className="max-w-2xl">
          {selectedBooking && (
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
                    onClick={() => cancelBooking(selectedBooking)}
                    disabled={busyId === selectedBooking.id}
                  >
                    Hủy booking
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationCenter({
  notifications,
  streamStatus,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: MentorNotification[];
  streamStatus: 'connecting' | 'live' | 'closed';
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const statusClass =
    streamStatus === 'live'
      ? 'bg-emerald-500'
      : streamStatus === 'connecting'
        ? 'bg-amber-500'
        : 'bg-slate-400';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="relative">
          <span className={cn('absolute right-2 top-2 h-2 w-2 rounded-full', statusClass)} />
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <p className="font-bold text-slate-950 dark:text-slate-50">Thông báo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} chưa đọc</p>
          </div>
          {unreadCount > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={onMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Chưa có thông báo.</div>
          ) : (
            notifications.slice(0, 8).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => !notification.readAt && onMarkRead(notification.id)}
                className={cn(
                  'block w-full border-b border-slate-100 p-4 text-left text-sm last:border-b-0 dark:border-slate-800',
                  notification.readAt
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-sky-50 dark:bg-sky-500/10',
                )}
              >
                <p className="font-semibold text-slate-950 dark:text-slate-50">{notification.title}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">{notification.body}</p>
                {notification.payload?.meetingLink && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <LinkIcon className="h-3.5 w-3.5" />
                    Video call
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProfileSummary({ profile, activeBookings }: { profile: TutorProfile; activeBookings: number }) {
  return (
    <PortalPanel id="profile" title="Hồ sơ mentor" description="Thông tin đang dùng để hiển thị trong marketplace.">
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

export type MentorDashboardView = 'overview' | 'profile' | 'availability' | 'bookings';

export default function MentorDashboard({ view = 'overview' }: { view?: MentorDashboardView }) {
  const [myProfile, setMyProfile] = useState<TutorProfile | null>(null);
  const [mySlots, setMySlots] = useState<MentorAvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<BookingSession[]>([]);
  const [notifications, setNotifications] = useState<MentorNotification[]>([]);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'closed'>('closed');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async (silent = false) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    if (!silent) setIsLoading(true);
    setMessage('');
    try {
      const [profile, myBookings] = await Promise.all([
        mentorService.getMyTutorProfile(token).catch((error) => {
          if (isProfileMissing(error)) return null;
          throw error;
        }),
        mentorService.getMyBookings(token),
      ]);

      const slots = profile ? await mentorService.getMyAvailabilitySlots(token) : [];
      setMyProfile(profile);
      setBookings(myBookings.asMentor);
      setMySlots(slots);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu mentor.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    try {
      const nextNotifications = await notificationService.getNotifications(token);
      setNotifications(nextNotifications);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadNotifications();
  }, [loadData, loadNotifications]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;

    return notificationService.subscribe(
      token,
      (notification) => {
        setNotifications((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ]);
        void loadData(true);
      },
      setStreamStatus,
    );
  }, [loadData]);

  const markNotificationRead = useCallback(async (id: string) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    try {
      const updated = await notificationService.markRead(token, id);
      setNotifications((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch {
      // Realtime state will reconcile on the next notification fetch.
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    try {
      await notificationService.markAllRead(token);
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    } catch {
      // Realtime state will reconcile on the next notification fetch.
    }
  }, []);

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
  };
  const pageDescription: Record<MentorDashboardView, string> = {
    overview: 'Theo dõi nhanh trạng thái hồ sơ, lịch trống và booking 1-1.',
    profile: 'Kiểm tra hồ sơ mentor đang dùng để hiển thị trong marketplace.',
    availability: 'Quản lý khung giờ trống bằng thời khóa biểu theo từng ngày và từng giờ.',
    bookings: 'Theo dõi và xử lý các buổi tư vấn học viên đã đặt với bạn.',
  };

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
        <div className="flex items-center gap-2">
          <NotificationCenter
            notifications={notifications}
            streamStatus={streamStatus}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
          <Link href="/mentor-matching">
            <Button variant="outline">Xem marketplace</Button>
          </Link>
        </div>
      </section>

      {message && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message}</p>}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
        </div>
      ) : !myProfile ? (
        <ApplyMentorForm onSubmitted={loadData} />
      ) : (
        <>
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

          {myProfile.status !== 'active' ? (
            <ProfileStatusCard profile={myProfile} />
          ) : (
            <>
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
                  onChanged={loadData}
                />
              )}
              {view === 'bookings' && <MentorBookingList bookings={bookings} onChanged={loadData} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
