// app/test-result.tsx
import { useRouter } from 'expo-router';
import { Brain, Briefcase, Compass, Map, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GlassView } from '../src/components/GlassView';
import { api } from '../src/services/api';
import { COLORS, RADIUS, SPACING } from '../src/theme';

interface MatchedCareer {
  id: string;
  _id?: string;
  title: string;
  matchPercentage: number;
  description?: string;
}

export default function TestResultScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creatingRoadmap, setCreatingRoadmap] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [selectedCareer, setSelectedCareer] = useState<MatchedCareer | null>(null);

  useEffect(() => {
    fetchTestResult();
  }, []);

  const fetchTestResult = async () => {
    try {
      // 🟢 Đồng bộ Web: Lấy kết quả Career Fit phân tích RIASEC mới nhất của học viên
      const response = await api.get('/career-fit-results/my-result');
      const data = response.data?.data || response.data;
      setResultData(data);

      // Mặc định chọn ngành có độ tương thích phần trăm cao nhất
      if (data?.matchedCareers?.length > 0) {
        setSelectedCareer(data.matchedCareers[0]);
      }
    } catch (error) {
      console.error('Fetch result error:', error);
      Alert.alert(
        'Thông báo',
        'Hệ thống đang hoàn tất phân tích AI. Vui lòng tải lại sau ít phút.',
      );
    } finally {
      setLoading(false);
    }
  };

  // 🛠️ TÍNH NĂNG 1: Bấm xem chi tiết nghề -> Điều hướng sang Tab Khám phá kèm từ khóa tìm kiếm
  const handleViewCareerDetail = (career: MatchedCareer) => {
    if (!career) return;

    // Đẩy sang Tab Khám phá (explore.tsx) và truyền tên ngành lên query params ngầm
    router.push({
      pathname: '/(tabs)/explore',
      params: { search: career.title },
    });
  };

  // 🛠️ TÍNH NĂNG 2: Gọi API khởi tạo Lộ trình học tập cá nhân hóa giống hệt bản Web
  const handleCreateRoadmap = async () => {
    if (!selectedCareer) {
      Alert.alert('Thông báo', 'Vui lòng chọn một ngành nghề để tạo lộ trình.');
      return;
    }

    setCreatingRoadmap(true);
    try {
      // Bắn request lên cổng learning-roadmaps để NestJS ra lệnh cho AI dựng Node bài học
      await api.post('/learning-roadmaps', {
        careerId: selectedCareer.id || selectedCareer._id,
        careerTitle: selectedCareer.title,
      });

      Alert.alert(
        'Thành công 🎉',
        `AI đã khởi tạo lộ trình học tập ngành ${selectedCareer.title} dành riêng cho bạn!`,
      );

      // 🟢 Đồng bộ Web: Tạo xong thì chuyển hướng học viên sang không gian học tập (Tab Định hướng)
      router.replace('/(tabs)/orientation');
    } catch (error: any) {
      console.error('Create roadmap error:', error);
      const msg =
        error.response?.data?.message || 'Không thể khởi tạo lộ trình lúc này. Vui lòng thử lại.';
      Alert.alert('Lỗi khởi tạo', msg);
    } finally {
      setCreatingRoadmap(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Đang đồng bộ kết quả phân tích AI...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Brain size={48} color={COLORS.secondary} />
        <Text style={styles.title}>KẾT QUẢ PHÂN TÍCH</Text>
        <Text style={styles.subtitle}>Bản đồ mật mã tính cách nghề nghiệp Holland</Text>
      </View>

      {/* Card nhóm tính cách trội RIASEC */}
      <GlassView style={styles.summaryCard}>
        <Sparkles size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
        <Text style={styles.summaryTitle}>Nhóm tính cách trội của bạn</Text>
        <Text style={styles.riasecCode}>{resultData?.primaryTraits?.join(' - ') || 'RIASEC'}</Text>
      </GlassView>

      <Text style={styles.sectionTitle}>Top ngành nghề phù hợp nhất</Text>
      <Text style={styles.sectionInfo}>
        Bấm vào từng ngành để chọn, xem chi tiết thị trường hoặc tạo lộ trình
      </Text>

      {/* Danh sách ngành nghề tương thích đổ bộ từ Backend */}
      <View style={styles.careerList}>
        {resultData?.matchedCareers?.map((career: MatchedCareer) => {
          const isSelected = selectedCareer?.title === career.title;
          return (
            <TouchableOpacity
              key={career.title}
              onPress={() => setSelectedCareer(career)}
              style={[styles.careerCard, isSelected && styles.careerCardActive]}
            >
              <View style={styles.careerRow}>
                <View style={styles.careerInfo}>
                  <Briefcase
                    size={18}
                    color={isSelected ? COLORS.primary : COLORS.muted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.careerName, isSelected && styles.careerNameActive]}>
                    {career.title}
                  </Text>
                </View>
                <View style={[styles.badge, isSelected && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>
                    {career.matchPercentage}% khớp
                  </Text>
                </View>
              </View>

              {/* Hộp mở rộng thông tin khi học viên click chọn ngành */}
              {isSelected && (
                <View style={styles.detailBox}>
                  <Text style={styles.descriptionText} numberOfLines={3}>
                    {career.description ||
                      'Ngành nghề có triển vọng phát triển cao dựa trên thế mạnh và mô hình tính cách RIASEC của bạn.'}
                  </Text>

                  {/* Cổng bấm xem chi tiết: Kích hoạt hàm điều hướng sang Tab Khám phá ngành */}
                  <TouchableOpacity
                    onPress={() => handleViewCareerDetail(career)}
                    style={styles.viewDetailLink}
                  >
                    <Text style={styles.viewDetailLinkText}>
                      Xem chi tiết thị trường & mức lương
                    </Text>
                    <Compass size={14} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 🔮 NÚT CỐT LÕI: Kích hoạt AI tạo lộ trình cá nhân hóa */}
      {selectedCareer && (
        <TouchableOpacity
          onPress={handleCreateRoadmap}
          disabled={creatingRoadmap}
          style={[styles.roadmapButton, creatingRoadmap && styles.disabledBtn]}
        >
          {creatingRoadmap ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.roadmapButtonText}>
                Tạo lộ trình học tập cho: {selectedCareer.title}
              </Text>
              <Map size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SPACING.lg, paddingTop: 60, paddingBottom: 40 },
  loadingText: { color: COLORS.muted, marginTop: SPACING.md, fontSize: 14 },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.foreground,
    letterSpacing: 2,
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.sm,
  },
  summaryCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  riasecCode: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.foreground, marginBottom: 2 },
  sectionInfo: { fontSize: 12, color: COLORS.muted, marginBottom: SPACING.md },
  careerList: { gap: SPACING.sm, marginBottom: SPACING.xxl },
  careerCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  careerCardActive: {
    borderColor: 'rgba(56, 189, 248, 0.3)',
    backgroundColor: 'rgba(56, 189, 248, 0.04)',
  },
  careerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  careerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  careerName: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
  careerNameActive: { color: COLORS.foreground, fontWeight: '700' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgeActive: { backgroundColor: COLORS.primary },
  badgeText: { fontSize: 11, fontWeight: '600', color: COLORS.muted },
  badgeTextActive: { color: COLORS.foreground, fontWeight: '700' },
  detailBox: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  descriptionText: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  viewDetailLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  viewDetailLinkText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  roadmapButton: {
    height: 56,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: { opacity: 0.6 },
  roadmapButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
