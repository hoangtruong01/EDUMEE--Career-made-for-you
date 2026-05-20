import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { Search, Sparkles, SlidersHorizontal, ArrowRight, Award } from 'lucide-react-native';
import { api } from '../../src/services/api';

const FILTER_PILLS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'match', label: 'Phù hợp nhất' },
  { id: 'ai', label: 'Xu hướng AI' },
  { id: 'salary', label: 'Lương cao' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [careers, setCareers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCategoryDisplayName = (category: string) => {
    const cat = String(category).toLowerCase();
    switch (cat) {
      case 'technology': return 'Công nghệ thông tin';
      case 'healthcare': return 'Y tế & Sức khỏe';
      case 'finance': return 'Tài chính & Đầu tư';
      case 'education': return 'Giáo dục & Đào tạo';
      case 'creative': return 'Thiết kế & Sáng tạo';
      case 'business': return 'Kinh doanh & Quản lý';
      case 'engineering': return 'Kỹ thuật & Công nghệ';
      case 'science': return 'Nghiên cứu khoa học';
      case 'legal': return 'Pháp lý & Luật';
      case 'sales_marketing': return 'Sales & Marketing';
      case 'social_services': return 'Dịch vụ xã hội';
      default: return category || 'Khác';
    }
  };

  const fetchCareers = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // 1. Fetch all active careers
      const careersResponse = await api.get('/careers?limit=100');
      let careersData: any[] = [];
      if (careersResponse.data) {
        if (Array.isArray(careersResponse.data)) {
          careersData = careersResponse.data;
        } else if (careersResponse.data.success && careersResponse.data.data) {
          const innerData = careersResponse.data.data;
          careersData = Array.isArray(innerData) 
            ? innerData 
            : (Array.isArray(innerData.data) ? innerData.data : []);
        } else if (careersResponse.data.data) {
          const innerData = careersResponse.data.data;
          careersData = Array.isArray(innerData) 
            ? innerData 
            : (Array.isArray(innerData.data) ? innerData.data : []);
        }
      }

      // 2. Fetch user's top matched career fit results if they have completed the Holland assessment
      let matchesMap: Record<string, number> = {};
      try {
        const matchesResponse = await api.get('/career-fit-results/top-matches');
        let matchesData: any[] = [];
        if (matchesResponse.data) {
          if (Array.isArray(matchesResponse.data)) {
            matchesData = matchesResponse.data;
          } else if (matchesResponse.data.success && Array.isArray(matchesResponse.data.data)) {
            matchesData = matchesResponse.data.data;
          } else if (Array.isArray(matchesResponse.data.data)) {
            matchesData = matchesResponse.data.data;
          }
        }

        matchesData.forEach((m: any) => {
          if (m.careerId?._id) {
            matchesMap[m.careerId._id] = m.overallFitScore;
          } else if (m.careerId) {
            matchesMap[m.careerId] = m.overallFitScore;
          } else if (m.careerTitle) {
            matchesMap[m.careerTitle.toLowerCase()] = m.overallFitScore;
          }
        });
      } catch (matchErr) {
        console.log('User has not taken assessment or top matches fetch failed', matchErr);
      }

      // 3. Format backend careers to match the app UI requirements
      const formatted = careersData.map((item: any) => {
        // Match percentage logic
        let matchScore = 0;
        const matchById = item._id ? matchesMap[item._id] : undefined;
        const matchByTitle = item.title ? matchesMap[item.title.toLowerCase()] : undefined;
        if (matchById !== undefined) {
          matchScore = matchById;
        } else if (matchByTitle !== undefined) {
          matchScore = matchByTitle;
        }

        // Emoji & Colors mapping based on backend enum category
        let emoji = '🧠';
        let color = '#8B5CF6';
        const cat = String(item.category).toLowerCase();
        if (cat === 'technology' || cat.includes('nghệ') || cat.includes('tin')) {
          emoji = '🧠';
          color = '#8B5CF6';
        } else if (cat === 'creative' || cat.includes('kế') || cat.includes('sáng')) {
          emoji = '🎨';
          color = '#EC4899';
        } else if (cat === 'business' || cat.includes('doanh') || cat.includes('quản')) {
          emoji = '📈';
          color = '#3B82F6';
        } else if (cat === 'healthcare' || cat.includes('sức') || cat.includes('y')) {
          emoji = '🏥';
          color = '#EF4444';
        } else if (cat === 'education' || cat.includes('dục')) {
          emoji = '🎓';
          color = '#10B981';
        } else {
          emoji = '📊';
          color = '#F59E0B';
        }

        // Salary summary processing
        let salaryText = 'Thỏa thuận';
        if (item.discoveryData?.salarySummary) {
          salaryText = item.discoveryData.salarySummary;
        } else if (item.careerLevels?.[0]?.salary?.[0]) {
          const s = item.careerLevels[0].salary[0];
          const formatNumber = (num: number) => {
            if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
            return `${num / 1000}`;
          };
          salaryText = `${formatNumber(s.min)} - ${formatNumber(s.max)} ${s.currency || 'VND'}`;
        }

        return {
          id: item._id || item.id,
          title: item.title,
          category: getCategoryDisplayName(item.category),
          salary: salaryText,
          match: Math.round(matchScore),
          icon: emoji,
          color: color,
          description: item.description,
        };
      });

      setCareers(formatted);
    } catch (err: any) {
      console.error('Fetch careers error:', err);
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đăng nhập hoặc mạng.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCareers();
  }, []);

  const onRefresh = () => {
    fetchCareers(true);
  };

  const filteredCareers = careers.filter(career => {
    const matchesSearch = career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          career.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'match') return career.match >= 80;
    if (selectedFilter === 'ai') return career.category === 'Công nghệ thông tin';
    if (selectedFilter === 'salary') {
      const maxSal = parseInt(career.salary.replace(/[^0-9]/g, '')) || 0;
      return maxSal >= 20 || career.salary.includes('M') && (
        career.salary.includes('25M') || 
        career.salary.includes('30M') || 
        career.salary.includes('35M') || 
        career.salary.includes('45M') || 
        career.salary.includes('60M')
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải dữ liệu nghề nghiệp...</Text>
      </View>
    );
  }

  if (error && careers.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchCareers()}>
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Khám phá</Text>
          <Text style={styles.subtitle}>Tìm kiếm định hướng tương lai của bạn</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <GlassView style={styles.searchBar}>
            <Search size={20} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Tìm kiếm nghề nghiệp, lĩnh vực..."
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            <TouchableOpacity style={styles.filterBtn}>
              <SlidersHorizontal size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          </GlassView>
        </View>

        {/* Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {FILTER_PILLS.map((pill) => (
            <TouchableOpacity
              key={pill.id}
              onPress={() => setSelectedFilter(pill.id)}
              style={[
                styles.pill,
                selectedFilter === pill.id && styles.pillActive
              ]}
            >
              <Text style={[
                styles.pillText,
                selectedFilter === pill.id && styles.pillTextActive
              ]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI Recommendations Banner */}
        <GlassView style={styles.recommendationBanner}>
          <View style={styles.recommendationHeader}>
            <Sparkles size={20} color={COLORS.secondary} />
            <Text style={styles.recommendationTitle}>Gợi ý từ AI của EDUMEE</Text>
          </View>
          <Text style={styles.recommendationDesc}>
            Dựa trên phân tích RIASEC của bạn, nhóm nghề **Công nghệ sáng tạo** có độ tương thích cao nhất (94%).
          </Text>
        </GlassView>

        {/* Career List */}
        <Text style={styles.sectionTitle}>Nghề nghiệp phù hợp ({filteredCareers.length})</Text>
        
        <View style={styles.careerList}>
          {filteredCareers.map((item) => (
            <GlassView key={item.id} style={styles.careerCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                  <Text style={styles.cardEmoji}>{item.icon}</Text>
                </View>
                <View style={styles.cardTitleInfo}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardCategory}>{item.category}</Text>
                </View>
                <View style={[styles.matchBadge, { borderColor: item.color }]}>
                  <Text style={[styles.matchText, { color: item.color }]}>
                    {item.match > 0 ? `${item.match}% Match` : 'Khám phá'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.salaryLabel}>Mức lương dự kiến</Text>
                  <Text style={styles.salaryValue}>{item.salary}</Text>
                </View>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: item.color }]}>
                  <Text style={styles.detailBtnText}>Lộ trình</Text>
                  <ArrowRight size={14} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </GlassView>
          ))}
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
  content: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  searchContainer: {
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 54,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 15,
    height: '100%',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  filtersScroll: {
    marginBottom: SPACING.lg,
  },
  filtersContainer: {
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.foreground,
  },
  recommendationBanner: {
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  recommendationDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  careerList: {
    gap: SPACING.md,
  },
  careerCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTitleInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  cardCategory: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  matchBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: SPACING.sm,
  },
  salaryLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
  salaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  detailBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  footerSpace: {
    height: 100,
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
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: COLORS.foreground,
    fontWeight: '700',
    fontSize: 14,
  },
});
