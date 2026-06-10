import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star, ThumbsUp, Users } from 'lucide-react-native';
import { summarizeReviews, useMentorPortalData, useMentorReviews } from '../../hooks/useMentorPortalData';
import { SPACING } from '../../theme';
import { formatDateTime } from './mentorUtils';
import { EmptyState, InfoCard, LoadingState, MENTOR_COLORS as COLORS, MetricCard, PortalScreen, SectionTitle } from './MentorPortalUI';

function getReviewRating(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value;
}

export default function MentorReviewsScreen() {
  const portalQuery = useMentorPortalData();
  const profile = portalQuery.data?.profile ?? null;
  const reviewsQuery = useMentorReviews(Boolean(profile?.status === 'active'));
  const reviews = reviewsQuery.data || [];
  const summary = summarizeReviews(reviews);

  if (portalQuery.isLoading || reviewsQuery.isLoading) return <LoadingState label="Đang tải đánh giá..." />;

  if (!profile || profile.status !== 'active') {
    return (
      <PortalScreen title="Đánh giá">
        <EmptyState icon={Star} title="Portal chưa mở" description="Hồ sơ mentor cần active trước khi xem đánh giá." />
      </PortalScreen>
    );
  }

  return (
    <PortalScreen
      title="Đánh giá"
      subtitle="Theo dõi phản hồi học viên gửi sau các buổi tư vấn."
      refreshing={reviewsQuery.isRefetching}
      onRefresh={() => reviewsQuery.refetch()}
    >
      <View style={styles.statGrid}>
        <MetricCard icon={Star} label="Điểm trung bình" value={`${summary.average ? summary.average.toFixed(1) : '--'}/5`} color="#F59E0B" />
        <MetricCard icon={Users} label="Tổng đánh giá" value={String(summary.total)} color="#38BDF8" />
        <MetricCard icon={Star} label="Đánh giá 5 sao" value={String(summary.fiveStarCount)} color="#FBBF24" />
        <MetricCard icon={ThumbsUp} label="Tỷ lệ giới thiệu" value={summary.recommendRate === null ? '--' : `${summary.recommendRate}%`} color="#22C55E" />
      </View>

      <InfoCard>
        <SectionTitle title="Phản hồi học viên" meta="Các đánh giá đã gửi sau khi buổi tư vấn hoàn thành." />
        {reviews.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có đánh giá nào.</Text>
        ) : (
          <View style={styles.reviewList}>
            {reviews.map((review, index) => {
              const rating = getReviewRating(review.overallRatings?.overallSatisfaction);
              const reviewer =
                review.isAnonymous === true
                  ? 'Học viên ẩn danh'
                  : typeof review.reviewerId === 'object'
                    ? review.reviewerId?.name || 'Học viên'
                    : 'Học viên';
              const metrics = [
                ['Giao tiếp', review.overallRatings?.communication],
                ['Chuyên môn', review.overallRatings?.expertise],
                ['Hữu ích', review.overallRatings?.helpfulness],
                ['Chuyên nghiệp', review.overallRatings?.professionalism],
                ['Đúng giờ', review.overallRatings?.punctuality],
              ].filter((metric): metric is [string, number] => typeof metric[1] === 'number');

              return (
                <View key={review.id || review._id || `${review.createdAt || 'review'}-${index}`} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewRating}>{rating ? rating.toFixed(1) : '--'}/5</Text>
                      <Text style={styles.reviewer}>{reviewer}</Text>
                    </View>
                    <Text style={styles.reviewDate}>{formatDateTime(review.createdAt)}</Text>
                  </View>
                  <Text style={styles.comment}>{review.writtenFeedback?.comment || 'Học viên chưa để lại nhận xét.'}</Text>
                  {metrics.length ? (
                    <View style={styles.metricRow}>
                      {metrics.map(([label, value]) => (
                        <Text key={label} style={styles.metricText}>{label}: {value}/5</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
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
  reviewList: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    paddingTop: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  reviewRating: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewer: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  reviewDate: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  comment: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  metricText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
