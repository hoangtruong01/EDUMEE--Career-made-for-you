'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { authStorage } from '@/lib/auth-storage';
import {
  adminMentorService,
  BookingSession,
  BookingStatus,
  TutorProfile,
  TutorStatus,
} from '@/lib/mentor.service';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Check,
  Clock,
  GraduationCap,
  Loader2,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MentorTab = 'pending' | 'approved' | 'bookings';

const statusTone: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  suspended: 'bg-slate-200 text-slate-700',
  inactive: 'bg-slate-100 text-slate-600',
  awaiting_payment: 'bg-amber-100 text-amber-700',
  pending: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-violet-100 text-violet-700',
  cancelled_by_mentee: 'bg-rose-100 text-rose-700',
  cancelled_by_mentor: 'bg-rose-100 text-rose-700',
  rescheduled: 'bg-indigo-100 text-indigo-700',
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function primaryExpertise(profile: TutorProfile) {
  const careers = profile.mentoringExpertise?.careerExpertise?.map((item) => item.careerTitle) || [];
  const skills = profile.mentoringExpertise?.skillExpertise?.map((item) => item.skillName) || [];
  return [...careers, ...skills].slice(0, 4).join(', ') || 'Chua cap nhat';
}

function profileTitle(profile: TutorProfile) {
  return profile.professionalBackground?.currentPosition || 'Mentor profile';
}

function ProfileStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', statusTone[status] || statusTone.inactive)}>
      {statusLabel(status)}
    </span>
  );
}

export default function AdminMentorsPage() {
  const [activeTab, setActiveTab] = useState<MentorTab>('pending');
  const [profiles, setProfiles] = useState<TutorProfile[]>([]);
  const [bookings, setBookings] = useState<BookingSession[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const token = authStorage.getAccessToken();
    setIsLoading(true);
    setMessage('');
    try {
      const [pending, active, bookingData] = await Promise.all([
        adminMentorService.getPendingProfiles(token),
        adminMentorService.getProfiles(token, 'active'),
        adminMentorService.getBookings(token),
      ]);
      setProfiles([...pending.data, ...active.data]);
      setBookings(bookingData.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong the tai du lieu mentor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingProfiles = profiles.filter((profile) => profile.status === 'pending_approval');
  const activeProfiles = profiles.filter((profile) => profile.status === 'active');

  const filteredProfiles = useMemo(() => {
    const source = activeTab === 'pending' ? pendingProfiles : activeProfiles;
    const keyword = search.trim().toLowerCase();
    if (!keyword) return source;
    return source.filter((profile) =>
      [
        profileTitle(profile),
        profile.professionalBackground?.company,
        primaryExpertise(profile),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [activeProfiles, activeTab, pendingProfiles, search]);

  const updateStatus = async (profile: TutorProfile, status: TutorStatus) => {
    const token = authStorage.getAccessToken();
    const reason =
      status === 'rejected' ? window.prompt('Ly do tu choi ho so mentor?') || 'Rejected by admin' : undefined;
    try {
      await adminMentorService.updateProfileStatus(token, profile.id, status, reason);
      setMessage(status === 'active' ? 'Da duyet mentor va cap role mentor.' : 'Da cap nhat trang thai mentor.');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong the cap nhat trang thai.');
    }
  };

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quan ly Mentor & Booking"
        subtitle="Duyet ho so mentor, theo doi thanh toan va chat luong cac buoi tu van 1-1."
      />

      <div className="mb-6 flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <TabItem
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          label="Cho duyet"
          badge={pendingProfiles.length.toString()}
        />
        <TabItem active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} label="Mentor active" />
        <TabItem active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} label="Booking" />
      </div>

      {message && <p className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>}

      {isLoading ? (
        <div className="flex h-80 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
        </div>
      ) : activeTab === 'bookings' ? (
        <BookingList bookings={bookings} />
      ) : (
        <>
          <div className="mb-4 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900"
                placeholder="Tim mentor, cong ty, ky nang..."
              />
            </div>
          </div>

          {activeTab === 'pending' ? (
            <PendingMentors mentors={filteredProfiles} onUpdateStatus={updateStatus} />
          ) : (
            <MentorList mentors={filteredProfiles} onUpdateStatus={updateStatus} />
          )}
        </>
      )}
    </div>
  );
}

function TabItem({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative pb-4 text-sm font-semibold transition-colors',
        active
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
      )}
    >
      {label}
      {badge && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">{badge}</span>}
      {active && <div className="absolute bottom-0 left-0 h-0.5 w-full bg-violet-600 dark:bg-violet-400" />}
    </button>
  );
}

function PendingMentors({
  mentors,
  onUpdateStatus,
}: {
  mentors: TutorProfile[];
  onUpdateStatus: (profile: TutorProfile, status: TutorStatus) => void;
}) {
  if (mentors.length === 0) {
    return <EmptyState text="Khong co ho so mentor nao dang cho duyet." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {mentors.map((profile) => (
        <AdminPanel key={profile.id} className="flex flex-col justify-between p-5">
          <div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{profileTitle(profile)}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {profile.professionalBackground?.company || 'Independent'}
                  </p>
                </div>
              </div>
              <ProfileStatusBadge status={profile.status} />
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <InfoField label="Chuyen mon" value={primaryExpertise(profile)} />
              <InfoField
                label="Kinh nghiem"
                value={`${profile.professionalBackground?.yearsOfExperience || 0} nam`}
              />
              <InfoField
                label="Gia tu van"
                value={`${profile.pricing?.sessionRates?.[0]?.pricePerSession?.toLocaleString('vi-VN') || 0} ${
                  profile.pricing?.currency || 'VND'
                }`}
              />
              <InfoField label="Ngay nop" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'N/A'} />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-800"
              type="button"
            >
              Xem ho so
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-600"
              onClick={() => onUpdateStatus(profile, 'active')}
              type="button"
              title="Duyet"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white transition hover:bg-rose-600"
              onClick={() => onUpdateStatus(profile, 'rejected')}
              type="button"
              title="Tu choi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </AdminPanel>
      ))}
    </div>
  );
}

function MentorList({
  mentors,
  onUpdateStatus,
}: {
  mentors: TutorProfile[];
  onUpdateStatus: (profile: TutorProfile, status: TutorStatus) => void;
}) {
  if (mentors.length === 0) {
    return <EmptyState text="Chua co mentor active." />;
  }

  return (
    <AdminPanel className="overflow-hidden p-0">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th className="px-6 py-4 text-left">Mentor</th>
            <th className="px-6 py-4 text-left">Chuyen mon</th>
            <th className="px-6 py-4 text-center">Danh gia</th>
            <th className="px-6 py-4 text-center">Buoi tu van</th>
            <th className="px-6 py-4 text-right">Trang thai</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {mentors.map((profile) => (
            <tr key={profile.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold text-white">
                    {profileTitle(profile).charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{profileTitle(profile)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {profile.professionalBackground?.company || 'Independent'}
                    </p>
                  </div>
                </div>
              </td>
              <td className="max-w-md px-6 py-4 text-slate-600 dark:text-slate-400">{primaryExpertise(profile)}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-1 font-bold text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {profile.performanceMetrics?.ratings?.averageRating?.toFixed(1) || 'Moi'}
                </div>
              </td>
              <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                {profile.performanceMetrics?.totalSessions || 0}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="inline-flex items-center gap-2">
                  <ProfileStatusBadge status={profile.status} />
                  <button
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    type="button"
                    onClick={() => onUpdateStatus(profile, 'suspended')}
                  >
                    Tam khoa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminPanel>
  );
}

function BookingList({ bookings }: { bookings: BookingSession[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const filtered = statusFilter === 'all' ? bookings : bookings.filter((booking) => booking.status === statusFilter);

  return (
    <AdminPanel className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <ShieldCheck className="h-4 w-4 text-violet-600" />
          Payment va booking status
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | BookingStatus)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-900"
        >
          <option value="all">Tat ca</option>
          <option value="awaiting_payment">Cho thanh toan</option>
          <option value="pending">Cho xac nhan</option>
          <option value="confirmed">Da xac nhan</option>
          <option value="completed">Da hoan thanh</option>
          <option value="cancelled_by_mentee">Da huy</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState text="Khong co booking phu hop." />
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 text-left">Booking</th>
              <th className="px-6 py-4 text-left">Thoi gian</th>
              <th className="px-6 py-4 text-left">Thanh toan</th>
              <th className="px-6 py-4 text-left">Trang thai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{booking.sessionType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500">#{booking.id}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    {new Date(
                      booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime,
                    ).toLocaleString('vi-VN')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    {(booking.paymentInfo?.sessionPrice || 0).toLocaleString('vi-VN')}{' '}
                    {booking.paymentInfo?.currency || 'VND'} · {booking.paymentInfo?.paymentStatus || 'pending'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <ProfileStatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminPanel>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-slate-800">
      {text}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}
