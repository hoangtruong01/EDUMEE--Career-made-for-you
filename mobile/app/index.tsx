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
import Svg, { Line, Circle } from 'react-native-svg';
import { 
  Brain, 
  Rocket, 
  Users, 
  Star, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  BookOpen,
  Award,
  Compass,
  LogIn,
  TrendingUp,
  Layers,
  MessageSquareHeart
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Native SVG Logo component to match the uploaded design exactly
const ProjectLogo = ({ size = 26 }) => {
  return (
    <Svg width={size} height={size * 0.92} viewBox="0 0 120 110" fill="none">
      {/* Connections */}
      <Line x1="60" y1="10" x2="14" y2="88" stroke="#1B2E66" strokeWidth="6" strokeLinecap="round"/>
      <Line x1="14" y1="88" x2="106" y2="88" stroke="#8DC63F" strokeWidth="7" strokeLinecap="round"/>
      <Line x1="60" y1="10" x2="106" y2="88" stroke="#29B8C3" strokeWidth="6" strokeLinecap="round"/>
      <Line x1="60" y1="10" x2="60" y2="56" stroke="#1B2E66" strokeWidth="5" strokeLinecap="round"/>
      <Line x1="14" y1="88" x2="60" y2="56" stroke="#1B2E66" strokeWidth="5" strokeLinecap="round"/>
      <Line x1="106" y1="88" x2="60" y2="56" stroke="#29B8C3" strokeWidth="5" strokeLinecap="round"/>
      {/* Nodes */}
      <Circle cx="60"  cy="10" r="10" fill="#1B2E66"/>
      <Circle cx="60"  cy="56" r="9"  fill="#29B8C3"/>
      <Circle cx="14"  cy="88" r="10" fill="#8DC63F"/>
      <Circle cx="106" cy="88" r="10" fill="#29B8C3"/>
    </Svg>
  );
};

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

const TESTIMONIALS = [
  {
    name: 'Nguyễn Minh Anh',
    school: 'Đại học Bách Khoa HN',
    text: '"Mình không biết nên chọn IT hay kinh tế. Sau bài test, mình hiểu rõ hơn về bản thân và quyết định theo Data Science."',
    avatar: '👩‍🎓',
  },
  {
    name: 'Trần Đức Huy',
    school: 'THPT Chuyên Lê Hồng Phong',
    text: '"Tính năng mô phỏng nghề nghiệp giúp mình hiểu thực tế công việc trước khi chọn ngành đại học."',
    avatar: '👨‍💻',
  },
  {
    name: 'Lê Thu Hà',
    school: 'Đại học FPT',
    text: '"Lộ trình cá nhân hóa giúp mình biết cần học gì, trong bao lâu. Cảm giác như có mentor riêng vậy!"',
    avatar: '👩‍💼',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  
  // Rotating text logic
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  
  // Testimonial Slide State
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  
  // Waterfall Animations values
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  
  const statsFade = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  
  const stepsFade = useRef(new Animated.Value(0)).current;
  const stepsSlide = useRef(new Animated.Value(30)).current;
  
  const featuresFade = useRef(new Animated.Value(0)).current;
  const featuresSlide = useRef(new Animated.Value(30)).current;
  
  const testFade = useRef(new Animated.Value(0)).current;
  const testSlide = useRef(new Animated.Value(30)).current;

  // Testimonial Card Micro-fade Animation
  const testimonialCardFade = useRef(new Animated.Value(1)).current;

  // Pulsing CTA animation
  const scalePulse = useRef(new Animated.Value(1)).current;

  // Staggered Waterfall Entrance
  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(heroFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(statsFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(statsSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(stepsFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(stepsSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(featuresFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(featuresSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(testFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(testSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // CTA Pulse Loop Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scalePulse, {
          toValue: 1.03,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scalePulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Auto-rotate Testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(testimonialCardFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
        Animated.timing(testimonialCardFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  // Manual dot tap handler
  const handleTestimonialTap = (idx: number) => {
    if (idx === activeTestimonial) return;
    Animated.timing(testimonialCardFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTestimonial(idx);
      Animated.timing(testimonialCardFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  };

  // Typing effect logic
  useEffect(() => {
    let timer: any;
    const fullWord = TYPING_WORDS[wordIndex];
    
    const type = () => {
      if (!isDeleting && charIndex < fullWord.length) {
        setCurrentWord(fullWord.slice(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
        timer = setTimeout(type, 100);
      } else if (!isDeleting && charIndex === fullWord.length) {
        timer = setTimeout(() => {
          setIsDeleting(true);
          type();
        }, 1500);
      } else if (isDeleting && charIndex > 0) {
        setCurrentWord(fullWord.slice(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
        timer = setTimeout(type, 50);
      } else {
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
        
        {/* Modern Floating Top Header (Glassmorphic) with Project Vector Logo */}
        <GlassView style={styles.topHeader} intensity={25} tint="dark">
          <View style={styles.topHeaderContent}>
            <View style={styles.logoRow}>
              <ProjectLogo size={32} />
              <Text style={styles.brandTitle}>EDUMEE</Text>
            </View>
            <Pressable 
              onPress={() => router.push('/login')} 
              style={({ pressed }) => [
                styles.topLoginBtn,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <LogIn size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.topLoginText}>Đăng nhập</Text>
            </Pressable>
          </View>
        </GlassView>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View style={[styles.heroContainer, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            {/* Tagline Pill */}
            <View style={styles.tagPill}>
              <Sparkles size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.tagText}>AI Career Companion cho Gen Z</Text>
            </View>

            {/* Title */}
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

            {/* Pulsing Hero CTA Button with Requested Label */}
            <Animated.View style={{ width: '100%', transform: [{ scale: scalePulse }] }}>
              <Pressable 
                onPress={() => router.push('/register')}
                style={({ pressed }) => [
                  styles.primaryCtaButton,
                  { opacity: pressed ? 0.9 : 1 }
                ]}
              >
                <Text style={styles.primaryCtaText}>Bắt đầu khám phá bản thân</Text>
                <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </Pressable>
            </Animated.View>

            <View style={styles.heroNoticeRow}>
              <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.heroNoticeText}>Miễn phí • 5 phút • AI Phân tích</Text>
            </View>
          </Animated.View>

          {/* Statistics Grid */}
          <Animated.View style={[styles.statsSection, { opacity: statsFade, transform: [{ translateY: statsSlide }] }]}>
            {STATS.map((stat, idx) => (
              <GlassView key={idx} style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '20' }]}>
                  <stat.icon size={22} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassView>
            ))}
          </Animated.View>

          {/* 3 Steps Section - NOW Stacked Vertically as Requested for Full Readability! */}
          <Animated.View style={{ opacity: stepsFade, transform: [{ translateY: stepsSlide }] }}>
            <View style={styles.sectionHeader}>
              <View style={styles.smallTagPurple}>
                <Text style={styles.smallTagTextPurple}>LỘ TRÌNH 3 BƯỚC</Text>
              </View>
              <Text style={styles.sectionTitle}>Khởi đầu chỉ với 3 bước</Text>
            </View>

            <View style={styles.stepsVerticalContainer}>
              {STEPS.map((step, idx) => (
                <GlassView key={idx} style={styles.stepCardVertical}>
                  <View style={styles.stepHeaderRow}>
                    <View style={[styles.stepIconBg, { backgroundColor: step.color }]}>
                      <step.icon size={22} color="#FFF" />
                    </View>
                    <Text style={styles.stepNumber}>{step.num}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </GlassView>
              ))}
            </View>
          </Animated.View>

          {/* Key Features Section - Swapped to below steps, High-Fidelity Bento Grid Layout from Web Image! */}
          <Animated.View style={{ opacity: featuresFade, transform: [{ translateY: featuresSlide }] }}>
            <View style={styles.sectionHeader}>
              <View style={styles.smallTag}>
                <Text style={styles.smallTagText}>NỀN TẢNG HƯỚNG NGHIỆP 4.0</Text>
              </View>
              <Text style={styles.bentoSectionTitle}>Mọi thứ bạn cần để</Text>
              <Text style={styles.bentoSectionTitleHighlight}>chọn đúng nghề</Text>
              <Text style={styles.bentoSectionSubtitle}>
                Kết hợp sức mạnh AI và trải nghiệm thực tế để giúp bạn tự tin bước vào tương lai.
              </Text>
            </View>

            {/* Asymmetrical Bento Grid perfectly matching the web image design */}
            <View style={styles.bentoGridContainer}>
              
              {/* Card 1: AI Tư vấn thông minh (Prominent Left Card layout in image) */}
              <GlassView style={styles.bentoLargeCard}>
                <View style={styles.bentoLargeHeader}>
                  <View style={styles.bentoIconBlueSquare}>
                    <Brain size={24} color="#3B82F6" />
                  </View>
                </View>
                <Text style={styles.bentoLargeTitle}>AI Tư vấn thông minh</Text>
                <Text style={styles.bentoLargeDesc}>
                  Thuật toán AI độc quyền phân tích sâu 24 đặc điểm tính cách, dự đoán độ tương thích với 500+ ngành nghề khác nhau với độ chính xác 98%.
                </Text>
                <View style={styles.bentoBadgesRow}>
                  <View style={styles.bentoBadge}><Text style={styles.bentoBadgeText}>NLP Analysis</Text></View>
                  <View style={styles.bentoBadge}><Text style={styles.bentoBadgeText}>Predictive Modeling</Text></View>
                </View>
              </GlassView>

              {/* Row: Card 2 & Card 3 (Lộ trình cá nhân & Mô phỏng nghề) */}
              <View style={styles.bentoRow}>
                {/* Card 2: Lộ trình cá nhân */}
                <GlassView style={styles.bentoHalfCard}>
                  <View style={styles.bentoIconBgGreen}>
                    <TrendingUp size={18} color="#10B981" />
                  </View>
                  <Text style={styles.bentoSmallTitle}>Lộ trình cá nhân</Text>
                  <Text style={styles.bentoSmallDesc}>
                    Roadmap chi tiết từ học tập đến kỹ năng mềm cho riêng bạn.
                  </Text>
                </GlassView>

                {/* Card 3: Mô phỏng nghề */}
                <GlassView style={styles.bentoHalfCard}>
                  <View style={styles.bentoIconBgPurple}>
                    <Layers size={18} color="#8B5CF6" />
                  </View>
                  <Text style={styles.bentoSmallTitle}>Mô phỏng nghề</Text>
                  <Text style={styles.bentoSmallDesc}>
                    Trải nghiệm thực tế thông qua các dự án mô phỏng AI.
                  </Text>
                </GlassView>
              </View>

              {/* Row: Card 4 & Card 5 (Review 360 & Badge & Achievement) */}
              <View style={styles.bentoRow}>
                {/* Card 4: Review 360° */}
                <GlassView style={styles.bentoHalfCard}>
                  <View style={styles.bentoIconBgYellow}>
                    <MessageSquareHeart size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.bentoSmallTitle}>Review 360°</Text>
                  <Text style={styles.bentoSmallDesc}>
                    Góc nhìn đa chiều từ những chuyên gia đang làm trong ngành.
                  </Text>
                </GlassView>

                {/* Card 5: Badge & Achievement */}
                <GlassView style={styles.bentoHalfCard}>
                  <View style={styles.bentoIconBgPink}>
                    <Award size={18} color="#EC4899" />
                  </View>
                  <Text style={styles.bentoSmallTitle}>Badge & Achievement</Text>
                  <Text style={styles.bentoSmallDesc}>
                    Nhận các Badge huy hiệu danh giá, nâng tầm Profile học sinh.
                  </Text>
                </GlassView>
              </View>
              
            </View>
          </Animated.View>

          {/* Testimonials Section */}
          <Animated.View style={{ opacity: testFade, transform: [{ translateY: testSlide }] }}>
            <View style={styles.sectionHeader}>
              <View style={styles.smallTag}>
                <Text style={styles.smallTagText}>ĐƯỢC KIỂM CHỨNG</Text>
              </View>
              <Text style={styles.sectionTitle}>Học sinh nói gì về EDUMEE?</Text>
            </View>

            <Animated.View style={{ opacity: testimonialCardFade }}>
              <GlassView style={styles.socialProofCard}>
                <View style={styles.socialHeaderRow}>
                  <Award size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
                  <Text style={styles.socialTitle}>Trải nghiệm thực tế</Text>
                  <View style={styles.starsRow}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 2 }} />
                    ))}
                  </View>
                </View>
                
                <Text style={styles.socialBody}>
                  {TESTIMONIALS[activeTestimonial].text}
                </Text>
                
                <View style={styles.socialAuthorRow}>
                  <View style={styles.authorAvatar}>
                    <Text style={{ fontSize: 16 }}>{TESTIMONIALS[activeTestimonial].avatar}</Text>
                  </View>
                  <View>
                    <Text style={styles.authorName}>{TESTIMONIALS[activeTestimonial].name}</Text>
                    <Text style={styles.authorSub}>{TESTIMONIALS[activeTestimonial].school}</Text>
                  </View>
                </View>
              </GlassView>
            </Animated.View>

            {/* Indicator Dots for Multiple Testimonials */}
            <View style={styles.dotsRow}>
              {TESTIMONIALS.map((_, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleTestimonialTap(idx)}
                  style={styles.dotTouchTarget}
                >
                  <View 
                    style={[
                      styles.dot, 
                      { 
                        backgroundColor: activeTestimonial === idx ? COLORS.primary : 'rgba(255, 255, 255, 0.2)',
                        width: activeTestimonial === idx ? 18 : 6,
                      }
                    ]} 
                  />
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Bottom space to avoid overlap with floating sticky actions */}
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
    backgroundColor: 'rgba(15, 23, 42, 0.82)', // Ultra-premium obsidian background overlay
  },
  topHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 24,
    left: SPACING.md,
    right: SPACING.md,
    height: 56,
    borderRadius: RADIUS.lg,
    zIndex: 99,
  },
  topHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.foreground,
    letterSpacing: 2.5,
  },
  topLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  topLoginText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 120 : 100, // Ensure no overlap with sticky header
    paddingBottom: 40, // Proper bottom padding without floating actions
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
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
    fontSize: 11,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  animatedTitleHighlight: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(59, 130, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  rotatingTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rotatingTextPrefix: {
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '600',
  },
  rotatingTextActive: {
    fontSize: 15,
    color: COLORS.secondary,
    fontWeight: '800',
  },
  cursor: {
    fontSize: 15,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  heroDesc: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  primaryCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  heroNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  heroNoticeText: {
    fontSize: 11,
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
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 17,
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
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  smallTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  smallTagPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  smallTagText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  smallTagTextPurple: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
    paddingHorizontal: SPACING.xs,
  },
  stepsVerticalContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  stepCardVertical: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepIconBg: {
    width: 44,
    height: 44,
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
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
  bentoSectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.foreground,
    textAlign: 'center',
  },
  bentoSectionTitleHighlight: {
    fontSize: 28,
    fontWeight: '900',
    color: '#C084FC', // Beautiful purple gradient primary color
    textAlign: 'center',
    marginTop: 2,
    marginBottom: SPACING.xs,
  },
  bentoSectionSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
  },
  bentoGridContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  bentoLargeCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderLeftWidth: 2,
    borderLeftColor: '#3B82F6', // Beautiful subtle glowing left border as in the web image
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  bentoLargeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Icon on the top right
    marginBottom: SPACING.sm,
  },
  bentoIconBlueSquare: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Rounded blue square
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoLargeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  bentoLargeDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  bentoBadgesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  bentoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  bentoBadgeText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  bentoHalfCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  bentoIconBgGreen: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(16, 185, 129, 0.12)', // Subtle green background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bentoIconBgPurple: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(139, 92, 246, 0.12)', // Subtle purple background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bentoIconBgYellow: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(245, 158, 11, 0.12)', // Subtle yellow background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bentoIconBgPink: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(236, 72, 153, 0.12)', // Subtle pink background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bentoSmallTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  bentoSmallDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  socialProofCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    minHeight: 180,
    justifyContent: 'center',
  },
  socialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  socialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialBody: {
    fontSize: 13,
    color: COLORS.foreground,
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  socialAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  authorSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  dotTouchTarget: {
    padding: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  footerSpace: {
    height: 40,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 16,
    left: SPACING.md,
    right: SPACING.md,
    height: 72,
    borderRadius: RADIUS.xl,
    zIndex: 99,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  stickyBottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  stickyRegisterBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  stickyRegisterText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: '700',
  },
  stickyLoginBtn: {
    flex: 1.6,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  stickyLoginText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
