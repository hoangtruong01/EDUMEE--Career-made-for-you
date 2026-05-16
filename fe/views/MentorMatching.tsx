'use client';

import { Button } from '@/components/ui/button';
import { authStorage } from '@/lib/auth-storage';
import { careerTagsService, type CareerTag, type SkillTag } from '@/lib/career-tags.service';
import {
  BookingSession,
  CreateBookingPayload,
  MentorAvailabilitySlot,
  MentorSessionType,
  mentorService,
  TutorProfile,
} from '@/lib/mentor.service';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Clock,
  GraduationCap,
  Loader2,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  rescheduled: 'Đề xuất đổi lịch',
  no_show_mentee: 'Học viên vắng',
  no_show_mentor: 'Mentor vắng',
};

function formatMoney(amount?: number, currency = 'VND') {
  if (!amount) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMentorName(profile?: TutorProfile) {
  if (!profile) return 'Mentor';
  return profile.professionalBackground?.currentPosition || 'Mentor';
}

function getPrimaryRate(profile: TutorProfile) {
  return profile.pricing?.sessionRates?.[0];
}

function getSessionTypes(profile: TutorProfile): MentorSessionType[] {
  const fromAvailability = profile.availability?.sessionPreferences?.sessionTypes || [];
  const fromPricing = profile.pricing?.sessionRates?.map((rate) => rate.sessionType) || [];
  return Array.from(new Set([...fromAvailability, ...fromPricing])).filter(Boolean);
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function MentorCard({
  mentor,
  onBook,
}: {
  mentor: TutorProfile;
  onBook: (mentor: TutorProfile) => void;
}) {
  const skills = mentor.mentoringExpertise?.skillExpertise?.slice(0, 4) || [];
  const careers = mentor.mentoringExpertise?.careerExpertise?.slice(0, 2) || [];
  const rate = getPrimaryRate(mentor);
  const rating = mentor.performanceMetrics?.ratings?.averageRating || 0;
  const reviews = mentor.performanceMetrics?.ratings?.totalReviews || 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex flex-col overflow-hidden rounded-2xl"
    >
      <div className="bg-gradient-hero h-20" />
      <div className="flex flex-1 flex-col p-5">
        <div className="-mt-12 mb-4 flex items-end justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-background bg-primary text-xl font-bold text-primary-foreground shadow-lg">
            {(mentor.professionalBackground?.currentPosition || 'M').charAt(0)}
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Đã xác thực
          </span>
        </div>

        <div className="mb-3">
          <h3 className="font-display text-lg font-bold">{getMentorName(mentor)}</h3>
          <p className="text-muted-foreground text-sm">
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
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              {rating ? rating.toFixed(1) : 'Mới'} ({reviews})
            </span>
            <span className="font-bold text-primary">
              {formatMoney(rate?.pricePerSession, mentor.pricing?.currency)}
            </span>
          </div>
          <Button className="w-full" variant="hero" onClick={() => onBook(mentor)}>
            <Calendar className="h-4 w-4" />
            Đặt lịch
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function BookingModal({
  mentor,
  onClose,
  onBooked,
}: {
  mentor: TutorProfile;
  onClose: () => void;
  onBooked: () => void;
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

function BookingList({ bookings }: { bookings: BookingSession[] }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="mb-4 font-display text-xl font-bold">Lịch của tôi</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có booking nào.</p>
      ) : (
        <div className="space-y-3">
          {bookings.slice(0, 5).map((booking) => (
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
                - {booking.schedulingDetails.duration} phut
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MentorMatching() {
  const [mentors, setMentors] = useState<TutorProfile[]>([]);
  const [bookings, setBookings] = useState<BookingSession[]>([]);
  const [careerCatalog, setCareerCatalog] = useState<CareerTag[]>([]);
  const [skillTags, setSkillTags] = useState<SkillTag[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [selectedSkillSlug, setSelectedSkillSlug] = useState('');
  const [activeMentor, setActiveMentor] = useState<TutorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const [profiles, myBookings] = await Promise.all([
        mentorService.getActiveMentors(token),
        mentorService.getMyBookings(token),
      ]);
      setMentors(profiles);
      setBookings(myBookings.asMentee);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu mentor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

          <section className="rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Muốn trở thành mentor?</h2>
                <p className="text-sm text-muted-foreground">
                  Tạo hồ sơ mentor riêng để admin duyệt và bắt đầu mở lịch tư vấn.
                </p>
              </div>
              <Link href="/mentor-dashboard">
                <Button variant="outline">
                  Mở cổng mentor
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
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {careerCatalog.slice(0, 24).map((career) => {
                      const careerId = getCareerId(career);
                      return (
                        <FilterChip
                          key={careerId}
                          active={selectedCareerId === careerId}
                          onClick={() => {
                            setSelectedCareerId((current) => (current === careerId ? '' : careerId));
                            setSelectedSkillSlug('');
                          }}
                        >
                          {career.title}
                        </FilterChip>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleSkillTags.map((skill) => (
                      <FilterChip
                        key={skill.slug}
                        active={selectedSkillSlug === skill.slug}
                        onClick={() => setSelectedSkillSlug((current) => (current === skill.slug ? '' : skill.slug))}
                      >
                        {skill.name}
                      </FilterChip>
                    ))}
                  </div>
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
                    <MentorCard key={mentor.id} mentor={mentor} onBook={setActiveMentor} />
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <BookingList bookings={bookings} />
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
        {activeMentor && (
          <BookingModal mentor={activeMentor} onClose={() => setActiveMentor(null)} onBooked={loadData} />
        )}
      </AnimatePresence>
    </>
  );
}
