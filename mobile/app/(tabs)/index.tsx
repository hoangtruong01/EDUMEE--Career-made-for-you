import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
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
  LogOut
} from 'lucide-react-native';

import { useRouter } from 'expo-router';

import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from '../../src/services/api';

export default function TabOneScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setUserProfile(response.data.data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await setAuthToken(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
    fontSize: 16,
    color: COLORS.muted,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.md,
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
    fontSize: 14,
  },
  heroIcon: {
    opacity: 0.8,
    transform: [{ rotate: '15deg' }],
  },
  sectionTitle: {
    fontSize: 20,
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
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  bentoCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  footerSpace: {
    height: 80,
  },
});
