import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HandCoins, Percent, ReceiptText, WalletCards } from 'lucide-react-native';
import { useMentorIncome, useMentorPortalData } from '../../hooks/useMentorPortalData';
import { COLORS, SPACING } from '../../theme';
import { formatCurrency, formatDateTime } from './mentorUtils';
import { EmptyState, InfoCard, LoadingState, MetricCard, PortalScreen, SectionTitle } from './MentorPortalUI';

function settlementLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Đang chờ',
    ready: 'Sẵn sàng nhận',
    withheld: 'Tạm giữ',
    refunded: 'Đã hoàn tiền',
  };
  return labels[status] || status;
}

export default function MentorIncomeScreen() {
  const portalQuery = useMentorPortalData();
  const profile = portalQuery.data?.profile ?? null;
  const incomeQuery = useMentorIncome(Boolean(profile?.status === 'active'));
  const income = incomeQuery.data;
  const summary = income?.summary;
  const entries = income?.entries || [];
  const currency = summary?.currency || 'VND';

  if (portalQuery.isLoading || incomeQuery.isLoading) return <LoadingState label="Đang tải thu nhập mentor..." />;

  if (!profile || profile.status !== 'active') {
    return (
      <PortalScreen title="Thu nhập">
        <EmptyState icon={HandCoins} title="Portal chưa mở" description="Hồ sơ mentor cần active trước khi xem thu nhập." />
      </PortalScreen>
    );
  }

  return (
    <PortalScreen
      title="Thu nhập"
      subtitle="Theo dõi doanh thu, phí nền tảng và khoản mentor được nhận."
      refreshing={incomeQuery.isRefetching}
      onRefresh={() => incomeQuery.refetch()}
    >
      <View style={styles.statGrid}>
        <MetricCard icon={ReceiptText} label="Doanh thu booking" value={formatCurrency(summary?.grossRevenue, currency)} color="#38BDF8" />
        <MetricCard icon={HandCoins} label="Thu nhập của tôi" value={formatCurrency(summary?.mentorPayoutAmount, currency)} color="#22C55E" />
        <MetricCard icon={WalletCards} label="Sẵn sàng nhận" value={formatCurrency(summary?.readyPayoutAmount, currency)} color="#A78BFA" />
        <MetricCard icon={Percent} label="Phí nền tảng" value={formatCurrency(summary?.platformFeeAmount, currency)} color="#F59E0B" />
      </View>

      <InfoCard>
        <SectionTitle title="Chi tiết thu nhập" meta={`${income?.total || 0} bản ghi trong kỳ`} />
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có thu nhập mentor trong kỳ này. Trial miễn phí không phát sinh payout.</Text>
        ) : (
          <View style={styles.entryList}>
            {entries.map((entry) => (
              <View key={entry.paymentId} style={styles.entryItem}>
                <View style={styles.entryTop}>
                  <View style={styles.entryCopy}>
                    <Text style={styles.entryTitle}>{entry.menteeName || 'Học viên'}</Text>
                    <Text style={styles.entryMeta}>{entry.sessionType.replace(/_/g, ' ')}, {formatDateTime(entry.paidAt)}</Text>
                  </View>
                  <Text style={styles.entryAmount}>{formatCurrency(entry.mentorPayoutAmount, entry.currency)}</Text>
                </View>
                <View style={styles.entryBreakdown}>
                  <Text style={styles.breakdownText}>Giá phiên: {formatCurrency(entry.settlementBaseAmount, entry.currency)}</Text>
                  <Text style={styles.breakdownText}>Phí nền tảng: {formatCurrency(entry.platformFeeAmount, entry.currency)}</Text>
                  <Text style={styles.statusText}>{settlementLabel(entry.settlementStatus)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </InfoCard>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.md,
  },
  entryList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  entryItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  entryCopy: {
    flex: 1,
    minWidth: 0,
  },
  entryTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  entryMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  entryAmount: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '900',
  },
  entryBreakdown: {
    gap: 3,
  },
  breakdownText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },
});
