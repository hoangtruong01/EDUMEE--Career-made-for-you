'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Award, GitCompare, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const features = [
  {
    icon: Target,
    title: 'Mô phỏng nghề nghiệp',
    desc: 'Trải nghiệm hành trình Intern → Senior → Leader trong từng ngành',
    color: 'bg-sky-light text-primary',
    href: '/career-simulation',
  },
  {
    icon: TrendingUp,
    title: 'Lộ trình cá nhân hóa',
    desc: 'Roadmap 3 tháng – 3 năm dựa trên năng lực & mục tiêu của bạn',
    color: 'bg-mint-light text-mint',
    href: '/learning-roadmap',
  },
  {
    icon: GitCompare,
    title: 'So sánh ngành nghề',
    desc: 'Thu nhập, áp lực, cơ hội – so sánh trực quan để chọn đúng',
    color: 'bg-lavender text-secondary',
    href: '/career-compare',
  },
  {
    icon: Users,
    title: 'Cộng đồng review thật',
    desc: 'Chia sẻ ẩn danh từ người trong ngành, không filter',
    color: 'bg-coral-light text-coral',
    href: '/community',
  },
  {
    icon: Award,
    title: 'Badge & Achievement',
    desc: 'Hoàn thành thử thách, nhận badge – giữ động lực liên tục',
    color: 'bg-gold-light text-gold',
    href: '/dashboard',
  },
  {
    icon: Sparkles,
    title: 'AI tư vấn thông minh',
    desc: 'Phân tích tính cách, dự đoán hướng đi phù hợp nhất',
    color: 'bg-sky-light text-primary',
    href: '/onboarding',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-card absolute inset-0 opacity-60" />
        <div className="relative container py-20 md:py-32">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI Career Companion cho Gen Z
              </div>
              <h1 className="font-display mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl">
                Khám phá nghề nghiệp
                <span className="text-gradient-hero block">phù hợp với bạn</span>
              </h1>
              <p className="text-muted-foreground mb-8 max-w-lg text-lg">
                Bạn đồng hành AI giúp bạn hiểu bản thân, khám phá ngành nghề và xây dựng lộ trình sự
                nghiệp – hoàn toàn cá nhân hóa.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button variant="hero" size="lg" className="gap-2">
                    Bắt đầu khám phá
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="hero-outline" size="lg">
                    Đăng nhập
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="shadow-elevated relative overflow-hidden rounded-2xl">
                <Image
                  src="/hero-career-journey.jpg"
                  alt="Career Journey Illustration"
                  width={600}
                  height={400}
                  className="h-auto w-full"
                  priority
                />
              </div>
              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="glass-card absolute -top-4 -right-4 flex items-center gap-2 rounded-xl px-4 py-3"
              >
                <div className="bg-gradient-mint flex h-8 w-8 items-center justify-center rounded-full">
                  <TrendingUp className="text-primary-foreground h-4 w-4" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Xu hướng</div>
                  <div className="text-sm font-semibold">AI & Data</div>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="glass-card absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl px-4 py-3"
              >
                <div className="bg-gradient-accent flex h-8 w-8 items-center justify-center rounded-full">
                  <Award className="text-primary-foreground h-4 w-4" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Badges</div>
                  <div className="text-sm font-semibold">12 đã mở</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl">
              Mọi thứ bạn cần để <span className="text-gradient-hero">chọn đúng nghề</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Từ bài test tính cách đến mô phỏng nghề nghiệp – tất cả trong một nền tảng thông minh
            </p>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={item}>
                <Link
                  href={f.href}
                  className="glass-card hover:shadow-elevated group block cursor-pointer rounded-2xl p-6 transition-shadow"
                >
                  <div
                    className={`h-12 w-12 rounded-xl ${f.color} mb-4 flex items-center justify-center transition-transform group-hover:scale-110`}
                  >
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display mb-2 text-lg font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="bg-gradient-hero text-primary-foreground rounded-3xl p-12 text-center md:p-16">
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl">
              Sẵn sàng khám phá tương lai?
            </h2>
            <p className="text-primary-foreground/80 mx-auto mb-8 max-w-xl text-lg">
              Chỉ cần 5 phút làm bài test, bạn sẽ có một bản đồ sự nghiệp được thiết kế riêng cho
              mình.
            </p>
            <Link href="/onboarding">
              <Button
                size="lg"
                className="bg-card text-foreground hover:bg-card/90 gap-2 font-semibold"
              >
                Làm bài test ngay
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border border-t py-8">
        <div className="text-muted-foreground container flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <div className="font-display text-foreground flex items-center gap-2 font-bold">
            <Sparkles className="text-primary h-4 w-4" />
            EDUMEE
          </div>
          <p>© 2026 EDUMEE. Người bạn đồng hành sự nghiệp của bạn.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
