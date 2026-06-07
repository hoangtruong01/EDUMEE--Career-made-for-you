'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { mentorCallService, type MentorCallSummary } from '@/lib/mentor-call.service';
import { cn } from '@/lib/utils';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Clock3,
  Loader2,
  LogOut,
  MonitorUp,
  RotateCcw,
  ShieldAlert,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CallLoadState = 'loading' | 'ready' | 'error';

const sessionTypeLabel: Record<string, string> = {
  career_guidance: 'Tư vấn định hướng nghề nghiệp',
  skill_coaching: 'Huấn luyện kỹ năng',
  interview_preparation: 'Luyện phỏng vấn',
  project_review: 'Góp ý dự án',
  resume_review: 'Góp ý CV',
  general_mentoring: 'Tư vấn chung',
  follow_up: 'Buổi theo dõi tiếp theo',
};

const bookingStatusLabel: Record<string, string> = {
  awaiting_payment: 'Chờ thanh toán',
  pending: 'Chờ mentor xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled_by_mentee: 'Học viên đã hủy',
  cancelled_by_mentor: 'Mentor đã hủy',
  rescheduled: 'Đề xuất đổi lịch',
  completed: 'Đã hoàn thành',
  no_show_mentee: 'Học viên vắng mặt',
  no_show_mentor: 'Mentor vắng mặt',
};

const roleLabel: Record<string, string> = {
  mentor: 'mentor',
  mentee: 'học viên',
};

const liveKitLightTheme = {
  colorScheme: 'light',
  '--lk-bg': '#f8fafc',
  '--lk-bg2': '#ffffff',
  '--lk-bg3': '#e0f2fe',
  '--lk-bg4': '#bae6fd',
  '--lk-bg5': '#7dd3fc',
  '--lk-fg': '#0f172a',
  '--lk-fg2': '#1e293b',
  '--lk-fg3': '#334155',
  '--lk-fg4': '#475569',
  '--lk-fg5': '#64748b',
  '--lk-border-color': 'rgba(15, 23, 42, 0.12)',
  '--lk-accent-fg': '#ffffff',
  '--lk-accent-bg': '#0284c7',
  '--lk-accent2': '#0369a1',
  '--lk-accent3': '#075985',
  '--lk-accent4': '#0c4a6e',
  '--lk-danger': '#dc2626',
  '--lk-danger-fg': '#ffffff',
  '--lk-danger2': '#b91c1c',
  '--lk-danger3': '#991b1b',
  '--lk-danger4': '#7f1d1d',
  '--lk-control-fg': '#0f172a',
  '--lk-control-bg': '#ffffff',
  '--lk-control-hover-bg': '#e0f2fe',
  '--lk-control-active-bg': '#bae6fd',
  '--lk-control-active-hover-bg': '#7dd3fc',
  '--lk-box-shadow': '0 18px 50px rgba(15, 23, 42, 0.14)',
  '--lk-drop-shadow': 'rgba(14, 165, 233, 0.18) 0 0 24px',
} as CSSProperties;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCallRange(summary: MentorCallSummary) {
  return `${formatTime(summary.startsAt)} - ${formatTime(summary.endsAt)}`;
}

function getSessionTypeLabel(value: string) {
  return sessionTypeLabel[value] || value.replace(/_/g, ' ');
}

function getBookingStatusLabel(value: string) {
  return bookingStatusLabel[value] || value;
}

function getRoleLabel(value: string) {
  return roleLabel[value] || value;
}

function getJoinWindowMessage(summary: MentorCallSummary) {
  if (summary.status !== 'confirmed' && summary.status !== 'rescheduled') {
    return 'Phòng call chỉ mở sau khi booking được mentor xác nhận.';
  }

  if (summary.joinWindow.reason === 'not_open') {
    return `Phòng sẽ mở lúc ${formatDateTime(summary.joinWindow.opensAt)}.`;
  }

  if (summary.joinWindow.reason === 'ended') {
    return 'Phòng call đã hết thời gian tham gia.';
  }

  return '';
}

function getReturnPath(summary: MentorCallSummary | null) {
  return summary?.userRole === 'mentor' ? '/mentor-dashboard/bookings' : '/mentor-matching';
}

function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-950">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Không thể tham gia</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={onRetry} className="bg-sky-600 hover:bg-sky-700">
            <RotateCcw className="h-4 w-4" />
            Thử lại
          </Button>
          <Button asChild type="button" variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Link href="/mentor-matching">Về trang mentor</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-950">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
        Đang chuẩn bị phòng mentor call...
      </div>
    </div>
  );
}

function ReadyState({
  summary,
  error,
  isJoining,
  onJoin,
}: {
  summary: MentorCallSummary;
  error: string;
  isJoining: boolean;
  onJoin: () => void;
}) {
  const disabledReason = !summary.livekitConfigured
    ? 'LiveKit chưa được cấu hình. Hãy thêm LIVEKIT_URL, LIVEKIT_API_KEY và LIVEKIT_API_SECRET ở backend.'
    : getJoinWindowMessage(summary);
  const canJoin = summary.joinWindow.canJoin && summary.livekitConfigured;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6">
        <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_380px]">
          <section className="p-6 sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
              <Video className="h-4 w-4" />
              EDUMEE Mentor Call
            </div>

            <div className="mt-8 max-w-3xl">
              <p className="text-sm font-semibold text-slate-500">Phiên tư vấn</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {getSessionTypeLabel(summary.sessionType)}
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Phòng gọi nội bộ cho booking #{summary.bookingId}. Bạn đang tham gia với vai trò{' '}
                <span className="font-semibold text-slate-950">{getRoleLabel(summary.userRole)}</span>.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CalendarClock className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Ngày</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{formatDate(summary.startsAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Clock3 className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Khung giờ</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{formatCallRange(summary)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <BadgeCheck className="h-5 w-5 text-violet-600" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{getBookingStatusLabel(summary.status)}</p>
              </div>
            </div>

            {(disabledReason || error) && (
              <div
                className={cn(
                  'mt-6 flex max-w-2xl gap-3 rounded-2xl border p-4 text-sm leading-6',
                  error
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900',
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error || disabledReason}</p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={onJoin}
                disabled={isJoining || !canJoin}
                className="h-11 rounded-xl bg-sky-600 px-5 hover:bg-sky-700"
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Vào phòng call
              </Button>
              <Button asChild type="button" variant="outline" className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href={getReturnPath(summary)}>Quay lại lịch hẹn</Link>
              </Button>
            </div>
          </section>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                  <MonitorUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông tin phòng</p>
                  <p className="font-bold text-slate-950">{summary.meetingCode}</p>
                </div>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Thời lượng</dt>
                  <dd className="font-medium">{summary.durationMinutes} phút</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Mở phòng</dt>
                  <dd className="text-right font-medium">{formatDateTime(summary.joinWindow.opensAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Đóng phòng</dt>
                  <dd className="text-right font-medium">{formatDateTime(summary.joinWindow.closesAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">LiveKit</dt>
                  <dd className={cn('font-medium', summary.livekitConfigured ? 'text-emerald-600' : 'text-amber-600')}>
                    {summary.livekitConfigured ? 'Sẵn sàng' : 'Chưa cấu hình'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function MentorCallRoom({ meetingCode }: { meetingCode: string }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [state, setState] = useState<CallLoadState>('loading');
  const [summary, setSummary] = useState<MentorCallSummary | null>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const returnPath = useMemo(() => getReturnPath(summary), [summary]);

  const loadSummary = useCallback(async () => {
    if (!accessToken) return;
    setState('loading');
    setError('');
    setToken('');
    setServerUrl('');
    try {
      const nextSummary = await mentorCallService.getSummary(accessToken, meetingCode);
      setSummary(nextSummary);
      setState('ready');
    } catch (loadError) {
      setSummary(null);
      setState('error');
      if (loadError instanceof ApiError) {
        setError(loadError.message || 'Không thể tải phòng call.');
      } else {
        setError('Không thể tải phòng call.');
      }
    }
  }, [accessToken, meetingCode]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const joinCall = async () => {
    if (!accessToken || !summary) return;
    setIsJoining(true);
    setError('');
    try {
      const response = await mentorCallService.createToken(accessToken, meetingCode);
      setServerUrl(response.livekitUrl);
      setToken(response.token);
    } catch (joinError) {
      if (joinError instanceof ApiError) {
        setError(joinError.message || 'Không thể vào phòng call.');
      } else {
        setError('Không thể vào phòng call.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (state === 'loading') return <LoadingState />;

  if (state === 'error') {
    return (
      <ErrorState
        title="Không thể mở phòng call"
        description={error || 'Booking không tồn tại hoặc bạn không có quyền truy cập phòng này.'}
        onRetry={loadSummary}
      />
    );
  }

  if (!summary) return <LoadingState />;

  if (token && serverUrl) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{getSessionTypeLabel(summary.sessionType)}</p>
            <p className="truncate text-xs text-slate-500">
              {formatCallRange(summary)} · Mã phòng: {summary.meetingCode}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => router.push(returnPath)}
          >
            <LogOut className="h-4 w-4" />
            Rời phòng
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_320px]">
          <section className="min-h-0 p-3 sm:p-4">
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              connect
              video
              audio
              onDisconnected={() => router.push(returnPath)}
              onError={(roomError) => setError(roomError.message)}
              data-lk-theme="default"
              style={liveKitLightTheme}
              className={cn('h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm')}
            >
              <VideoConference />
            </LiveKitRoom>
          </section>

          <aside className="hidden min-h-0 border-l border-slate-200 bg-white p-5 lg:block">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phiên tư vấn</p>
                <h2 className="mt-2 text-lg font-bold leading-tight">{getSessionTypeLabel(summary.sessionType)}</h2>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Vai trò</dt>
                    <dd className="mt-1 font-semibold">{getRoleLabel(summary.userRole)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Thời gian</dt>
                    <dd className="mt-1 font-semibold">{formatDate(summary.startsAt)}</dd>
                    <dd className="text-slate-500">{formatCallRange(summary)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái booking</dt>
                    <dd className="mt-1 font-semibold">{getBookingStatusLabel(summary.status)}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                Hãy kiểm tra micro, camera và tài liệu cần chia sẻ trước khi bắt đầu nội dung chính.
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <ReadyState
      summary={summary}
      error={error}
      isJoining={isJoining}
      onJoin={joinCall}
    />
  );
}
