'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  ChevronDown,
  GitCompare,
  GraduationCap,
  Map,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const personalityResult = {
  type: 'Nhà Khám Phá Sáng Tạo',
  description:
    'Bạn là người tò mò, yêu thích sáng tạo và không ngại thử nghiệm. Bạn phù hợp với những nghề đòi hỏi tư duy đột phá, giải quyết vấn đề phức tạp và làm việc với công nghệ tiên tiến.',
  strengths: [
    'Tư duy sáng tạo',
    'Giải quyết vấn đề',
    'Thích nghi nhanh',
    'Tự học tốt',
    'Công nghệ',
  ],
  traits: [
    { name: 'Sáng tạo', value: 85 },
    { name: 'Phân tích', value: 72 },
    { name: 'Giao tiếp', value: 60 },
    { name: 'Lãnh đạo', value: 55 },
    { name: 'Kỷ luật', value: 68 },
  ],
  careers: [
    { title: 'Frontend Developer', match: 95, icon: '💻', salary: '15-35 triệu' },
    { title: 'UX/UI Designer', match: 88, icon: '🎨', salary: '12-30 triệu' },
    { title: 'Product Manager', match: 82, icon: '📊', salary: '20-50 triệu' },
    { title: 'Data Analyst', match: 78, icon: '📈', salary: '15-35 triệu' },
    { title: 'AI Engineer', match: 75, icon: '🤖', salary: '25-60 triệu' },
  ],
};

const primaryActions = [
  {
    icon: Target,
    label: 'Xem mô phỏng nghề theo từng level',
    href: '/career-simulation',
    color: 'bg-sky-light text-primary',
  },
  {
    icon: Map,
    label: 'Xây lộ trình học 3–12 tháng',
    href: '/learning-roadmap',
    color: 'bg-mint-light text-mint',
  },
  {
    icon: GitCompare,
    label: 'So sánh 2–3 nghề nghiệp',
    href: '/career-compare',
    color: 'bg-lavender text-secondary',
  },
];

const moreActions = [
  {
    icon: TrendingUp,
    label: 'Xem hướng chuyên sâu & xu hướng',
    href: '/specialization',
    color: 'bg-gold-light text-gold',
  },
  {
    icon: Brain,
    label: 'Đánh giá kỹ năng hiện tại',
    href: '/personality-test',
    color: 'bg-coral-light text-coral',
  },
  {
    icon: GraduationCap,
    label: 'Kết nối mentor / gia sư',
    href: '/mentor-matching',
    color: 'bg-sky-light text-primary',
  },
  {
    icon: MessageCircle,
    label: 'Xem review ẩn danh từ cộng đồng',
    href: '/community',
    color: 'bg-mint-light text-mint',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const AssessmentResult = () => {
  const [showMore, setShowMore] = useState(false);
  const visibleActions = showMore ? [...primaryActions, ...moreActions] : primaryActions;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground">
        <div className="container py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-primary-foreground/20 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4" /> Kết quả phân tích
            </div>
            <h1 className="font-display mb-2 text-3xl font-bold md:text-4xl">
              Bạn là &ldquo;{personalityResult.type}&rdquo;
            </h1>
            <p className="text-primary-foreground/80 mx-auto max-w-2xl text-sm md:text-base">
              {personalityResult.description}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container -mt-4 space-y-6">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold">
            <Star className="text-gold h-5 w-5" /> Điểm mạnh của bạn
          </h2>
          <div className="flex flex-wrap gap-2">
            {personalityResult.strengths.map((s) => (
              <Badge key={s} className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                {s}
              </Badge>
            ))}
          </div>
        </motion.div>

        {/* Personality traits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-display mb-4 text-lg font-semibold">Phân bổ tính cách</h2>
          <div className="space-y-4">
            {personalityResult.traits.map((trait) => (
              <div key={trait.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{trait.name}</span>
                  <span className="text-muted-foreground">{trait.value}%</span>
                </div>
                <Progress value={trait.value} className="h-2.5" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Career matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-display mb-4 text-lg font-semibold">Nghề nghiệp phù hợp</h2>
          <div className="space-y-3">
            {personalityResult.careers.map((career, i) => (
              <motion.div
                key={career.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="bg-muted/50 hover:bg-muted flex items-center gap-4 rounded-xl p-4 transition-colors"
              >
                <span className="text-2xl">{career.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{career.title}</div>
                  <div className="text-muted-foreground text-xs">
                    Thu nhập: {career.salary}/tháng
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-primary text-sm font-bold">{career.match}%</div>
                  <div className="text-muted-foreground text-xs">phù hợp</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Next actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="font-display mb-2 text-lg font-semibold">Bạn muốn làm gì tiếp theo?</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            AI sẽ tạo nội dung cá nhân hóa dựa trên hồ sơ của bạn
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:grid-cols-2"
          >
            {visibleActions.map((action) => (
              <motion.div key={action.href} variants={item}>
                <Link href={action.href}>
                  <div className="border-border hover:border-primary/30 hover:shadow-soft bg-card group flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all">
                    <div
                      className={`h-10 w-10 rounded-xl ${action.color} flex flex-shrink-0 items-center justify-center`}
                    >
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{action.label}</span>
                    <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
          {!showMore && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground mt-3 w-full gap-1"
              onClick={() => setShowMore(true)}
            >
              Xem thêm lựa chọn <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AssessmentResult;
