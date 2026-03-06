'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
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
import { useSyncExternalStore } from 'react';

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
  const hasResult = useSyncExternalStore(
    (cb) => {
      window.addEventListener('storage', cb);
      return () => window.removeEventListener('storage', cb);
    },
    () => localStorage.getItem('hasAssessmentResult') === 'true',
    () => false,
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-card">
        <div className="container py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-muted-foreground mb-1">Xin chào 👋</p>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Hành trình của bạn</h1>
          </motion.div>
        </div>
      </div>

      <div className="container -mt-2 space-y-8">
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
              className="grid grid-cols-3 gap-3"
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
              <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
                <Award className="text-gold h-5 w-5" />
                Thành tựu
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {badges.map((badge, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 text-center ${!badge.earned ? 'opacity-30 grayscale' : ''}`}
                  >
                    <div
                      className={`mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl ${
                        badge.earned ? 'bg-gold-light text-gold' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <badge.icon className="h-6 w-6" />
                    </div>
                    <div className="max-w-[70px] text-xs font-medium">{badge.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
