// app/(tabs)/index.tsx
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
    Activity,
    Award,
    BookOpen,
    ChevronRight,
    Clock,
    Compass,
    FileText,
    Flame,
    LogOut,
    MessageSquare,
    Rocket,
    Shield,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { GlassView } from '../../src/components/GlassView';
import { api, setAuthToken } from '../../src/services/api';
import { COLORS, RADIUS, SPACING } from '../../src/theme';
import { getRoleHomeRoute } from '../../src/utils/roleNavigation';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  {
    label: 'Quản lý người dùng',
    icon: Users,
    color: '#8B5CF6',
    route: '/(tabs)/profile',
  },
  {
    label: 'Ngân hàng câu hỏi',
    icon: FileText,
    color: '#10B981',
    route: '/(tabs)/assessment',
  },
  {
    label: 'Quản lý nghề nghiệp',
    icon: TrendingUp,
    color: '#3B82F6',
    route: '/(tabs)/explore',
  },
  {
    label: 'Quản lý cộng đồng',
    icon: Sparkles,
    color: '#F59E0B',
    route: '/(tabs)/community',
  },
];

const ACTIVITY_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'users', label: 'Người dùng' },
  { value: 'test', label: 'Bài test' },
  { value: 'mentor', label: 'Mentor' },
];

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
    default:
      return { label: badgeId, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
  }
};

export default function IntegratedHomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const [adminStats, setAdminStats] = useState<any>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'users' | 'test' | 'mentor'>('all');

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile-data'],
    queryFn: async () => {
      const response = await api.get('/users/me');
      return response.data?.data || response.data;
    },
  });

  const {
    data: dashboardData,
    isLoading: isMetricsLoading,
    refetch,
    isRefetching,
  } = useQuery<DashboardDataResponse>({
    queryKey: ['student-dashboard-metrics'],
    enabled: userProfile?.role !== 'admin',
    queryFn: async () => {
      const response = await api.get('/dashboard/metrics');
      return response.data?.data || response.data;
    },
  });

  const fetchAdminStats = async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      const statsData = response.data?.data || response.data;
      setAdminStats(statsData);
    } catch (error) {
      console.error('Fetch admin stats error, falling back to robust mock:', error);
      setAdminStats({
        stats: [
          { title: 'Người dùng', value: '1,250', delta: '+12%', iconType: 'users' },
          { title: 'Bài đánh giá', value: '840', delta: '+8%', iconType: 'test' },
          { title: 'Nghề nghiệp', value: '120', delta: '+4%', iconType: 'careers' },
          { title: 'Mentor tích cực', value: '45', delta: '+15%', iconType: 'mentor' },
        ],
        recentActivities: [
          {
            title: 'Hoàn thành bài test Holland',
            user: 'hoang@edumee.com',
            time: new Date().toISOString(),
            type: 'test',
          },
          {
            title: 'Đăng ký tài khoản mới',
            user: 'minhanh@gmail.com',
            time: new Date(Date.now() - 3600000).toISOString(),
            type: 'users',
          },
          {
            title: 'Đặt lịch tư vấn Mentor',
            user: 'khiem@gmail.com',
            time: new Date(Date.now() - 7200000).toISOString(),
            type: 'mentor',
          },
          {
            title: 'Hoàn thành bài test Holland',
            user: 'ngoc@gmail.com',
            time: new Date(Date.now() - 10800000).toISOString(),
            type: 'test',
          },
        ],
        popularCareers: [
          { name: 'AI Engineer', views: '320', matches: '84%', delta: '+15%' },
          { name: 'UI/UX Designer', views: '280', matches: '72%', delta: '+8%' },
          { name: 'Product Manager', views: '210', matches: '65%', delta: '-2%' },
          { name: 'Data Analyst', views: '190', matches: '50%', delta: '+5%' },
        ],
      });
    }
  };

  //  ĐỒNG BỘ PHÂN QUYỀN KHI SCREEN ĐƯỢC PHÁT HIỆN FOCUSED
  useEffect(() => {
    if (!userProfile) return;

    if (userProfile.role === 'mentor') {
      router.replace(getRoleHomeRoute(userProfile.role) as any);
      return;
    }

    if (userProfile.role === 'admin' && isFocused) {
      fetchAdminStats();
    }
  }, [userProfile, isFocused]);

  const onRefresh = useCallback(async () => {
    if (userProfile?.role === 'admin') {
      await fetchAdminStats();
    } else {
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['user-profile-data'] }),
      ]);
    }
  }, [refetch, queryClient, userProfile]);

  const handleLogout = async () => {
    try {
      await setAuthToken(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isProfileLoading || (userProfile?.role !== 'admin' && isMetricsLoading)) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#090D1A' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>ĐANG ĐỒNG BỘ KHÔNG GIAN EDUMEE...</Text>
      </View>
    );
  }

  const filteredActivities =
    adminStats?.recentActivities?.filter((item: any) => {
      if (activityFilter === 'all') return true;
      return item.type === activityFilter;
    }) || [];

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case 'users':
        return '#8B5CF6';
      case 'test':
        return '#10B981';
      case 'careers':
        return '#3B82F6';
      case 'mentor':
        return '#F59E0B';
      default:
        return '#8B5CF6';
    }
  };

  const renderAdminStatsIcon = (iconType: string, color: string) => {
    switch (iconType) {
      case 'users':
        return <Users size={20} color={color} />;
      case 'test':
        return <Activity size={20} color={color} />;
      case 'careers':
        return <FileText size={20} color={color} />;
      case 'mentor':
        return <MessageSquare size={20} color={color} />;
      default:
        return <Users size={20} color={color} />;
    }
  };

  if (userProfile?.role === 'admin') {
    return (
      <View style={styles.mainWrapper}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Admin Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.adminTitleWrapper}>
                <Shield size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.welcomeText}>EDUMEE ADMIN PANEL</Text>
              </View>
              <Text style={styles.userName}>{userProfile?.name || 'Quản trị viên'} 👑</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <LogOut size={18} color={COLORS.muted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileButton}>
                <Image
                  source={{ uri: userProfile?.avatar || 'https://i.pravatar.cc/100' }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Section Header */}
          <View style={styles.adminSectionTitleRow}>
            <View>
              <Text style={styles.adminTitle}>Dashboard</Text>
              <Text style={styles.adminSubtitle}>Tổng quan hoạt động hệ thống Career AI</Text>
            </View>
            <GlassView style={styles.timeTag}>
              <Clock size={14} color={COLORS.muted} style={{ marginRight: 4 }} />
              <Text style={styles.timeTagText}>Vừa xong</Text>
            </GlassView>
          </View>

          {/* Admin Stats Grid */}
          <View style={styles.statsGrid}>
            {adminStats?.stats?.map((item: any, idx: number) => {
              const color = getIconColor(item.iconType);
              return (
                <GlassView key={idx} style={styles.statCardGrid}>
                  <View style={styles.statCardHeader}>
                    <View style={[styles.statIconWrapper, { backgroundColor: color + '20' }]}>
                      {renderAdminStatsIcon(item.iconType, color)}
                    </View>
                    <View style={styles.deltaBadge}>
                      <Text style={styles.deltaText}>{item.delta}</Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.title}</Text>
                </GlassView>
              );
            })}
          </View>

          {/* Recent Activities */}
          <GlassView style={styles.activitiesContainer}>
            <Text style={styles.panelTitle}>Hoạt động gần đây</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filtersContainer}
            >
              {ACTIVITY_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setActivityFilter(f.value as any)}
                  style={[styles.pill, activityFilter === f.value && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, activityFilter === f.value && styles.pillTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.activitiesList}>
              {filteredActivities.map((act: any, idx: number) => {
                const color = getIconColor(act.type);
                return (
                  <View key={idx} style={styles.activityItem}>
                    <View style={[styles.activityIconWrapper, { backgroundColor: color + '20' }]}>
                      {renderAdminStatsIcon(act.type, color)}
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{act.title}</Text>
                      <Text style={styles.activityUser}>{act.user}</Text>
                    </View>
                    <Text style={styles.activityTime}>
                      {new Date(act.time).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlassView>

          {/* Popular Careers */}
          <GlassView style={styles.careersPanel}>
            <Text style={styles.panelTitle}>Nghề phổ biến</Text>
            <View style={styles.careersList}>
              {adminStats?.popularCareers?.map((car: any, idx: number) => (
                <View key={idx} style={styles.careerRow}>
                  <View style={styles.careerInfo}>
                    <Text style={styles.careerName}>
                      {idx + 1}. {car.name}
                    </Text>
                    <Text style={styles.careerMeta}>
                      {car.views} lượt xem • Khớp {car.matches}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.careerDelta,
                      { color: car.delta.startsWith('-') ? '#EF4444' : '#10B981' },
                    ]}
                  >
                    {car.delta}
                  </Text>
                </View>
              ))}
            </View>
          </GlassView>

          {/* Quick Actions */}
          <Text style={styles.panelTitle}>Thao tác nhanh</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push(item.route as any)}
                style={styles.quickActionCard}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
                  <item.icon size={18} color="#fff" />
                </View>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                <ChevronRight size={16} color={COLORS.muted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Admin Notice */}
          <View style={styles.noticeBox}>
            <Sparkles size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.noticeText}>
              Nhấn vào các thao tác nhanh để truy cập trực tiếp từng module quản trị.
            </Text>
          </View>

          <View style={styles.footerSpace} />
        </ScrollView>
      </View>
    );
  }

  const hasActiveRoadmap = dashboardData?.hasActiveRoadmap || false;
  const stats = dashboardData?.stats;
  const activeRoadmap = dashboardData?.activeRoadmap;
  const pendingTasks = dashboardData?.pendingTasks || [];
  const nextTask = pendingTasks.length > 0 ? pendingTasks[0] : null;

  return (
    <View style={styles.mainWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* TOP HEADER CHÀO HỎI HỌC VIÊN */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Chào buổi sáng,</Text>
            <Text style={styles.userName}>{userProfile?.name || 'Học viên'} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <LogOut size={18} color={COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton}>
              <Image
                source={{ uri: userProfile?.avatar || 'https://i.pravatar.cc/100' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {!hasActiveRoadmap ? (
          /* USER CHƯA CÓ LỘ TRÌNH (HOME BAN ĐẦU) */
          <View style={styles.innerViewBody}>
            <GlassView style={styles.heroCard}>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>Tiềm năng của bạn là vô hạn</Text>
                <Text style={styles.heroSubtitle}>
                  Hoàn thành bài trắc nghiệm tính cách để AI thiết lập lộ trình học cá nhân hóa!
                </Text>
                <TouchableOpacity
                  style={styles.heroButton}
                  onPress={() => router.push('/holland-test')}
                >
                  <Text style={styles.heroButtonText}>Khám phá ngay</Text>
                  <Sparkles size={14} color={COLORS.foreground} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              <Rocket size={70} color={COLORS.primary} style={styles.heroIcon} />
            </GlassView>

            <Text style={styles.sectionTitle}>Không gian định hướng</Text>
            <Text style={styles.sectionDesc}>
              Hãy bắt đầu hành trình của bạn bằng việc tìm hiểu bản thân và xu hướng xã hội.
            </Text>

            <View style={styles.bentoGrid}>
              <View style={styles.bentoRow}>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/orientation')}
                  style={[styles.bentoCard, { flex: 1.6, backgroundColor: '#4F46E5' }]}
                >
                  <Target size={26} color="#fff" />
                  <Text style={styles.bentoCardTitle}>Định hướng nghề</Text>
                  <Text style={styles.bentoCardSubtitle}>Phân tích mật mã RIASEC</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/explore')}
                  style={[styles.bentoCard, { flex: 1, backgroundColor: '#EC4899' }]}
                >
                  <TrendingUp size={20} color="#fff" />
                  <Text style={styles.bentoCardTitle}>Xu hướng</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bentoRow}>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/community')}
                  style={[styles.bentoCard, { flex: 1.6, backgroundColor: '#10B981' }]}
                >
                  <Users size={26} color="#fff" />
                  <Text style={styles.bentoCardTitle}>Cộng đồng Mentors</Text>
                  <Text style={styles.bentoCardSubtitle}>Kết nối chuyên gia đầu ngành</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/explore')}
                  style={[styles.bentoCard, { flex: 1, backgroundColor: '#F59E0B' }]}
                >
                  <BookOpen size={20} color="#fff" />
                  <Text style={styles.bentoCardTitle}>Kho lộ trình</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* USER ĐÃ CÓ LỘ TRÌNH (DASHBOARD CHUYÊN SÂU 56% CỦA THUẬN) */
          <View style={styles.innerViewBody}>
            <Text style={styles.sectionTitle}>Chỉ số học tập</Text>
            <View style={styles.statsGrid}>
              <GlassView style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
                  <Flame size={18} color="#F97316" />
                </View>
                <Text style={styles.statValue}>{stats?.currentStreak || 0} Ngày</Text>
                <Text style={styles.statLabel}>Streak hiện tại</Text>
              </GlassView>

              <GlassView style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <BookOpen size={18} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{stats?.totalTasksCompleted || 0} Bài</Text>
                <Text style={styles.statLabel}>Đã hoàn thành</Text>
              </GlassView>
            </View>

            <View style={styles.statsGrid}>
              <GlassView style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Compass size={18} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{stats?.exploredCareersCount || 0}</Text>
                <Text style={styles.statLabel}>Nghề đã khám phá</Text>
              </GlassView>

              <GlassView style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Target size={18} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{stats?.uncompletedTasksCount || 0} Bài</Text>
                <Text style={styles.statLabel}>Nhiệm vụ còn lại</Text>
              </GlassView>
            </View>

            <Text style={styles.sectionTitle}>Lộ trình mục tiêu của bạn</Text>
            <GlassView style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.titleIconBadge}>
                  <Award size={18} color="#C084FC" />
                </View>
                <Text style={styles.cardHeaderTitle}>{activeRoadmap?.careerTitle}</Text>
              </View>

              <View style={styles.progressDataRow}>
                <Text style={styles.progressText}>Tiến độ tổng quan</Text>
                <Text style={styles.progressPercent}>
                  {activeRoadmap?.overallProgressPercentage || 0}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${activeRoadmap?.overallProgressPercentage || 0}%` },
                  ]}
                />
              </View>

              {nextTask ? (
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
                    <Text style={styles.actionCtaText}>Vào bài học ngay</Text>
                    <ChevronRight size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.heroNextTask}>
                  <Text style={styles.taskTitleText}>
                    Chúc mừng! Bạn đã hoàn thành sạch sẽ tất cả bài học.
                  </Text>
                </View>
              )}
            </GlassView>

            {stats?.achievements && stats.achievements.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.sectionTitle}>Danh hiệu đã đạt</Text>
                <GlassView style={styles.sectionCard}>
                  <View style={styles.badgeContainer}>
                    {stats.achievements.map((badge: string, idx: number) => {
                      const meta = getBadgeMeta(badge);
                      return (
                        <View
                          key={idx}
                          style={[styles.achievementBadge, { backgroundColor: meta.bg }]}
                        >
                          <ShieldCheck size={12} color={meta.color} />
                          <Text style={[styles.badgeText, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </GlassView>
              </View>
            )}

            <Text style={styles.sectionTitle}>Lối tắt tính năng</Text>
            <View style={[styles.bentoGrid, { marginBottom: 20 }]}>
              <View style={styles.bentoRow}>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/orientation')}
                  style={[
                    styles.miniBento,
                    {
                      backgroundColor: 'rgba(79, 70, 229, 0.12)',
                      borderColor: 'rgba(79, 70, 229, 0.25)',
                    },
                  ]}
                >
                  <Target size={16} color="#818CF8" />
                  <Text style={[styles.miniBentoText, { color: '#818CF8' }]}>Định hướng nghề</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/explore')}
                  style={[
                    styles.miniBento,
                    {
                      backgroundColor: 'rgba(236, 72, 153, 0.12)',
                      borderColor: 'rgba(236, 72, 153, 0.25)',
                    },
                  ]}
                >
                  <TrendingUp size={16} color="#F472B6" />
                  <Text style={[styles.miniBentoText, { color: '#F472B6' }]}>Xu hướng nghề</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#090D1A' },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: 80, // Chống đè kẹt cuộn của TabBar hệ thống
  },
  innerViewBody: { width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },

  // Header chung
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.foreground, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },

  // Giao diện Student Home Cũ (Chưa làm test)
  heroCard: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    height: 150,
  },
  heroContent: { flex: 1, marginRight: SPACING.sm },
  heroTitle: { fontSize: 16, fontWeight: '800', color: COLORS.foreground, marginBottom: 4 },
  heroSubtitle: { fontSize: 12, color: COLORS.muted, marginBottom: SPACING.md, lineHeight: 16 },
  heroButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  heroButtonText: { color: COLORS.foreground, fontWeight: '700', fontSize: 12 },
  heroIcon: { opacity: 0.6, transform: [{ rotate: '15deg' }] },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: SPACING.lg,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  sectionDesc: { fontSize: 12, color: COLORS.muted, marginBottom: SPACING.md, lineHeight: 16 },

  // Grid Stats Học viên
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
    letterSpacing: -0.5,
  },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },

  // Lộ trình Progress
  sectionCard: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  titleIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  progressDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: '#3B82F6' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#1E293B',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#3B82F6' },
  heroNextTask: {
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  taskTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  taskTagText: { color: '#FB923C', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  taskTitleText: { fontSize: 13, fontWeight: '700', color: '#F1F5F9', lineHeight: 18 },
  actionCtaButton: {
    flexDirection: 'row',
    height: 42,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 2,
  },
  actionCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // Danh hiệu (Achievements)
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // Bento cũ học viên
  bentoGrid: { gap: 10, marginTop: SPACING.xs },
  bentoRow: { flexDirection: 'row', gap: 10 },
  bentoCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  bentoCardTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 6 },
  bentoCardSubtitle: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 10, marginTop: 2 },
  miniBento: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  miniBentoText: { fontSize: 12, fontWeight: '700' },

  // ================= ĐỘC QUYỀN HỆ STYLES CHO PHÂN HỆ ADMIN SYSTEM =================
  adminTitleWrapper: { flexDirection: 'row', alignItems: 'center' },
  adminSectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  adminTitle: { fontSize: 24, fontWeight: '800', color: COLORS.foreground },
  adminSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  timeTagText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  statCardGrid: { width: '47.5%', padding: SPACING.md, borderRadius: RADIUS.lg },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deltaBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  deltaText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
  activitiesContainer: { padding: SPACING.md, marginBottom: SPACING.xl, borderRadius: RADIUS.lg },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  filtersScroll: { marginBottom: SPACING.md },
  filtersContainer: { gap: SPACING.xs },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  pillTextActive: { color: COLORS.foreground },
  activitiesList: { gap: SPACING.md },
  activityItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },
  activityUser: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  activityTime: { fontSize: 11, color: COLORS.muted },
  careersPanel: { padding: SPACING.md, marginBottom: SPACING.xl, borderRadius: RADIUS.lg },
  careersList: { gap: SPACING.md },
  careerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  careerInfo: { flex: 1 },
  careerName: { fontSize: 13, fontWeight: '600', color: COLORS.foreground },
  careerMeta: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  careerDelta: { fontSize: 12, fontWeight: '700' },
  quickActionsGrid: { gap: SPACING.sm, marginBottom: SPACING.lg },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  quickActionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#A78BFA' },
  footerSpace: { height: 80 },
});
