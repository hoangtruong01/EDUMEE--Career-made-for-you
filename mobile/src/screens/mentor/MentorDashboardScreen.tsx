import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  MessageSquare,
  RefreshCcw,
  Star,
  UserCheck,
  Users,
  WalletCards,
} from 'lucide-react-native';
import { RADIUS, SPACING } from '../../theme';
import {
  summarizeIncome,
  summarizeReviews,
  useMentorIncome,
  useMentorPortalData,
  useMentorReviews,
} from '../../hooks/useMentorPortalData';
import { getRoleHomeRoute } from '../../utils/roleNavigation';
import { formatCurrency, formatDateTime, getMentorName, getMentorTitle, profileStatusLabel, sessionTypeLabel } from './mentorUtils';
import {
  ActionButton,
  EmptyState,
  InfoCard,
  LoadingState,
  MENTOR_COLORS as COLORS,
  MessageBanner,
  MetricCard,
  PortalScreen,
  SectionTitle,
} from './MentorPortalUI';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop';

export default function MentorDashboardScreen() {
  const router = useRouter();
  const portalQuery = useMentorPortalData();
  const profile = portalQuery.data?.profile ?? null;
  const user = portalQuery.data?.user ?? null;
  const isActiveProfile = profile?.status === 'active';
  const reviewsQuery = useMentorReviews(Boolean(isActiveProfile));
  const incomeQuery = useMentorIncome(Boolean(isActiveProfile));

  useEffect(() => {
    if (user?.role && user.role !== 'mentor') {
      router.replace(getRoleHomeRoute(user.role) as any);
    }
  }, [router, user?.role]);

  const bookings = portalQuery.data?.bookings || [];
  const slots = portalQuery.data?.slots || [];
  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['pending', 'confirmed', 'rescheduled'].includes(booking.status)),
    [bookings],
  );
  const pendingBookings = useMemo(() => bookings.filter((booking) => booking.status === 'pending'), [bookings]);
  const upcomingBookings = useMemo(
    () =>
      activeBookings
        .slice()
        .sort((first, second) => {
          const firstDate = new Date(first.schedulingDetails.confirmedDateTime || first.schedulingDetails.requestedDateTime);
          const secondDate = new Date(second.schedulingDetails.confirmedDateTime || second.schedulingDetails.requestedDateTime);
          return firstDate.getTime() - secondDate.getTime();
        })
        .slice(0, 3),
    [activeBookings],
  );
  const reviewsSummary = summarizeReviews(reviewsQuery.data || []);
  const incomeSummary = summarizeIncome(incomeQuery.data);
  const rate = profile?.pricing?.sessionRates?.[0];

  if (portalQuery.isLoading) return <LoadingState label="Đang tải mentor portal..." />;

  if (portalQuery.error) {
    return (
      <PortalScreen title="Tổng quan mentor">
        <MessageBanner
          message={portalQuery.error instanceof Error ? portalQuery.error.message : 'Không thể tải mentor portal.'}
          tone="danger"
        />
      </PortalScreen>
    );
  }

  if (!profile || !isActiveProfile) {
    return (
      <PortalScreen
        title={!profile ? 'Hoàn thiện hồ sơ' : 'Hồ sơ đang chờ duyệt'}
        subtitle="Portal mentor sẽ mở đầy đủ sau khi hồ sơ được admin duyệt."
        refreshing={portalQuery.isRefetching}
        onRefresh={() => portalQuery.refetch()}
      >
        <EmptyState
          icon={UserCheck}
          title={!profile ? 'Chưa có hồ sơ mentor' : profileStatusLabel[profile.status] || profile.status}
          description={
            !profile
              ? 'Hãy tạo hồ sơ mentor để admin xét duyệt trước khi nhận booking.'
              : 'Bạn vẫn có thể xem trạng thái và cập nhật hồ sơ nếu bị từ chối.'
          }
        />
        {profile?.adminInfo?.rejectionReason ? (
          <MessageBanner message={`Lý do từ chối: ${profile.adminInfo.rejectionReason}`} tone="danger" />
        ) : null}
        <ActionButton label={!profile ? 'Tạo hồ sơ mentor' : 'Mở hồ sơ mentor'} onPress={() => router.push('/(mentor-tabs)/profile' as any)} />
      </PortalScreen>
    );
  }

  return (
    <PortalScreen
      title="Tổng quan làm việc"
      subtitle="Theo dõi hồ sơ, lịch trống, booking và các việc cần xử lý trong ngày."
      refreshing={portalQuery.isRefetching}
      onRefresh={() => portalQuery.refetch()}
      rightAction={
        <TouchableOpacity onPress={() => portalQuery.refetch()} style={styles.iconButton}>
          <RefreshCcw size={18} color={COLORS.foreground} />
        </TouchableOpacity>
      }
    >
      <InfoCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Image source={{ uri: profile.mentorUser?.avatar || user?.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
          <View style={styles.heroCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {getMentorName(profile)}
            </Text>
            <Text style={styles.profileTitle} numberOfLines={2}>
              {getMentorTitle(profile)}
            </Text>
          </View>
        </View>
        <View style={styles.heroFooter}>
          <Text style={styles.statusText}>{profileStatusLabel[profile.status] || profile.status}</Text>
          <Text style={styles.heroMeta}>{bookings.length} booking tổng cộng</Text>
        </View>
      </InfoCard>

      <View style={styles.statGrid}>
        <MetricCard icon={Calendar} label="Slot đã tạo" value={String(slots.length)} color="#38BDF8" />
        <MetricCard icon={Clock} label="Chờ xác nhận" value={String(pendingBookings.length)} color="#F59E0B" />
        <MetricCard icon={Users} label="Booking active" value={String(activeBookings.length)} color="#22C55E" />
        <MetricCard icon={CreditCard} label="Giá từ" value={formatCurrency(rate?.pricePerSession, profile.pricing?.currency)} color="#A78BFA" />
      </View>

      <View style={styles.quickGrid}>
        <QuickLink icon={Calendar} label="Mở lịch" meta="Tạo slot, sửa slot, đổi lịch" onPress={() => router.push('/(mentor-tabs)/availability' as any)} />
        <QuickLink icon={MessageSquare} label="Booking" meta="Xác nhận, chat, hoàn tất" onPress={() => router.push('/(mentor-tabs)/bookings' as any)} />
        <QuickLink icon={WalletCards} label="Thu nhập" meta={formatCurrency(incomeSummary.mentorPayoutAmount, incomeSummary.currency)} onPress={() => router.push('/(mentor-tabs)/income' as any)} />
        <QuickLink icon={Star} label="Đánh giá" meta={`${reviewsSummary.total} phản hồi`} onPress={() => router.push('/(mentor-tabs)/reviews' as any)} />
        <QuickLink icon={Bell} label="Thông báo" meta="Booking và tin nhắn mới" onPress={() => router.push('/(mentor-tabs)/notifications' as any)} />
      </View>

      <InfoCard>
        <SectionTitle title="Booking sắp tới" meta={`${activeBookings.length} booking đang theo dõi`} />
        {upcomingBookings.length === 0 ? (
          <Text style={styles.emptyInline}>Chưa có booking active. Mở thêm lịch trống để học viên đặt lịch.</Text>
        ) : (
          <View style={styles.bookingList}>
            {upcomingBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingItem}
                onPress={() => router.push({ pathname: '/(mentor-tabs)/bookings', params: { bookingId: booking.id } } as any)}
              >
                <View style={styles.bookingIcon}>
                  <CheckCircle2 size={17} color={COLORS.primary} />
                </View>
                <View style={styles.bookingCopy}>
                  <Text style={styles.bookingTitle}>{sessionTypeLabel[booking.sessionType] || booking.sessionType}</Text>
                  <Text style={styles.bookingMeta} numberOfLines={1}>
                    {booking.menteeUser?.name || 'Học viên'}, {formatDateTime(booking.schedulingDetails.confirmedDateTime || booking.schedulingDetails.requestedDateTime)}
                  </Text>
                </View>
                <ChevronRight size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </InfoCard>
    </PortalScreen>
  );
}

function QuickLink({
  icon: Icon,
  label,
  meta,
  onPress,
}: {
  icon: typeof Calendar;
  label: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.quickLink}>
      <View style={styles.quickIcon}>
        <Icon size={18} color={COLORS.primary} />
      </View>
      <View style={styles.quickCopy}>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <ChevronRight size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.16)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: '900',
  },
  profileTitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  heroFooter: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  statusText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '900',
  },
  heroMeta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickGrid: {
    gap: SPACING.sm,
  },
  quickLink: {
    minHeight: 72,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickLabel: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  quickMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '700',
  },
  emptyInline: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  bookingList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    paddingTop: SPACING.sm,
  },
  bookingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingCopy: {
    flex: 1,
    minWidth: 0,
  },
  bookingTitle: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  bookingMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
});
