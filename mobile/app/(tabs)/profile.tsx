import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
  TextInput,
  RefreshControl,
  Modal,
  Pressable
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
  Activity,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Brain,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  DollarSign,
  Rocket,
  CheckCircle2,
  TrendingUp
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api, setAuthToken } from '../../src/services/api';

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.7;
const CENTER = CHART_SIZE / 2;
const RADIUS_CHART = (CHART_SIZE / 2) * 0.7;

const RIASEC_DECORATIONS: Record<string, {label:string;color:string;emoji:string;desc:string}> = {
  realistic: { label: 'Thực tế', color: '#EF4444', emoji: '🛠️', desc: 'Thích làm việc với máy móc, dụng cụ.' },
  investigative: { label: 'Nghiên cứu', color: '#8B5CF6', emoji: '🔬', desc: 'Thích phân tích và giải quyết vấn đề.' },
  artistic: { label: 'Nghệ thuật', color: '#EC4899', emoji: '🎨', desc: 'Giàu trí tưởng tượng, sáng tạo.' },
  social: { label: 'Xã hội', color: '#10B981', emoji: '🤝', desc: 'Thích giúp đỡ và tư vấn mọi người.' },
  enterprising: { label: 'Kinh doanh', color: '#3B82F6', emoji: '📈', desc: 'Năng động, thuyết phục, lãnh đạo.' },
  conventional: { label: 'Nghiệp vụ', color: '#F59E0B', emoji: '📋', desc: 'Thích làm việc với hệ thống, sổ sách.' }
};

const RIASEC_ORDER = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
const DIMENSION_OPTIONS = [
  ...RIASEC_ORDER,
  'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'
];

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'riasec'>('riasec');
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [testResult, setTestResult] = useState<any>(null);
  const [recommendedCareers, setRecommendedCareers] = useState<any[]>([]);

  // Career Detailed Analysis Modal States
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [careerDetail, setCareerDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  // Loading & Refresh states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin Question Bank states
  const [questions, setQuestions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [formText, setFormText] = useState('');
  const [formDimension, setFormDimension] = useState('realistic');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchProfileAndResult = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true); else setIsLoading(true);

      const userRes = await api.get('/users/me');
      const profile = userRes.data?.data || userRes.data;
      setUserData(profile);
      const role = profile?.role || 'user';
      setUserRole(role);

      const resultRes = await api.get('/career-fit-results/my-results', {
        params: { limit: 3 }
      });
      const resultsArr = resultRes.data?.data || resultRes.data || [];
      if (Array.isArray(resultsArr) && resultsArr.length > 0) {
        setTestResult(resultsArr[0]);
        setRecommendedCareers(resultsArr.slice(0, 3));
      } else {
        setTestResult(null);
        setRecommendedCareers([]);
      }

      if (role === 'admin') {
        await fetchQuestionsData();
      }
    } catch (error) {
      console.error('Fetch profile/result error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchCareerDetail = async (title: string) => {
    try {
      setSelectedCareer(title);
      setIsLoadingDetail(true);
      setCareerDetail(null);
      const res = await api.get('/career-fit-results/detailed-analysis', {
        params: { careerTitle: title }
      });
      setCareerDetail(res.data?.data || res.data);
    } catch (err) {
      showToast('Không thể tải chi tiết ngành nghề. Vui lòng thử lại sau.');
      setSelectedCareer(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleStartRoadmap = async () => {
    if (!selectedCareer) return;
    setIsGeneratingRoadmap(true);
    try {
      await api.post('/learning-roadmaps/generate-ai', { careerTitle: selectedCareer });
      Alert.alert('Thành công', `AI đã khởi tạo Lộ trình học tập chi tiết cho ngành ${selectedCareer}!`, [
        { 
          text: 'Đi tới Lộ trình', 
          onPress: () => {
            setSelectedCareer(null);
            router.push('/(tabs)/orientation');
          }
        }
      ]);
    } catch (err: any) {
      console.error('Start roadmap error:', err);
      showToast(err.response?.data?.message || 'Không thể tạo lộ trình. Vui lòng thử lại sau.');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const fetchQuestionsData = async () => {
    try {
      const qRes = await api.get('/assessment-questions?page=1&limit=200');
      const qData = qRes.data?.data?.questions || qRes.data?.data || qRes.data?.questions || [];
      setQuestions(Array.isArray(qData) ? qData : []);
    } catch (e) {
      console.error('Fetch questions error:', e);
    }
  };

  useEffect(() => {
    fetchProfileAndResult();
  }, [fetchProfileAndResult]);

  // Question CRUD logic
  const resetQuestionForm = () => {
    setEditingId(null);
    setFormText('');
    setFormDimension('realistic');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormOptD('');
    setShowQuestionForm(false);
  };

  const startEditQuestion = (q: any) => {
    setEditingId(q._id || q.id);
    setFormText(q.questionText || '');
    setFormDimension(q.dimension || 'realistic');
    const optA = q.options?.find((o:any)=>o.value==='A')?.label || '';
    const optB = q.options?.find((o:any)=>o.value==='B')?.label || '';
    const optC = q.options?.find((o:any)=>o.value==='C')?.label || '';
    const optD = q.options?.find((o:any)=>o.value==='D')?.label || '';
    setFormOptA(optA);
    setFormOptB(optB);
    setFormOptC(optC);
    setFormOptD(optD);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async () => {
    if (!formText.trim()) { showToast('Vui lòng nhập nội dung câu hỏi'); return; }
    if (!formOptA.trim()||!formOptB.trim()||!formOptC.trim()||!formOptD.trim()) {
      showToast('Vui lòng nhập đầy đủ 4 đáp án'); return;
    }
    const payload = {
      questionText: formText.trim(),
      questionType: 'multiple_choice',
      dimension: formDimension,
      options: [
        { value: 'A', label: formOptA.trim() },
        { value: 'B', label: formOptB.trim() },
        { value: 'C', label: formOptC.trim() },
        { value: 'D', label: formOptD.trim() },
      ]
    };
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/assessment-questions/${editingId}`, payload);
        showToast('Đã cập nhật câu hỏi');
      } else {
        await api.post('/assessment-questions', payload);
        showToast('Đã thêm câu hỏi mới');
      }
      resetQuestionForm();
      await fetchQuestionsData();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (q: any) => {
    const id = q._id || q.id;
    const doDelete = async () => {
      try {
        await api.delete(`/assessment-questions/${id}`);
        showToast('Đã xóa câu hỏi');
        await fetchQuestionsData();
      } catch {
        showToast('Xóa thất bại');
      }
    };
    if (Platform.OS === 'web') {
      if (confirm('Xóa câu hỏi này?')) doDelete();
    } else {
      Alert.alert('Xác nhận', 'Xóa câu hỏi này?', [
        { text: 'Hủy' },
        { text: 'Xóa', style: 'destructive', onPress: doDelete }
      ]);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const s = searchQ.toLowerCase();
    return (q.questionText||'').toLowerCase().includes(s) || (q.dimension||'').toLowerCase().includes(s);
  });

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
                {RIASEC_DECORATIONS[key]?.label || key}
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
      {/* Dynamic Segment Header */}
      <View style={styles.segmentHeader}>
        <View style={styles.segmentWrapper}>
          <TouchableOpacity
            onPress={() => setActiveTab('riasec')}
            style={[styles.segmentBtn, activeTab === 'riasec' && styles.segmentBtnActive]}
          >
            <Brain size={16} color={activeTab === 'riasec' ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'riasec' && styles.segmentBtnTextActive]}>Kết quả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            style={[styles.segmentBtn, activeTab === 'profile' && styles.segmentBtnActive]}
          >
            <User size={16} color={activeTab === 'profile' ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'profile' && styles.segmentBtnTextActive]}>Hồ sơ & Ví</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchProfileAndResult(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {activeTab === 'profile' ? (
          /* 👤 PERSONAL PROFILE & WALLET SEGMENT */
          <View>
            {/* User Info Header */}
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
                  <Text style={styles.badgeText}>
                    {userRole === 'admin' ? 'Quản trị viên' : 'Gói Thành viên'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Wallet & AI Limit Card */}
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
          </View>
        ) : (
          /* 🧠 HOLLAND RIASEC ASSESSMENT SEGMENT */
          <View>
            {testResult ? (
              <View>
                {/* Profile RIASEC Result Card from Assessment Screen */}
                <Text style={styles.sectionTitle}>3 Nghề nghiệp phù hợp nhất</Text>
                
                {recommendedCareers.length > 0 && (
                  <View style={styles.careersGridContainer}>
                    {/* Featured Top 1 Card - Full Width */}
                    {recommendedCareers[0] && (
                      <GlassView style={styles.featuredCareerCard}>
                        <View style={styles.featuredCardHeader}>
                          <View style={styles.featuredRankBadge}>
                            <Award size={14} color="#F59E0B" />
                            <Text style={styles.featuredRankText}>PHÙ HỢP HẠNG 1</Text>
                          </View>
                          <View style={[styles.fitBadge, { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '15' }]}>
                            <Text style={[styles.fitText, { color: COLORS.secondary }]}>
                              {Math.round(recommendedCareers[0].overallFitScore || 0)}% Match
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.featuredCareerTitle}>{recommendedCareers[0].careerTitle}</Text>
                        
                        <Text style={styles.featuredCareerDesc}>
                          {recommendedCareers[0].aiExplanation || 'AI đã phân tích và đối chiếu năng lực cốt lõi của bạn.'}
                        </Text>
                        
                        <TouchableOpacity 
                          onPress={() => fetchCareerDetail(recommendedCareers[0].careerTitle)} 
                          style={styles.featuredCtaBtn}
                        >
                          <Text style={styles.featuredCtaBtnText}>Xem chi tiết</Text>
                          <ChevronRight size={14} color="#fff" />
                        </TouchableOpacity>
                      </GlassView>
                    )}

                    {/* Sub Careers - Two Column Grid */}
                    <View style={styles.subCareersRow}>
                      {recommendedCareers.slice(1, 3).map((item, idx) => {
                        const rankNum = idx + 2;
                        const fitColor = rankNum === 2 ? COLORS.primary : '#10B981';
                        return (
                          <GlassView key={item._id || item.id || idx} style={styles.subCareerCard}>
                            <View style={styles.subCardHeader}>
                              <View style={[styles.subRankBadge, { backgroundColor: fitColor + '15' }]}>
                                <Text style={[styles.subRankText, { color: fitColor }]}>HẠNG {rankNum}</Text>
                              </View>
                              <Text style={[styles.subFitText, { color: fitColor }]}>
                                {Math.round(item.overallFitScore || 0)}% Match
                              </Text>
                            </View>

                            <Text style={styles.subCareerTitle} numberOfLines={2}>{item.careerTitle}</Text>
                            
                            <Text style={styles.subCareerDesc} numberOfLines={3}>
                              {item.strengths?.join('. ') || 'AI đánh giá tố chất của bạn hoàn hảo với công việc này.'}
                            </Text>

                            <TouchableOpacity 
                              onPress={() => fetchCareerDetail(item.careerTitle)} 
                              style={[styles.subCtaBtn, { borderColor: fitColor }]}
                            >
                              <Text style={[styles.subCtaBtnText, { color: fitColor }]}>Xem chi tiết</Text>
                              <ChevronRight size={12} color={fitColor} />
                            </TouchableOpacity>
                          </GlassView>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Radar Chart */}
                <GlassView style={styles.sectionCard}>
                  <Text style={styles.cardTitle}>Biểu đồ mạng nhện Holland</Text>
                  {renderRadarChart()}
                </GlassView>

                {/* Dimension Breakdown Bar Progress Lists */}
                <GlassView style={styles.sectionCard}>
                  <Text style={styles.cardTitle}>Chi tiết 6 nhóm tính cách Holland</Text>
                  {RIASEC_ORDER.map(key => {
                    const score = testResult.dimensionScores?.[key] || 0;
                    const cfg = RIASEC_DECORATIONS[key];
                    return (
                      <View key={key} style={{ marginBottom: 14 }}>
                        <View style={styles.barHeader}>
                          <Text style={styles.barLabel}>{cfg.emoji} {cfg.label}</Text>
                          <Text style={[styles.barScore, { color: cfg.color }]}>{Math.round(score)}%</Text>
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${Math.max(5, score)}%`, backgroundColor: cfg.color }]} />
                        </View>
                        <Text style={styles.barDesc}>{cfg.desc}</Text>
                      </View>
                    );
                  })}
                </GlassView>

                <View style={styles.noticeBox}>
                  <Info size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
                  <Text style={styles.noticeText}>
                    Kết quả này là cơ sở giúp hệ thống AI tự động đề xuất lộ trình học và mô phỏng thực tiễn chính xác nhất cho bạn.
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={() => router.push('/holland-test')} 
                  style={styles.retryAssessmentBtn}
                >
                  <RotateCcw size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.retryAssessmentBtnText}>Làm lại bài trắc nghiệm</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <GlassView style={styles.introCard}>
                <Compass size={48} color={COLORS.primary} style={{ marginBottom: SPACING.md }} />
                <Text style={styles.introTitle}>Khám phá bản thân cùng Career AI</Text>
                <Text style={styles.introDesc}>
                  Làm bài trắc nghiệm Holland Code (RIASEC) để xác định tố chất năng lực, thế mạnh & nghề nghiệp lý tưởng nhất của bạn.
                </Text>
                <TouchableOpacity onPress={() => router.push('/holland-test')} style={styles.startBtn}>
                  <Text style={styles.startBtnText}>Bắt đầu làm trắc nghiệm</Text>
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>
              </GlassView>
            )}

            {/* ──── ADMIN ONLY: QUESTION BANK MANAGEMENT CRUD SEGMENT ──── */}
            {userRole === 'admin' && (
              <View style={{ marginTop: SPACING.xl }}>
                <View style={styles.adminHeaderRow}>
                  <Brain size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminHeaderLabel}>QUẢN TRỊ VIÊN</Text>
                    <Text style={styles.adminHeaderTitle}>Ngân hàng câu hỏi RIASEC</Text>
                  </View>
                  <TouchableOpacity onPress={() => { resetQuestionForm(); setShowQuestionForm(true); }} style={styles.addQBtn}>
                    <Plus size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Search query */}
                <GlassView style={styles.searchRow}>
                  <Search size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Tìm câu hỏi theo nội dung/nhóm..."
                    placeholderTextColor={COLORS.muted}
                    style={styles.searchInput}
                    value={searchQ}
                    onChangeText={setSearchQ}
                  />
                </GlassView>

                <Text style={styles.countText}>Tổng số: {filteredQuestions.length} câu hỏi</Text>

                {/* CRUD Form card */}
                {showQuestionForm && (
                  <GlassView style={styles.formCard}>
                    <Text style={styles.formTitle}>
                      {editingId ? '✏️ Sửa câu hỏi RIASEC' : '➕ Thêm câu hỏi mới'}
                    </Text>

                    <Text style={styles.fieldLabel}>Nội dung câu hỏi</Text>
                    <TextInput
                      multiline
                      style={styles.textArea}
                      value={formText}
                      onChangeText={setFormText}
                      placeholder="Nhập câu hỏi..."
                      placeholderTextColor={COLORS.muted}
                    />

                    <Text style={styles.fieldLabel}>Nhóm tính cách (Dimension)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {DIMENSION_OPTIONS.map(d => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setFormDimension(d)}
                          style={[styles.dimPill, formDimension === d && styles.dimPillActive]}
                        >
                          <Text style={[styles.dimPillText, formDimension === d && styles.dimPillTextActive]}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {(['A','B','C','D'] as const).map((v, i) => (
                      <View key={v}>
                        <Text style={styles.fieldLabel}>Đáp án {v}</Text>
                        <TextInput
                          style={styles.inputField}
                          value={[formOptA, formOptB, formOptC, formOptD][i]}
                          onChangeText={[setFormOptA, setFormOptB, setFormOptC, setFormOptD][i]}
                          placeholder={`Nội dung đáp án cho lựa chọn ${v}`}
                          placeholderTextColor={COLORS.muted}
                        />
                      </View>
                    ))}

                    <View style={styles.formActions}>
                      <TouchableOpacity onPress={handleSaveQuestion} disabled={submitting} style={styles.saveBtn}>
                        <Save size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>
                          {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm mới'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={resetQuestionForm} style={styles.cancelBtn}>
                        <X size={16} color={COLORS.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.cancelBtnText}>Hủy</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassView>
                )}

                {/* Question List */}
                {filteredQuestions.map((q, idx) => (
                  <GlassView key={q._id || q.id || idx} style={styles.qCard}>
                    <View style={styles.qHeader}>
                      <View style={[styles.qDimBadge, { backgroundColor: (RIASEC_DECORATIONS[q.dimension]?.color || '#8B5CF6') + '20' }]}>
                        <Text style={[styles.qDimText, { color: RIASEC_DECORATIONS[q.dimension]?.color || '#8B5CF6' }]}>
                          {q.dimension}
                        </Text>
                      </View>
                      <View style={styles.qActions}>
                        <TouchableOpacity onPress={() => startEditQuestion(q)} style={styles.qActionBtn}>
                          <Pencil size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteQuestion(q)} style={styles.qActionBtn}>
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.qText}>{q.questionText}</Text>
                    {q.options?.map((o: any) => (
                      <Text key={o.value} style={styles.qOpt}>
                        <Text style={{ fontWeight: '700', color: COLORS.foreground }}>{o.value}.</Text> {o.label}
                      </Text>
                    ))}
                  </GlassView>
                ))}
              </View>
            )}

            {toastMessage ? (
              <View style={styles.toast}>
                <Text style={styles.toastText}>{toastMessage}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* 🔮 PREMIUM GLASSMORPHIC CAREER DETAIL MODAL */}
      <Modal
        visible={selectedCareer !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCareer(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedCareer(null)}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]} />
          </Pressable>
          
          <View style={styles.modalContent}>
            {/* Modal Header Handle */}
            <View style={styles.modalHandle} />
            
            {/* Close Button */}
            <TouchableOpacity onPress={() => setSelectedCareer(null)} style={styles.modalCloseBtn}>
              <X size={20} color="#fff" />
            </TouchableOpacity>

            {isLoadingDetail ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.modalLoadingText}>AI đang phân tích chi tiết ngành nghề...</Text>
                <Text style={styles.modalLoadingSubtext}>Đang tổng hợp xu hướng thị trường & nhu cầu nhân lực</Text>
              </View>
            ) : careerDetail ? (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Hero Header */}
                <View style={styles.modalHero}>
                  <View style={styles.modalIconContainer}>
                    <Sparkles size={28} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.modalCareerTitle}>{selectedCareer}</Text>
                  
                  {/* Salary & Demand Badge */}
                  <View style={styles.modalBadgeRow}>
                    <View style={styles.modalSalaryBadge}>
                      <DollarSign size={14} color="#10B981" />
                      <Text style={styles.modalSalaryText}>{careerDetail.salaryRange || 'Thỏa thuận'}</Text>
                    </View>
                    <View style={styles.modalDemandBadge}>
                      <TrendingUp size={14} color={COLORS.primary} />
                      <Text style={styles.modalDemandText}>{careerDetail.demandLevel || 'Rất cao'}</Text>
                    </View>
                  </View>
                </View>

                {/* Overview Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>📋 Tổng quan ngành nghề</Text>
                  <GlassView style={styles.modalGlassCard}>
                    <Text style={styles.modalOverviewText}>{careerDetail.overview}</Text>
                  </GlassView>
                </View>

                {/* Pros & Cons Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>⚖️ Ưu điểm & Thách thức</Text>
                  <View style={styles.prosConsContainer}>
                    {/* Pros */}
                    <GlassView style={[styles.prosConsCard, { marginRight: 8 }]}>
                      <Text style={styles.prosTitle}>✨ Ưu điểm</Text>
                      {careerDetail.pros?.map((pro: string, i: number) => (
                        <View key={i} style={styles.bulletRow}>
                          <CheckCircle2 size={12} color="#10B981" style={{ marginTop: 2, marginRight: 6 }} />
                          <Text style={styles.bulletText}>{pro}</Text>
                        </View>
                      ))}
                    </GlassView>

                    {/* Cons */}
                    <GlassView style={styles.prosConsCard}>
                      <Text style={styles.consTitle}>⚠️ Thách thức</Text>
                      {careerDetail.cons?.map((con: string, i: number) => (
                        <View key={i} style={styles.bulletRow}>
                          <XCircle size={12} color="#EF4444" style={{ marginTop: 2, marginRight: 6 }} />
                          <Text style={styles.bulletText}>{con}</Text>
                        </View>
                      ))}
                    </GlassView>
                  </View>
                </View>

                {/* 5-Year Trends */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>📈 Xu hướng ngành trong 5 năm tới</Text>
                  <GlassView style={styles.modalGlassCard}>
                    {careerDetail.trends?.map((trend: any, i: number) => (
                      <View key={i} style={styles.trendRow}>
                        <View style={styles.trendYearContainer}>
                          <Text style={styles.trendYearText}>{trend.year}</Text>
                        </View>
                        <View style={styles.trendDescContainer}>
                          <Text style={styles.trendDescText}>{trend.description}</Text>
                        </View>
                      </View>
                    ))}
                  </GlassView>
                </View>

                {/* Roadmap Preview */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>🚀 Lộ trình phát triển gợi ý</Text>
                  <GlassView style={styles.modalGlassCard}>
                    {[
                      'Giai đoạn 1: Nền tảng căn bản và Công cụ',
                      'Giai đoạn 2: Xây dựng Dự án Thực chiến',
                      'Giai đoạn 3: Chuyên sâu & Portfolio',
                      'Giai đoạn 4: Chuẩn bị Hồ sơ & Ứng tuyển'
                    ].map((step, i) => (
                      <View key={i} style={styles.stepRow}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumberText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </GlassView>
                </View>

                {/* Key Skills */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>⚡ Kỹ năng cốt lõi cần có</Text>
                  <View style={styles.skillsTagContainer}>
                    {careerDetail.keySkills?.map((skill: string, i: number) => (
                      <View key={i} style={styles.skillTag}>
                        <Text style={styles.skillTagText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Top Companies */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>🏢 Công ty tuyển dụng hàng đầu</Text>
                  <View style={styles.companiesContainer}>
                    {careerDetail.topCompanies?.map((company: string, i: number) => (
                      <GlassView key={i} style={styles.companyCard}>
                        <View style={styles.companyIconContainer}>
                          <Text style={styles.companyIconText}>{company.charAt(0)}</Text>
                        </View>
                        <Text style={styles.companyName} numberOfLines={1}>{company}</Text>
                      </GlassView>
                    ))}
                  </View>
                </View>

                {/* Generate Roadmap CTA Button */}
                <TouchableOpacity 
                  onPress={handleStartRoadmap}
                  disabled={isGeneratingRoadmap}
                  style={styles.modalCtaBtn}
                >
                  {isGeneratingRoadmap ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Rocket size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.modalCtaBtnText}>Bắt đầu lộ trình ngay</Text>
                      <ChevronRight size={16} color="#fff" style={{ marginLeft: 4 }} />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.modalErrorContainer}>
                <Text style={styles.modalErrorText}>Không thể tải chi tiết phân tích.</Text>
                <TouchableOpacity onPress={() => setSelectedCareer(null)} style={styles.modalErrorBtn}>
                  <Text style={styles.modalErrorBtnText}>Quay lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    flex: 1,
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
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
    marginTop: SPACING.sm,
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

  /* 🧠 ASSESSMENT SPECIFIC INTEGRATED STYLES */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  profileSummaryCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  profileLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  fitBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fitText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  aiExplanationText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  cardBtns: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  primaryReportBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  primaryReportBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryReportBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryReportBtnText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  barScore: {
    fontSize: 13,
    fontWeight: '800',
  },
  barBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barDesc: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#A78BFA',
  },
  introCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  introDesc: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  startBtn: {
    width: '100%',
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* 🛠️ ADMIN STYLES FOR INTEGRATED QUESTION BANK */
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  adminHeaderLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '800',
    letterSpacing: 2,
  },
  adminHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    marginTop: 2,
  },
  addQBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 13,
    height: 36,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none' as any } })
  },
  countText: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  formCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.foreground,
    padding: SPACING.sm,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Platform.select({ web: { outlineStyle: 'none' as any } })
  },
  inputField: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: COLORS.foreground,
    paddingHorizontal: SPACING.sm,
    height: 42,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: 'none' as any } })
  },
  dimPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dimPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dimPillText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  dimPillTextActive: {
    color: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  qCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qDimBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  qDimText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  qActions: {
    flexDirection: 'row',
    gap: 6,
  },
  qActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  qOpt: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  retryAssessmentBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  retryAssessmentBtnText: {
    color: COLORS.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    height: '85%',
    paddingTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: SPACING.lg,
    top: SPACING.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalLoadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  modalLoadingSubtext: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  modalScrollContent: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalCareerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalSalaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  modalSalaryText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  modalDemandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  modalDemandText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  modalSection: {
    marginBottom: SPACING.xl,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  modalGlassCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  modalOverviewText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 22,
  },
  prosConsContainer: {
    flexDirection: 'row',
  },
  prosConsCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  prosTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: SPACING.sm,
  },
  consTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: SPACING.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  bulletText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    flex: 1,
  },
  trendRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  trendYearContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignSelf: 'flex-start',
    marginRight: SPACING.sm,
  },
  trendYearText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  trendDescContainer: {
    flex: 1,
  },
  trendDescText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stepNumberText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  skillsTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  skillTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skillTagText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  companiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  companyCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  companyIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  companyIconText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  companyName: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  modalCtaBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalCtaBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalErrorText: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  modalErrorBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalErrorBtnText: {
    color: COLORS.foreground,
    fontWeight: '700',
  },
  careersGridContainer: {
    marginBottom: SPACING.md,
  },
  featuredCareerCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  featuredCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featuredRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  featuredRankText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 4,
  },
  featuredCareerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  featuredCareerDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  featuredCtaBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },
  featuredCtaBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  subCareersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subCareerCard: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    justifyContent: 'space-between',
  },
  subCardHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  subRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: 4,
  },
  subRankText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subFitText: {
    fontSize: 12,
    fontWeight: '800',
  },
  subCareerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
    minHeight: 38,
    marginBottom: SPACING.xs,
  },
  subCareerDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
    marginBottom: SPACING.md,
    minHeight: 48,
  },
  subCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  subCtaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  toast: {
    position: 'absolute',
    bottom: 90,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: 'rgba(16,185,129,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    zIndex: 999,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
