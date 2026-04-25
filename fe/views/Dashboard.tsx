'use client';

import { Button } from '@/components/ui/button';
import { useAssessment } from '@/context/assessment-context';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart2,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  GitCompare,
  MapPin,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

const headerStats = [
  {
    value: '3',
    label: 'Bài trắc nghiệm',
    icon: CheckCircle2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    value: '12',
    label: 'Nghề đã xem',
    icon: BarChart2,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    value: '5',
    label: 'Ngày học liên tiếp',
    icon: TrendingUp,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    value: '1',
    label: 'Buổi mentor',
    icon: Users,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
];

const recommendations = [
  {
    title: 'React Hooks chuyên sâu',
    meta: '20 bài',
    type: 'Khóa học',
    match: 96,
    dotColor: 'bg-blue-400',
  },
  {
    title: 'TypeScript cho Beginners',
    meta: '40 bài',
    type: 'Video series',
    match: 91,
    dotColor: 'bg-violet-400',
  },
  {
    title: 'System Design Interview',
    meta: 'Đọc',
    type: 'Sách',
    match: 85,
    dotColor: 'bg-orange-400',
  },
];

const journeySteps = [
  {
    level: 'Hiện tại',
    title: 'Sinh viên năm 3',
    subtitle: 'Công nghệ thông tin',
    status: 'current',
    color: 'bg-primary',
  },
  {
    level: '3 tháng',
    title: 'Intern Frontend',
    subtitle: 'Thực tập tại startup',
    status: 'next',
    color: 'bg-mint',
  },
  {
    level: '1 năm',
    title: 'Junior Developer',
    subtitle: 'React / TypeScript',
    status: 'future',
    color: 'bg-secondary',
  },
  {
    level: '3 năm',
    title: 'Senior Developer',
    subtitle: 'Tech Lead pathway',
    status: 'future',
    color: 'bg-accent',
  },
];

const badges = [
  { icon: Star, label: 'Người khám phá', earned: true },
  { icon: Zap, label: 'Test hoàn thành', earned: true },
  { icon: Target, label: 'Mục tiêu rõ ràng', earned: true },
  { icon: BookOpen, label: 'Học 7 ngày liền', earned: false },
  { icon: Award, label: 'Mentor đầu tiên', earned: false },
];

const quickActions = [
  {
    icon: GitCompare,
    label: 'So sánh nghề',
    href: '/career-compare',
    color: 'bg-lavender text-secondary',
  },
  {
    icon: Compass,
    label: 'Mô phỏng nghề',
    href: '/career-simulation',
    color: 'bg-sky-light text-primary',
  },
  { icon: Users, label: 'Cộng đồng', href: '/community', color: 'bg-coral-light text-coral' },
];

const WelcomeState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card rounded-2xl p-8 text-center"
  >
    <div className="bg-gradient-hero mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
      <Sparkles className="text-primary-foreground h-8 w-8" />
    </div>
    <h2 className="font-display mb-2 text-xl font-bold">Chào mừng bạn đến EDUMEE!</h2>
    <p className="text-muted-foreground mx-auto mb-6 max-w-md text-sm">
      Hoàn thành bài đánh giá tính cách để AI cá nhân hóa dashboard, gợi ý nghề nghiệp và lộ trình
      học tập phù hợp nhất với bạn.
    </p>
    <Link href="/onboarding">
      <Button variant="hero" size="lg" className="gap-2">
        Bắt đầu bài đánh giá
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  </motion.div>
);

const Dashboard = () => {
  const { hasAssessmentResult: hasResult } = useAssessment();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-card">
        <div className="container py-8">
          <div className="mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground mb-1">Xin chào 👋</p>
                  <h1 className="font-display text-2xl font-bold md:text-3xl">
                    Hành trình của bạn
                  </h1>
                </div>
                <button className="relative rounded-full p-2 transition-colors hover:bg-white/10">
                  <Bell className="h-6 w-6" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                </button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {headerStats.map((stat) => (
                <div key={stat.value} className="glass-card rounded-xl p-3 text-center">
                  <div
                    className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full ${stat.bg}`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="font-display text-xl font-bold">{stat.value}</div>
                  <div className="text-muted-foreground text-xs leading-tight">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container -mt-2 space-y-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {!hasResult ? (
            <WelcomeState />
          ) : (
            <>
              {/* AI Suggestion — moved to top for higher visibility */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-hero text-primary-foreground rounded-2xl p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-primary-foreground/20 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">Gợi ý từ AI</h3>
                    <p className="text-primary-foreground/80 mb-3 text-sm">
                      Dựa trên profile của bạn, ngành Frontend Development rất phù hợp. Hãy thử khám
                      phá thêm hướng Full-stack để mở rộng cơ hội!
                    </p>
                    <Link href="/career-simulation">
                      <Button
                        size="sm"
                        className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 gap-1"
                      >
                        Khám phá ngay <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-2 sm:gap-3"
              >
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="glass-card hover:shadow-elevated cursor-pointer rounded-xl p-4 text-center transition-shadow">
                      <div
                        className={`h-12 w-12 rounded-xl ${action.color} mx-auto mb-2 flex items-center justify-center`}
                      >
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-medium">{action.label}</div>
                    </div>
                  </Link>
                ))}
              </motion.div>

              {/* Career Journey Map */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                    <MapPin className="text-primary h-5 w-5" />
                    Career Journey Map
                  </h2>
                  <Link href="/career-simulation">
                    <Button variant="ghost" size="sm" className="text-primary gap-1">
                      Chi tiết <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>

                <div className="relative">
                  <div className="bg-border absolute top-0 bottom-0 left-5 w-0.5" />
                  <div className="space-y-6">
                    {journeySteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="relative flex items-start gap-4"
                      >
                        <div
                          className={`h-10 w-10 rounded-full ${step.color} z-10 flex flex-shrink-0 items-center justify-center ${
                            step.status === 'current'
                              ? 'ring-primary/20 ring-4'
                              : step.status === 'future'
                                ? 'opacity-50'
                                : ''
                          }`}
                        >
                          {step.status === 'current' ? (
                            <div className="bg-primary-foreground animate-pulse-soft h-3 w-3 rounded-full" />
                          ) : (
                            <div className="bg-primary-foreground h-2 w-2 rounded-full" />
                          )}
                        </div>
                        <div className={step.status === 'future' ? 'opacity-50' : ''}>
                          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            {step.level}
                          </div>
                          <div className="font-semibold">{step.title}</div>
                          <div className="text-muted-foreground text-sm">{step.subtitle}</div>
                        </div>
                        {step.status === 'current' && (
                          <span className="bg-primary/10 text-primary ml-auto rounded-full px-2 py-1 text-xs font-medium">
                            Đang ở đây
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                    <Award className="text-gold h-5 w-5" />
                    Thành tựu
                  </h2>
                  <span className="text-muted-foreground text-sm">
                    {badges.filter((b) => b.earned).length}/{badges.length} đã mở khóa
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {badges.map((badge, i) => (
                    <div
                      key={i}
                      className={`flex-shrink-0 text-center ${!badge.earned ? 'opacity-30 grayscale' : ''}`}
                    >
                      <div
                        className={`mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl ${
                          badge.earned
                            ? 'bg-gold-light text-gold'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <badge.icon className="h-6 w-6" />
                      </div>
                      <div className="max-w-[70px] text-xs font-medium">{badge.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Learning Roadmap */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                    <Clock className="text-primary h-5 w-5" />
                    Lộ trình học tập
                  </h2>
                  <Link href="/learning-roadmap">
                    <Button variant="ghost" size="sm" className="text-primary gap-1">
                      Xem thêm <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-primary text-sm font-medium">Nền tảng lập trình</span>
                    <span className="text-sm font-bold">65%</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div className="bg-gradient-hero h-full w-[65%] rounded-full" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/5 rounded-xl p-3 text-center">
                    <div className="font-display text-primary text-xl font-bold">13</div>
                    <div className="text-muted-foreground text-xs">Đã hoàn thành</div>
                  </div>
                  <div className="bg-secondary/5 rounded-xl p-3 text-center">
                    <div className="font-display text-secondary text-xl font-bold">7</div>
                    <div className="text-muted-foreground text-xs">Đang học</div>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <div className="font-display text-xl font-bold">60</div>
                    <div className="text-muted-foreground text-xs">Còn lại</div>
                  </div>
                </div>
              </motion.div>

              {/* Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-card rounded-2xl p-6"
              >
                <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="text-primary h-5 w-5" />
                  Được gợi ý cho bạn
                </h2>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${rec.dotColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{rec.title}</div>
                        <div className="text-muted-foreground text-xs">{rec.meta}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-muted rounded-full px-2 py-0.5 text-xs">
                          {rec.type}
                        </span>
                        <span className="text-primary text-sm font-bold">{rec.match}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
