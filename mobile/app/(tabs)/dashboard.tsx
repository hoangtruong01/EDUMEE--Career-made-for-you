// app/(tabs)/dashboard.tsx
import { api } from '@/src/services/api';
import { useTheme } from '@/src/theme/ThemeContext';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Award,
  BookOpen,
  ChevronRight,
  Compass,
  Flame,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../src/components/Button';
import { GlassView } from '../../src/components/GlassView';

const { width } = Dimensions.get('window');

// 🟢 ĐÃ THÊM: Định nghĩa các Interface kiểu dữ liệu chính xác theo cấu trúc DTO của Backend NestJS
interface DashboardStats {
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  exploredCareersCount: number;
  uncompletedTasksCount: number;
  achievements: string[];
}

interface CurrentLearningState {
  phaseTitle: string;
  taskTitle: string;
}

interface ActiveRoadmapSummary {
  roadmapId: string;
  careerTitle: string;
  overallProgressPercentage: number;
  completedCount: number;
  remainingCount: number;
  currentState: CurrentLearningState;
}

interface PendingTaskReminder {
  taskId: string;
  title: string;
  formatType: string;
  phaseTitle: string;
}

interface DashboardDataResponse {
  hasActiveRoadmap: boolean;
  stats: DashboardStats;
  activeRoadmap?: ActiveRoadmapSummary;
  pendingTasks: PendingTaskReminder[];
}

const getBadgeMeta = (badgeId: string) => {
  switch (badgeId) {
    case 'PHASE_LAUNCHER':
      return { label: 'Chiến Binh Khởi Động', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
    case 'PERFECT_SCORE':
      return { label: 'Điểm Số Tuyệt Đối', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.12)' };
    case 'SPEED_RUNNER':
      return { label: 'Siêu Tốc Độ', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.12)' };
    case 'EXPLORER_PRO':
      return { label: 'Thám Hiểm Bậc Thầy', color: '#34D399', bg: 'rgba(52, 211, 153, 0.12)' };
    case 'STREAK_MASTER':
      return { label: 'Kỷ Luật Thép', color: '#F87171', bg: 'rgba(248, 113, 113, 0.12)' };
    case 'ROADMAP_CONQUEROR':
      return { label: 'Phá Đảo Lộ Trình', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.16)' };
    default:
      return { label: badgeId, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
  }
};

export default function StudentDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isFocused = useIsFocused();

  // 🟢 ĐÃ FIX: Ép kiểu Generics <DashboardDataResponse> cho useQuery để bóc tách thuộc tính không bị báo lỗi Object rỗng
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<DashboardDataResponse>({
    queryKey: ['student-dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/metrics');
      return response.data?.data || response.data;
    },
  });

  useEffect(() => {
    if (isFocused) {
      refetch();
    }
  }, [isFocused]);

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#0F172A' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[styles.loadingText, { color: '#94A3B8' }]}>
          ĐANG ĐỒNG BỘ CHỈ SỐ HỌC TẬP...
        </Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#0F172A', padding: 24 }]}>
        <Text style={[styles.errorText, { color: '#EF4444' }]}>
          Gặp lỗi khi kết nối với máy chủ Backend.
        </Text>
        <Button title="Thử tải lại dữ liệu" onPress={() => refetch()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const { stats, activeRoadmap, pendingTasks, hasActiveRoadmap } = data;
  const nextTask = pendingTasks && pendingTasks.length > 0 ? pendingTasks[0] : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: '#0F172A' }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />
      }
    >
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeSub}>KHÔNG GIAN CỦA BẠN</Text>
        <Text style={styles.welcomeMain}>Bảng Chỉ Số Học Tập</Text>
      </View>

      <View style={styles.statsGrid}>
        <GlassView style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
            <Flame size={20} color="#F97316" />
          </View>
          <Text style={styles.statValue}>{stats?.currentStreak || 0} Ngày</Text>
          <Text style={styles.statLabel}>Streak hiện tại</Text>
        </GlassView>

        <GlassView style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <BookOpen size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{stats?.totalTasksCompleted || 0} Bài</Text>
          <Text style={styles.statLabel}>Đã hoàn thành</Text>
        </GlassView>
      </View>

      <View style={styles.statsGrid}>
        <GlassView style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Compass size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{stats?.exploredCareersCount || 0}</Text>
          <Text style={styles.statLabel}>Nghề đã khám phá</Text>
        </GlassView>

        <GlassView style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Target size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{stats?.uncompletedTasksCount || 0} Bài</Text>
          <Text style={styles.statLabel}>Nhiệm vụ còn lại</Text>
        </GlassView>
      </View>

      {hasActiveRoadmap && activeRoadmap ? (
        <GlassView style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleIconBadge}>
              <Award size={18} color="#C084FC" />
            </View>
            <Text style={styles.cardHeaderTitle}>{activeRoadmap.careerTitle}</Text>
          </View>

          <View style={styles.progressDataRow}>
            <Text style={styles.progressText}>Tiến độ tổng quan</Text>
            <Text style={styles.progressPercent}>
              {activeRoadmap.overallProgressPercentage || 0}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${activeRoadmap.overallProgressPercentage || 0}%` },
              ]}
            />
          </View>

          {nextTask && (
            <View style={styles.heroNextTask}>
              <View style={styles.taskTagRow}>
                <Zap size={12} color="#FB923C" />
                <Text style={styles.taskTagText}>BÀI HỌC TIẾP THEO</Text>
              </View>
              <Text style={styles.taskTitleText} numberOfLines={2}>
                {nextTask.title}
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/orientation')}
                style={styles.actionCtaButton}
              >
                <Text style={styles.actionCtaText}>Bứt phá lộ trình</Text>
                <ChevronRight size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </GlassView>
      ) : (
        <GlassView style={[styles.sectionCard, { alignItems: 'center', padding: 24 }]}>
          <Compass size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>Chưa có lộ trình hoạt động</Text>
          <Button
            title="Đến kho định hướng"
            onPress={() => router.push('/(tabs)/explore')}
            style={{ width: '100%', marginTop: 8 }}
          />
        </GlassView>
      )}

      {stats?.achievements && stats.achievements.length > 0 && (
        <GlassView style={[styles.sectionCard, { marginBottom: 60 }]}>
          <View style={styles.cardHeaderRow}>
            <Sparkles size={18} color="#FBBF24" />
            <Text style={styles.cardHeaderTitle}>Danh hiệu của bạn</Text>
          </View>
          <View style={styles.badgeContainer}>
            {stats.achievements.map((badge: string, idx: number) => {
              const meta = getBadgeMeta(badge);
              return (
                <View key={idx} style={[styles.achievementBadge, { backgroundColor: meta.bg }]}>
                  <ShieldCheck size={13} color={meta.color} />
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        </GlassView>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 🟢 ĐÃ FIX: Loại bỏ thuộc tính rác paddingHexagonal làm crash compiler TypeScript
  container: { flex: 1, paddingHorizontal: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  errorText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  welcomeSection: { marginTop: 28, marginBottom: 20 },
  welcomeSub: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 2 },
  welcomeMain: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: {
    padding: 8,
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  sectionCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 12,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  titleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  progressDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  progressPercent: { fontSize: 15, fontWeight: '800', color: '#3B82F6' },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#1E293B',
  },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#3B82F6' },
  heroNextTask: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  taskTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  taskTagText: { color: '#FB923C', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  taskTitleText: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', lineHeight: 20 },
  actionCtaButton: {
    flexDirection: 'row',
    height: 46,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 4,
  },
  actionCtaText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#FFFFFF' },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
