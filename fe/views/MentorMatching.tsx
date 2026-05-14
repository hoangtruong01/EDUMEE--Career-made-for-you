'use client';

import { Button } from '@/components/ui/button';
import { authStorage } from '@/lib/auth-storage';
import {
  BookingSession,
  CreateBookingPayload,
  mentorService,
  TutorProfile,
} from '@/lib/mentor.service';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const statusLabel: Record<string, string> = {
  awaiting_payment: 'Cho thanh toan',
  pending: 'Cho mentor xac nhan',
  confirmed: 'Da xac nhan',
  completed: 'Da hoan thanh',
  cancelled_by_mentee: 'Hoc vien da huy',
  cancelled_by_mentor: 'Mentor da huy',
  rescheduled: 'De xuat doi lich',
  no_show_mentee: 'Hoc vien vang',
  no_show_mentor: 'Mentor vang',
};

function formatMoney(amount?: number, currency = 'VND') {
  if (!amount) return 'Mien phi';
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

function getSessionTypes(profile: TutorProfile) {
  const fromAvailability = profile.availability?.sessionPreferences?.sessionTypes || [];
  const fromPricing = profile.pricing?.sessionRates?.map((rate) => rate.sessionType) || [];
  return Array.from(new Set([...fromAvailability, ...fromPricing])).filter(Boolean);
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
            Verified
          </span>
        </div>

        <div className="mb-3">
          <h3 className="font-display text-lg font-bold">{getMentorName(mentor)}</h3>
          <p className="text-muted-foreground text-sm">
            {mentor.professionalBackground?.company || 'Independent'} ·{' '}
            {mentor.professionalBackground?.yearsOfExperience || 0} nam kinh nghiem
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
              {rating ? rating.toFixed(1) : 'Moi'} ({reviews})
            </span>
            <span className="font-bold text-primary">
              {formatMoney(rate?.pricePerSession, mentor.pricing?.currency)}
            </span>
          </div>
          <Button className="w-full" variant="hero" onClick={() => onBook(mentor)}>
            <Calendar className="h-4 w-4" />
            Dat lich
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
  const firstRate = getPrimaryRate(mentor);
  const [sessionType, setSessionType] = useState(sessionTypes[0] || 'general_mentoring');
  const [requestedDateTime, setRequestedDateTime] = useState('');
  const [duration, setDuration] = useState(firstRate?.duration || 60);
  const [topics, setTopics] = useState('');
  const [currentSituation, setCurrentSituation] = useState('');
  const [desiredOutcomes, setDesiredOutcomes] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!requestedDateTime || !topics.trim() || !currentSituation.trim() || !desiredOutcomes.trim()) {
      setMessage('Vui long nhap du muc tieu, thoi gian va noi dung can trao doi.');
      return;
    }

    const payload: CreateBookingPayload = {
      tutorProfileId: mentor.id,
      sessionType,
      schedulingDetails: {
        requestedDateTime,
        duration,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
        meetingPlatform: 'google_meet',
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
      setMessage('Dat lich thanh cong. Mentor se xac nhan lich som.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong the tao booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Dong" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">Dat lich voi mentor</h2>
            <p className="text-sm text-muted-foreground">{getMentorName(mentor)}</p>
          </div>
          <button className="rounded-full p-2 hover:bg-muted" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Loai buoi
              <select
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {sessionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              Thoi luong
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {(mentor.availability?.sessionPreferences?.preferredDuration || [60, 90]).map((item) => (
                  <option key={item} value={item}>
                    {item} phut
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm font-medium">
            Thoi gian mong muon
            <input
              type="datetime-local"
              value={requestedDateTime}
              onChange={(event) => setRequestedDateTime(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium">
            Chu de can trao doi
            <input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder="VD: CV, phong van, lo trinh backend"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium">
            Tinh huong hien tai
            <textarea
              value={currentSituation}
              onChange={(event) => setCurrentSituation(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium">
            Ket qua mong muon
            <textarea
              value={desiredOutcomes}
              onChange={(event) => setDesiredOutcomes(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm"
            />
          </label>

          {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={onClose}>
              Dong
            </Button>
            <Button className="flex-1" variant="hero" onClick={submit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Xac nhan va thanh toan
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ApplyMentorForm({ onSubmitted }: { onSubmitted: () => void }) {
  const token = authStorage.getAccessToken();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    currentPosition: '',
    company: '',
    yearsOfExperience: '3',
    industries: '',
    careerTitle: '',
    skills: '',
    specializations: '',
    price: '200000',
  });

  const submit = async () => {
    if (!form.currentPosition || !form.company || !form.careerTitle || !form.skills) {
      setMessage('Vui long nhap du vi tri, cong ty, nghe va ky nang mentor.');
      return;
    }

    try {
      await mentorService.applyTutorProfile(token, {
        professionalBackground: {
          currentPosition: form.currentPosition,
          company: form.company,
          yearsOfExperience: Number(form.yearsOfExperience) || 0,
          industries: form.industries.split(',').map((item) => item.trim()).filter(Boolean),
          seniority: 'mid',
        },
        mentoringExpertise: {
          careerExpertise: [
            {
              careerTitle: form.careerTitle,
              yearsInField: Number(form.yearsOfExperience) || 0,
              confidenceLevel: 4,
            },
          ],
          skillExpertise: form.skills.split(',').map((skill) => ({
            skillName: skill.trim(),
            skillCategory: 'technical',
            proficiencyLevel: 4,
            teachingExperience: 1,
          })),
          specializations: form.specializations.split(',').map((item) => item.trim()).filter(Boolean),
          targetMenteeLevels: ['beginner', 'mid'],
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
      setMessage('Da gui ho so mentor. Admin se duyet truoc khi hien thi cong khai.');
      onSubmitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong the gui ho so mentor.');
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Dang ky lam mentor</h2>
          <p className="text-sm text-muted-foreground">Ho so se o trang thai cho duyet truoc khi len danh sach.</p>
        </div>
        <Button variant="outline" onClick={() => setIsOpen((value) => !value)}>
          {isOpen ? 'Thu gon' : 'Mo form'}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ['currentPosition', 'Vi tri hien tai'],
            ['company', 'Cong ty'],
            ['yearsOfExperience', 'So nam kinh nghiem'],
            ['industries', 'Linh vuc, cach nhau boi dau phay'],
            ['careerTitle', 'Nghe co the mentor'],
            ['skills', 'Ky nang mentor'],
            ['specializations', 'Chuyen de mentor'],
            ['price', 'Gia moi buoi 60 phut'],
          ].map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm font-medium">
              {label}
              <input
                value={form[key as keyof typeof form]}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <Button variant="hero" onClick={submit}>
              Gui ho so cho admin duyet
            </Button>
          </div>
        </div>
      )}
      {message && <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}

function BookingList({ title, bookings }: { title: string; bookings: BookingSession[] }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chua co booking nao.</p>
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
                · {booking.schedulingDetails.duration} phut
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
  const [bookings, setBookings] = useState<{ asMentee: BookingSession[]; asMentor: BookingSession[] }>({
    asMentee: [],
    asMentor: [],
  });
  const [search, setSearch] = useState('');
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
      setBookings(myBookings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong the tai du lieu mentor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredMentors = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return mentors;
    return mentors.filter((mentor) => {
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
  }, [mentors, search]);

  return (
    <>
      <div className="min-h-screen pb-20">
        <div className="bg-gradient-card">
          <div className="container py-10">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <GraduationCap className="h-4 w-4" />
                Mentor duoc admin xac thuc
              </span>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Ket noi voi Mentor</h1>
              <p className="mt-2 text-muted-foreground">
                Dat lich 1-1, thanh toan qua SePay va theo doi trang thai xac nhan tu mentor.
              </p>
            </div>
          </div>
        </div>

        <div className="container mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Users, label: 'Mentor active', value: mentors.length.toString() },
              { icon: Calendar, label: 'Booking cua toi', value: bookings.asMentee.length.toString() },
              { icon: CheckCircle2, label: 'Mentor queue', value: bookings.asMentor.length.toString() },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-card rounded-2xl p-4 text-center">
                <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <ApplyMentorForm onSubmitted={loadData} />

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tim theo vi tri, cong ty, ky nang..."
                  className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

              {isLoading ? (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-border">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredMentors.length === 0 ? (
                <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
                  Chua co mentor phu hop.
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
              <BookingList title="Lich cua toi" bookings={bookings.asMentee} />
              <BookingList title="Lich can mentor xu ly" bookings={bookings.asMentor} />
              <section className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="h-4 w-4" />
                  Payment workflow
                </div>
                Booking co phi se o trang thai cho thanh toan, sau khi SePay xac nhan thanh cong moi vao hang cho mentor xac nhan.
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
