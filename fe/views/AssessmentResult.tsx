'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, RotateCcw, Share2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const themeSubscribe = (cb: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};
const getIsDark = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));

/* ─── Data ─── */
const topCareers = [
  {
    rank: 1,
    icon: '💻',
    title: 'Kỹ sư Phần mềm',
    match: 92,
    salary: '25–60 triệu/tháng',
    growth: '+22% đến 2030',
    skills: ['Lập trình', 'Problem Solving', 'Teamwork'],
    insight:
      'Tư duy logic cao, yêu thích xây dựng sản phẩm và khả năng học công nghệ mới tốt phù hợp với yêu cầu nghề.',
    gradient: 'from-violet-500 to-purple-600',
    btnClass: 'bg-violet-600 hover:bg-violet-700',
    barColor: '#7c3aed',
  },
  {
    rank: 2,
    icon: '🤖',
    title: 'Kỹ sư AI/Machine Learning',
    match: 85,
    salary: '30–80 triệu/tháng',
    growth: '+45% đến 2030',
    skills: ['Python', 'Data', 'Deep Learning'],
    insight:
      'Xu hướng AI bùng nổ, nền tảng toán học vững và khả năng tư duy trừu tượng của bạn phù hợp hoàn hảo.',
    gradient: 'from-pink-500 to-rose-500',
    btnClass: 'bg-pink-500 hover:bg-pink-600',
    barColor: '#ec4899',
  },
  {
    rank: 3,
    icon: '📊',
    title: 'Data Scientist',
    match: 87,
    salary: '20–50 triệu/tháng',
    growth: '+35% đến 2030',
    skills: ['Statistics', 'Python', 'SQL'],
    insight: 'Kỹ năng phân tích dữ liệu và tư duy hệ thống là lợi thế lớn trong lĩnh vực này.',
    gradient: 'from-blue-500 to-cyan-400',
    btnClass: 'bg-blue-500 hover:bg-blue-600',
    barColor: '#3b82f6',
  },
];

const radarData = [
  { subject: 'Tư duy logic', A: 90 },
  { subject: 'Sáng tạo', A: 75 },
  { subject: 'Giao tiếp', A: 60 },
  { subject: 'Kỹ thuật', A: 85 },
  { subject: 'Lãnh đạo', A: 55 },
  { subject: 'Cảm xúc xã hội', A: 65 },
];

const barData = [
  { name: 'Kỹ sư phần mềm', score: 92, color: '#7c3aed' },
  { name: 'Data Scientist', score: 87, color: '#7c3aed' },
  { name: 'Product Manager', score: 74, color: '#7c3aed' },
  { name: 'UX Designer', score: 68, color: '#06b6d4' },
  { name: 'Kỹ sư AI/ML', score: 85, color: '#7c3aed' },
];

const personalityTraits = [
  { name: 'INTJ – Nhà chiến lược', value: 85, desc: 'Độc lập, logic, dài hạn' },
  { name: 'Analytical Thinking', value: 90, desc: 'Yêu thích phân tích dữ liệu' },
  { name: 'Intrinsic Motivation', value: 78, desc: 'Tự thúc đẩy bản thân' },
  { name: 'Tech Enthusiast', value: 92, desc: 'Đam mê công nghệ' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ─── Component ─── */
const AssessmentResult = () => {
  const router = useRouter();
  const { toast } = useToast();

  const isDark = useSyncExternalStore(themeSubscribe, getIsDark, () => false);
  const tickColor = isDark ? 'hsl(var(--muted-foreground))' : '#6b7280';
  const tooltipStyle = {
    borderRadius: 8,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: 12,
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="bg-gradient-card px-4 pt-10 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-4 py-1.5 text-sm font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Phân tích hoàn tất
          </span>
          <h1 className="font-display text-foreground mt-4 text-2xl font-extrabold sm:text-4xl md:text-5xl">
            Kết quả phân tích của bạn
          </h1>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            AI đã phân tích 20 câu trả lời và so sánh với 50,000+ hồ sơ nghề nghiệp
          </p>
        </motion.div>
      </div>

      <div className="container space-y-8 py-8">
        <motion.section variants={fadeUp} initial="hidden" animate="show">
          <h2 className="text-foreground mb-5 flex items-center gap-2 text-xl font-bold">
            🎯 Top 3 nghề phù hợp nhất
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topCareers.map((career) => (
              <div key={career.title} className="glass-card relative overflow-hidden rounded-2xl">
                <div className={`h-2 w-full bg-gradient-to-r ${career.gradient}`} />
                {career.rank === 1 && (
                  <span className="absolute top-4 right-4 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-white">
                    #1 Tốt nhất
                  </span>
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl text-2xl">
                      {career.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground font-bold">{career.title}</div>
                      <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className={`h-full bg-gradient-to-r ${career.gradient}`}
                          style={{ width: `${career.match}%` }}
                        />
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {career.match}% match
                      </div>
                    </div>
                  </div>

                  <div className="text-foreground/80 mb-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-green-500">$</span>
                      {career.salary}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      {career.growth}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {career.skills.map((s) => (
                      <span
                        key={s}
                        className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
                    💡 {career.insight}
                  </p>

                  <button
                    onClick={() => router.push('/learning-roadmap')}
                    className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${career.btnClass}`}
                  >
                    Xem lộ trình học &gt;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="grid gap-5 md:grid-cols-2"
        >
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-foreground mb-4 font-bold">Biểu đồ năng lực</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: tickColor }} />
                <Radar
                  name="Năng lực"
                  dataKey="A"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-foreground mb-4 font-bold">Điểm phù hợp theo nghề</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: tickColor }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => [`${v}%`, 'Điểm phù hợp']} contentStyle={tooltipStyle} />
                <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={16}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.section variants={fadeUp} initial="hidden" animate="show">
          <h2 className="text-foreground mb-5 flex items-center gap-2 text-xl font-bold">
            🧠 Hồ sơ tính cách của bạn
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {personalityTraits.map((trait) => (
              <div key={trait.name} className="glass-card rounded-2xl p-5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-foreground text-sm font-semibold">{trait.name}</span>
                  <span className="text-sm font-bold text-violet-600">{trait.value}%</span>
                </div>
                <div className="bg-muted mb-2 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                    style={{ width: `${trait.value}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">{trait.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fadeUp} initial="hidden" animate="show" className="text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/learning-roadmap">
              <Button className="gap-2 rounded-full bg-violet-600 px-6 text-white hover:bg-violet-700">
                🎁 Xem lộ trình học tập
              </Button>
            </Link>

            <Link href="/career-compare">
              <Button variant="outline" className="gap-2 rounded-full px-6">
                → Khám phá thêm nghề
              </Button>
            </Link>

            <Button
              variant="outline"
              className="gap-2 rounded-full px-6"
              onClick={() =>
                toast({
                  title: 'Đang xử lý...',
                  description:
                    'Hệ thống đang xuất file PDF báo cáo của bạn. Vui lòng đợi trong giây lát!',
                })
              }
            >
              <Download className="h-4 w-4" /> Tải kết quả PDF
            </Button>

            <Button
              variant="outline"
              className="gap-2 rounded-full px-6"
              onClick={() =>
                toast({
                  title: 'Đã copy link!',
                  description: 'Bạn có thể dán link này để gửi cho bạn bè ngay bây giờ.',
                })
              }
            >
              <Share2 className="h-4 w-4" /> Chia sẻ
            </Button>
          </div>
          <div className="mt-4">
            <Link href="/personality-test">
              <Button variant="ghost" className="text-muted-foreground gap-1.5 text-sm">
                <RotateCcw className="h-3.5 w-3.5" /> Làm lại bài đánh giá
              </Button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AssessmentResult;
