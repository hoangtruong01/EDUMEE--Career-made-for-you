'use client';

import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { motion, type Variants } from 'framer-motion';

import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Code2,
  DollarSign,
  Layers,
  MessageSquareHeart,
  Moon,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Sun,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const landingThemeSubscribe = (cb: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};
const getLandingTheme = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));

/* ─── Animation Variants ─── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};


const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};


const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'backOut' } },
};


/* ─── Typing Hook ─── */
function useTyping(words: string[], speed = 80, pause = 1800) {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = words[wordIdx];
    const delay = deleting ? speed / 2 : charIdx === current.length ? pause : speed;
    const t = setTimeout(() => {
      if (!deleting && charIdx < current.length) {
        setText(current.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      } else if (!deleting && charIdx === current.length) {
        setDeleting(true);
      } else if (deleting && charIdx > 0) {
        setText(current.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      } else {
        setDeleting(false);
        setWordIdx(i => (i + 1) % words.length);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);
  return text;
}

/* ─── Data ─── */
const stats = [
  { value: '10,000+', label: 'Học sinh đã sử dụng', icon: Users },
  { value: '4.8/5', label: 'Đánh giá trung bình', icon: Star },
  { value: '50+', label: 'Ngành nghề phân tích', icon: BookOpen },
];
const steps = [
  {
    num: '01',
    icon: ClipboardCheck,
    title: 'Làm bài test tính cách',
    desc: 'Trả lời các câu hỏi ngắn để AI hiểu rõ tính cách và sở thích của bạn.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    num: '02',
    icon: Brain,
    title: 'AI phân tích năng lực',
    desc: 'Trí tuệ nhân tạo phân tích điểm mạnh, sở thích và xu hướng nghề nghiệp.',
    color: 'from-violet-500 to-purple-400',
  },
  {
    num: '03',
    icon: Rocket,
    title: 'Nhận gợi ý nghề nghiệp',
    desc: 'Nhận danh sách nghề nghiệp phù hợp kèm lộ trình phát triển chi tiết.',
    color: 'from-orange-500 to-amber-400',
  },
];

const careerPreviews = [
  {
    icon: Code2,
    title: 'Software Engineer',
    desc: 'Xây dựng phần mềm, ứng dụng và hệ thống công nghệ phục vụ hàng triệu người dùng.',
    difficulty: 4,
    salary: '15 – 45 triệu/tháng',
    gradient: 'from-blue-500/10 to-cyan-500/5',
    iconBg: 'bg-blue-500/10 text-blue-500',
  },
  {
    icon: Palette,
    title: 'UI/UX Designer',
    desc: 'Thiết kế giao diện và trải nghiệm người dùng cho sản phẩm số hiện đại.',
    difficulty: 3,
    salary: '12 – 35 triệu/tháng',
    gradient: 'from-violet-500/10 to-pink-500/5',
    iconBg: 'bg-violet-500/10 text-violet-500',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Product Manager',
    desc: 'Dẫn dắt sản phẩm từ ý tưởng đến thực tế, kết hợp công nghệ và kinh doanh.',
    difficulty: 4,
    salary: '18 – 50 triệu/tháng',
    gradient: 'from-orange-500/10 to-amber-500/5',
    iconBg: 'bg-orange-500/10 text-orange-500',
  },
];

const testimonials = [
  {
    name: 'Minh Anh',
    school: 'Đại học Bách Khoa HN',
    text: '"Mình không biết nên chọn IT hay kinh tế. Sau bài test, mình hiểu rõ hơn về bản thân và quyết định theo Data Science."',
    avatar: '👩‍🎓',
  },
  {
    name: 'Đức Huy',
    school: 'THPT Chuyên Lê Hồng Phong',
    text: '"Tính năng mô phỏng nghề nghiệp giúp mình hiểu thực tế công việc trước khi chọn ngành đại học."',
    avatar: '👨‍💻',
  },
  {
    name: 'Thu Hà',
    school: 'Đại học FPT',
    text: '"Lộ trình cá nhân hóa giúp mình biết cần học gì, trong bao lâu. Cảm giác như có mentor riêng vậy!"',
    avatar: '👩‍💼',
  },
];

/* ─── Component ─── */
const TYPING_WORDS = [
  'Software Engineer 💻',
  'UI/UX Designer 🎨',
  'Product Manager 🚀',
  'Data Scientist 🧠',
  'Digital Marketer 📊',
];

const Landing = () => {
  const isDark = useSyncExternalStore(landingThemeSubscribe, getLandingTheme, () => false);
  const typedText = useTyping(TYPING_WORDS);

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark);
  }

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new StorageEvent('storage'));
  }, [isDark]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ═══ Navigation Bar ═══ */}
      <nav className="bg-background/80 fixed top-0 right-0 left-0 z-50 border-b border-white/10 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display flex items-center gap-2 text-xl font-bold">
            <Image
              src="/edumee-logo-icon.svg"
              alt="Edumee logo"
              width={30}
              height={28}
              className="flex-shrink-0"
            />
            <span>Edumee</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Chế độ sáng/tối" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/personality-test">
              <Button
                variant="hero"
                size="sm"
                className="gap-1.5 rounded-full px-3 text-xs sm:px-5 sm:text-sm"
              >
                <span className="hidden sm:inline">Bắt đầu ngay</span>
                <span className="sm:hidden">Bắt đầu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="aurora-bg relative min-h-[90vh] overflow-hidden pt-16 flex items-center">
        {/* Aurora orbs */}
        <div className="gradient-orb h-[600px] w-[600px] -top-32 -right-32 bg-blue-500/20" />
        <div className="gradient-orb h-[500px] w-[500px] -bottom-20 -left-20 bg-violet-500/15" style={{animationDelay:'2s'}} />
        <div className="gradient-orb h-[300px] w-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-400/10" style={{animationDelay:'4s'}} />

        <div className="relative container py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left content */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp}>
                <span className="tag-pill mb-6">
                  <Zap className="h-3.5 w-3.5" />
                  AI Career Companion cho Gen Z
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-display mb-4 text-4xl leading-[1.1] font-extrabold tracking-tight md:text-5xl lg:text-6xl"
              >
                Khám phá con đường
                <span className="text-gradient-animate block mt-1">sự nghiệp của bạn</span>
              </motion.h1>

              <motion.div variants={fadeUp} className="mb-6">
                <p className="text-muted-foreground text-xl font-medium">
                  Trở thành{' '}
                  <span className="text-gradient-hero typing-cursor font-bold">{typedText}</span>
                </p>
              </motion.div>

              <motion.p variants={fadeUp} className="text-muted-foreground mb-8 max-w-lg text-base leading-relaxed">
                AI phân tích tính cách & sở thích, gợi ý ngành nghề phù hợp kèm lộ trình
                chi tiết – hoàn toàn miễn phí trong 5 phút.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link href="/personality-test">
                  <Button
                    variant="hero"
                    size="lg"
                    className="shimmer-btn glow-ring gap-2 rounded-full px-8 py-6 text-base font-bold"
                  >
                    Bắt đầu bài test miễn phí
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Miễn phí • 5 phút • Không cần đăng ký</span>
                </div>
              </motion.div>

              {/* Social proof mini */}
              <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['👩‍💻','👨‍🎓','👩‍🎓','👨‍💼','👩‍💼'].map((e, i) => (
                    <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-sm">{e}</div>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-semibold">10,000+</span> bạn trẻ đã tìm thấy nghề phù hợp
                </p>
              </motion.div>
            </motion.div>

            {/* Right illustration */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: 'backOut' }}
              className="relative"
            >
              <div className="shadow-elevated relative overflow-hidden rounded-3xl ring-1 ring-white/10">
                <Image
                  src="/hero-illustration.png"
                  alt="AI Career Journey"
                  width={700}
                  height={467}
                  className="h-auto w-full"
                  priority
                />
              </div>

              {/* Badge — Trending */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="bento-card absolute -top-4 -right-4 hidden items-center gap-2 px-4 py-3 sm:flex"
              >
                <div className="bg-gradient-mint flex h-9 w-9 items-center justify-center rounded-full">
                  <TrendingUp className="text-white h-4 w-4" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Xu hướng 2026</div>
                  <div className="text-sm font-bold">AI & Data Science</div>
                </div>
              </motion.div>

              {/* Badge — Score */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="bento-card absolute -bottom-4 -left-4 hidden items-center gap-2 px-4 py-3 sm:flex"
              >
                <div className="bg-gradient-accent flex h-9 w-9 items-center justify-center rounded-full">
                  <Award className="text-white h-4 w-4" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Bạn hợp với</div>
                  <div className="text-sm font-bold">92% Tech 🎯</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ STATISTICS BENTO V2 ═══ */}
      <section className="py-12 md:py-20">
        <div className="container">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-3"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                className="bento-card-v2 group p-8 text-center flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="border-beam opacity-0 group-hover:opacity-40 transition-opacity" />
                <div className="bg-primary/10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/20">
                  <stat.icon className="text-primary h-7 w-7" />
                </div>
                <div className="stat-number font-display text-5xl font-black tracking-tighter">
                  {stat.value}
                </div>
                <div className="text-muted-foreground mt-2 text-sm font-bold uppercase tracking-widest opacity-60">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 md:py-32 relative">
        <div className="container">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <span className="tag-pill mx-auto mb-4 bg-secondary/20 text-secondary border-secondary/30">
              <Zap className="h-3.5 w-3.5" />
              Lộ trình 3 bước
            </span>
            <h2 className="font-display mb-6 text-4xl font-bold md:text-5xl tracking-tight">
              Khởi đầu <span className="text-gradient-animate">chỉ với 3 bước</span>
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-8 sm:grid-cols-2 md:grid-cols-3"
          >
            {steps.map((step) => (
              <motion.div key={step.num} variants={fadeUp} className="relative group">
                <div className="bento-card-v2 p-10 h-full flex flex-col items-center text-center group-hover:border-primary/20">
                  <div className="absolute top-6 right-8 text-6xl font-black text-muted/10 group-hover:text-primary/5 transition-colors">
                    {step.num}
                  </div>
                  <div
                    className={`mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br ${step.color} shadow-lg shadow-primary/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <step.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="font-display mb-4 text-2xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground text-base leading-relaxed opacity-80">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FEATURES DASHBOARD 2026 ═══ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-10 pointer-events-none" />
        <div className="container relative">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <span className="tag-pill mx-auto mb-4 bg-primary/20 text-primary border-primary/30">
              <Sparkles className="h-3.5 w-3.5" />
              Nền tảng hướng nghiệp 4.0
            </span>
            <h2 className="font-display mb-6 text-4xl font-bold md:text-5xl lg:text-6xl tracking-tight">
              Mọi thứ bạn cần để <br className="hidden md:block" />
              <span className="text-gradient-animate">chọn đúng nghề</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg opacity-80">
              Kết hợp sức mạnh AI và trải nghiệm thực tế để giúp bạn tự tin bước vào tương lai.
            </p>
          </motion.div>

          {/* Unified Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
            {/* Feature 1: AI Analysis (Large) */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="md:col-span-2 md:row-span-2 bento-card-v2 noise-bg p-10 flex flex-col justify-end group"
            >
              <div className="border-beam group-hover:opacity-100 opacity-0 transition-opacity" />
              <div className="absolute top-10 right-10">
                <div className="h-20 w-20 rounded-3xl bg-blue-500/20 flex items-center justify-center animate-pulse-soft">
                  <Brain className="h-10 w-10 text-blue-500" />
                </div>
              </div>
              <div className="relative z-10">
                <h4 className="text-3xl font-bold mb-4 font-display">AI Tư vấn thông minh</h4>
                <p className="text-muted-foreground text-lg max-w-md">
                  Thuật toán AI độc quyền phân tích sâu 24 đặc điểm tính cách, dự đoán độ tương thích với 500+ ngành nghề khác nhau với độ chính xác 98%.
                </p>
                <div className="mt-8 flex gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium">NLP Analysis</span>
                  <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium">Predictive Modeling</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Specialization (Small) */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bento-card-v2 p-8 group flex flex-col justify-between"
            >
              <div className="h-12 w-12 rounded-2xl bg-mint-light/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                <TrendingUp className="h-6 w-6 text-mint" />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">Lộ trình cá nhân</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Roadmap chi tiết từ học tập đến kỹ năng mềm cho riêng bạn.
                </p>
              </div>
            </motion.div>

            {/* Feature 3: Simulation (Small) */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bento-card-v2 p-8 group flex flex-col justify-between"
            >
              <div className="h-12 w-12 rounded-2xl bg-lavender/20 flex items-center justify-center group-hover:-rotate-12 transition-transform">
                <Layers className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">Mô phỏng nghề</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Trải nghiệm công việc thực tế thông qua các dự án mô phỏng AI.
                </p>
              </div>
            </motion.div>

            {/* Feature 4: Community (Small) */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="bento-card-v2 p-8 group flex flex-col justify-between"
            >
              <div className="h-12 w-12 rounded-2xl bg-gold-light/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquareHeart className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">Review 360°</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Góc nhìn đa chiều từ những chuyên gia đang làm trong ngành.
                </p>
              </div>
            </motion.div>

            {/* Feature 5: Achievements (Wide) */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="md:col-span-2 bento-card-v2 p-8 flex items-center gap-8 group"
            >
              <div className="h-20 w-20 flex-shrink-0 rounded-full bg-gradient-accent flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Award className="h-10 w-10 text-white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold mb-2">Badge & Achievement</h4>
                <p className="text-muted-foreground text-base">
                  Hoàn thành các cột mốc hướng nghiệp và nhận những huy hiệu danh giá, xây dựng Profile ấn tượng ngay từ khi còn là học sinh.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ CAREER PREVIEW ═══ */}
      <section className="py-24 md:py-32">
        <div className="container">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <span className="tag-pill mx-auto mb-4">
              <BarChart3 className="h-3.5 w-3.5" />
              Preview kết quả
            </span>
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
              Nghề nghiệp <span className="text-gradient-animate">có thể phù hợp</span> với bạn
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Ví dụ kết quả sau khi hoàn thành bài test
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 md:grid-cols-3"
          >
            {careerPreviews.map((career) => (
              <motion.div key={career.title} variants={scaleIn}>
                <div
                  className={`bento-card group relative overflow-hidden bg-gradient-to-br p-6 ${career.gradient}`}
                >
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${career.iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                    <career.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display mb-2 text-xl font-bold">{career.title}</h3>
                  <p className="text-muted-foreground mb-5 text-sm leading-relaxed">{career.desc}</p>
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Độ khó</span>
                      <span className="font-semibold">{career.difficulty}/5</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(career.difficulty / 5) * 100}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        viewport={{ once: true }}
                        className="bg-gradient-hero h-full rounded-full"
                      />
                    </div>
                  </div>
                  <div className="mb-5 flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">{career.salary}</span>
                  </div>
                  <Link href="/personality-test">
                    <Button
                      variant="outline"
                      size="sm"
                      className="group-hover:bg-primary w-full gap-2 rounded-xl font-semibold transition-all duration-300 group-hover:text-white group-hover:border-primary"
                    >
                      Khám phá ngành này
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF (INFINITE LOOP) ═══ */}
      <section className="relative py-24 overflow-hidden bg-muted/30">
        <div className="absolute inset-0 noise-bg opacity-40 pointer-events-none" />
        <div className="relative">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-16 text-center container"
          >
            <h2 className="font-display mb-4 text-4xl font-bold md:text-5xl tracking-tight">
              Học sinh nói gì về <span className="text-gradient-animate">EDUMEE</span>?
            </h2>
            <p className="text-muted-foreground text-lg">Cộng đồng hơn 10,000+ bạn trẻ đang cùng phát triển</p>
          </motion.div>

          {/* Row 1: Forward Loop */}
          <div className="flex overflow-hidden py-4 select-none">
            <div className="marquee-track flex gap-6 px-4">
              {[...testimonials, ...testimonials].map((t, idx) => (
                <div key={`row1-${idx}`} className="bento-card-v2 w-[380px] flex-shrink-0 p-8">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 text-base leading-relaxed font-medium italic">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-hero flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-md">{t.avatar}</div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{t.school}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ADAPTIVE COMPACT ═══ */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="container relative z-10 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bento-card-v2 noise-bg relative overflow-hidden rounded-[2rem] p-8 text-center md:p-12 shadow-xl"
          >
            {/* Adaptive Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-30 dark:opacity-50" />
            <div className="border-beam opacity-40" />
            
            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm shadow-inner">
                <Rocket className="h-6 w-6" />
              </div>
              
              <h2 className="font-display mb-3 text-2xl font-black md:text-4xl tracking-tight leading-tight">
                Sẵn sàng khám phá <br className="md:hidden" />
                <span className="text-muted-foreground">tương lai của bạn?</span>
              </h2>
              
              <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm md:text-base font-medium">
                Tìm thấy ngành nghề mơ ước chỉ sau 5 phút làm bài test AI.
              </p>

              <div className="flex flex-col items-center gap-4">
                <Link href="/personality-test">
                  <Button
                    size="lg"
                    className="shimmer-btn group relative h-12 md:h-14 gap-2 rounded-full px-8 md:px-10 text-sm md:text-base font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    Bắt đầu ngay
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                
                <div className="flex items-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-60">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Miễn phí</span>
                  <span className="h-1 w-1 rounded-full bg-foreground/20" />
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> 5 Phút</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Kết quả AI</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
