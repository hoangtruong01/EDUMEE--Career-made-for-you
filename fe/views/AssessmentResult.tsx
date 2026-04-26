'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { assessmentService } from '@/lib/assessment.service';
import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
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
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface CareerResult {
  rank: number;
  icon: string;
  title: string;
  match: number;
  salary: string;
  growth: string;
  skills: string[];
  insight: string;
  gradient: string;
  btnClass: string;
  barColor: string;
}

interface RadarData {
  subject: string;
  A: number;
}

interface BarData {
  name: string;
  score: number;
  color: string;
}

interface PersonalityTrait {
  name: string;
  value: number;
  desc: string;
}

/* ─── Component ─── */
const AssessmentResult = () => {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [topCareers, setTopCareers] = useState<CareerResult[]>([]);
  const [radarData, setRadarData] = useState<RadarData[]>([]);
  const [barData, setBarData] = useState<BarData[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTrait[]>([]);
  const [isLoadingResult, setIsLoadingResult] = useState(true);

  const isDark = useSyncExternalStore(themeSubscribe, getIsDark, () => false);
  const tickColor = isDark ? 'hsl(var(--muted-foreground))' : '#6b7280';
  const tooltipStyle = {
    borderRadius: 8,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: 12,
  };

  useEffect(() => {
    const loadResults = async () => {
      if (!accessToken) {
        setIsLoadingResult(false);
        return;
      }

      try {
        const results = await assessmentService.getMyResults(accessToken);
        if (!Array.isArray(results) || results.length === 0) {
          setIsLoadingResult(false);
          return;
        }

        const palette = [
          {
            gradient: 'from-violet-500 to-purple-600',
            btnClass: 'bg-violet-600 hover:bg-violet-700',
            barColor: '#7c3aed',
          },
          {
            gradient: 'from-pink-500 to-rose-500',
            btnClass: 'bg-pink-500 hover:bg-pink-600',
            barColor: '#ec4899',
          },
          {
            gradient: 'from-blue-500 to-cyan-400',
            btnClass: 'bg-blue-500 hover:bg-blue-600',
            barColor: '#3b82f6',
          },
        ];

        // Map careers
        const mapped = results.slice(0, 3).map((item, idx) => {
          const style = palette[idx] || palette[0];
          return {
            rank: idx + 1,
            icon: idx === 0 ? '💻' : idx === 1 ? '🤖' : '📊',
            title: item.careerTitle || `Nghề nghiệp #${idx + 1}`,
            match: Number(item.overallFitScore || 0),
            salary: 'Cập nhật theo thị trường',
            growth: 'Nhu cầu cao',
            skills: (item.strengths || []).slice(0, 3),
            insight: item.aiExplanation || 'AI đánh giá nghề này có độ phù hợp cao.',
            gradient: style.gradient,
            btnClass: style.btnClass,
            barColor: style.barColor,
          };
        });
        setTopCareers(mapped);

        // Map bar data
        setBarData(results.slice(0, 5).map(r => ({
          name: r.careerTitle,
          score: r.overallFitScore,
          color: '#7c3aed'
        })));

        // Placeholder for radar & personality if not in DTO
        setRadarData([
          { subject: 'Logic', A: 85 },
          { subject: 'Sáng tạo', A: 70 },
          { subject: 'Giao tiếp', A: 75 },
          { subject: 'Kỹ thuật', A: 80 },
          { subject: 'Lãnh đạo', A: 65 },
        ]);

        setPersonalityTraits([
          { name: 'Phân tích', value: 85, desc: 'Tư duy logic tốt' },
          { name: 'Kỹ thuật', value: 90, desc: 'Đam mê công nghệ' },
        ]);

      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setIsLoadingResult(false);
      }
    };

    void loadResults();
  }, [accessToken]);

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
          {isLoadingResult && (
            <p className="text-muted-foreground mt-2 text-xs">Dang tai ket qua tu he thong AI...</p>
          )}
        </motion.div>
      </div>

      <div className="container mt-8 space-y-10 px-4">
        {topCareers.length > 0 ? (
          <>
            <motion.section variants={fadeUp} initial="hidden" animate="show">
              <h2 className="text-foreground mb-6 flex items-center gap-2 text-xl font-bold">
                <TrendingUp className="h-5 w-5 text-violet-500" />
                Top Nghề nghiệp phù hợp nhất
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {topCareers.map((career) => (
              <div key={career.title} className="glass-card relative overflow-hidden rounded-2xl">
                <div className={`h-2 w-full bg-linear-to-r ${career.gradient}`} />
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
                          className={`h-full bg-linear-to-r ${career.gradient}`}
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
                    {career.skills.map((s: string) => (
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
                    onClick={() =>
                      router.push(
                        `/career-analysis?career=${encodeURIComponent(career.title)}&match=${career.match}`,
                      )
                    }
                    className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${career.btnClass}`}
                  >
                    Xem phân tích &amp; lộ trình &gt;
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
                    className="h-full rounded-full bg-linear-to-r from-violet-500 to-purple-400"
                    style={{ width: `${trait.value}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">{trait.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <TrendingUp className="text-muted-foreground h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Chưa có kết quả đánh giá</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Bạn cần hoàn thành bài trắc nghiệm tính cách để AI có thể phân tích và đề xuất nghề nghiệp phù hợp.
            </p>
            <Link href="/personality-test" className="mt-6">
              <Button className="bg-violet-600 hover:bg-violet-700">
                Làm bài trắc nghiệm ngay
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};


export default AssessmentResult;
