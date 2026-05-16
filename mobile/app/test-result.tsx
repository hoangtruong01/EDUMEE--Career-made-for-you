import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../src/theme';
import { GlassView } from '../src/components/GlassView';
import { Svg, Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { CheckCircle2, ChevronRight, Share2, Home } from 'lucide-react-native';
import { api } from '../src/services/api';

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.8;
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

export default function TestResultScreen() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, []);

  const fetchResult = async () => {
    try {
      const response = await api.get('/career-fit-results/my-results', {
        params: { limit: 1 }
      });
      if (response.data && response.data.data.length > 0) {
        setResult(response.data.data[0]);
      }
    } catch (error) {
      console.error('Fetch result error:', error);
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
    if (!result?.dimensionScores) return null;

    const scores = RIASEC_ORDER.map(key => result.dimensionScores[key] || 0);
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
                stroke="rgba(255, 255, 255, 0.1)"
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
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <Polygon
            points={points}
            fill="rgba(56, 189, 248, 0.4)"
            stroke={COLORS.primary}
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
                fontSize="10"
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Không tìm thấy kết quả. Vui lòng làm bài trắc nghiệm.</Text>
        <Pressable onPress={() => router.replace('/holland-test')} style={styles.retryButton}>
          <Text style={styles.retryText}>Làm trắc nghiệm ngay</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <CheckCircle2 size={48} color={COLORS.secondary} />
        <Text style={styles.title}>Hoàn tất phân tích!</Text>
        <Text style={styles.subtitle}>AI đã xác định hồ sơ nghề nghiệp của bạn</Text>
      </View>

      <GlassView style={styles.chartCard}>
        <Text style={styles.cardTitle}>Biểu đồ RIASEC</Text>
        {renderRadarChart()}
      </GlassView>

      <Text style={styles.sectionTitle}>Nghề nghiệp phù hợp nhất</Text>
      
      <GlassView style={styles.careerCard}>
        <View style={styles.careerHeader}>
          <Text style={styles.careerTitle}>{result.careerTitle}</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{Math.round(result.overallFitScore)}%</Text>
          </View>
        </View>
        <Text style={styles.careerDesc}>{result.aiExplanation?.substring(0, 150)}...</Text>
        <Pressable style={styles.detailButton}>
          <Text style={styles.detailButtonText}>Xem chi tiết lộ trình</Text>
          <ChevronRight size={16} color={COLORS.primary} />
        </Pressable>
      </GlassView>

      <View style={styles.actionGroup}>
        <Pressable style={[styles.actionButton, { backgroundColor: COLORS.primary }]} onPress={() => router.replace('/(tabs)')}>
          <Home size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Về Trang chủ</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Share2 size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Chia sẻ</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  content: {
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  chartCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  careerCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  careerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  careerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    flex: 1,
  },
  scoreBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  scoreText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 14,
  },
  careerDesc: {
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  retryText: {
    color: COLORS.foreground,
    fontWeight: '700',
  }
});
