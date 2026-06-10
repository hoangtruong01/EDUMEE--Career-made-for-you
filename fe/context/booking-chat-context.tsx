'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notification-context';
import {
  BOOKING_CHAT_OPEN_EVENT,
  type BookingChatOpenDetail,
} from '@/lib/booking-chat-events';
import { type BookingSession, mentorService } from '@/lib/mentor.service';
import type { AppNotification } from '@/lib/notification.service';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Loader2,
  MessageSquare,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type BookingChatContextValue = {
  openBookingChat: (bookingOrId: BookingSession | string) => Promise<void>;
  closeBookingChat: (bookingId: string) => void;
  markConversationRead: (bookingId: string) => void;
};

type BookingMessage = NonNullable<BookingSession['communicationThread']>[number];
type ChatSenderType = 'mentee' | 'mentor';
type ParticipantSummary = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
};

const BookingChatContext = createContext<BookingChatContextValue | undefined>(undefined);
const CHAT_NOTIFICATION_TYPE = 'mentor_booking_message';
const CHAT_POLL_INTERVAL_MS = 8000;

function getBookingIdFromNotification(notification: AppNotification) {
  const bookingId = notification.payload?.bookingId;
  return typeof bookingId === 'string' ? bookingId : '';
}

function isChatNotification(notification: AppNotification) {
  return notification.type === CHAT_NOTIFICATION_TYPE || notification.payload?.openChat === true;
}

function getCurrentSenderType(role: string): ChatSenderType | null {
  if (role === 'mentor') return 'mentor';
  if (role === 'user') return 'mentee';
  return null;
}

function getParticipant(booking: BookingSession, type: ChatSenderType): ParticipantSummary {
  const source = type === 'mentor' ? booking.mentorUser : booking.menteeUser;
  const fallbackId = type === 'mentor' ? booking.mentorId : booking.menteeId;
  const fallbackName = type === 'mentor' ? 'Mentor' : 'Học viên';

  return {
    id: source?.id || fallbackId,
    name: source?.name || fallbackName,
    email: source?.email,
    avatar: source?.avatar,
  };
}

function getSenderName(booking: BookingSession, message: BookingMessage, currentSenderType: ChatSenderType) {
  if (message.senderType === currentSenderType) return 'Bạn';
  if (message.senderType === 'system') return 'Hệ thống';
  if (message.senderType === 'mentor' || message.senderType === 'mentee') {
    return getParticipant(booking, message.senderType).name;
  }
  return 'Người gửi';
}

function getPeerName(booking: BookingSession, currentSenderType: ChatSenderType) {
  return getParticipant(booking, currentSenderType === 'mentor' ? 'mentee' : 'mentor').name;
}

function formatMessageTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getLastMessage(booking: BookingSession): BookingMessage | undefined {
  const messages = booking.communicationThread || [];
  return messages[messages.length - 1];
}

function getPreview(booking: BookingSession, currentSenderType: ChatSenderType) {
  const lastMessage = getLastMessage(booking);
  if (!lastMessage) return 'Chưa có tin nhắn';
  return `${getSenderName(booking, lastMessage, currentSenderType)}: ${lastMessage.message}`;
}

export function BookingChatProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated, isHydrated, role } = useAuth();
  const { notifications } = useNotifications();
  const pathname = usePathname();
  const currentSenderType = getCurrentSenderType(role);
  const [conversations, setConversations] = useState<Record<string, BookingSession>>({});
  const [conversationOrder, setConversationOrder] = useState<string[]>([]);
  const [activeBookingId, setActiveBookingId] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [unreadByBookingId, setUnreadByBookingId] = useState<Record<string, number>>({});
  const [loadingByBookingId, setLoadingByBookingId] = useState<Record<string, boolean>>({});
  const [sendingByBookingId, setSendingByBookingId] = useState<Record<string, boolean>>({});
  const [errorByBookingId, setErrorByBookingId] = useState<Record<string, string>>({});
  const messageListRef = useRef<HTMLDivElement>(null);
  const activeBookingIdRef = useRef(activeBookingId);
  const isExpandedRef = useRef(isExpanded);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    activeBookingIdRef.current = activeBookingId;
  }, [activeBookingId]);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const upsertConversation = useCallback((booking: BookingSession, options?: { prepend?: boolean }) => {
    setConversations((current) => ({ ...current, [booking.id]: booking }));
    setConversationOrder((current) => {
      if (current.includes(booking.id)) return current;
      return options?.prepend ? [booking.id, ...current] : [...current, booking.id];
    });
  }, []);

  const markConversationRead = useCallback((bookingId: string) => {
    setUnreadByBookingId((current) => ({ ...current, [bookingId]: 0 }));
  }, []);

  const fetchBooking = useCallback(async (bookingId: string) => {
    if (!accessToken) throw new Error('Bạn cần đăng nhập để xem tin nhắn.');
    setLoadingByBookingId((current) => ({ ...current, [bookingId]: true }));
    try {
      const booking = await mentorService.getBooking(accessToken, bookingId);
      upsertConversation(booking);
      setErrorByBookingId((current) => ({ ...current, [bookingId]: '' }));
      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải cuộc trò chuyện.';
      setErrorByBookingId((current) => ({ ...current, [bookingId]: message }));
      throw error;
    } finally {
      setLoadingByBookingId((current) => ({ ...current, [bookingId]: false }));
    }
  }, [accessToken, upsertConversation]);

  const openBookingChat = useCallback(async (bookingOrId: BookingSession | string) => {
    if (!currentSenderType || !isAuthenticated) return;

    const bookingId = typeof bookingOrId === 'string' ? bookingOrId : bookingOrId.id;
    if (typeof bookingOrId !== 'string') {
      upsertConversation(bookingOrId);
    }

    setActiveBookingId(bookingId);
    setIsExpanded(true);
    markConversationRead(bookingId);

    if (typeof bookingOrId === 'string' || !bookingOrId.mentorUser || !bookingOrId.menteeUser) {
      try {
        const freshBooking = await fetchBooking(bookingId);
        setActiveBookingId(freshBooking.id);
      } catch {
        // The dock keeps the tab visible and shows the conversation-level error.
      }
    }
  }, [
    currentSenderType,
    fetchBooking,
    isAuthenticated,
    markConversationRead,
    upsertConversation,
  ]);

  const closeBookingChat = useCallback((bookingId: string) => {
    setConversationOrder((current) => current.filter((id) => id !== bookingId));
    setConversations((current) => {
      const next = { ...current };
      delete next[bookingId];
      return next;
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[bookingId];
      return next;
    });
    setUnreadByBookingId((current) => {
      const next = { ...current };
      delete next[bookingId];
      return next;
    });
    setActiveBookingId((current) => {
      if (current !== bookingId) return current;
      const nextActiveId = conversationOrder.find((id) => id !== bookingId) || '';
      return nextActiveId;
    });
  }, [conversationOrder]);

  useEffect(() => {
    const handleOpenBookingChat = (event: Event) => {
      const detail = (event as CustomEvent<BookingChatOpenDetail>).detail;
      if (detail?.booking) {
        void openBookingChat(detail.booking);
        return;
      }
      if (detail?.bookingId) {
        void openBookingChat(detail.bookingId);
      }
    };

    window.addEventListener(BOOKING_CHAT_OPEN_EVENT, handleOpenBookingChat);
    return () => window.removeEventListener(BOOKING_CHAT_OPEN_EVENT, handleOpenBookingChat);
  }, [openBookingChat]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !accessToken || !currentSenderType) {
      mountedAtRef.current = null;
      seenNotificationIdsRef.current.clear();
      return;
    }

    const mountedAtMs = mountedAtRef.current ?? Date.now();
    mountedAtRef.current = mountedAtMs;
    const notificationByBookingId = new Map<string, AppNotification>();

    notifications.forEach((notification) => {
      if (seenNotificationIdsRef.current.has(notification.id)) return;
      seenNotificationIdsRef.current.add(notification.id);
      if (!isChatNotification(notification)) return;

      const createdAtMs = notification.createdAt ? new Date(notification.createdAt).getTime() : Number.NaN;
      if (!Number.isNaN(createdAtMs) && createdAtMs < mountedAtMs - 5_000) return;

      const bookingId = getBookingIdFromNotification(notification);
      if (!bookingId || notificationByBookingId.has(bookingId)) return;
      notificationByBookingId.set(bookingId, notification);
    });

    if (notificationByBookingId.size === 0) return;
    let cancelled = false;

    Array.from(notificationByBookingId.keys()).forEach((bookingId) => {
      void mentorService.getBooking(accessToken, bookingId)
        .then((booking) => {
          if (cancelled) return;
          upsertConversation(booking, { prepend: true });
          const isActiveConversation =
            isExpandedRef.current && activeBookingIdRef.current === booking.id;
          if (isActiveConversation) {
            markConversationRead(booking.id);
            return;
          }
          setUnreadByBookingId((current) => ({
            ...current,
            [booking.id]: (current[booking.id] || 0) + 1,
          }));
          setActiveBookingId((current) => current || booking.id);
        })
        .catch(() => {
          // A later manual open or list refetch will reconcile this conversation.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    currentSenderType,
    isAuthenticated,
    isHydrated,
    markConversationRead,
    notifications,
    upsertConversation,
  ]);

  useEffect(() => {
    if (!isExpanded || !activeBookingId || !accessToken) return;
    let cancelled = false;

    const refreshActiveConversation = async () => {
      try {
        const booking = await mentorService.getBooking(accessToken, activeBookingId);
        if (!cancelled) upsertConversation(booking);
      } catch {
        // Keep the current thread; realtime or the next send/open can reconcile.
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshActiveConversation();
    }, CHAT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [accessToken, activeBookingId, isExpanded, upsertConversation]);

  const activeBooking = activeBookingId ? conversations[activeBookingId] : undefined;
  const activeMessages = activeBooking?.communicationThread || [];
  const activeDraft = activeBookingId ? drafts[activeBookingId] || '' : '';
  const totalUnread = useMemo(
    () => Object.values(unreadByBookingId).reduce((total, count) => total + count, 0),
    [unreadByBookingId],
  );

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }, [activeBookingId, activeMessages.length, isExpanded]);

  useEffect(() => {
    if (isExpanded && activeBookingId) markConversationRead(activeBookingId);
  }, [activeBookingId, isExpanded, markConversationRead]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeBooking || !accessToken || !activeBookingId) return;
    const message = activeDraft.trim();
    if (!message || sendingByBookingId[activeBookingId]) return;

    setSendingByBookingId((current) => ({ ...current, [activeBookingId]: true }));
    setErrorByBookingId((current) => ({ ...current, [activeBookingId]: '' }));

    try {
      const updatedBooking = await mentorService.sendBookingMessage(accessToken, activeBooking.id, message);
      upsertConversation(updatedBooking);
      setDrafts((current) => ({ ...current, [activeBookingId]: '' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể gửi tin nhắn.';
      setErrorByBookingId((current) => ({ ...current, [activeBookingId]: errorMessage }));
    } finally {
      setSendingByBookingId((current) => ({ ...current, [activeBookingId]: false }));
    }
  };

  const value = useMemo<BookingChatContextValue>(() => ({
    openBookingChat,
    closeBookingChat,
    markConversationRead,
  }), [closeBookingChat, markConversationRead, openBookingChat]);

  const shouldRenderDock = isHydrated && isAuthenticated && Boolean(currentSenderType);
  const dockSenderType: ChatSenderType = currentSenderType || 'mentee';
  const isMentorPortal = pathname === '/mentor-dashboard' || pathname.startsWith('/mentor-dashboard/');
  const isMentorCallRoom = pathname === '/mentor-call' || pathname.startsWith('/mentor-call/');

  return (
    <BookingChatContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <BookingChatDeepLinkBridge />
      </Suspense>
      {shouldRenderDock && !isMentorCallRoom ? (
        <div
          className={cn(
            'fixed inset-x-3 z-[70] sm:inset-x-auto sm:right-6',
            isMentorPortal ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-3' : 'bottom-3',
          )}
        >
          {!isExpanded ? (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="ml-auto flex h-12 items-center gap-3 rounded-full border border-sky-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-2xl shadow-slate-900/15 transition hover:border-sky-300 hover:bg-sky-50"
              aria-label="Mở hộp tin nhắn"
            >
              <span className="relative grid h-9 w-9 place-items-center rounded-full bg-sky-600 text-white">
                <MessageSquare className="h-4 w-4" />
                {totalUnread > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                ) : null}
              </span>
              Tin nhắn
            </button>
          ) : (
            <section
              className={cn(
                'ml-auto flex w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:w-[760px]',
                isMentorPortal
                  ? 'h-[min(620px,calc(100vh-7.5rem-env(safe-area-inset-bottom)))] lg:h-[min(620px,calc(100vh-2rem))]'
                  : 'h-[min(620px,calc(100vh-2rem))]',
              )}
            >
              <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 sm:block">
                <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                  <p className="font-bold text-slate-950">Tin nhắn</p>
                  {totalUnread > 0 ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      {totalUnread}
                    </span>
                  ) : null}
                </div>
                <div className="max-h-[calc(100%-3.5rem)] overflow-y-auto p-2">
                  {conversationOrder.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      Chưa mở cuộc trò chuyện nào.
                    </div>
                  ) : (
                    conversationOrder.map((bookingId) => {
                      const booking = conversations[bookingId];
                      if (!booking || !currentSenderType) return null;
                      const unread = unreadByBookingId[bookingId] || 0;
                      return (
                        <button
                          key={bookingId}
                          type="button"
                          onClick={() => {
                            setActiveBookingId(bookingId);
                            markConversationRead(bookingId);
                          }}
                          className={cn(
                            'mb-2 w-full rounded-xl border p-3 text-left transition',
                            activeBookingId === bookingId
                              ? 'border-sky-200 bg-white shadow-sm'
                              : 'border-transparent hover:border-slate-200 hover:bg-white',
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-slate-950">
                              {getPeerName(booking, currentSenderType)}
                            </span>
                            {unread > 0 ? (
                              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {getPreview(booking, currentSenderType)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold text-slate-950">
                      <MessageSquare className="h-4 w-4 text-sky-600" />
                      Chat booking
                    </p>
                    {activeBooking ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        Học viên: {getParticipant(activeBooking, 'mentee').name} · Mentor: {getParticipant(activeBooking, 'mentor').name}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-500">Chọn một cuộc trò chuyện để bắt đầu.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeBookingId ? (
                      <button
                        type="button"
                        onClick={() => closeBookingChat(activeBookingId)}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                        aria-label="Đóng cuộc trò chuyện"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                      aria-label="Thu gọn hộp tin nhắn"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                {conversationOrder.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2 sm:hidden">
                    {conversationOrder.map((bookingId) => {
                      const booking = conversations[bookingId];
                      if (!booking || !currentSenderType) return null;
                      const unread = unreadByBookingId[bookingId] || 0;
                      return (
                        <button
                          key={bookingId}
                          type="button"
                          onClick={() => {
                            setActiveBookingId(bookingId);
                            markConversationRead(bookingId);
                          }}
                          className={cn(
                            'relative max-w-40 shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold',
                            activeBookingId === bookingId
                              ? 'border-sky-300 bg-white text-sky-700'
                              : 'border-slate-200 bg-white text-slate-600',
                          )}
                        >
                          <span className="block truncate">{getPeerName(booking, currentSenderType)}</span>
                          {unread > 0 ? (
                            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] text-white">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                  {!activeBooking ? (
                    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                      <UserRound className="mb-2 h-8 w-8 text-slate-300" />
                      Chọn cuộc trò chuyện từ tab bên trái hoặc mở từ booking.
                    </div>
                  ) : loadingByBookingId[activeBooking.id] && activeMessages.length === 0 ? (
                    <div className="flex h-full min-h-64 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
                      Chưa có tin nhắn.
                    </div>
                  ) : (
                    activeMessages.map((message) => {
                      const isMine = message.senderType === dockSenderType;
                      const isSystem = message.senderType === 'system';
                      return (
                        <div
                          key={message.messageId}
                          className={cn('flex', isSystem ? 'justify-center' : isMine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[82%] rounded-2xl px-3 py-2 text-sm',
                              isSystem
                                ? 'bg-slate-200 text-slate-600'
                                : isMine
                                  ? 'rounded-br-md bg-sky-600 text-white'
                                  : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200',
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                            <p className={cn('mt-1 text-[11px]', isMine ? 'text-sky-100' : 'text-slate-500')}>
                              {getSenderName(activeBooking, message, dockSenderType)} · {formatMessageTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {activeBookingId && errorByBookingId[activeBookingId] ? (
                  <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                    {errorByBookingId[activeBookingId]}
                  </p>
                ) : null}

                <form onSubmit={submitMessage} className="flex gap-2 border-t border-slate-200 bg-white p-3">
                  <input
                    value={activeDraft}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!activeBookingId) return;
                      setDrafts((current) => ({ ...current, [activeBookingId]: value }));
                    }}
                    disabled={!activeBooking}
                    placeholder={activeBooking ? 'Nhập tin nhắn...' : 'Chọn cuộc trò chuyện...'}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!activeBooking || !activeDraft.trim() || Boolean(activeBookingId && sendingByBookingId[activeBookingId])}
                    className="h-11 w-11 bg-sky-600 hover:bg-sky-700"
                    aria-label="Gửi tin nhắn"
                  >
                    {activeBookingId && sendingByBookingId[activeBookingId] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </section>
          )}
        </div>
      ) : null}
    </BookingChatContext.Provider>
  );
}

function BookingChatDeepLinkBridge() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { openBookingChat } = useBookingChat();

  useEffect(() => {
    const bookingId = searchParams.get('chatBooking');
    if (!bookingId) return;

    void openBookingChat(bookingId);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('chatBooking');
    const nextQuery = nextParams.toString();
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ''}`, { scroll: false });
  }, [openBookingChat, pathname, router, searchParams]);

  return null;
}

export function useBookingChat() {
  const context = useContext(BookingChatContext);
  if (!context) {
    throw new Error('useBookingChat must be used inside BookingChatProvider');
  }
  return context;
}
