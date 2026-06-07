import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCcw,
  SearchX,
  Send,
  Video,
  X,
  XCircle,
} from 'lucide-react-native';
import { mentorPortalQueryKey, updateMentorPortalBookingCache, useMentorPortalData } from '../../hooks/useMentorPortalData';
import { mentorService, type BookingSession, type MentorAvailabilitySlot } from '../../services/mentor.service';
import { COLORS, RADIUS, SPACING } from '../../theme';
import {
  bookingStatusLabel,
  dateAtMinutes,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatMinute,
  getBookingDuration,
  getBookingPaymentSummary,
  getBookingStart,
  getId,
  getPendingRescheduleProposal,
  getTrialNote,
  isActiveBooking,
  isBookingCancelled,
  openMeetingLink,
  parseDateOnly,
  sessionTypeLabel,
  SLOT_STARTS,
} from './mentorUtils';
import {
  ActionButton,
  EmptyState,
  InfoCard,
  LoadingState,
  MessageBanner,
  Pill,
  PortalScreen,
  SectionTitle,
} from './MentorPortalUI';

type BookingFilter = 'all' | 'trial' | 'paid' | 'pending' | 'completed' | 'cancelled';

const filters: { value: BookingFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'trial', label: 'Trial' },
  { value: 'paid', label: 'Trả phí' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function filterBooking(booking: BookingSession, filter: BookingFilter) {
  if (filter === 'all') return true;
  if (filter === 'trial') return booking.bookingType === 'trial';
  if (filter === 'paid') return booking.bookingType !== 'trial';
  if (filter === 'pending') return booking.status === 'pending';
  if (filter === 'completed') return booking.status === 'completed';
  if (filter === 'cancelled') return isBookingCancelled(booking);
  return true;
}

function showError(error: unknown, fallback: string) {
  Alert.alert('Thông báo', error instanceof Error ? error.message : fallback);
}

export default function MentorBookingsScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const queryClient = useQueryClient();
  const portalQuery = useMentorPortalData();
  const profile = portalQuery.data?.profile ?? null;
  const bookings = portalQuery.data?.bookings || [];
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingSession | null>(null);
  const [chatBooking, setChatBooking] = useState<BookingSession | null>(null);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBooking, setCancelBooking] = useState<BookingSession | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineTarget, setDeclineTarget] = useState<{ booking: BookingSession; proposalId: string } | null>(null);
  const [proposalDate, setProposalDate] = useState(() => formatDateOnly(new Date()));
  const [proposalMinute, setProposalMinute] = useState(SLOT_STARTS[0] || 8 * 60);
  const [proposalReason, setProposalReason] = useState('');
  const [chatDraft, setChatDraft] = useState('');

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => filterBooking(booking, activeFilter)),
    [activeFilter, bookings],
  );
  const filterCounts = useMemo(
    () => ({
      all: bookings.length,
      trial: bookings.filter((booking) => booking.bookingType === 'trial').length,
      paid: bookings.filter((booking) => booking.bookingType !== 'trial').length,
      pending: bookings.filter((booking) => booking.status === 'pending').length,
      completed: bookings.filter((booking) => booking.status === 'completed').length,
      cancelled: bookings.filter(isBookingCancelled).length,
    }),
    [bookings],
  );

  useEffect(() => {
    const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
    if (!bookingId || selectedBooking) return;
    const match = bookings.find((booking) => booking.id === bookingId || booking._id === bookingId);
    if (match) setSelectedBooking(match);
  }, [bookings, params.bookingId, selectedBooking]);

  useEffect(() => {
    if (!chatBooking) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const booking = await mentorService.getBooking(getId(chatBooking));
        if (!cancelled) {
          setChatBooking(booking);
          if (selectedBooking?.id === booking.id) setSelectedBooking(booking);
          updateMentorPortalBookingCache(queryClient, booking);
        }
      } catch {
        // The next manual refresh can reconcile the conversation.
      }
    };
    const interval = setInterval(refresh, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chatBooking, queryClient, selectedBooking?.id]);

  const applyBookingUpdate = (booking: BookingSession) => {
    updateMentorPortalBookingCache(queryClient, booking);
    setSelectedBooking((current) => (current && current.id === booking.id ? booking : current));
    setChatBooking((current) => (current && current.id === booking.id ? booking : current));
  };

  const runBookingAction = async (id: string, action: () => Promise<BookingSession>, success: string) => {
    setBusyId(id);
    setMessage('');
    try {
      const updated = await action();
      applyBookingUpdate(updated);
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật booking.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const handleConfirm = (booking: BookingSession) =>
    runBookingAction(booking.id, () => mentorService.confirmBooking(booking.id), 'Đã xác nhận booking.');

  const handleComplete = (booking: BookingSession) =>
    runBookingAction(booking.id, () => mentorService.completeBooking(booking.id), 'Đã đánh dấu buổi tư vấn hoàn thành.');

  const handleCancel = async () => {
    if (!cancelBooking) return;
    const ok = await runBookingAction(
      cancelBooking.id,
      () => mentorService.cancelBooking(cancelBooking.id, cancelReason.trim() || undefined),
      'Đã hủy booking.',
    );
    if (ok) {
      setCancelBooking(null);
      setCancelReason('');
      await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
    }
  };

  const openChat = async (booking: BookingSession) => {
    setChatBooking(booking);
    try {
      const fresh = await mentorService.getBooking(booking.id);
      setChatBooking(fresh);
      applyBookingUpdate(fresh);
    } catch {
      // Keep the provided booking if fresh fetch fails.
    }
  };

  const sendChatMessage = async () => {
    if (!chatBooking || !chatDraft.trim()) return;
    setBusyId(`chat-${chatBooking.id}`);
    try {
      const updated = await mentorService.sendBookingMessage(chatBooking.id, chatDraft.trim());
      setChatDraft('');
      setChatBooking(updated);
      applyBookingUpdate(updated);
    } catch (error) {
      showError(error, 'Không thể gửi tin nhắn.');
    } finally {
      setBusyId('');
    }
  };

  const proposeReschedule = async (booking: BookingSession) => {
    if (!profile) return;
    if (getPendingRescheduleProposal(booking)) {
      setMessage('Booking này đang có đề xuất đổi lịch chờ phản hồi.');
      return;
    }
    const date = parseDateOnly(proposalDate);
    if (!date) {
      setMessage('Chọn ngày hợp lệ để đề xuất đổi lịch.');
      return;
    }
    const start = dateAtMinutes(date, proposalMinute);
    if (start <= new Date()) {
      setMessage('Khung giờ đổi lịch phải nằm trong tương lai.');
      return;
    }
    const duration = getBookingDuration(booking);
    const end = new Date(start.getTime() + duration * 60_000);
    setBusyId(`reschedule-${booking.id}`);
    let createdSlot: MentorAvailabilitySlot | null = null;
    try {
      createdSlot = await mentorService.createAvailabilitySlot({
        tutorProfileId: getId(profile),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: 'available',
      });
      const updated = await mentorService.createRescheduleProposal(booking.id, {
        newDateTime: start.toISOString(),
        duration,
        timeZone: booking.schedulingDetails.timeZone,
        availabilitySlotId: getId(createdSlot),
        reason: proposalReason,
        message: proposalReason,
      });
      applyBookingUpdate(updated);
      await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
      setProposalReason('');
      setMessage('Đã gửi đề xuất đổi lịch cho học viên.');
    } catch (error) {
      if (createdSlot) {
        await mentorService.deleteAvailabilitySlot(getId(createdSlot)).catch(() => undefined);
      }
      setMessage(error instanceof Error ? error.message : 'Không thể gửi đề xuất đổi lịch.');
    } finally {
      setBusyId('');
    }
  };

  const acceptProposal = async (booking: BookingSession, proposalId: string) => {
    await runBookingAction(
      `accept-${proposalId}`,
      () => mentorService.acceptRescheduleProposal(booking.id, proposalId),
      'Đã đồng ý đổi lịch.',
    );
    await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
  };

  const declineProposal = async () => {
    if (!declineTarget) return;
    const ok = await runBookingAction(
      `decline-${declineTarget.proposalId}`,
      () =>
        mentorService.declineRescheduleProposal(
          declineTarget.booking.id,
          declineTarget.proposalId,
          declineReason.trim() || undefined,
        ),
      'Đã từ chối đề xuất đổi lịch.',
    );
    if (ok) {
      setDeclineTarget(null);
      setDeclineReason('');
    }
  };

  if (portalQuery.isLoading) return <LoadingState label="Đang tải booking..." />;

  if (!profile || profile.status !== 'active') {
    return (
      <PortalScreen title="Booking">
        <EmptyState icon={SearchX} title="Portal chưa mở" description="Hồ sơ mentor cần active trước khi xử lý booking." />
      </PortalScreen>
    );
  }

  return (
    <PortalScreen
      title="Booking"
      subtitle="Xử lý lịch đặt, chat với học viên, đổi lịch và hoàn tất buổi tư vấn."
      refreshing={portalQuery.isRefetching}
      onRefresh={() => portalQuery.refetch()}
      rightAction={
        <TouchableOpacity onPress={() => portalQuery.refetch()} style={styles.iconButton}>
          <RefreshCcw size={18} color={COLORS.foreground} />
        </TouchableOpacity>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((filter) => (
          <Pill
            key={filter.value}
            label={`${filter.label} ${filterCounts[filter.value]}`}
            active={activeFilter === filter.value}
            onPress={() => setActiveFilter(filter.value)}
          />
        ))}
      </ScrollView>

      {message ? <MessageBanner message={message} tone={message.startsWith('Đã') ? 'success' : 'neutral'} /> : null}

      {visibleBookings.length === 0 ? (
        <EmptyState icon={SearchX} title="Chưa có booking phù hợp" description="Đổi bộ lọc hoặc kéo xuống để tải lại danh sách mới nhất." />
      ) : (
        <View style={styles.list}>
          {visibleBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              busyId={busyId}
              onOpen={() => setSelectedBooking(booking)}
              onConfirm={() => handleConfirm(booking)}
              onCancel={() => setCancelBooking(booking)}
              onJoin={() => openMeetingLink(booking).catch((error) => showError(error, 'Không thể mở phòng call.'))}
            />
          ))}
        </View>
      )}

      <BookingDetailModal
        booking={selectedBooking}
        busyId={busyId}
        proposalDate={proposalDate}
        proposalMinute={proposalMinute}
        proposalReason={proposalReason}
        onClose={() => setSelectedBooking(null)}
        onConfirm={handleConfirm}
        onComplete={handleComplete}
        onCancel={(booking) => setCancelBooking(booking)}
        onChat={openChat}
        onJoin={(booking) => openMeetingLink(booking).catch((error) => showError(error, 'Không thể mở phòng call.'))}
        onProposalDateChange={setProposalDate}
        onProposalMinuteChange={setProposalMinute}
        onProposalReasonChange={setProposalReason}
        onPropose={proposeReschedule}
        onAcceptProposal={acceptProposal}
        onDeclineProposal={(booking, proposalId) => setDeclineTarget({ booking, proposalId })}
      />

      <ChatModal
        booking={chatBooking}
        draft={chatDraft}
        busy={Boolean(chatBooking && busyId === `chat-${chatBooking.id}`)}
        onDraftChange={setChatDraft}
        onSend={sendChatMessage}
        onClose={() => setChatBooking(null)}
      />

      <ReasonModal
        visible={!!cancelBooking}
        title="Hủy booking"
        description="Nhập lý do ngắn để học viên hiểu vì sao lịch bị hủy."
        value={cancelReason}
        busy={Boolean(cancelBooking && busyId === cancelBooking.id)}
        confirmLabel="Hủy booking"
        onChange={setCancelReason}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleCancel}
      />

      <ReasonModal
        visible={!!declineTarget}
        title="Từ chối đổi lịch"
        description="Lý do này sẽ được lưu trong luồng booking."
        value={declineReason}
        busy={Boolean(declineTarget && busyId === `decline-${declineTarget.proposalId}`)}
        confirmLabel="Từ chối"
        onChange={setDeclineReason}
        onClose={() => setDeclineTarget(null)}
        onConfirm={declineProposal}
      />
    </PortalScreen>
  );
}

function BookingCard({
  booking,
  busyId,
  onOpen,
  onConfirm,
  onCancel,
  onJoin,
}: {
  booking: BookingSession;
  busyId: string;
  onOpen: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onJoin: () => void;
}) {
  const canConfirm = booking.status === 'pending';
  const canJoin = ['confirmed', 'rescheduled'].includes(booking.status);
  const canCancel = isActiveBooking(booking);
  return (
    <InfoCard>
      <TouchableOpacity onPress={onOpen} style={styles.cardTop}>
        <View style={styles.bookingIcon}>
          <Clock size={17} color={COLORS.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{sessionTypeLabel[booking.sessionType] || booking.sessionType}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {booking.menteeUser?.name || 'Học viên'}, {formatDateTime(booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime)}
          </Text>
        </View>
        <Text style={styles.statusText}>{bookingStatusLabel[booking.status] || booking.status}</Text>
      </TouchableOpacity>
      <Text style={styles.topicText} numberOfLines={2}>
        {booking.bookingRequest.topicsToDiscuss?.join(', ') || booking.bookingRequest.currentSituation || 'Chưa có chủ đề'}
      </Text>
      <Text style={styles.paymentText}>{getBookingPaymentSummary(booking)}</Text>
      <View style={styles.actionRow}>
        {canConfirm ? <ActionButton label="Xác nhận" onPress={onConfirm} loading={busyId === booking.id} icon={CheckCircle2} /> : null}
        {canJoin ? <ActionButton label="Vào phòng" onPress={onJoin} icon={Video} /> : null}
        {canCancel ? <ActionButton label="Hủy" onPress={onCancel} variant="danger" icon={XCircle} /> : null}
      </View>
    </InfoCard>
  );
}

function BookingDetailModal({
  booking,
  busyId,
  proposalDate,
  proposalMinute,
  proposalReason,
  onClose,
  onConfirm,
  onComplete,
  onCancel,
  onChat,
  onJoin,
  onProposalDateChange,
  onProposalMinuteChange,
  onProposalReasonChange,
  onPropose,
  onAcceptProposal,
  onDeclineProposal,
}: {
  booking: BookingSession | null;
  busyId: string;
  proposalDate: string;
  proposalMinute: number;
  proposalReason: string;
  onClose: () => void;
  onConfirm: (booking: BookingSession) => void;
  onComplete: (booking: BookingSession) => void;
  onCancel: (booking: BookingSession) => void;
  onChat: (booking: BookingSession) => void;
  onJoin: (booking: BookingSession) => void;
  onProposalDateChange: (value: string) => void;
  onProposalMinuteChange: (value: number) => void;
  onProposalReasonChange: (value: string) => void;
  onPropose: (booking: BookingSession) => void;
  onAcceptProposal: (booking: BookingSession, proposalId: string) => void;
  onDeclineProposal: (booking: BookingSession, proposalId: string) => void;
}) {
  if (!booking) return null;
  const canConfirm = booking.status === 'pending';
  const canComplete = ['confirmed', 'rescheduled'].includes(booking.status);
  const canCancel = isActiveBooking(booking);
  const pendingProposal = getPendingRescheduleProposal(booking);
  const trialNote = getTrialNote(booking);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{sessionTypeLabel[booking.sessionType] || booking.sessionType}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.detailGrid}>
              <DetailBlock label="Thời gian" value={`${formatDateTime(booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime)}, ${getBookingDuration(booking)} phút`} />
              <DetailBlock label="Trạng thái" value={bookingStatusLabel[booking.status] || booking.status} />
              <DetailBlock label="Thanh toán" value={getBookingPaymentSummary(booking)} />
              <DetailBlock label="Meeting" value={booking.schedulingDetails.meetingLink || 'Tự tạo sau khi xác nhận'} />
            </View>
            {trialNote ? <MessageBanner message={trialNote} /> : null}
            <DetailBlock label="Chủ đề" value={booking.bookingRequest.topicsToDiscuss?.join(', ') || 'Chưa có'} />
            <DetailBlock label="Tình huống hiện tại" value={booking.bookingRequest.currentSituation || 'Chưa có'} />
            <DetailBlock label="Mục tiêu" value={booking.bookingRequest.desiredOutcomes?.join(', ') || 'Chưa có'} />

            {isActiveBooking(booking) ? (
              <InfoCard>
                <SectionTitle title="Đổi lịch" meta="Tạo đề xuất mới hoặc phản hồi đề xuất từ học viên." />
                {pendingProposal ? (
                  <View style={styles.proposalBox}>
                    <Text style={styles.proposalTitle}>
                      {pendingProposal.proposedByRole === 'mentor' ? 'Bạn đã đề xuất' : 'Học viên đề xuất'}:{' '}
                      {formatDateTime(pendingProposal.newDateTime)}
                    </Text>
                    <Text style={styles.cardMeta}>{pendingProposal.reason || pendingProposal.message || 'Không có lý do kèm theo.'}</Text>
                    {pendingProposal.proposedByRole === 'mentee' ? (
                      <View style={styles.actionRow}>
                        <ActionButton
                          label="Từ chối"
                          onPress={() => onDeclineProposal(booking, pendingProposal.id)}
                          variant="danger"
                          loading={busyId === `decline-${pendingProposal.id}`}
                        />
                        <ActionButton
                          label="Đồng ý"
                          onPress={() => onAcceptProposal(booking, pendingProposal.id)}
                          loading={busyId === `accept-${pendingProposal.id}`}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.rescheduleForm}>
                    <TextInput
                      value={proposalDate}
                      onChangeText={onProposalDateChange}
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.muted}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.minuteRow}>
                      {SLOT_STARTS.map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          onPress={() => onProposalMinuteChange(minute)}
                          style={[styles.minutePill, proposalMinute === minute && styles.minutePillActive]}
                        >
                          <Text style={[styles.minuteText, proposalMinute === minute && styles.selectedText]}>{formatMinute(minute)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TextInput
                      value={proposalReason}
                      onChangeText={onProposalReasonChange}
                      style={styles.input}
                      placeholder="Lý do hoặc lời nhắn"
                      placeholderTextColor={COLORS.muted}
                    />
                    <ActionButton
                      label="Gửi đề xuất đổi lịch"
                      onPress={() => onPropose(booking)}
                      loading={busyId === `reschedule-${booking.id}`}
                    />
                  </View>
                )}
              </InfoCard>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <ActionButton label="Chat" onPress={() => onChat(booking)} variant="outline" icon={MessageSquare} />
            {['confirmed', 'rescheduled'].includes(booking.status) ? (
              <ActionButton label="Vào phòng" onPress={() => onJoin(booking)} icon={Video} />
            ) : null}
            {canConfirm ? <ActionButton label="Xác nhận" onPress={() => onConfirm(booking)} loading={busyId === booking.id} icon={CheckCircle2} /> : null}
            {canComplete ? <ActionButton label="Hoàn tất" onPress={() => onComplete(booking)} variant="success" loading={busyId === booking.id} icon={CheckCircle2} /> : null}
            {canCancel ? <ActionButton label="Hủy" onPress={() => onCancel(booking)} variant="danger" icon={XCircle} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ChatModal({
  booking,
  draft,
  busy,
  onDraftChange,
  onSend,
  onClose,
}: {
  booking: BookingSession | null;
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  if (!booking) return null;
  const messages = booking.communicationThread || [];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, styles.chatSheet]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Chat booking</Text>
              <Text style={styles.cardMeta}>{booking.menteeUser?.name || 'Học viên'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.messages}>
            {messages.length === 0 ? (
              <Text style={styles.emptyChat}>Chưa có tin nhắn.</Text>
            ) : (
              messages.map((message) => {
                const mine = message.senderType === 'mentor';
                const system = message.senderType === 'system';
                return (
                  <View key={message.messageId} style={[styles.messageRow, system ? styles.messageCenter : mine ? styles.messageMine : styles.messagePeer]}>
                    <View style={[styles.bubble, system ? styles.systemBubble : mine ? styles.mineBubble : styles.peerBubble]}>
                      <Text style={[styles.bubbleText, mine && styles.mineText]}>{message.message}</Text>
                      <Text style={[styles.bubbleMeta, mine && styles.mineMeta]}>
                        {message.senderType === 'mentor' ? 'Bạn' : message.senderType === 'mentee' ? booking.menteeUser?.name || 'Học viên' : 'Hệ thống'}, {formatDateTime(message.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              value={draft}
              onChangeText={onDraftChange}
              style={styles.chatInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={COLORS.muted}
            />
            <ActionButton label="" onPress={onSend} loading={busy} disabled={!draft.trim()} icon={Send} style={styles.sendButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReasonModal({
  visible,
  title,
  description,
  value,
  busy,
  confirmLabel,
  onChange,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  description: string;
  value: string;
  busy: boolean;
  confirmLabel: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.reasonBackdrop}>
        <View style={styles.reasonBox}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMeta}>{description}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            multiline
            style={[styles.input, styles.reasonInput]}
            placeholder="Nhập lý do..."
            placeholderTextColor={COLORS.muted}
          />
          <View style={styles.modalActions}>
            <ActionButton label="Đóng" onPress={onClose} variant="ghost" />
            <ActionButton label={confirmLabel} onPress={onConfirm} loading={busy} variant="danger" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    gap: SPACING.sm,
  },
  list: {
    gap: SPACING.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bookingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    maxWidth: 94,
    textAlign: 'right',
  },
  topicText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  paymentText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  modalSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  chatSheet: {
    height: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  detailGrid: {
    gap: SPACING.sm,
  },
  detailBlock: {
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.md,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  detailValue: {
    color: COLORS.foreground,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 4,
  },
  proposalBox: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'rgba(167,139,250,0.1)',
    padding: SPACING.md,
  },
  proposalTitle: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  rescheduleForm: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.foreground,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '800',
  },
  minuteRow: {
    gap: SPACING.sm,
  },
  minutePill: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  minutePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  minuteText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  messages: {
    flexGrow: 1,
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  emptyChat: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 13,
    marginTop: SPACING.xl,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageMine: {
    justifyContent: 'flex-end',
  },
  messagePeer: {
    justifyContent: 'flex-start',
  },
  messageCenter: {
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mineBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 5,
  },
  peerBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 5,
  },
  systemBubble: {
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  bubbleText: {
    color: COLORS.foreground,
    fontSize: 13,
    lineHeight: 18,
  },
  mineText: {
    color: '#fff',
  },
  bubbleMeta: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },
  mineMeta: {
    color: 'rgba(255,255,255,0.75)',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.foreground,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendButton: {
    width: 44,
    paddingHorizontal: 0,
  },
  reasonBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,6,23,0.72)',
    padding: SPACING.lg,
  },
  reasonBox: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  reasonInput: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});
