import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Plus, Repeat, Save, Trash2, X } from 'lucide-react-native';
import { mentorPortalQueryKey, useMentorPortalData } from '../../hooks/useMentorPortalData';
import { mentorService, type BookingSession, type MentorAvailabilitySlot } from '../../services/mentor.service';
import { COLORS, RADIUS, SPACING } from '../../theme';
import {
  addDays,
  formatDateOnly,
  formatMinute,
  getBookingEnd,
  getBookingStart,
  getId,
  getSlotDate,
  sameDay,
  sessionTypeLabel,
  SLOT_BLOCK_MINUTES,
  SLOT_STARTS,
  startOfWeek,
  WEEKDAY_LABELS,
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

const ACTIVE_BOOKING_STATUSES = ['awaiting_payment', 'pending', 'confirmed', 'rescheduled'];

function slotKey(dayIndex: number, minute: number) {
  return `${dayIndex}-${minute}`;
}

function parseSlotKey(key: string) {
  const [dayIndex, minute] = key.split('-').map(Number);
  return { dayIndex, minute };
}

function statusTone(status: string) {
  if (status === 'available') return '#22C55E';
  if (status === 'held' || status === 'awaiting_payment') return '#F59E0B';
  if (status === 'booked' || status === 'confirmed') return '#6366F1';
  if (status === 'pending') return '#38BDF8';
  if (status === 'rescheduled') return '#A855F7';
  return '#94A3B8';
}

function statusLabel(status: string) {
  if (status === 'available') return 'Đã mở';
  if (status === 'held') return 'Đang giữ';
  if (status === 'booked') return 'Đã booking';
  if (status === 'awaiting_payment') return 'Chờ thanh toán';
  if (status === 'pending') return 'Chờ xác nhận';
  if (status === 'confirmed') return 'Đã xác nhận';
  if (status === 'rescheduled') return 'Đã đổi lịch';
  return status;
}

type TimetableItem =
  | {
      id: string;
      kind: 'slot';
      slot: MentorAvailabilitySlot;
      start: Date;
      end: Date;
      status: string;
    }
  | {
      id: string;
      kind: 'booking';
      booking: BookingSession;
      slot?: MentorAvailabilitySlot;
      start: Date;
      end: Date;
      status: string;
    };

export default function MentorAvailabilityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const portalQuery = useMentorPortalData();
  const profile = portalQuery.data?.profile ?? null;
  const slots = portalQuery.data?.slots || [];
  const bookings = portalQuery.data?.bookings || [];
  const [startOffsetWeeks, setStartOffsetWeeks] = useState(0);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [draftDayIndex, setDraftDayIndex] = useState(0);
  const [draftStartMinute, setDraftStartMinute] = useState(SLOT_STARTS[0] || 8 * 60);
  const [repeatWeeks, setRepeatWeeks] = useState('8');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editingSlot, setEditingSlot] = useState<MentorAvailabilitySlot | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editMinute, setEditMinute] = useState(SLOT_STARTS[0] || 8 * 60);

  const weekStart = useMemo(() => startOfWeek(addDays(new Date(), startOffsetWeeks * 7)), [startOffsetWeeks]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const draftSlots = useMemo(
    () =>
      selectedSlotKeys
        .map(parseSlotKey)
        .sort((first, second) => first.dayIndex - second.dayIndex || first.minute - second.minute),
    [selectedSlotKeys],
  );

  const scheduleItemsByDay = useMemo(() => {
    const map = new Map<number, TimetableItem[]>();
    const visibleBookings = bookings
      .filter((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status))
      .map((booking) => {
        const start = getBookingStart(booking);
        const end = getBookingEnd(booking, start);
        const dayIndex = weekDays.findIndex((day) => sameDay(day, start));
        return { booking, start, end, dayIndex };
      })
      .filter((entry) => entry.dayIndex >= 0 && !Number.isNaN(entry.start.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const bookingBySlotId = new Map(visibleBookings.map(({ booking }) => [booking.availabilitySlotId, booking]));
    const mappedBookingIds = new Set<string>();
    const pushItem = (dayIndex: number, start: Date, item: TimetableItem) => {
      const current = map.get(dayIndex) || [];
      current.push(item);
      current.sort((a, b) => a.start.getTime() - b.start.getTime());
      map.set(dayIndex, current);
    };

    slots.forEach((slot) => {
      const { start, end } = getSlotDate(slot);
      const dayIndex = weekDays.findIndex((day) => sameDay(day, start));
      if (dayIndex < 0 || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const booking = bookingBySlotId.get(getId(slot));
      if (booking) {
        mappedBookingIds.add(getId(booking));
        const bookingStart = getBookingStart(booking);
        pushItem(dayIndex, bookingStart, {
          id: `booking-${getId(booking)}`,
          kind: 'booking',
          booking,
          slot,
          start: bookingStart,
          end: getBookingEnd(booking, bookingStart),
          status: booking.status,
        });
        return;
      }

      pushItem(dayIndex, start, {
        id: `slot-${getId(slot)}`,
        kind: 'slot',
        slot,
        start,
        end,
        status: slot.status,
      });
    });

    visibleBookings.forEach(({ booking, start, end, dayIndex }) => {
      if (mappedBookingIds.has(getId(booking))) return;
      pushItem(dayIndex, start, {
        id: `booking-${getId(booking)}`,
        kind: 'booking',
        booking,
        start,
        end,
        status: booking.status,
      });
    });

    return map;
  }, [bookings, slots, weekDays]);
  const hasScheduleItems = Array.from(scheduleItemsByDay.values()).some((items) => items.length > 0);

  if (portalQuery.isLoading) return <LoadingState label="Đang tải lịch mentor..." />;

  if (!profile || profile.status !== 'active') {
    return (
      <PortalScreen title="Lịch làm việc">
        <EmptyState icon={Calendar} title="Portal chưa mở" description="Bạn cần hồ sơ mentor active trước khi tạo lịch trống." />
      </PortalScreen>
    );
  }

  const addDraftSlot = () => {
    const key = slotKey(draftDayIndex, draftStartMinute);
    if (selectedSlotKeys.includes(key)) {
      setMessage('Khung giờ này đã có trong danh sách chờ lưu.');
      return;
    }
    setSelectedSlotKeys((current) =>
      [...current, key].sort((first, second) => {
        const a = parseSlotKey(first);
        const b = parseSlotKey(second);
        return a.dayIndex - b.dayIndex || a.minute - b.minute;
      }),
    );
    setMessage('');
  };

  const removeDraftSlot = (key: string) => {
    setSelectedSlotKeys((current) => current.filter((item) => item !== key));
    setMessage('');
  };

  const createSelectedSlots = async () => {
    if (selectedSlotKeys.length === 0) {
      setMessage('Chọn ít nhất một ô trong thời gian biểu.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const normalizedRepeatWeeks = Math.min(12, Math.max(1, Number(repeatWeeks) || 1));
      const result = await mentorService.createBulkAvailabilitySlots({
        tutorProfileId: getId(profile),
        weekStart: formatDateOnly(weekStart),
        slotStarts: selectedSlotKeys
          .map(parseSlotKey)
          .sort((a, b) => a.dayIndex - b.dayIndex || a.minute - b.minute)
          .map(({ dayIndex, minute }) => ({ dayIndex, startTime: formatMinute(minute) })),
        repeatWeeks: normalizedRepeatWeeks,
      });
      setSelectedSlotKeys([]);
      await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
      setMessage(
        result.skipped.length
          ? `Đã tạo ${result.created.length} slot. Bỏ qua ${result.skipped.length} slot do trùng, quá khứ hoặc đã tồn tại.`
          : `Đã tạo ${result.created.length} slot.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo lịch trống.');
    } finally {
      setBusy(false);
    }
  };

  const openEditSlot = (slot: MentorAvailabilitySlot) => {
    const { start } = getSlotDate(slot);
    setEditingSlot(slot);
    setEditDate(formatDateOnly(start));
    setEditMinute(start.getHours() * 60 + start.getMinutes());
  };

  const updateSlot = async () => {
    if (!editingSlot) return;
    const [year, month, day] = editDate.split('-').map(Number);
    const start = year && month && day ? new Date(year, month - 1, day, Math.floor(editMinute / 60), editMinute % 60) : null;
    if (!start || Number.isNaN(start.getTime())) {
      setMessage('Chọn ngày hợp lệ để sửa slot.');
      return;
    }
    if (start < new Date()) {
      setMessage('Không thể chuyển slot sang thời gian trong quá khứ.');
      return;
    }
    const end = new Date(start.getTime() + SLOT_BLOCK_MINUTES * 60_000);
    setBusy(true);
    try {
      await mentorService.updateAvailabilitySlot(getId(editingSlot), {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: 'available',
      });
      setEditingSlot(null);
      await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
      setMessage('Đã cập nhật slot lịch rảnh.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật slot.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSlot = async () => {
    if (!editingSlot) return;
    Alert.alert('Xóa slot lịch rảnh', 'Slot này sẽ biến mất khỏi lịch làm việc của bạn.', [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xóa slot',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await mentorService.deleteAvailabilitySlot(getId(editingSlot));
            setEditingSlot(null);
            await queryClient.invalidateQueries({ queryKey: mentorPortalQueryKey });
            setMessage('Đã xóa slot lịch rảnh.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể xóa slot.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const openTimetableItem = (item: TimetableItem) => {
    if (item.kind === 'booking') {
      router.push({ pathname: '/(mentor-tabs)/bookings', params: { bookingId: getId(item.booking) } } as never);
      return;
    }
    if (item.slot.status === 'available' && item.start >= new Date()) {
      openEditSlot(item.slot);
    }
  };

  return (
    <PortalScreen
      title="Lịch làm việc"
      subtitle="Thêm slot rảnh theo thứ và giờ, mỗi slot kéo dài 90 phút."
      refreshing={portalQuery.isRefetching}
      onRefresh={() => portalQuery.refetch()}
    >
      <InfoCard>
        <SectionTitle title="Tạo slot rảnh" meta="Admin và phụ huynh sẽ dùng lịch này để giảm trùng lịch." />
        <View style={styles.controlBlock}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlLabel}>Bắt đầu từ</Text>
            <View style={styles.segmented}>
              {[
                { label: 'Tuần này', value: 0 },
                { label: 'Tuần sau', value: 1 },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setStartOffsetWeeks(option.value);
                    setSelectedSlotKeys([]);
                    setMessage('');
                  }}
                  style={[styles.segmentButton, startOffsetWeeks === option.value && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentText, startOffsetWeeks === option.value && styles.segmentTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.repeatRow}>
            <Repeat size={16} color={COLORS.primary} />
            <Text style={styles.repeatText}>Lặp trong</Text>
            <TextInput
              value={repeatWeeks}
              onChangeText={setRepeatWeeks}
              keyboardType="numeric"
              style={styles.repeatInput}
              placeholder="8"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.repeatText}>tuần</Text>
          </View>
        </View>

        <View style={styles.builderForm}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ngày</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => setDraftDayIndex(index)}
                  style={[styles.choicePill, draftDayIndex === index && styles.choicePillActive]}
                >
                  <Text style={[styles.choiceText, draftDayIndex === index && styles.selectedText]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bắt đầu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
              {SLOT_STARTS.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  onPress={() => setDraftStartMinute(minute)}
                  style={[styles.choicePill, draftStartMinute === minute && styles.choicePillActive]}
                >
                  <Text style={[styles.choiceText, draftStartMinute === minute && styles.selectedText]}>{formatMinute(minute)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.timePreviewRow}>
            <View style={styles.timePreviewBox}>
              <Text style={styles.fieldLabel}>Kết thúc</Text>
              <View style={styles.timePreviewValue}>
                <Text style={styles.timePreviewText}>{formatMinute(draftStartMinute + SLOT_BLOCK_MINUTES)}</Text>
                <Clock size={16} color={COLORS.muted} />
              </View>
            </View>
            <ActionButton label="Thêm" onPress={addDraftSlot} icon={Plus} style={styles.addButton} />
          </View>
        </View>
      </InfoCard>

      {message ? <MessageBanner message={message} tone={message.startsWith('Đã') ? 'success' : 'neutral'} /> : null}

      <InfoCard>
        <View style={styles.saveHeader}>
          <View style={styles.saveCopy}>
            <Text style={styles.selectedCount}>{draftSlots.length} slot đang thêm</Text>
            <Text style={styles.selectedMeta}>Slot quá khứ trong tuần này có thể bị backend bỏ qua khi lưu.</Text>
          </View>
          <ActionButton
            label="Lưu lịch rảnh"
            onPress={createSelectedSlots}
            loading={busy}
            disabled={selectedSlotKeys.length === 0}
            icon={Save}
            style={styles.inlineSave}
          />
        </View>

        {draftSlots.length === 0 ? (
          <View style={styles.emptyDraftBox}>
            <Text style={styles.emptyDraftText}>Chưa có slot nào trong danh sách chờ lưu.</Text>
          </View>
        ) : (
          <View style={styles.draftList}>
            {draftSlots.map(({ dayIndex, minute }) => {
              const key = slotKey(dayIndex, minute);
              return (
                <View key={key} style={styles.draftRow}>
                  <View style={styles.draftIcon}>
                    <Clock size={19} color={COLORS.primary} />
                  </View>
                  <View style={styles.draftCopy}>
                    <Text style={styles.draftTitle}>{WEEKDAY_LABELS[dayIndex]}</Text>
                    <Text style={styles.draftMeta}>
                      {formatMinute(minute)} - {formatMinute(minute + SLOT_BLOCK_MINUTES)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeDraftSlot(key)} style={styles.removeButton}>
                    <Trash2 size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </InfoCard>

      <InfoCard>
        <SectionTitle title="Lịch đã mở sắp tới" meta="Bấm slot còn trống để sửa hoặc xóa; bấm booking để xem chi tiết." />
        <View style={styles.legendRow}>
          <Pill label="Đã mở" active color="#22C55E" />
          <Pill label="Đang giữ" active color="#F59E0B" />
          <Pill label="Booking" active color="#6366F1" />
        </View>
        {!hasScheduleItems ? (
          <View style={styles.emptyDraftBox}>
            <Text style={styles.emptyDraftText}>Tuần đang chọn chưa có slot hoặc booking nào.</Text>
          </View>
        ) : (
          <View style={styles.dayGroupList}>
            {weekDays.map((day, dayIndex) => {
              const items = scheduleItemsByDay.get(dayIndex) || [];
              if (items.length === 0) return null;
              return (
                <View key={day.toISOString()} style={styles.dayGroup}>
                  <Text style={styles.dayGroupTitle}>{WEEKDAY_LABELS[dayIndex]}</Text>
                  <View style={styles.scheduleList}>
                    {items.map((item) => {
                      const tone = statusTone(item.status);
                      const title =
                        item.kind === 'booking'
                          ? sessionTypeLabel[item.booking.sessionType] || item.booking.sessionType
                          : statusLabel(item.status);
                      const meta =
                        item.kind === 'booking'
                          ? `${statusLabel(item.status)} · ${formatMinute(item.start.getHours() * 60 + item.start.getMinutes())} - ${formatMinute(
                              item.end.getHours() * 60 + item.end.getMinutes(),
                            )}`
                          : `${formatMinute(item.start.getHours() * 60 + item.start.getMinutes())} - ${formatMinute(
                              item.end.getHours() * 60 + item.end.getMinutes(),
                            )}`;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => openTimetableItem(item)}
                          style={[styles.scheduleRow, { borderColor: `${tone}66`, backgroundColor: `${tone}16` }]}
                        >
                          <View style={[styles.statusDot, { backgroundColor: tone }]} />
                          <View style={styles.scheduleCopy}>
                            <Text style={styles.scheduleTitle} numberOfLines={1}>{title}</Text>
                            <Text style={styles.scheduleMeta} numberOfLines={1}>{meta}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </InfoCard>

      <Modal visible={!!editingSlot} transparent animationType="slide" onRequestClose={() => setEditingSlot(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết slot lịch rảnh</Text>
              <TouchableOpacity onPress={() => setEditingSlot(null)} style={styles.modalClose}>
                <X size={18} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            {editingSlot ? (
              <>
                <Text style={styles.modalMeta}>Slot available có thể sửa ngày giờ hoặc xóa khỏi lịch.</Text>
                <TextInput value={editDate} onChangeText={setEditDate} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.muted} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.minuteRow}>
                  {SLOT_STARTS.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      onPress={() => setEditMinute(minute)}
                      style={[styles.minutePill, editMinute === minute && styles.minutePillActive]}
                    >
                      <Text style={[styles.minuteText, editMinute === minute && styles.selectedText]}>{formatMinute(minute)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <ActionButton label="Xóa slot" onPress={deleteSlot} variant="danger" loading={busy} icon={Trash2} />
                  <ActionButton label="Lưu thay đổi" onPress={updateSlot} loading={busy} icon={Save} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  controlBlock: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  controlHeader: {
    gap: SPACING.sm,
  },
  controlLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#fff',
  },
  repeatRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  repeatText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  repeatInput: {
    width: 58,
    height: 38,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: COLORS.foreground,
    backgroundColor: 'rgba(255,255,255,0.06)',
    textAlign: 'center',
    fontWeight: '900',
  },
  builderForm: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  fieldGroup: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  choiceRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  choicePill: {
    minHeight: 42,
    minWidth: 82,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  choicePillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  choiceText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  timePreviewRow: {
    gap: SPACING.sm,
  },
  timePreviewBox: {
    gap: SPACING.xs,
  },
  timePreviewValue: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePreviewText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  addButton: {
    marginTop: 2,
  },
  saveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  saveCopy: {
    flex: 1,
  },
  selectedCount: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  selectedMeta: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  inlineSave: {
    minWidth: 112,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  emptyDraftBox: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: SPACING.md,
  },
  emptyDraftText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  draftList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  draftRow: {
    minHeight: 72,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  draftIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftCopy: {
    flex: 1,
    minWidth: 0,
  },
  draftTitle: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  draftMeta: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  removeButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayGroupList: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  dayGroup: {
    gap: SPACING.sm,
  },
  dayGroupTitle: {
    color: COLORS.foreground,
    fontSize: 15,
    fontWeight: '900',
  },
  scheduleList: {
    gap: SPACING.sm,
  },
  scheduleRow: {
    minHeight: 62,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  scheduleCopy: {
    flex: 1,
    minWidth: 0,
  },
  scheduleTitle: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  scheduleMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  selectedText: {
    color: '#fff',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.72)',
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.lg,
    gap: SPACING.md,
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
  },
  modalMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 44,
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
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});
