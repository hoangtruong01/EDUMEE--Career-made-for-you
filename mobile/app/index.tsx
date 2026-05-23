import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ImageBackground, 
  Pressable, 
  Dimensions, 
  Animated,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../src/theme';
import { GlassView } from '../src/components/GlassView';
import { 
  Brain, 
  Rocket, 
  Users, 
  Star, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  BookOpen,
  Award
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Rotating keywords just like the web landing page
const TYPING_WORDS = [
  'Software Engineer 💻',
  'UI/UX Designer 🎨',
  'Product Manager 🚀',
  'Data Scientist 🧠',
  'Digital Marketer 📊',
];

const STATS = [
  { value: '10,000+', label: 'Học sinh tin dùng', icon: Users, color: '#3B82F6' },
  { value: '4.8/5', label: 'Đánh giá trung bình', icon: Star, color: '#F59E0B' },
  { value: '50+', label: 'Ngành nghề phân tích', icon: BookOpen, color: '#10B981' },
];

const STEPS = [
  {
    num: '01',
    icon: Brain,
    title: 'Làm bài test tính cách',
    desc: 'Trả lời các câu hỏi ngắn để AI hiểu rõ tính cách & sở thích của bạn.',
    color: '#3B82F6',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'AI phân tích năng lực',
    desc: 'Trí tuệ nhân tạo phân tích điểm mạnh và xu hướng nghề nghiệp.',
    color: '#8B5CF6',
  },
  {
    num: '03',
    icon: Rocket,
    title: 'Nhận gợi ý sự nghiệp',
    desc: 'Nhận lộ trình phát triển chi tiết cùng kết nối Mentor chuyên nghiệp.',
    color: '#F97316',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  
  // Rotating text logic
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  
  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Fade-in animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Typing effect logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullWord = TYPING_WORDS[wordIndex];
    
    const type = () => {
      if (!isDeleting && charIndex < fullWord.length) {
        // Typing
        setCurrentWord(fullWord.slice(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
        timer = setTimeout(type, 100);
      } else if (!isDeleting && charIndex === fullWord.length) {
        // Finished typing, wait before deleting
        timer = setTimeout(() => {
          setIsDeleting(true);
          type();
        }, 1500);
      } else if (isDeleting && charIndex > 0) {
        // Deleting
        setCurrentWord(fullWord.slice(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
        timer = setTimeout(type, 50);
      } else {
        // Reset to next word
        setIsDeleting(false);
        setWordIndex(prev => (prev + 1) % TYPING_WORDS.length);
        setCharIndex(0);
        timer = setTimeout(type, 300);
      }
    };

    timer = setTimeout(type, 100);
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex]);

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        {/* Glow Orbs Overlay */}
        <View style={styles.glowOverlay} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View style={[styles.heroContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Tagline Pill */}
            <View style={styles.tagPill}>
              <Sparkles size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.tagText}>AI Career Companion cho Gen Z</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>EDUMEE</Text>
            <Text style={styles.subTitle}>Khám phá con đường</Text>
            <Text style={styles.animatedTitleHighlight}>sự nghiệp của bạn</Text>

            {/* Rotating Career Text */}
            <View style={styles.rotatingTextWrapper}>
              <Text style={styles.rotatingTextPrefix}>Trở thành </Text>
              <Text style={styles.rotatingTextActive}>{currentWord}</Text>
              <Text style={styles.cursor}>|</Text>
            </View>

            <Text style={styles.heroDesc}>
              AI phân tích tính cách & sở thích cá nhân, gợi ý ngành nghề phù hợp kèm lộ trình học tập tối ưu – hoàn toàn miễn phí.
            </Text>

            {/* Hero CTA Button */}
            <Pressable 
              onPress={() => router.push('/register')}
              style={({ pressed }) => [
                styles.primaryCtaButton,
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
            >
              <Text style={styles.primaryCtaText}>Bắt đầu bài test miễn phí</Text>
              <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />
            </Pressable>

            <View style={styles.heroNoticeRow}>
              <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.heroNoticeText}>Miễn phí • 5 phút • AI Phân tích</Text>
            </View>
          </Animated.View>

          {/* Statistics Grid */}
          <View style={styles.statsSection}>
            {STATS.map((stat, idx) => (
              <GlassView key={idx} style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '20' }]}>
                  <stat.icon size={22} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassView>
            ))}
          </View>

          {/* 3 Steps Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.smallTag}>
              <Text style={styles.smallTagText}>LỘ TRÌNH 3 BƯỚC</Text>
            </View>
            <Text style={styles.sectionTitle}>Khởi đầu chỉ với 3 bước</Text>
          </View>

          <View style={styles.stepsContainer}>
            {STEPS.map((step, idx) => (
              <GlassView key={idx} style={styles.stepCard}>
                <View style={styles.stepHeaderRow}>
                  <View style={[styles.stepIconBg, { backgroundColor: step.color }]}>
                    <step.icon size={24} color="#FFF" />
                  </View>
                  <Text style={styles.stepNumber}>{step.num}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </GlassView>
            ))}
          </View>

          {/* Social Proof Banner */}
          <GlassView style={styles.socialProofCard}>
            <View style={styles.socialHeaderRow}>
              <Award size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.socialTitle}>Được kiểm chứng</Text>
            </View>
            <Text style={styles.socialBody}>
              "Mình không biết nên chọn công nghệ hay kinh doanh. Bài trắc nghiệm Holland của EDUMEE đã giúp mình định hình và có lộ trình chuyển tiếp cực rõ ràng!"
            </Text>
            <View style={styles.socialAuthorRow}>
              <View style={styles.authorAvatar}>
                <Text style={{ fontSize: 16 }}>👩‍🎓</Text>
              </View>
              <View>
                <Text style={styles.authorName}>Nguyễn Minh Anh</Text>
                <Text style={styles.authorSub}>Đại Học Quốc Gia Hà Nội</Text>
              </View>
            </View>
          </GlassView>

          {/* Welcome Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <Pressable 
              onPress={() => router.push('/login')}
              style={({ pressed }) => [
                styles.loginButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Text style={styles.loginButtonText}>Đăng nhập ngay</Text>
            </Pressable>

            <Pressable 
              onPress={() => router.push('/register')}
              style={({ pressed }) => [
                styles.registerButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Text style={styles.registerButtonText}>Tạo tài khoản mới</Text>
            </Pressable>
          </View>

          {/* Admin Hidden Portal Access */}
          <View style={styles.adminAccessRow}>
            <Pressable onPress={() => router.push('/admin-login')}>
              <Text style={styles.adminAccessText}>Truy cập Cổng Quản trị viên</Text>
            </Pressable>
          </View>

          <View style={styles.footerSpace} />
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Beautiful deep backdrop overlay
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 40,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  tagText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.foreground,
    letterSpacing: 4,
    marginBottom: SPACING.xs,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  animatedTitleHighlight: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
    textShadowColor: 'rgba(59, 130, 246, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  rotatingTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  rotatingTextPrefix: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '600',
  },
  rotatingTextActive: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '800',
  },
  cursor: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  heroDesc: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  primaryCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryCtaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  heroNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  heroNoticeText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
    marginTop: SPACING.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  statIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  smallTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  smallTagText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.foreground,
  },
  stepsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  stepCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepIconBg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.08)',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  socialProofCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xxl,
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  socialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  socialBody: {
    fontSize: 14,
    color: COLORS.foreground,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  socialAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  authorSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  actionButtonsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  loginButton: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
  adminAccessRow: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  adminAccessText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerSpace: {
    height: 60,
  },
});
