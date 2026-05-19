import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList 
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { Search, Sparkles, SlidersHorizontal, ArrowRight, Award } from 'lucide-react-native';

const FILTER_PILLS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'match', label: 'Phù hợp nhất' },
  { id: 'ai', label: 'Xu hướng AI' },
  { id: 'salary', label: 'Lương cao' },
];

const MOCK_CAREERS = [
  {
    id: '1',
    title: 'AI Engineer',
    category: 'Công nghệ thông tin',
    salary: '25M - 60M VND',
    match: 96,
    icon: '🧠',
    color: '#8B5CF6',
    description: 'Xây dựng mô hình học máy, xử lý ngôn ngữ tự nhiên và thị giác máy tính.',
  },
  {
    id: '2',
    title: 'UI/UX Designer',
    category: 'Thiết kế sáng tạo',
    salary: '18M - 35M VND',
    match: 88,
    icon: '🎨',
    color: '#EC4899',
    description: 'Thiết kế giao diện và trải nghiệm người dùng tối ưu trên đa nền tảng.',
  },
  {
    id: '3',
    title: 'Product Manager',
    category: 'Kinh doanh & Quản lý',
    salary: '22M - 45M VND',
    match: 84,
    icon: '📈',
    color: '#3B82F6',
    description: 'Quản lý vòng đời sản phẩm, định vị thị trường và tối ưu hóa tính năng.',
  },
  {
    id: '4',
    title: 'Data Analyst',
    category: 'Công nghệ thông tin',
    salary: '15M - 30M VND',
    match: 79,
    icon: '📊',
    color: '#10B981',
    description: 'Phân tích dữ liệu lớn, đưa ra insight kinh doanh và dự báo xu hướng.',
  },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredCareers = MOCK_CAREERS.filter(career => {
    const matchesSearch = career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          career.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'match') return career.match >= 85;
    if (selectedFilter === 'ai') return career.category === 'Công nghệ thông tin';
    if (selectedFilter === 'salary') return career.salary.includes('45M') || career.salary.includes('60M');
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                  <Text style={[styles.matchText, { color: item.color }]}>{item.match}% Match</Text>
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
});
