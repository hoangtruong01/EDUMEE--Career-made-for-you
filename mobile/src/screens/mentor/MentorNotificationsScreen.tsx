import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2 } from 'lucide-react-native';
import { notificationService, type AppNotification } from '../../services/notification.service';
import { COLORS, SPACING } from '../../theme';
import { formatCurrency, formatDateTime } from './mentorUtils';
import { ActionButton, EmptyState, InfoCard, LoadingState, PortalScreen, SectionTitle } from './MentorPortalUI';

function notificationMeta(notification: AppNotification) {
  if (typeof notification.payload?.amount === 'number') {
    return formatCurrency(notification.payload.amount, notification.payload.currency || 'VND');
  }
  return formatDateTime(notification.createdAt);
}

export default function MentorNotificationsScreen() {
  const notificationsQuery = useQuery({
    queryKey: ['mentorNotifications'],
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 20_000,
  });
  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const markRead = async (notification: AppNotification) => {
    await notificationService.markRead(notification.id || notification._id || '');
    notificationsQuery.refetch();
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    notificationsQuery.refetch();
  };

  if (notificationsQuery.isLoading) return <LoadingState label="Đang tải thông báo..." />;

  return (
    <PortalScreen
      title="Thông báo"
      subtitle="Theo dõi booking, tin nhắn, thanh toán và review mới."
      refreshing={notificationsQuery.isRefetching}
      onRefresh={() => notificationsQuery.refetch()}
    >
      <InfoCard>
        <SectionTitle title="Hộp thông báo" meta={`${unreadCount} thông báo chưa đọc`} />
        <ActionButton label="Đánh dấu tất cả đã đọc" onPress={markAllRead} variant="outline" icon={CheckCircle2} style={styles.markAll} />
      </InfoCard>
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Chưa có thông báo" description="Các sự kiện mentor mới sẽ xuất hiện tại đây." />
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id || notification._id}
              style={[styles.item, !notification.readAt && styles.unreadItem]}
              onPress={() => markRead(notification)}
            >
              <View style={styles.itemIcon}>
                <Bell size={17} color={notification.readAt ? COLORS.muted : COLORS.primary} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{notification.title}</Text>
                <Text style={styles.itemBody}>{notification.body}</Text>
                <Text style={styles.itemMeta}>{notificationMeta(notification)}</Text>
              </View>
              {!notification.readAt ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  markAll: {
    marginTop: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
  item: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  unreadItem: {
    borderColor: 'rgba(59,130,246,0.35)',
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  itemBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  itemMeta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
});
