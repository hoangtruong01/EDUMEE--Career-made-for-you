import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { Svg, Polygon, Line, Text as SvgText } from 'react-native-svg';
import { 
  User, 
  CreditCard, 
  Wallet, 
  Award, 
  FileDown, 
  Sparkles, 
  ChevronRight, 
  Compass, 
  LogOut, 
  Activity 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api, setAuthToken } from '../../src/services/api';

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.7;
const CENTER = CHART_SIZE / 2;
const RADIUS_CHART = (CHART_SIZE / 2) * 0.7;

const RIASEC_LABELS = {
  realistic: 'Thực tế',
  investigative: 'Nghiên cứu',
  artistic: 'Nghệ thuật',
  social: 'Xã hội',
  enterprising: 'Kinh doanh',
  conventional: 'Nghiệp vụ'
};

const RIASEC_ORDER = [
  'realistic',
  'investigative',
  'artistic',
  'social',
  'enterprising',
  'conventional'
];

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfileAndResult();
  }, []);

  const fetchProfileAndResult = async () => {
    try {
      const userRes = await api.get('/users/me');
      setUserData(userRes.data.data);

      const resultRes = await api.get('/career-fit-results/my-results', {
        params: { limit: 1 }
      });
      if (resultRes.data && resultRes.data.data.length > 0) {
        setTestResult(resultRes.data.data[0]);
      }
    } catch (error) {
      console.error('Fetch profile/result error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCoordinates = (index: number, score: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (score / 100) * RADIUS_CHART;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  };

  const renderRadarChart = () => {
    if (!testResult?.dimensionScores) {
      return (
        <View style={styles.noChartContainer}>
          <Compass size={40} color={COLORS.muted} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.noChartText}>Bạn chưa làm bài trắc nghiệm Holland.</Text>
          <TouchableOpacity 
            style={styles.takeTestBtn}
            onPress={() => router.push('/holland-test')}
          >
            <Text style={styles.takeTestText}>Làm ngay</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const scores = RIASEC_ORDER.map(key => testResult.dimensionScores[key] || 0);
    const points = scores.map((score, i) => {
      const coords = getCoordinates(i, score);
      return `${coords.x},${coords.y}`;
    }).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          {/* Grid lines */}
          {[20, 40, 60, 80, 100].map((level) => {
            const gridPoints = RIASEC_ORDER.map((_, i) => {
              const coords = getCoordinates(i, level);
              return `${coords.x},${coords.y}`;
            }).join(' ');
            return (
              <Polygon
                key={level}
                points={gridPoints}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Axis lines */}
          {RIASEC_ORDER.map((_, i) => {
            const coords = getCoordinates(i, 100);
            return (
              <Line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={coords.x}
                y2={coords.y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <Polygon
            points={points}
            fill="rgba(139, 92, 246, 0.3)"
            stroke="#8B5CF6"
            strokeWidth="2"
          />

          {/* Labels */}
          {RIASEC_ORDER.map((key, i) => {
            const coords = getCoordinates(i, 115);
            return (
              <SvgText
                key={key}
                x={coords.x}
                y={coords.y}
                fill={COLORS.muted}
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {RIASEC_LABELS[key as keyof typeof RIASEC_LABELS]}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  const handleExportPDF = () => {
    const msg = 'Đang chuẩn bị xuất báo cáo PDF. Vui lòng check email hoặc thông báo khi sẵn sàng.';
    Platform.OS === 'web' ? alert(msg) : Alert.alert('Thông báo', msg);
  };

  const handleLogout = async () => {
    try {
      await setAuthToken(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.header}>
          <Image 
            source={{ uri: userData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }} 
            style={styles.avatar} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData?.name || 'Học viên EDUMEE'}</Text>
            <Text style={styles.userEmail}>{userData?.email || 'user@edumee.vn'}</Text>
            <View style={styles.badge}>
              <Award size={12} color={COLORS.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>Gói Thành viên</Text>
            </View>
          </View>
        </View>

        {/* RIASEC Chart Card */}
        <GlassView style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Hồ sơ tính cách RIASEC</Text>
          {renderRadarChart()}
        </GlassView>

        {/* Wallet & Credits */}
        <GlassView style={styles.sectionCard}>
          <View style={styles.cardHeaderWithIcon}>
            <Wallet size={20} color={COLORS.primary} />
            <Text style={styles.cardTitleInline}>Ví & Hạn mức AI</Text>
          </View>
          
          <View style={styles.walletRow}>
            <View>
              <Text style={styles.walletLabel}>Số dư ví EDUMEE</Text>
              <Text style={styles.walletBalance}>150,000đ</Text>
            </View>
            <TouchableOpacity style={styles.depositBtn}>
              <Text style={styles.depositText}>Nạp tiền</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <Text style={styles.quotaTitle}>Hạn mức sử dụng AI trong tháng</Text>
          
          <View style={styles.quotaRow}>
            <Text style={styles.quotaLabel}>Làm trắc nghiệm Holland</Text>
            <Text style={styles.quotaValue}>1 / 3 lượt</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '33%', backgroundColor: COLORS.primary }]} />
          </View>

          <View style={styles.quotaRow}>
            <Text style={styles.quotaLabel}>Tạo Lộ trình học AI (Roadmap)</Text>
            <Text style={styles.quotaValue}>2 / 5 lượt</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '40%', backgroundColor: COLORS.secondary }]} />
          </View>

          <View style={styles.quotaRow}>
            <Text style={styles.quotaLabel}>So sánh nghề nghiệp</Text>
            <Text style={styles.quotaValue}>3 / 10 lượt</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '30%', backgroundColor: '#10B981' }]} />
          </View>
        </GlassView>

        {/* AI Membership Plan Selection */}
        <GlassView style={styles.sectionCard}>
          <View style={styles.cardHeaderWithIcon}>
            <Sparkles size={20} color={COLORS.secondary} />
            <Text style={styles.cardTitleInline}>Gói thành viên Premium</Text>
          </View>
          <Text style={styles.planDesc}>Nâng cấp để nhận không giới hạn lượt tạo AI Roadmap và đặt lịch ưu tiên với các Hot Mentors.</Text>
          
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeText}>Khám phá gói Premium</Text>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
        </GlassView>

        {/* Actions List */}
        <View style={styles.actionList}>
          <TouchableOpacity onPress={handleExportPDF} style={styles.actionRow}>
            <View style={styles.actionLeft}>
              <FileDown size={20} color={COLORS.muted} />
              <Text style={styles.actionLabel}>Xuất báo cáo PDF RIASEC</Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={[styles.actionRow, { borderBottomWidth: 0 }]}>
            <View style={styles.actionLeft}>
              <LogOut size={20} color="#EF4444" />
              <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Đăng xuất</Text>
            </View>
            <ChevronRight size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  badgeText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardTitleInline: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  noChartContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noChartText: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  takeTestBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  takeTestText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 13,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  walletLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: 2,
  },
  depositBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  depositText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.md,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quotaLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  quotaValue: {
    fontSize: 12,
    color: COLORS.foreground,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    marginBottom: SPACING.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  planDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  upgradeBtn: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionList: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: SPACING.md,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  footerSpace: {
    height: 100,
  },
});
