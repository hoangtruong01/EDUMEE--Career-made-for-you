import { Calendar, CheckCircle2, Search, Send, Star, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GlassView } from '../../src/components/GlassView';
import { api } from '../../src/services/api';
import { COLORS, RADIUS, SPACING } from '../../src/theme';

type BookingStep = 'form' | 'success';

interface MentorCardData {
  id: string;
  profileId: string;
  mentorUserId: string;
  name: string;
  title: string;
  skills: string[];
  rating: number;
  reviews: number;
  price: string;
  rawPrice: number;
  avatar: string;
  bio: string;
}

interface AvailabilitySlot {
  id?: string;
  _id?: string;
  startAt: string;
  endAt: string;
  status: string;
}

interface TutorProfileLike {
  id?: string;
  _id?: string;
  userId?: string;
  status?: string;
  mentorUser?: {
    id?: string;
    _id?: string;
    name?: string;
    avatar?: string;
  };
  professionalBackground?: {
    currentPosition?: string;
    company?: string;
  };
  mentoringExpertise?: {
    specializations?: string[];
    skillExpertise?: { skillName?: string }[];
  };
  pricing?: {
    currency?: string;
    sessionRates?: { pricePerSession?: number; duration?: number; sessionType?: string }[];
  };
  performanceMetrics?: {
    ratings?: {
      averageRating?: number;
      totalReviews?: number;
    };
  };
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop';

function unpackResponseData(response: any) {
  const payload = response?.data ?? response;
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    const inner = payload.data;
    if (inner && typeof inner === 'object' && 'data' in inner) return inner.data;
    return inner;
  }
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
  return payload;
}

function getEntityId(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id || value._id || '';
}

function formatCurrency(amount?: number, currency = 'VND') {
  const value = Number(amount || 0);
  if (!value) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTimeRange(slot?: AvailabilitySlot | null) {
  if (!slot) return '--';
  return `${formatDateTime(slot.startAt)} - ${new Date(slot.endAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getSlotId(slot: AvailabilitySlot) {
  return slot.id || slot._id || `${slot.startAt}-${slot.endAt}`;
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function parseMentor(item: TutorProfileLike): MentorCardData {
  const profileId = getEntityId(item);
  const mentorUserId = getEntityId(item.userId) || getEntityId(item.mentorUser);
  const rate = item.pricing?.sessionRates?.[0];
  const price = Number(rate?.pricePerSession || 0);
  const currentPosition = item.professionalBackground?.currentPosition || 'Mentor định hướng';
  const company = item.professionalBackground?.company;
  const skills =
    item.mentoringExpertise?.skillExpertise
      ?.map((skill) => skill.skillName)
      .filter(Boolean)
      .slice(0, 4) || item.mentoringExpertise?.specializations?.slice(0, 4) || ['Mentoring'];

  return {
    id: profileId,
    profileId,
    mentorUserId,
    name: item.mentorUser?.name || 'Mentor EDUMEE',
    title: company ? `${currentPosition} tại ${company}` : currentPosition,
    skills: skills as string[],
    rating: Number(item.performanceMetrics?.ratings?.averageRating || 5),
    reviews: Number(item.performanceMetrics?.ratings?.totalReviews || 0),
    price: formatCurrency(price, item.pricing?.currency),
    rawPrice: price,
    avatar: item.mentorUser?.avatar || DEFAULT_AVATAR,
    bio:
      item.mentoringExpertise?.specializations?.join(', ') ||
      'Tư vấn định hướng, chia sẻ kinh nghiệm thực chiến và hỗ trợ học viên chuẩn bị bước tiếp theo.',
  };
}

function getFallbackMentors(): MentorCardData[] {
  return [
    {
      id: 'fallback-1',
      profileId: 'fallback-1',
      mentorUserId: 'fallback-1',
      name: 'Lê Hoài Nam',
      title: 'AI Architect tại VinAI',
      skills: ['Machine Learning', 'Career path', 'Interview'],
      rating: 4.9,
      reviews: 24,
      price: '200.000 ₫',
      rawPrice: 200000,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop',
      bio: 'Hỗ trợ học viên xây dựng lộ trình AI, chuẩn bị portfolio và luyện phỏng vấn kỹ thuật.',
    },
    {
      id: 'fallback-2',
      profileId: 'fallback-2',
      mentorUserId: 'fallback-2',
      name: 'Hoàng Thu Thủy',
      title: 'Senior Product Designer tại Grab',
      skills: ['Product Design', 'UX Research', 'Portfolio'],
      rating: 4.8,
      reviews: 18,
      price: '150.000 ₫',
      rawPrice: 150000,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
      bio: 'Mentor về thiết kế sản phẩm, nghiên cứu người dùng và cách kể câu chuyện qua case study.',
    },
  ];
}

export default function MentorTabScreen() {
  const [mentors, setMentors] = useState<MentorCardData[]>([]);
  const [isLoadingMentors, setIsLoadingMentors] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('Tất cả');

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorCardData | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>('form');

  const fetchMentors = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoadingMentors(true);

      const response = await api.get('/tutor-profiles/active');
      const data = unpackResponseData(response);
      const list = Array.isArray(data) ? data : [];
      const parsed = list.map(parseMentor).filter((mentor) => mentor.profileId);
      setMentors(parsed.length ? parsed : getFallbackMentors());
    } catch (error) {
      console.log('Failed to fetch mentors:', error);
      setMentors(getFallbackMentors());
    } finally {
      setIsLoadingMentors(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  const allSkills = useMemo(() => {
    const skills = Array.from(new Set(mentors.flatMap((mentor) => mentor.skills)));
    return ['Tất cả', ...skills.slice(0, 10)];
  }, [mentors]);

  const filteredMentors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mentors.filter((mentor) => {
      const matchesQuery =
        !query ||
        mentor.name.toLowerCase().includes(query) ||
        mentor.title.toLowerCase().includes(query) ||
        mentor.skills.some((skill) => skill.toLowerCase().includes(query));
      const matchesSkill = selectedSkill === 'Tất cả' || mentor.skills.includes(selectedSkill);
      return matchesQuery && matchesSkill;
    });
  }, [mentors, searchQuery, selectedSkill]);

  const openBooking = async (mentor: MentorCardData) => {
    setSelectedMentor(mentor);
    setBookingReason('');
    setBookingStep('form');
    setAvailableSlots([]);
    setSelectedSlotId('');
    setBookingModalVisible(true);
    setIsLoadingSlots(true);

    try {
      const mentorId = mentor.mentorUserId || mentor.id;
      const response = await api.get(`/mentor-availability/mentor/${encodeURIComponent(mentorId)}/available`);
      const data = unpackResponseData(response);
      const slots = Array.isArray(data) ? data : [];
      setAvailableSlots(slots);
      setSelectedSlotId(slots[0] ? getSlotId(slots[0]) : '');
    } catch (error) {
      console.log('Failed to fetch available slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedMentor) return;
    const selectedSlot = availableSlots.find((slot) => getSlotId(slot) === selectedSlotId);

    if (!selectedSlot) {
      notify('Chưa chọn lịch', 'Vui lòng chọn một khung giờ trống của mentor.');
      return;
    }

    if (!bookingReason.trim()) {
      notify('Thiếu nội dung', 'Vui lòng nhập nội dung bạn muốn trao đổi.');
      return;
    }

    const durationMs = new Date(selectedSlot.endAt).getTime() - new Date(selectedSlot.startAt).getTime();
    const duration = Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs / 60000) : 60;

    setBookingSubmitting(true);
    try {
      await api.post('/booking-sessions', {
        tutorProfileId: selectedMentor.profileId,
        availabilitySlotId: selectedSlotId,
        sessionType: 'general_mentoring',
        schedulingDetails: {
          requestedDateTime: selectedSlot.startAt,
          duration,
          timeZone: 'Asia/Ho_Chi_Minh',
          meetingPlatform: 'video',
        },
        bookingRequest: {
          topicsToDiscuss: [bookingReason.trim()],
          currentSituation: 'Học viên cần tư vấn lộ trình học và nghề nghiệp.',
          desiredOutcomes: ['Có mục tiêu rõ ràng sau buổi tư vấn'],
          isFirstSession: true,
        },
      });
      setBookingStep('success');
    } catch (error: any) {
      notify('Không thể đặt lịch', error?.response?.data?.message || 'Vui lòng thử lại sau.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Mentor</Text>
        <Text style={styles.title}>Tìm mentor phù hợp</Text>
        <Text style={styles.subtitle}>Chọn chuyên gia đã được duyệt và gửi yêu cầu đặt lịch tư vấn.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchMentors(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <DiscoverView
          mentors={filteredMentors}
          allSkills={allSkills}
          selectedSkill={selectedSkill}
          searchQuery={searchQuery}
          isLoading={isLoadingMentors}
          onSearchChange={setSearchQuery}
          onSkillChange={setSelectedSkill}
          onBook={openBooking}
        />
      </ScrollView>

      <BookingModal
        visible={bookingModalVisible}
        mentor={selectedMentor}
        step={bookingStep}
        slots={availableSlots}
        selectedSlotId={selectedSlotId}
        isLoadingSlots={isLoadingSlots}
        bookingReason={bookingReason}
        isSubmitting={bookingSubmitting}
        onSelectSlot={setSelectedSlotId}
        onReasonChange={setBookingReason}
        onSubmit={handleBookingSubmit}
        onClose={() => setBookingModalVisible(false)}
      />
    </View>
  );
}

function DiscoverView({
  mentors,
  allSkills,
  selectedSkill,
  searchQuery,
  isLoading,
  onSearchChange,
  onSkillChange,
  onBook,
}: {
  mentors: MentorCardData[];
  allSkills: string[];
  selectedSkill: string;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSkillChange: (value: string) => void;
  onBook: (mentor: MentorCardData) => void;
}) {
  return (
    <View style={styles.section}>
      <GlassView style={styles.searchBox}>
        <Search size={18} color={COLORS.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Tìm theo tên, vị trí, kỹ năng..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />
      </GlassView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillRow}>
        {allSkills.map((skill) => {
          const active = selectedSkill === skill;
          return (
            <TouchableOpacity
              key={skill}
              onPress={() => onSkillChange(skill)}
              style={[styles.skillPill, active && styles.skillPillActive]}
            >
              <Text style={[styles.skillPillText, active && styles.skillPillTextActive]}>{skill}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <GlassView style={styles.noticeCard}>
        <UserCheckIcon />
        <Text style={styles.noticeText}>Mentor active đã được duyệt hồ sơ, kinh nghiệm và lĩnh vực tư vấn.</Text>
      </GlassView>

      {isLoading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách mentor...</Text>
        </View>
      ) : mentors.length === 0 ? (
        <EmptyState title="Chưa tìm thấy mentor" description="Thử đổi từ khóa hoặc chọn lĩnh vực khác." />
      ) : (
        <View style={styles.cardList}>
          {mentors.map((mentor) => (
            <GlassView key={mentor.id} style={styles.mentorCard}>
              <View style={styles.mentorTop}>
                <Image source={{ uri: mentor.avatar }} style={styles.mentorAvatar} />
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>{mentor.name}</Text>
                  <Text style={styles.mentorTitle} numberOfLines={2}>
                    {mentor.title}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {mentor.rating.toFixed(1)} · {mentor.reviews} đánh giá
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.mentorBio}>{mentor.bio}</Text>

              <View style={styles.tagWrap}>
                {mentor.skills.map((skill) => (
                  <View key={`${mentor.id}-${skill}`} style={styles.skillTag}>
                    <Text style={styles.skillTagText}>{skill}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.mentorFooter}>
                <View>
                  <Text style={styles.smallLabel}>Phí tư vấn</Text>
                  <Text style={styles.priceText}>{mentor.price}</Text>
                </View>
                <TouchableOpacity onPress={() => onBook(mentor)} style={styles.primaryButton}>
                  <Calendar size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>Đặt lịch</Text>
                </TouchableOpacity>
              </View>
            </GlassView>
          ))}
        </View>
      )}
    </View>
  );
}

function UserCheckIcon() {
  return (
    <View style={styles.noticeIcon}>
      <CheckCircle2 size={16} color="#22C55E" />
    </View>
  );
}

function BookingModal({
  visible,
  mentor,
  step,
  slots,
  selectedSlotId,
  isLoadingSlots,
  bookingReason,
  isSubmitting,
  onSelectSlot,
  onReasonChange,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  mentor: MentorCardData | null;
  step: BookingStep;
  slots: AvailabilitySlot[];
  selectedSlotId: string;
  isLoadingSlots: boolean;
  bookingReason: string;
  isSubmitting: boolean;
  onSelectSlot: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <GlassView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{step === 'success' ? 'Đặt lịch thành công' : 'Đặt lịch tư vấn'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <X size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>

          {step === 'success' ? (
            <View style={styles.successBlock}>
              <View style={styles.successIcon}>
                <CheckCircle2 size={34} color="#22C55E" />
              </View>
              <Text style={styles.successTitle}>Yêu cầu đã được gửi</Text>
              <Text style={styles.successText}>
                Mentor {mentor?.name} sẽ xác nhận booking. Link phòng call sẽ xuất hiện khi lịch được duyệt.
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.primaryButtonWide}>
                <Text style={styles.primaryButtonText}>Xong</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {mentor && (
                <View style={styles.modalMentor}>
                  <Image source={{ uri: mentor.avatar }} style={styles.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalMentorName}>{mentor.name}</Text>
                    <Text style={styles.modalMentorTitle} numberOfLines={1}>
                      {mentor.title}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>Chọn khung giờ</Text>
              {isLoadingSlots ? (
                <View style={styles.slotLoading}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.loadingText}>Đang tải lịch trống...</Text>
                </View>
              ) : slots.length === 0 ? (
                <View style={styles.noSlotBox}>
                  <Calendar size={18} color={COLORS.muted} />
                  <Text style={styles.noSlotText}>Mentor chưa có slot trống. Hãy thử lại sau.</Text>
                </View>
              ) : (
                <View style={styles.slotList}>
                  {slots.slice(0, 8).map((slot) => {
                    const slotId = getSlotId(slot);
                    const selected = selectedSlotId === slotId;
                    return (
                      <TouchableOpacity
                        key={slotId}
                        onPress={() => onSelectSlot(slotId)}
                        style={[styles.slotChoice, selected && styles.slotChoiceActive]}
                      >
                        <Text style={[styles.slotChoiceText, selected && styles.slotChoiceTextActive]}>
                          {formatTimeRange(slot)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.inputLabel}>Bạn muốn trao đổi gì?</Text>
              <TextInput
                value={bookingReason}
                onChangeText={onReasonChange}
                placeholder="Ví dụ: Em cần định hướng lộ trình học backend và review CV..."
                placeholderTextColor={COLORS.muted}
                multiline
                textAlignVertical="top"
                style={styles.reasonInput}
              />

              <TouchableOpacity
                onPress={onSubmit}
                disabled={isSubmitting || isLoadingSlots || slots.length === 0}
                style={[
                  styles.primaryButtonWide,
                  (isSubmitting || isLoadingSlots || slots.length === 0) && styles.disabledButton,
                ]}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Send size={16} color="#fff" />}
                <Text style={styles.primaryButtonText}>Gửi yêu cầu đặt lịch</Text>
              </TouchableOpacity>
            </>
          )}
        </GlassView>
      </View>
    </Modal>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  kicker: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: COLORS.foreground,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  section: {
    gap: SPACING.md,
  },
  searchBox: {
    height: 48,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 14,
    height: 48,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  skillRow: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  skillPill: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skillPillActive: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderColor: 'rgba(59,130,246,0.38)',
  },
  skillPillText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  skillPillTextActive: {
    color: COLORS.foreground,
  },
  noticeCard: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.15)',
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardList: {
    gap: SPACING.md,
  },
  mentorCard: {
    padding: SPACING.md,
  },
  mentorTop: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  mentorAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mentorInfo: {
    flex: 1,
    minWidth: 0,
  },
  mentorName: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  mentorTitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  ratingText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  mentorBio: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.md,
  },
  skillTag: {
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  skillTagText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  mentorFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  smallLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  priceText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  primaryButton: {
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonWide: {
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  loadingBlock: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.foreground,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modalContent: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: '900',
  },
  modalMentor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
  },
  modalMentorName: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  modalMentorTitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  inputLabel: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '900',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  slotLoading: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSlotBox: {
    minHeight: 70,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: SPACING.md,
  },
  noSlotText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  slotList: {
    gap: SPACING.sm,
  },
  slotChoice: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: SPACING.md,
  },
  slotChoiceActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  slotChoiceText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  slotChoiceTextActive: {
    color: COLORS.foreground,
  },
  reasonInput: {
    height: 92,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: SPACING.md,
    color: COLORS.foreground,
    fontSize: 13,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  successBlock: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  successIcon: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: '900',
    marginTop: SPACING.md,
  },
  successText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
