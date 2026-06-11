'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { mentorCallService, type MentorCallSummary } from '@/lib/mentor-call.service';
import { mentorService } from '@/lib/mentor.service';
import { cn } from '@/lib/utils';
import type { TrackReferenceOrPlaceholder, WidgetState } from '@livekit/components-core';
import { isEqualTrackRef, isTrackReference } from '@livekit/components-core';
import {
  CarouselLayout,
  Chat,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MonitorUp,
  RotateCcw,
  ShieldAlert,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

const liveKitCallTheme = {
  colorScheme: 'dark',
  '--lk-bg': '#0f0f10',
  '--lk-bg2': '#171719',
  '--lk-bg3': '#242427',
  '--lk-bg4': '#303035',
  '--lk-bg5': '#3f3f46',
  '--lk-fg': '#f8fafc',
  '--lk-fg2': '#e2e8f0',
  '--lk-fg3': '#cbd5e1',
  '--lk-fg4': '#94a3b8',
  '--lk-fg5': '#64748b',
  '--lk-border-color': 'rgba(255, 255, 255, 0.1)',
  '--lk-accent-fg': '#ffffff',
  '--lk-accent-bg': '#0284c7',
  '--lk-accent2': '#0369a1',
  '--lk-accent3': '#075985',
  '--lk-accent4': '#0c4a6e',
  '--lk-danger': '#e11d48',
  '--lk-danger-fg': '#ffffff',
  '--lk-danger2': '#be123c',
  '--lk-danger3': '#9f1239',
  '--lk-danger4': '#881337',
  '--lk-control-fg': '#f8fafc',
  '--lk-control-bg': '#2f2f32',
  '--lk-control-hover-bg': '#3a3a3d',
  '--lk-control-active-bg': '#404045',
  '--lk-control-active-hover-bg': '#52525b',
  '--lk-box-shadow': '0 18px 50px rgba(0, 0, 0, 0.35)',
  '--lk-drop-shadow': 'rgba(14, 165, 233, 0.28) 0 0 24px',
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
            <p className="text-xs font-bold tracking-wide text-rose-600 uppercase">
              Không thể tham gia
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={onRetry} className="bg-sky-600 hover:bg-sky-700">
            <RotateCcw className="h-4 w-4" />
            Thử lại
          </Button>
          <Button
            asChild
            type="button"
            variant="outline"
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
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
                <span className="font-semibold text-slate-950">
                  {getRoleLabel(summary.userRole)}
                </span>
                .
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CalendarClock className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Ngày
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {formatDate(summary.startsAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Clock3 className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Khung giờ
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">{formatCallRange(summary)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <BadgeCheck className="h-5 w-5 text-violet-600" />
                <p className="mt-3 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Trạng thái
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {getBookingStatusLabel(summary.status)}
                </p>
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
                {isJoining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Vào phòng call
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Link href={getReturnPath(summary)}>Quay lại lịch hẹn</Link>
              </Button>
            </div>
          </section>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-t-0 lg:border-l">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                  <MonitorUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Thông tin phòng
                  </p>
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
                  <dd className="text-right font-medium">
                    {formatDateTime(summary.joinWindow.opensAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Đóng phòng</dt>
                  <dd className="text-right font-medium">
                    {formatDateTime(summary.joinWindow.closesAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">LiveKit</dt>
                  <dd
                    className={cn(
                      'font-medium',
                      summary.livekitConfigured ? 'text-emerald-600' : 'text-amber-600',
                    )}
                  >
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

function MentorLiveKitConference() {
  const [widgetState, setWidgetState] = useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const lastAutoFocusedScreenShareTrack = useRef<TrackReferenceOrPlaceholder | null>(null);
  const layoutContext = useCreateLayoutContext();
  const pinDispatch = layoutContext.pin.dispatch;

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const screenShareTracks = useMemo(
    () =>
      tracks
        .filter(isTrackReference)
        .filter((track) => track.publication.source === Track.Source.ScreenShare),
    [tracks],
  );
  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = useMemo(
    () => tracks.filter((track) => !isEqualTrackRef(track, focusTrack)),
    [focusTrack, tracks],
  );

  useEffect(() => {
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      pinDispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
      return;
    }

    if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      pinDispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }

    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (track) =>
          track.participant.identity === focusTrack.participant.identity &&
          track.source === focusTrack.source,
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        pinDispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [focusTrack, pinDispatch, screenShareTracks, tracks]);

  return (
    <div className="lk-video-conference h-full">
      <LayoutContextProvider value={layoutContext} onWidgetChange={setWidgetState}>
        <div className="lk-video-conference-inner">
          {!focusTrack ? (
            <div className="lk-grid-layout-wrapper">
              <GridLayout tracks={tracks}>
                <ParticipantTile />
              </GridLayout>
            </div>
          ) : (
            <div className="lk-focus-layout-wrapper">
              <FocusLayoutContainer>
                <CarouselLayout tracks={carouselTracks}>
                  <ParticipantTile />
                </CarouselLayout>
                <FocusLayout trackRef={focusTrack} />
              </FocusLayoutContainer>
            </div>
          )}
          <ControlBar
            controls={{
              microphone: true,
              camera: true,
              screenShare: true,
              chat: true,
              leave: true,
              settings: false,
            }}
          />
        </div>
        <Chat style={{ display: widgetState.showChat ? 'grid' : 'none' }} />
      </LayoutContextProvider>
      <RoomAudioRenderer />
      <ConnectionStateToast />
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
  const [isCompleting, setIsCompleting] = useState(false);

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

  const completeCall = async () => {
    if (!accessToken || !summary || summary.userRole !== 'mentor') return;
    setIsCompleting(true);
    setError('');
    try {
      await mentorService.completeBooking(accessToken, summary.bookingId);
      setToken('');
      setServerUrl('');
      router.push('/mentor-dashboard/bookings');
    } catch (completeError) {
      setError(
        completeError instanceof Error ? completeError.message : 'Không thể hoàn tất buổi tư vấn.',
      );
    } finally {
      setIsCompleting(false);
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
      <div className="h-dvh overflow-hidden bg-[#0f0f10] text-white">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video
          audio
          onDisconnected={() => router.push(returnPath)}
          onError={(roomError) => setError(roomError.message)}
          data-lk-theme="default"
          style={liveKitCallTheme}
          className={cn(
            'relative h-full min-h-0 overflow-hidden bg-[#0f0f10]',
            '[&_.lk-video-conference]:h-full [&_.lk-video-conference]:min-h-0',
            '[&_.lk-video-conference-inner]:h-full [&_.lk-video-conference-inner]:min-h-0',
            '[&_.lk-focus-layout-wrapper]:min-h-0 [&_.lk-grid-layout-wrapper]:min-h-0',
            '[&_.lk-control-bar]:border-t [&_.lk-control-bar]:border-white/10 [&_.lk-control-bar]:bg-[#101012]',
            '[&_.lk-button]:rounded-xl [&_.lk-button]:font-semibold',
            '[&_.lk-chat]:border-l [&_.lk-chat]:border-white/10 [&_.lk-chat]:bg-[#171719]',
          )}
        >
          <div className="pointer-events-none absolute top-3 left-3 z-20 max-w-[calc(100%-1.5rem)] rounded-lg bg-black/45 px-3 py-2 text-white shadow-lg backdrop-blur sm:top-4 sm:left-4">
            <p className="truncate text-sm font-semibold">
              {getSessionTypeLabel(summary.sessionType)}
            </p>
            <p className="truncate text-xs text-white/70">
              {formatCallRange(summary)} · Mã phòng: {summary.meetingCode}
            </p>
          </div>

          {summary.userRole === 'mentor' && (
            <Button
              type="button"
              onClick={completeCall}
              disabled={isCompleting}
              className="absolute top-3 right-3 z-30 h-12 rounded-xl bg-white px-4 font-bold text-slate-950 shadow-lg hover:bg-slate-100 disabled:bg-white/80 sm:top-4 sm:right-4"
            >
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Hoàn tất
            </Button>
          )}

          {error && (
            <div
              aria-live="polite"
              className="absolute top-20 right-3 left-3 z-30 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-950/90 px-4 py-3 text-sm text-rose-50 shadow-lg backdrop-blur sm:right-auto sm:left-1/2 sm:w-[min(520px,calc(100%-2rem))] sm:-translate-x-1/2"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <MentorLiveKitConference />
        </LiveKitRoom>
      </div>
    );
  }

  return <ReadyState summary={summary} error={error} isJoining={isJoining} onJoin={joinCall} />;
}
