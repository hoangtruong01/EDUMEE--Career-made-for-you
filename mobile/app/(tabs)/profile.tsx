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
import { COLORS, SPACING, RADIUS, useTheme, LIGHT_COLORS } from '../../src/theme';
import * as ImagePicker from 'expo-image-picker';
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
const CHART_SIZE = width * 0.52;
const CENTER = CHART_SIZE / 2;
const RADIUS_CHART = (CHART_SIZE / 2) * 0.65;

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
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const styles = getStyles(colors);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'riasec'>('riasec');
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [testResult, setTestResult] = useState<any>(null);
  const [recommendedCareers, setRecommendedCareers] = useState<any[]>([]);

  // Dynamic Wallet state
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Edit Profile States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('other');
  const [editDob, setEditDob] = useState('');
  const [editCity, setEditCity] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'EDUMEE cần quyền truy cập ảnh của bạn để đổi ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadAvatar(selectedImage.uri);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      showToast('Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setIsLoading(true);
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'avatar.jpg');
      } else {
        formData.append('file', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const res = await api.patch('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newAvatar = res.data?.avatar || res.data?.data?.avatar;
      if (newAvatar) {
        setUserData((prev: any) => ({ ...prev, avatar: newAvatar }));
        showToast('Cập nhật ảnh đại diện thành công!');
      }
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditProfile = () => {
    setEditName(userData?.name || '');
    setEditPhone(userData?.phone_number || '');
    setEditGender(userData?.gender || 'other');
    let dobString = '';
    if (userData?.date_of_birth) {
      try {
        dobString = new Date(userData.date_of_birth).toISOString().split('T')[0];
      } catch {
        dobString = userData.date_of_birth;
      }
    }
    setEditDob(dobString);
    setEditCity(userData?.Address?.city || userData?.address?.city || '');
    setIsEditProfileOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      showToast('Tên không được để trống');
      return;
    }
    setIsSavingProfile(true);
    try {
      const payload = {
        name: editName.trim(),
        phone_number: editPhone.trim(),
        gender: editGender,
        date_of_birth: editDob || undefined,
        address: {
          city: editCity.trim()
        }
      };
      const res = await api.patch('/users/me', payload);
      const updatedUser = res.data?.data || res.data;
      if (updatedUser) {
        setUserData(updatedUser);
        setIsEditProfileOpen(false);
        showToast('Cập nhật thông tin thành công!');
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      showToast(err.response?.data?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchProfileAndResult = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true); else setIsLoading(true);

      const userRes = await api.get('/users/me');
      const profile = userRes.data?.data || userRes.data;
      setUserData(profile);
      const role = profile?.role || 'user';
      setUserRole(role);

      // Fetch dynamic wallet balance
      try {
        const walletRes = await api.get('/wallet/me');
        const balance = walletRes.data?.availableBalance ?? walletRes.data?.data?.availableBalance ?? 0;
        setWalletBalance(balance);
      } catch (e) {
        console.error('Fetch wallet balance error:', e);
      }

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
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Brain size={16} color={activeTab === 'riasec' ? colors.primary : colors.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, activeTab === 'riasec' && styles.segmentBtnTextActive]}>Kết quả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            style={[styles.segmentBtn, activeTab === 'profile' && styles.segmentBtnActive]}
          >
            <User size={16} color={activeTab === 'profile' ? colors.primary : colors.muted} style={{ marginRight: 6 }} />
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {activeTab === 'profile' ? (
          /* 👤 PERSONAL PROFILE & WALLET SEGMENT */
          <View>
            {/* User Info Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                <Image
                  source={{ uri: userData?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }}
                  style={styles.avatar}
                />
                <View style={styles.avatarEditOverlay}>
                  <Pencil size={11} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userData?.name || 'Học viên EDUMEE'}</Text>
                <Text style={styles.userEmail}>{userData?.email || 'user@edumee.vn'}</Text>
                <View style={styles.badge}>
                  <Award size={12} color={colors.secondary} style={{ marginRight: 4 }} />
                  <Text style={styles.badgeText}>
                    {userRole === 'admin' ? 'Quản trị viên' : 'Gói Thành viên'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Wallet & AI Limit Card */}
            <GlassView tint={isDarkMode ? 'dark' : 'light'} style={styles.sectionCard}>
              <View style={styles.cardHeaderWithIcon}>
                <Wallet size={20} color={colors.primary} />
                <Text style={styles.cardTitleInline}>Ví & Hạn mức AI</Text>
              </View>

              <View style={styles.walletRow}>
                <View>
                  <Text style={styles.walletLabel}>Số dư ví EDUMEE</Text>
                  <Text style={styles.walletBalance}>{walletBalance.toLocaleString('vi-VN')}đ</Text>
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Nạp tiền', 'Tính năng nạp tiền qua cổng thanh toán đang được xử lý.')} style={styles.depositBtn}>
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
                <View style={[styles.progressBarFill, { width: '33%', backgroundColor: colors.primary }]} />
              </View>

              <View style={styles.quotaRow}>
                <Text style={styles.quotaLabel}>Tạo Lộ trình học AI (Roadmap)</Text>
                <Text style={styles.quotaValue}>2 / 5 lượt</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '40%', backgroundColor: colors.secondary }]} />
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
            <GlassView tint={isDarkMode ? 'dark' : 'light'} style={styles.sectionCard}>
              <View style={styles.cardHeaderWithIcon}>
                <Sparkles size={20} color={colors.secondary} />
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
              <TouchableOpacity onPress={openEditProfile} style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <Pencil size={20} color={colors.primary} />
                  <Text style={styles.actionLabel}>Cập nhật thông tin cá nhân</Text>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity onPress={pickImage} style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <Award size={20} color={colors.secondary} />
                  <Text style={styles.actionLabel}>Thay đổi ảnh đại diện</Text>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleTheme} style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <Sparkles size={20} color={isDarkMode ? colors.secondary : colors.primary} />
                  <Text style={styles.actionLabel}>
                    Giao diện: {isDarkMode ? 'Tối (Dark Mode)' : 'Sáng (Light Mode)'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {isDarkMode ? 'Đổi sang Sáng' : 'Đổi sang Tối'}
                  </Text>
                  <ChevronRight size={18} color={colors.muted} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleExportPDF} style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <FileDown size={20} color={colors.muted} />
                  <Text style={styles.actionLabel}>Xuất báo cáo PDF RIASEC</Text>
                </View>
                <ChevronRight size={18} color={colors.muted} />
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
                  <View style={styles.careersThreeColumnRow}>
                    {recommendedCareers.slice(0, 3).map((item, idx) => {
                      const rankNum = idx + 1;
                      const fitColor = rankNum === 1 ? '#F59E0B' : rankNum === 2 ? COLORS.primary : '#10B981';
                      return (
                        <GlassView key={item._id || item.id || idx} style={styles.threeColumnCard}>
                          {/* Header Rank Badge & Score */}
                          <View style={styles.threeColumnCardHeader}>
                            <View style={[styles.threeColumnRankBadge, { backgroundColor: fitColor + '15' }]}>
                              <Text style={[styles.threeColumnRankText, { color: fitColor }]}>HẠNG {rankNum}</Text>
                            </View>
                            <Text style={[styles.threeColumnFitText, { color: fitColor }]}>
                              {Math.round(item.overallFitScore || 0)}% Match
                            </Text>
                          </View>

                          {/* Career Title */}
                          <Text style={styles.threeColumnCareerTitle} numberOfLines={3}>
                            {item.careerTitle}
                          </Text>
                          
                          {/* Snippet / Strengths */}
                          <Text style={styles.threeColumnCareerDesc} numberOfLines={3}>
                            {idx === 0 
                              ? (item.aiExplanation || 'AI đã phân tích năng lực cốt lõi.') 
                              : (item.strengths?.join('. ') || 'Tố chất nổi bật.')}
                          </Text>

                          {/* CTA Button */}
                          <TouchableOpacity 
                            onPress={() => fetchCareerDetail(item.careerTitle)} 
                            style={[styles.threeColumnCtaBtn, { backgroundColor: fitColor }]}
                          >
                            <Text style={styles.threeColumnCtaBtnText}>Chi tiết</Text>
                            <ChevronRight size={10} color="#fff" />
                          </TouchableOpacity>
                        </GlassView>
                      );
                    })}
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

      {/* ✏️ EDIT PROFILE MODAL */}
      <Modal
        visible={isEditProfileOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditProfileOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsEditProfileOpen(false)}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} />
          </Pressable>
          
          <View style={styles.editProfileModalContent}>
            {/* Modal Header Handle */}
            <View style={styles.modalHandle} />
            
            {/* Close Button */}
            <TouchableOpacity onPress={() => setIsEditProfileOpen(false)} style={styles.modalCloseBtn}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[styles.modalCareerTitle, { fontSize: 20, marginBottom: SPACING.lg }]}>
                ✏️ Cập nhật thông tin cá nhân
              </Text>

              {/* Tên */}
              <View style={styles.formInputWrapper}>
                <Text style={styles.formLabel}>Họ và tên</Text>
                <TextInput
                  style={styles.inputField}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nhập họ và tên..."
                  placeholderTextColor={colors.muted}
                />
              </View>

              {/* Số điện thoại */}
              <View style={styles.formInputWrapper}>
                <Text style={styles.formLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.inputField}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Nhập số điện thoại..."
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Giới tính */}
              <View style={styles.formInputWrapper}>
                <Text style={styles.formLabel}>Giới tính</Text>
                <View style={styles.genderSelector}>
                  {(['male', 'female', 'other'] as const).map((g) => {
                    const label = g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác';
                    const active = editGender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setEditGender(g)}
                        style={[styles.genderBtn, active && styles.genderBtnActive]}
                      >
                        <Text style={[styles.genderText, active && styles.genderTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Ngày sinh */}
              <View style={styles.formInputWrapper}>
                <Text style={styles.formLabel}>Ngày sinh (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.inputField}
                  value={editDob}
                  onChangeText={setEditDob}
                  placeholder="Ví dụ: 2001-09-28"
                  placeholderTextColor={colors.muted}
                />
              </View>

              {/* Thành phố */}
              <View style={styles.formInputWrapper}>
                <Text style={styles.formLabel}>Thành phố</Text>
                <TextInput
                  style={styles.inputField}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="Nhập tỉnh/thành phố..."
                  placeholderTextColor={colors.muted}
                />
              </View>

              {/* Save & Cancel buttons */}
              <View style={[styles.formActions, { marginTop: SPACING.lg }]}>
                <TouchableOpacity 
                  onPress={handleUpdateProfile} 
                  disabled={isSavingProfile} 
                  style={styles.saveBtn}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditProfileOpen(false)} style={styles.cancelBtn}>
                  <X size={16} color={colors.muted} style={{ marginRight: 4 }} />
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    })
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentBtnTextActive: {
    color: colors.foreground,
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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
  },
  userEmail: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background === '#0F172A' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  badgeText: {
    color: colors.secondary,
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
    color: colors.foreground,
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
    color: colors.foreground,
  },
  noChartContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noChartText: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  takeTestBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  takeTestText: {
    color: '#fff',
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
    color: colors.muted,
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 2,
  },
  depositBtn: {
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  depositText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: SPACING.md,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: SPACING.md,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quotaLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  quotaValue: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)',
    borderRadius: 3,
    marginBottom: SPACING.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  planDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  upgradeBtn: {
    backgroundColor: colors.secondary,
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.01)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: SPACING.md,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  footerSpace: {
    height: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
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
    color: colors.muted,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
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
    color: colors.muted,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryReportBtnText: {
    color: colors.muted,
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
    color: colors.foreground,
  },
  barScore: {
    fontSize: 13,
    fontWeight: '800',
  },
  barBg: {
    height: 8,
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barDesc: {
    fontSize: 11,
    color: colors.muted,
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
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  introDesc: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  startBtn: {
    width: '100%',
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.primary,
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
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  adminHeaderLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 2,
  },
  adminHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 2,
  },
  addQBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
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
    color: colors.foreground,
    fontSize: 13,
    height: 36,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none' as any } })
  },
  countText: {
    color: colors.muted,
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
    color: colors.foreground,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  textArea: {
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    padding: SPACING.sm,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Platform.select({ web: { outlineStyle: 'none' as any } })
  },
  inputField: {
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    paddingHorizontal: SPACING.sm,
    height: 42,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: 'none' as any } })
  },
  dimPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dimPillText: {
    color: colors.muted,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.muted,
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  qOpt: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  retryAssessmentBtn: {
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  retryAssessmentBtnText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    height: '85%',
    paddingTop: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.15)',
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
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
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
    color: colors.foreground,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  modalLoadingSubtext: {
    fontSize: 13,
    color: colors.muted,
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
    color: colors.foreground,
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
    color: colors.primary,
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
    color: colors.foreground,
    marginBottom: SPACING.md,
  },
  modalGlassCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  modalOverviewText: {
    fontSize: 14,
    color: colors.muted,
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
    color: colors.muted,
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
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  trendDescContainer: {
    flex: 1,
  },
  trendDescText: {
    fontSize: 13,
    color: colors.muted,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    color: colors.muted,
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
    color: colors.primary,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  companyName: {
    flex: 1,
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  modalCtaBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    shadowColor: colors.primary,
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
    color: colors.muted,
    marginBottom: SPACING.md,
  },
  modalErrorBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalErrorBtnText: {
    color: colors.foreground,
    fontWeight: '700',
  },
  careersThreeColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
  },
  threeColumnCard: {
    width: '32%',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    justifyContent: 'space-between',
    minHeight: 240,
  },
  threeColumnCardHeader: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  threeColumnRankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: 2,
  },
  threeColumnRankText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  threeColumnFitText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  threeColumnCareerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
    lineHeight: 16,
    minHeight: 48,
    marginBottom: 4,
  },
  threeColumnCareerDesc: {
    fontSize: 9,
    color: COLORS.muted,
    lineHeight: 13,
    marginBottom: 10,
    minHeight: 39,
  },
  threeColumnCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    width: '100%',
  },
  threeColumnCtaBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
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
  
  // NEW EDIT PROFILE FORM STYLES
  editProfileModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    paddingTop: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formInputWrapper: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  genderSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderBtn: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background === '#0F172A' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
