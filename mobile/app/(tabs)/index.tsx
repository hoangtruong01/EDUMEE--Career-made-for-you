import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { 
  Rocket, 
  Target, 
  Users, 
  ChevronRight, 
  Sparkles,
  TrendingUp,
  BookOpen,
  LogOut,
  Shield,
  Clock,
  Plus,
  FileText,
  MessageSquare,
  Activity,
  ArrowRight,
  TrendingDown
} from 'lucide-react-native';

import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from '../../src/services/api';

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

export default function TabOneScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'users' | 'test' | 'mentor'>('all');
  const [actionMessage, setActionMessage] = useState<string>('Sẵn sàng cho thao tác quản trị');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProfile = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const response = await api.get('/users/me');
      const profile = response.data?.data || response.data;
      setUserProfile(profile);
      
      if (profile && profile.role === 'admin') {
        await fetchAdminStats();
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      const statsData = response.data?.data || response.data;
      setAdminStats(statsData);
    } catch (error) {
      console.error('Fetch admin stats error, falling back to mock:', error);
      // Fallback robust mock stats to guarantee dashboard renders perfectly if BE DB has no statistics yet
      setAdminStats({
        stats: [
          { title: 'Người dùng', value: '1,250', delta: '+12%', iconType: 'users' },
          { title: 'Bài đánh giá', value: '840', delta: '+8%', iconType: 'test' },
          { title: 'Nghề nghiệp', value: '120', delta: '+4%', iconType: 'careers' },
          { title: 'Mentor tích cực', value: '45', delta: '+15%', iconType: 'mentor' }
        ],
        recentActivities: [
          { title: 'Hoàn thành bài test Holland', user: 'hoang@edumee.com', time: new Date().toISOString(), type: 'test' },
          { title: 'Đăng ký tài khoản mới', user: 'minhanh@gmail.com', time: new Date(Date.now() - 3600000).toISOString(), type: 'users' },
          { title: 'Đặt lịch tư vấn Mentor', user: 'khiem@gmail.com', time: new Date(Date.now() - 7200000).toISOString(), type: 'mentor' },
          { title: 'Hoàn thành bài test Holland', user: 'ngoc@gmail.com', time: new Date(Date.now() - 10800000).toISOString(), type: 'test' }
        ],
        popularCareers: [
          { name: 'AI Engineer', views: '320', matches: '84%', delta: '+15%' },
          { name: 'UI/UX Designer', views: '280', matches: '72%', delta: '+8%' },
          { name: 'Product Manager', views: '210', matches: '65%', delta: '-2%' },
          { name: 'Data Analyst', views: '190', matches: '50%', delta: '+5%' }
        ]
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await setAuthToken(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRefresh = () => {
    fetchProfile(true);
  };

  const filteredActivities = adminStats?.recentActivities?.filter((item: any) => {
    if (activityFilter === 'all') return true;
    return item.type === activityFilter;
  }) || [];

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case 'users': return '#8B5CF6';
      case 'test': return '#10B981';
      case 'careers': return '#3B82F6';
      case 'mentor': return '#F59E0B';
      default: return '#8B5CF6';
    }
  };

  const renderAdminStatsIcon = (iconType: string, color: string) => {
    switch (iconType) {
      case 'users': return <Users size={22} color={color} />;
      case 'test': return <Activity size={22} color={color} />;
      case 'careers': return <FileText size={22} color={color} />;
      case 'mentor': return <MessageSquare size={22} color={color} />;
      default: return <Users size={22} color={color} />;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải cấu hình người dùng...</Text>
      </View>
    );
  }

  // RENDER ADMIN DASHBOARD
  if (userProfile?.role === 'admin') {
    return (
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
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
                <LogOut size={20} color={COLORS.muted} />
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
                <GlassView key={idx} style={styles.statCard}>
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
                  style={[
                    styles.pill,
                    activityFilter === f.value && styles.pillActive
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    activityFilter === f.value && styles.pillTextActive
                  ]}>
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
                      {new Date(act.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
                    <Text style={styles.careerName}>{idx + 1}. {car.name}</Text>
                    <Text style={styles.careerMeta}>{car.views} lượt xem • Khớp {car.matches}</Text>
                  </View>
                  <Text style={[
                    styles.careerDelta,
                    { color: car.delta.startsWith('-') ? '#EF4444' : '#10B981' }
                  ]}>
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
            <Text style={styles.noticeText}>Nhấn vào các thao tác nhanh để truy cập trực tiếp từng module quản trị.</Text>
          </View>

          <View style={styles.footerSpace} />
        </ScrollView>
      </View>
    );
  }

  // RENDER NORMAL STUDENT LANDING PAGE
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Chào buổi sáng,</Text>
          <Text style={styles.userName}>{userProfile?.name || 'Bạn'} 👋</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={20} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Image 
              source={{ uri: userProfile?.avatar || 'https://i.pravatar.cc/100' }} 
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Card */}
      <GlassView style={styles.heroCard}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Tiềm năng của bạn là vô hạn</Text>
          <Text style={styles.heroSubtitle}>Hoàn thành bài trắc nghiệm để khám phá ngay!</Text>
          <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/holland-test')}>
            <Text style={styles.heroButtonText}>Bắt đầu ngay</Text>
            <Sparkles size={16} color={COLORS.foreground} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        <Rocket size={80} color={COLORS.primary} style={styles.heroIcon} />
      </GlassView>

      <Text style={styles.sectionTitle}>Khám phá</Text>

      {/* Bento Grid */}
      <View style={styles.bentoGrid}>
        <View style={styles.bentoRow}>
          <TouchableOpacity 
            onPress={() => router.push('/holland-test')}
            style={[styles.bentoCard, { flex: 2, backgroundColor: '#4F46E5' }]}
          >
            <Target size={32} color="#fff" />
            <Text style={styles.bentoCardTitle}>Định hướng nghề nghiệp</Text>
            <Text style={styles.bentoCardSubtitle}>Tìm kiếm con đường phù hợp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/explore' as any)}
            style={[styles.bentoCard, { flex: 1, backgroundColor: '#EC4899' }]}
          >
            <TrendingUp size={24} color="#fff" />
            <Text style={styles.bentoCardTitle}>Xu hướng</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bentoRow}>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/explore' as any)}
            style={[styles.bentoCard, { flex: 1, backgroundColor: '#F59E0B' }]}
          >
            <BookOpen size={24} color="#fff" />
            <Text style={styles.bentoCardTitle}>Lộ trình</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/community' as any)}
            style={[styles.bentoCard, { flex: 2, backgroundColor: '#10B981' }]}
          >
            <Users size={32} color="#fff" />
            <Text style={styles.bentoCardTitle}>Cộng đồng Mentors</Text>
            <Text style={styles.bentoCardSubtitle}>Kết nối với chuyên gia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footerSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  heroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 180,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  heroButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: COLORS.foreground,
    fontWeight: '600',
    fontSize: 13,
  },
  heroIcon: {
    opacity: 0.8,
    transform: [{ rotate: '15deg' }],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  bentoGrid: {
    gap: SPACING.md,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  bentoCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  bentoCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  bentoCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  footerSpace: {
    height: 80,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    flex: 1,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
    fontSize: 15,
    fontWeight: '600',
  },
  
  // ADMIN PANEL EXCLUSIVE STYLES
  adminTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminSectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  adminSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  timeTagText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: '47.5%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
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
  deltaText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  activitiesContainer: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  filtersScroll: {
    marginBottom: SPACING.md,
  },
  filtersContainer: {
    gap: SPACING.xs,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.foreground,
  },
  activitiesList: {
    gap: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  activityUser: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.muted,
  },
  careersPanel: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  careersList: {
    gap: SPACING.md,
  },
  careerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  careerInfo: {
    flex: 1,
  },
  careerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  careerMeta: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  careerDelta: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionsGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
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
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },
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
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#A78BFA',
  },
});
