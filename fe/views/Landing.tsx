'use client';

import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardCheck,
  Code2,
  DollarSign,
  GitCompare,
  Layers,
  MessageSquareHeart,
  Moon,
  Palette,
  Rocket,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useSyncExternalStore } from 'react';

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
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

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

const featureCategories = [
  {
    title: 'AI Career Analysis',
    icon: Sparkles,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    features: [
      {
        icon: Brain,
        title: 'AI tư vấn thông minh',
        desc: 'Phân tích tính cách, dự đoán hướng đi phù hợp nhất cho bạn.',
        color: 'bg-sky-light text-primary',
      },
      {
        icon: TrendingUp,
        title: 'Lộ trình cá nhân hóa',
        desc: 'Roadmap 3 tháng – 3 năm dựa trên năng lực & mục tiêu.',
        color: 'bg-mint-light text-mint',
      },
    ],
  },
  {
    title: 'Career Exploration',
    icon: Target,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    features: [
      {
        icon: Layers,
        title: 'Mô phỏng nghề nghiệp',
        desc: 'Trải nghiệm hành trình từ Intern → Senior → Leader.',
        color: 'bg-lavender text-secondary',
      },
      {
        icon: GitCompare,
        title: 'So sánh ngành nghề',
        desc: 'Thu nhập, áp lực, cơ hội – so sánh trực quan.',
        color: 'bg-coral-light text-coral',
      },
    ],
  },
  {
    title: 'Community Insights',
    icon: Users,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    features: [
      {
        icon: MessageSquareHeart,
        title: 'Review từ chuyên gia',
        desc: 'Chia sẻ ẩn danh từ người trong ngành, không filter.',
        color: 'bg-gold-light text-gold',
      },
      {
        icon: Award,
        title: 'Badge & Achievement',
        desc: 'Hoàn thành thử thách, nhận badge – giữ động lực liên tục.',
        color: 'bg-sky-light text-primary',
      },
    ],
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
const Landing = () => {
  const isDark = useSyncExternalStore(landingThemeSubscribe, getLandingTheme, () => false);

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
            <div className="bg-gradient-hero flex h-8 w-8 items-center justify-center rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span>EDUMEE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Chế độ sáng/tối" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="hero" size="sm" className="gap-1.5 rounded-full px-5 text-sm">
                Bắt đầu ngay
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative overflow-hidden pt-16">
        {/* Background decorations */}
        <div className="floating-blob -top-20 -right-20 h-[500px] w-[500px] bg-blue-400" />
        <div className="floating-blob -bottom-20 -left-20 h-[400px] w-[400px] bg-purple-400" />
        <div className="bg-gradient-card absolute inset-0 opacity-40" />

        <div className="relative container py-20 md:py-28 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
                <Zap className="h-4 w-4" />
                AI Career Companion cho Gen Z
              </div>

              <h1 className="font-display mb-6 text-4xl leading-[1.1] font-extrabold tracking-tight md:text-5xl lg:text-6xl">
                Khám phá nghề nghiệp
                <span className="text-gradient-hero block">phù hợp với bạn</span>
                <span className="text-muted-foreground block text-2xl font-medium md:text-3xl">
                  chỉ trong 5 phút ⚡
                </span>
              </h1>

              <p className="text-muted-foreground mb-8 max-w-lg text-lg leading-relaxed">
                AI phân tích tính cách & sở thích của bạn, gợi ý ngành nghề phù hợp kèm lộ trình
                phát triển chi tiết – hoàn toàn miễn phí.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link href="/onboarding">
                  <Button
                    variant="hero"
                    size="lg"
                    className="shimmer-btn gap-2 rounded-full px-8 py-6 text-base font-bold"
                  >
                    Bắt đầu bài test miễn phí
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="text-muted-foreground flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Timer className="h-4 w-4" /> Chỉ mất 5 phút
                  </span>
                  <span>•</span>
                  <span>Không cần đăng ký</span>
                </div>
              </div>
            </motion.div>

            {/* Right illustration */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="shadow-elevated relative overflow-hidden rounded-3xl">
                <Image
                  src="/hero-illustration.png"
                  alt="AI Career Journey - Student to Career Path"
                  width={700}
                  height={467}
                  className="h-auto w-full"
                  priority
                />
              </div>

              {/* Floating badge — Trending */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="glass-card absolute -top-4 -right-4 flex items-center gap-2 rounded-xl px-4 py-3"
              >
                <div className="bg-gradient-mint flex h-9 w-9 items-center justify-center rounded-full">
                  <TrendingUp className="text-primary-foreground h-4 w-4" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Xu hướng 2026</div>
                  <div className="text-sm font-bold">AI & Data Science</div>
                </div>
              </motion.div>

              {/* Floating badge — Score */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="glass-card absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl px-4 py-3"
              >
                <div className="bg-gradient-accent flex h-9 w-9 items-center justify-center rounded-full">
                  <Award className="text-primary-foreground h-4 w-4" />
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

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 md:py-32">
        <div className="container">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <div className="bg-primary/10 text-primary mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              <Zap className="h-4 w-4" />
              Đơn giản & nhanh chóng
            </div>
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
              Cách hoạt động <span className="text-gradient-hero">rất đơn giản</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Chỉ 3 bước để tìm ra con đường sự nghiệp phù hợp nhất với bạn
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-8 md:grid-cols-3"
          >
            {steps.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} className="relative">
                {/* Connector line for desktop */}
                {i < steps.length - 1 && (
                  <div className="from-border absolute top-16 right-0 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r to-transparent md:block" />
                )}
                <div className="glass-card card-hover-lift relative rounded-2xl p-8 text-center">
                  {/* Step number */}
                  <div className="text-muted-foreground/20 mb-4 text-5xl font-black">
                    {step.num}
                  </div>
                  {/* Icon */}
                  <div
                    className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color}`}
                  >
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-display mb-3 text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="relative py-24 md:py-32">
        <div className="bg-gradient-card absolute inset-0 opacity-30" />
        <div className="relative container">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
              Mọi thứ bạn cần để <span className="text-gradient-hero">chọn đúng nghề</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Từ bài test tính cách đến mô phỏng nghề nghiệp – tất cả trong một nền tảng thông minh
            </p>
          </motion.div>

          <div className="space-y-12">
            {featureCategories.map((cat) => (
              <motion.div
                key={cat.title}
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                {/* Category header */}
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg}`}
                  >
                    <cat.icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <h3 className="font-display text-lg font-bold">{cat.title}</h3>
                </div>

                {/* Feature cards */}
                <div className="grid gap-6 sm:grid-cols-2">
                  {cat.features.map((f) => (
                    <motion.div
                      key={f.title}
                      variants={fadeUp}
                      className="glass-card card-hover-lift group cursor-pointer rounded-2xl border border-transparent p-6"
                    >
                      <div
                        className={`h-12 w-12 rounded-xl ${f.color} mb-4 flex items-center justify-center transition-transform group-hover:scale-110`}
                      >
                        <f.icon className="h-6 w-6" />
                      </div>
                      <h4 className="font-display mb-2 text-lg font-semibold">{f.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
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
            <div className="bg-primary/10 text-primary mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4" />
              Preview kết quả
            </div>
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
              Nghề nghiệp <span className="text-gradient-hero">có thể phù hợp</span> với bạn
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Đây là ví dụ về kết quả bạn có thể nhận được sau khi hoàn thành bài test
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-8 md:grid-cols-3"
          >
            {careerPreviews.map((career) => (
              <motion.div key={career.title} variants={scaleIn}>
                <div
                  className={`card-hover-lift glass-card group relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br p-6 ${career.gradient}`}
                >
                  {/* Icon */}
                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${career.iconBg}`}
                  >
                    <career.icon className="h-7 w-7" />
                  </div>

                  {/* Title & desc */}
                  <h3 className="font-display mb-2 text-xl font-bold">{career.title}</h3>
                  <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
                    {career.desc}
                  </p>

                  {/* Difficulty */}
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Độ khó</span>
                      <span className="font-semibold">{career.difficulty}/5</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-gradient-hero h-full rounded-full transition-all"
                        style={{ width: `${(career.difficulty / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="mb-5 flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">{career.salary}</span>
                  </div>

                  {/* Explore button */}
                  <Link href="/onboarding">
                    <Button
                      variant="outline"
                      size="sm"
                      className="group-hover:bg-primary w-full gap-2 rounded-xl font-semibold transition-colors group-hover:text-white"
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

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="relative py-24 md:py-32">
        <div className="bg-gradient-card absolute inset-0 opacity-30" />
        <div className="relative container">
          {/* Stats */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-20 grid gap-6 sm:grid-cols-3"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="glass-card rounded-2xl p-8 text-center"
              >
                <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                  <stat.icon className="text-primary h-7 w-7" />
                </div>
                <div className="font-display text-gradient-hero text-4xl font-extrabold">
                  {stat.value}
                </div>
                <div className="text-muted-foreground mt-1 text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonials */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl">
              Học sinh nói gì về <span className="text-gradient-hero">EDUMEE</span>?
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-3"
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp}>
                <div className="glass-card h-full rounded-2xl p-6">
                  {/* Stars */}
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 text-sm leading-relaxed italic">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full text-xl">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-muted-foreground text-xs">{t.school}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="bg-gradient-hero relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="relative"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <h2 className="font-display text-primary-foreground mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
                Sẵn sàng khám phá nghề nghiệp
                <br />
                tương lai của bạn?
              </h2>
              <p className="text-primary-foreground/80 mx-auto mb-8 max-w-xl text-lg">
                Làm bài test AI 5 phút và nhận gợi ý nghề nghiệp được cá nhân hóa riêng cho bạn.
              </p>
              <Link href="/onboarding">
                <Button
                  size="lg"
                  className="shimmer-btn gap-2 rounded-full bg-white px-10 py-6 text-base font-bold text-gray-900 shadow-xl hover:bg-white/90"
                >
                  Bắt đầu bài test ngay
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-primary-foreground/60 mt-4 text-sm">
                Miễn phí hoàn toàn • Không cần đăng ký • Kết quả tức thì
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
