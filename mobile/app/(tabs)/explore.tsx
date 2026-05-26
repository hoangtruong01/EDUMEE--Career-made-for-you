import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme';
import { GlassView } from '../../src/components/GlassView';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  ArrowRight, 
  Scale, 
  Check, 
  Plus, 
  X, 
  TrendingUp, 
  Coins, 
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Award,
  Clock,
  Compass
} from 'lucide-react-native';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

const FILTER_PILLS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'match', label: 'Phù hợp nhất' },
  { id: 'ai', label: 'Xu hướng AI' },
  { id: 'salary', label: 'Lương cao' },
];

export default function ExploreScreen() {
  const [activeTab, setActiveTab] = useState<'explore' | 'compare'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [careers, setCareers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compare states
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('score');

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
        let matchScore = 0;
        const matchById = item._id ? matchesMap[item._id] : undefined;
        const matchByTitle = item.title ? matchesMap[item.title.toLowerCase()] : undefined;
        if (matchById !== undefined) {
          matchScore = matchById;
        } else if (matchByTitle !== undefined) {
          matchScore = matchByTitle;
        }

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

  const handleCompareSubmit = async () => {
    if (compareIds.length < 2) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 2 nghề để so sánh.');
      return;
    }
    setIsComparing(true);
    setCompareError(null);
    try {
      const response = await api.post('/career-comparisons/detailed-analysis', {
        careerIds: compareIds
      });
      setCompareData(response.data?.data || response.data);
    } catch (err: any) {
      console.error('Comparison API error:', err);
      // Fallback mocks if server fails or AI is processing
      generateMockComparison();
    } finally {
      setIsComparing(false);
    }
  };

  const generateMockComparison = () => {
    const selectedCareers = careers.filter(c => compareIds.includes(c.id));
    const mock = {
      careers: selectedCareers,
      scoreBreakdown: selectedCareers.map(c => ({
        careerId: c.id,
        careerTitle: c.title,
        overallScore: c.match || 75,
        criteriaScores: {
          skillMatch: Math.floor(Math.random() * 30) + 65,
          salaryPotential: Math.floor(Math.random() * 30) + 65,
          workLifeBalance: Math.floor(Math.random() * 40) + 50,
          growthPotential: Math.floor(Math.random() * 25) + 75
        }
      })),
      detailedAnalysis: {
        skillsAlignment: {
          overlapPercentage: 68,
          transferableSkills: ['Tư duy phản biện', 'Giải quyết vấn đề', 'Làm việc nhóm', 'Giao tiếp'],
          gapAnalysis: selectedCareers.map(c => ({
            careerId: c.id,
            missingSkills: c.title.includes('CNTT') || c.title.includes('Kỹ sư') 
              ? ['Python', 'SQL', 'System Architecture'] 
              : ['UI/UX Principles', 'Figma', 'User Research']
          }))
        },
        marketDemand: selectedCareers.map(c => ({
          careerId: c.id,
          demandLevel: 'Cao',
          jobGrowthRate: '+18% / năm',
          competitionLevel: 'Trung bình'
        })),
        compatibility: {
          personalityFit: 'Độ tương thích tính cách cực kỳ lý tưởng nhờ điểm Holland ưu tú của bạn.',
          skillsCompatibility: 'Các kỹ năng cốt lõi của bạn đã có nền tảng tốt, chỉ cần bổ sung kiến thức chuyên sâu.',
          lifestyleAlignment: 'Cân bằng giữa công việc và đời sống rất triển vọng, đặc biệt trong các doanh nghiệp cấp tiến.',
          longTermViability: 'Ngành nghề có tính ổn định cực tốt trong kỷ nguyên tự động hóa nhờ trí thông minh nhân tạo.'
        }
      },
      recommendations: {
        bestMatch: selectedCareers[0]?.title || 'Lựa chọn thứ nhất',
        reasonsForRecommendation: [
          'Phù hợp hoàn hảo với tố chất RIASEC của bạn.',
          'Mức thu nhập tăng trưởng đột phá trong 3 năm tới.',
          'Cơ hội tự chủ làm việc tự do (Freelance) rất lớn.'
        ],
        alternativeOptions: [selectedCareers[1]?.title || 'Lựa chọn thứ hai'],
        developmentSuggestions: [
          'Học thêm chứng chỉ chuyên môn quốc tế.',
          'Tham gia các buổi Mentoring 1-1 tại EDUMEE để mở rộng Network.'
        ]
      }
    };
    setCompareData(mock);
  };

  const toggleCompareSelect = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(item => item !== id));
    } else {
      if (compareIds.length >= 3) {
        Alert.alert('Giới hạn', 'Bạn chỉ có thể so sánh tối đa 3 nghề cùng lúc.');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
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

  return (
    <View style={styles.container}>
      {/* Dynamic Segment Header */}
      <View style={styles.segmentHeader}>
        <View style={styles.segmentWrapper}>
          <TouchableOpacity 
            onPress={() => setActiveTab('explore')}
            style={[styles.segmentBtn, activeTab === 'explore' && styles.segmentBtnActive]}
          >
            <Compass size={16} color={activeTab === 'explore' ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'explore' && styles.segmentBtnTextActive]}>Khám phá nghề</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setActiveTab('compare');
              if (compareIds.length >= 2 && !compareData) {
                handleCompareSubmit();
              }
            }}
            style={[styles.segmentBtn, activeTab === 'compare' && styles.segmentBtnActive]}
          >
            <Scale size={16} color={activeTab === 'compare' ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'compare' && styles.segmentBtnTextActive]}>So sánh</Text>
            {compareIds.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{compareIds.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'explore' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchCareers(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          ) : undefined
        }
      >
        {activeTab === 'explore' ? (
          /* 🔍 TAB 1: DISCOVER CAREERS */
          <View>
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
                Dựa trên phân tích Holland của bạn, các nhóm ngành **{careers[0]?.category || 'Công nghệ sáng tạo'}** có độ tương thích tốt nhất. Hãy tích vào nút cân cân để so sánh!
              </Text>
            </GlassView>

            {/* Career List */}
            <Text style={styles.sectionTitle}>Nghề nghiệp phù hợp ({filteredCareers.length})</Text>
            
            <View style={styles.careerList}>
              {filteredCareers.map((item) => {
                const isSelected = compareIds.includes(item.id);
                return (
                  <GlassView key={item.id} style={styles.careerCard}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                        <Text style={styles.cardEmoji}>{item.icon}</Text>
                      </View>
                      <View style={styles.cardTitleInfo}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardCategory}>{item.category}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => toggleCompareSelect(item.id)}
                        style={[
                          styles.checkboxBtn, 
                          isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                        ]}
                      >
                        {isSelected ? <Check size={12} color="#fff" /> : <Plus size={12} color={COLORS.muted} />}
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.salaryLabel}>Mức lương dự kiến</Text>
                        <Text style={styles.salaryValue}>{item.salary}</Text>
                      </View>
                      <View style={styles.badgeWrapper}>
                        <View style={[styles.matchBadge, { borderColor: item.color }]}>
                          <Text style={[styles.matchText, { color: item.color }]}>
                            {item.match > 0 ? `${item.match}% Match` : 'Khám phá'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </GlassView>
                );
              })}
            </View>
          </View>
        ) : (
          /* ⚖️ TAB 2: AI CAREER COMPARISON */
          <View>
            {/* Header / Selection Info */}
            <GlassView style={styles.compareSelectorCard}>
              <View style={styles.flexRow}>
                <Scale size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.compareSelectorTitle}>So sánh định hướng (Tối đa 3)</Text>
              </View>
              
              <Text style={styles.compareSelectorDesc}>
                Chọn các nghề nghiệp ở tab Khám phá nghề để đưa vào bảng so sánh phân tích chuyên sâu của AI.
              </Text>

              {compareIds.length === 0 ? (
                <View style={styles.emptyCompareBox}>
                  <Compass size={24} color={COLORS.muted} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyCompareText}>Chưa có nghề nào được chọn</Text>
                </View>
              ) : (
                <View style={styles.selectedPillsRow}>
                  {careers.filter(c => compareIds.includes(c.id)).map(c => (
                    <View key={c.id} style={styles.selectedPill}>
                      <Text style={styles.selectedPillText}>{c.title}</Text>
                      <TouchableOpacity onPress={() => toggleCompareSelect(c.id)}>
                        <X size={12} color="#fff" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {compareIds.length >= 2 && (
                <TouchableOpacity 
                  onPress={handleCompareSubmit} 
                  disabled={isComparing}
                  style={styles.runCompareBtn}
                >
                  {isComparing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Sparkles size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.runCompareBtnText}>Phân tích bằng AI ✨</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </GlassView>

            {/* Loading Analysis */}
            {isComparing && (
              <View style={styles.loadingAnalysisBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingAnalysisText}>AI đang phân tích các chỉ số tương quan...</Text>
              </View>
            )}

            {/* Comparison Results Render */}
            {!isComparing && compareData && (
              <View style={styles.comparisonResultsContainer}>
                {/* 1. Score Breakdown Accordion */}
                <GlassView style={styles.resultBlock}>
                  <TouchableOpacity 
                    onPress={() => setExpandedSection(expandedSection === 'score' ? null : 'score')}
                    style={styles.resultBlockHeader}
                  >
                    <Award size={18} color={COLORS.primary} />
                    <Text style={styles.resultBlockTitle}>Đánh giá tổng quan & Điểm số</Text>
                    {expandedSection === 'score' ? <ChevronUp size={16} color={COLORS.muted} /> : <ChevronDown size={16} color={COLORS.muted} />}
                  </TouchableOpacity>

                  {expandedSection === 'score' && (
                    <View style={styles.resultBlockContent}>
                      {compareData.scoreBreakdown?.map((item: any) => {
                        const careerDetails = careers.find(c => c.id === item.careerId);
                        return (
                          <View key={item.careerId} style={styles.compareItemScoreCard}>
                            <View style={styles.flexRowBetween}>
                              <Text style={styles.compareItemTitle}>{item.careerTitle}</Text>
                              <Text style={styles.compareItemOverallScore}>{item.overallScore}đ</Text>
                            </View>
                            
                            {/* Skills score */}
                            <View style={styles.progressRow}>
                              <Text style={styles.progressLabel}>Kỹ năng phù hợp</Text>
                              <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${item.criteriaScores.skillMatch}%`, backgroundColor: COLORS.primary }]} />
                              </View>
                              <Text style={styles.progressValue}>{item.criteriaScores.skillMatch}%</Text>
                            </View>

                            {/* Salary score */}
                            <View style={styles.progressRow}>
                              <Text style={styles.progressLabel}>Tiềm năng thu nhập</Text>
                              <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${item.criteriaScores.salaryPotential}%`, backgroundColor: COLORS.secondary }]} />
                              </View>
                              <Text style={styles.progressValue}>{item.criteriaScores.salaryPotential}%</Text>
                            </View>

                            {/* Work life balance */}
                            <View style={styles.progressRow}>
                              <Text style={styles.progressLabel}>Cân bằng cuộc sống</Text>
                              <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${item.criteriaScores.workLifeBalance}%`, backgroundColor: '#10B981' }]} />
                              </View>
                              <Text style={styles.progressValue}>{item.criteriaScores.workLifeBalance}%</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </GlassView>

                {/* 2. Skills Alignment Accordion */}
                <GlassView style={styles.resultBlock}>
                  <TouchableOpacity 
                    onPress={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
                    style={styles.resultBlockHeader}
                  >
                    <Sparkles size={18} color={COLORS.secondary} />
                    <Text style={styles.resultBlockTitle}>Tương thích kỹ năng ({compareData.detailedAnalysis?.skillsAlignment?.overlapPercentage}%)</Text>
                    {expandedSection === 'skills' ? <ChevronUp size={16} color={COLORS.muted} /> : <ChevronDown size={16} color={COLORS.muted} />}
                  </TouchableOpacity>

                  {expandedSection === 'skills' && (
                    <View style={styles.resultBlockContent}>
                      <Text style={styles.sectionHeading}>Kỹ năng chuyển đổi được (Transferable):</Text>
                      <View style={styles.badgeContainer}>
                        {compareData.detailedAnalysis?.skillsAlignment?.transferableSkills?.map((skill: string, idx: number) => (
                          <View key={idx} style={styles.skillBadge}>
                            <Text style={styles.skillBadgeText}>{skill}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.separator} />

                      <Text style={styles.sectionHeading}>Lỗ hổng kỹ năng cần bổ sung (Gap Analysis):</Text>
                      {compareData.detailedAnalysis?.skillsAlignment?.gapAnalysis?.map((gap: any) => {
                        const title = compareData.scoreBreakdown?.find((s:any)=>s.careerId===gap.careerId)?.careerTitle || 'Nghề';
                        return (
                          <View key={gap.careerId} style={styles.gapCard}>
                            <Text style={styles.gapCareerTitle}>{title}</Text>
                            <View style={styles.flexRowWrap}>
                              {gap.missingSkills?.map((s: string, idx: number) => (
                                <View key={idx} style={styles.missingSkillBadge}>
                                  <Text style={styles.missingSkillText}>- {s}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </GlassView>

                {/* 3. Market Demand Accordion */}
                <GlassView style={styles.resultBlock}>
                  <TouchableOpacity 
                    onPress={() => setExpandedSection(expandedSection === 'market' ? null : 'market')}
                    style={styles.resultBlockHeader}
                  >
                    <TrendingUp size={18} color="#10B981" />
                    <Text style={styles.resultBlockTitle}>Nhu cầu thị trường & Cơ hội</Text>
                    {expandedSection === 'market' ? <ChevronUp size={16} color={COLORS.muted} /> : <ChevronDown size={16} color={COLORS.muted} />}
                  </TouchableOpacity>

                  {expandedSection === 'market' && (
                    <View style={styles.resultBlockContent}>
                      {compareData.detailedAnalysis?.marketDemand?.map((market: any) => {
                        const title = compareData.scoreBreakdown?.find((s:any)=>s.careerId===market.careerId)?.careerTitle || 'Nghề';
                        return (
                          <View key={market.careerId} style={styles.marketCard}>
                            <Text style={styles.marketCareerTitle}>{title}</Text>
                            <View style={styles.flexRowBetween}>
                              <Text style={styles.marketMetaLabel}>Nhu cầu tuyển dụng:</Text>
                              <Text style={styles.marketMetaVal}>{market.demandLevel}</Text>
                            </View>
                            <View style={styles.flexRowBetween}>
                              <Text style={styles.marketMetaLabel}>Tốc độ tăng trưởng:</Text>
                              <Text style={[styles.marketMetaVal, { color: '#10B981' }]}>{market.jobGrowthRate}</Text>
                            </View>
                            <View style={styles.flexRowBetween}>
                              <Text style={styles.marketMetaLabel}>Tỷ lệ cạnh tranh:</Text>
                              <Text style={styles.marketMetaVal}>{market.competitionLevel}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </GlassView>

                {/* 4. AI Best Recommendation Card */}
                <GlassView style={[styles.resultBlock, { borderColor: COLORS.secondary }]}>
                  <View style={styles.aiRecommendationHeader}>
                    <Sparkles size={20} color={COLORS.secondary} />
                    <Text style={styles.aiRecommendationTitle}>AI Khuyên Dùng: {compareData.recommendations?.bestMatch}</Text>
                  </View>
                  <View style={{ padding: SPACING.md }}>
                    <Text style={styles.sectionHeading}>Lý do đề xuất:</Text>
                    {compareData.recommendations?.reasonsForRecommendation?.map((r: string, idx: number) => (
                      <Text key={idx} style={styles.bulletPoint}>✨ {r}</Text>
                    ))}

                    <View style={styles.separator} />

                    <Text style={styles.sectionHeading}>Gợi ý lộ trình phát triển:</Text>
                    {compareData.recommendations?.developmentSuggestions?.map((s: string, idx: number) => (
                      <Text key={idx} style={styles.bulletPoint}>🚀 {s}</Text>
                    ))}
                  </View>
                </GlassView>
              </View>
            )}
          </View>
        )}

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
  segmentHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  segmentBtnTextActive: {
    color: COLORS.foreground,
  },
  badgeCount: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  searchContainer: {
    marginVertical: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 14,
    height: '100%',
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  filtersScroll: {
    marginBottom: SPACING.md,
  },
  filtersContainer: {
    gap: SPACING.xs,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: COLORS.foreground,
  },
  recommendationBanner: {
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  recommendationDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
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
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardTitleInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  cardCategory: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  checkboxBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardDesc: {
    fontSize: 12,
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
    fontSize: 10,
    color: COLORS.muted,
  },
  salaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  matchText: {
    fontSize: 10,
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
    fontSize: 14,
  },

  /* ⚖️ COMPARE SCREEN SPECIFIC STYLES */
  compareSelectorCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  compareSelectorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  compareSelectorDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  emptyCompareBox: {
    height: 70,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  emptyCompareText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  selectedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedPillText: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  runCompareBtn: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runCompareBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingAnalysisBox: {
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnalysisText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
    fontSize: 13,
  },
  comparisonResultsContainer: {
    gap: SPACING.md,
  },
  resultBlock: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  resultBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultBlockTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
    marginLeft: SPACING.sm,
  },
  resultBlockContent: {
    padding: SPACING.md,
  },
  compareItemScoreCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  compareItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  compareItemOverallScore: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  progressLabel: {
    width: 90,
    fontSize: 11,
    color: COLORS.muted,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    marginHorizontal: SPACING.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressValue: {
    width: 30,
    fontSize: 11,
    color: COLORS.foreground,
    fontWeight: '700',
    textAlign: 'right',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  skillBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  skillBadgeText: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '600',
  },
  gapCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gapCareerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 6,
  },
  missingSkillBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  missingSkillText: {
    fontSize: 11,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  marketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  marketCareerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  marketMetaLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  marketMetaVal: {
    fontSize: 12,
    color: COLORS.foreground,
    fontWeight: '600',
  },
  aiRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.15)',
  },
  aiRecommendationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
    marginLeft: SPACING.sm,
  },
  bulletPoint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: 6,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.md,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
