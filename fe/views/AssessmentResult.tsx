'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { assessmentService } from '@/lib/assessment.service';
import { roadmapService, CareerDetailedAnalysis } from '@/lib/roadmap.service';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  TrendingUp, 
  Bot, 
  ChevronRight,
  BarChart3,
  Rocket,
  DollarSign,
  Calendar,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
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


interface MappedCareer {
  title: string;
  match: number;
  icon: string;
  insight: string;
  growth: string;
  demandLabel: string;
  skills: string[];
  gradient: string;
}

/* ─── Career Card ─── */
const CareerCard = ({
  career,
  index,
  details,
  onNavigate
}: {
  career: MappedCareer;
  index: number;
  details?: CareerDetailedAnalysis;
  onNavigate: (title: string) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card flex flex-col overflow-hidden rounded-3xl border-border/50 shadow-soft hover:shadow-elevated transition-all duration-300 h-full"
    >
      {/* Gradient top strip */}
      <div className={`h-1.5 w-full bg-linear-to-r ${career.gradient}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm border border-border/50">
              {career.icon}
            </span>
            <div>
              <div className="flex items-start gap-2">
                <h3 className="font-display leading-tight font-bold text-base">{career.title}</h3>
                {index === 0 && (
                  <span className="bg-amber-400/20 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border border-amber-400/30 shrink-0 mt-0.5">
                    TOP
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full border border-border/30">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${career.match}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full bg-linear-to-r ${career.gradient}`} 
                  />
                </div>
                <span className="text-primary text-[10px] font-bold">{career.match}% match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insight snippet - Fixed height to keep cards equal */}
        <div className="mb-4 min-h-[40px]">
          <p className="text-muted-foreground line-clamp-2 text-xs italic pl-3 border-l-2 border-primary/30">
            &quot;{career.insight}&quot;
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-primary/5 rounded-xl p-2.5 border border-primary/10">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Lương</span>
            </div>
            <p className="text-foreground font-bold text-xs truncate">
              {details?.salaryRange || 'Đang phân tích...'}
            </p>
          </div>
          <div className="bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/10">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Nhu cầu</span>
            </div>
            <p className="text-foreground font-bold text-xs truncate">
              {details?.demandLevel || career.demandLabel}
            </p>
          </div>
        </div>

        {/* Concise AI Details */}
        <div className="flex-1 space-y-4">
          {/* Summary */}
          <div className="min-h-[60px]">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
              <Info className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Tóm tắt ngành</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
              {details?.overview || 'Đang chờ AI cập nhật thông tin tổng quan về ngành nghề này...'}
            </p>
          </div>

          {/* 5-Year Outlook & Skills in a small grid */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tầm nhìn 5 năm</span>
              </div>
              <div className="bg-muted/30 rounded-xl p-2 border border-border/40">
                <p className="text-[10px] text-foreground/80 leading-snug line-clamp-2">
                  {details?.trends?.[0]?.description || 'Xu hướng phát triển đang được AI phân tích...'}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Kỹ năng cần học</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(details?.keySkills || career.skills || []).slice(0, 3).map((skill: string, i: number) => (
                  <span key={i} className="bg-primary/5 text-primary border border-primary/10 rounded-lg px-2 py-0.5 text-[9px] font-medium">
                    {skill}
                  </span>
                ))}
                {!(details?.keySkills || career.skills) && <span className="text-[10px] text-muted-foreground italic">Đang tải...</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <Button 
            variant="hero" 
            className="w-full gap-2 rounded-2xl py-5 shadow-lg shadow-primary/20 text-xs"
            onClick={() => onNavigate(career.title)}
          >
            <Rocket className="h-3.5 w-3.5" />
            Lộ trình chi tiết
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main view ─── */
const AssessmentResult = () => {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [topCareers, setTopCareers] = useState<MappedCareer[]>([]);
  const [detailedAnalyses, setDetailedAnalyses] = useState<Record<string, CareerDetailedAnalysis>>({});
  const [radarData, setRadarData] = useState<{ subject: string; A: number }[]>([]);
  const [barData, setBarData] = useState<{ name: string; score: number; color: string }[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<{ name: string; value: number; desc: string }[]>([]);
  const [isLoadingResult, setIsLoadingResult] = useState(true);

  const isDark = useSyncExternalStore(themeSubscribe, getIsDark, () => false);
  const tickColor = isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))';
  const tooltipStyle = {
    borderRadius: 12,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: 12,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
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
          { gradient: 'from-violet-600 to-indigo-600', icon: '💻' },
          { gradient: 'from-fuchsia-600 to-purple-600', icon: '🤖' },
          { gradient: 'from-blue-600 to-cyan-500', icon: '📊' },
        ];

        // Map careers
        const mapped = results.slice(0, 3).map((item, idx) => {
          const style = palette[idx] || palette[0];
          return {
            title: item.careerTitle || 'Nghề nghiệp',
            match: Math.round(Number(item.overallFitScore || 0)),
            icon: style.icon,
            insight: item.aiExplanation || 'AI đánh giá ngành này có sự tương đồng lớn với phong cách làm việc của bạn.',
            growth: 'Tăng trưởng mạnh',
            demandLabel: 'Rất cao',
            skills: (item.strengths || []).slice(0, 3),
            gradient: style.gradient,
          };
        });
        setTopCareers(mapped);

        // Map bar data
        setBarData(results.slice(0, 5).map(r => ({
          name: r.careerTitle || 'Nghề nghiệp',
          score: Math.round(Number(r.overallFitScore || 0)),
          color: '#7c3aed'
        })));

        // Mock radar & personality (can be replaced with real data if available in backend)
        setRadarData([
          { subject: 'Logic', A: 85 },
          { subject: 'Sáng tạo', A: 70 },
          { subject: 'Giao tiếp', A: 75 },
          { subject: 'Kỹ thuật', A: 80 },
          { subject: 'Lãnh đạo', A: 65 },
        ]);

        setPersonalityTraits([
          { name: 'Tư duy hệ thống', value: 85, desc: 'Khả năng nhìn nhận vấn đề tổng quát' },
          { name: 'Thích nghi', value: 92, desc: 'Luôn sẵn sàng với những thay đổi mới' },
          { name: 'Kỹ thuật', value: 78, desc: 'Nền tảng kiến thức công cụ tốt' },
          { name: 'Sáng tạo', value: 65, desc: 'Cách tiếp cận vấn đề độc đáo' },
        ]);

        // Fetch detailed analyses in parallel
        const detailPromises = mapped.map(async (career) => {
          try {
            const detail = await roadmapService.getDetailedAnalysis(accessToken, career.title);
            return { title: career.title, detail };
          } catch (err) {
            console.error(`Failed to fetch details for ${career.title}:`, err);
            return null;
          }
        });

        const detailResults = await Promise.all(detailPromises);
        const detailMap: Record<string, CareerDetailedAnalysis> = {};
        detailResults.forEach(res => {
          if (res) detailMap[res.title] = res.detail;
        });
        setDetailedAnalyses(detailMap);

      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setIsLoadingResult(false);
      }
    };

    void loadResults();
  }, [accessToken]);

  const handleNavigate = (title: string) => {
    router.push(`/career-analysis?career=${encodeURIComponent(title)}`);
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-linear-to-b from-primary/10 via-transparent to-transparent px-4 pt-12 pb-10 text-center">
        <div className="absolute top-0 left-1/2 h-64 w-full -translate-x-1/2 bg-purple-500/5 blur-3xl" />
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Phân tích AI hoàn tất
          </span>
          <h1 className="font-display text-foreground text-3xl font-extrabold sm:text-5xl">
            Kết quả của bạn đã sẵn sàng
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed">
            Dựa trên 20 câu trả lời về tính cách và sở thích, Edumee AI đã chọn lọc ra những lộ trình sự nghiệp tối ưu nhất dành riêng cho bạn.
          </p>
        </motion.div>
      </div>

      <div className="container mt-4 space-y-12 px-4">
        {/* Top Careers Grid */}
        <motion.section initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
              <TrendingUp className="h-6 w-6 text-primary" />
              Ngành nghề đề xuất
            </h2>
          </div>
          
          {isLoadingResult ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-muted h-64 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : topCareers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {topCareers.map((career, idx) => (
                <CareerCard 
                  key={career.title} 
                  career={career} 
                  index={idx} 
                  details={detailedAnalyses[career.title]}
                  onNavigate={handleNavigate} 
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl">
              <Rocket className="text-muted-foreground/30 mb-4 h-16 w-16" />
              <h3 className="text-xl font-bold">Chưa có dữ liệu</h3>
              <p className="text-muted-foreground mt-2">Hãy bắt đầu bài trắc nghiệm để khám phá lộ trình của bạn.</p>
              <Link href="/personality-test" className="mt-6">
                <Button variant="hero">Làm bài ngay</Button>
              </Link>
            </div>
          )}
        </motion.section>

        {/* Charts Section */}
        {!isLoadingResult && topCareers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Competency Radar */}
            {/* Competency Radar */}
            <div className="glass-card rounded-2xl p-6 border-border/50 shadow-soft hover:shadow-elevated transition-all duration-500">
              <div className="mb-6 flex items-center gap-2">
                <div className="bg-primary/10 rounded-xl p-2.5">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-foreground font-bold">Biểu đồ năng lực</h3>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ 
                        fontSize: 10, 
                        fill: tickColor, 
                        fontWeight: 700,
                        className: "uppercase tracking-tight"
                      }} 
                    />
                    <Radar
                      name="Năng lực"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                      dot={{ 
                        r: 4, 
                        fill: 'hsl(var(--primary))', 
                        strokeWidth: 2, 
                        stroke: 'hsl(var(--background))' 
                      }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fit Score - Modernized List */}
            <div className="glass-card rounded-2xl p-6 border-border/50 shadow-soft hover:shadow-elevated transition-all duration-500">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded-xl p-2.5">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-foreground font-bold">Phân tích độ phù hợp</h3>
                </div>
                <span className="text-primary text-[10px] font-extrabold uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  Top 5
                </span>
              </div>
              
              <div className="space-y-6 py-2">
                {barData.map((item, i) => (
                  <div key={i} className="group">
                    <div className="mb-2.5 flex items-end justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                          Xếp hạng #{i + 1}
                        </span>
                        <span className="text-foreground text-sm font-bold group-hover:text-primary transition-colors line-clamp-1">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-primary font-display text-lg font-black leading-none">
                        {item.score}<span className="text-[10px] ml-0.5">%</span>
                      </span>
                    </div>
                    <div className="bg-muted/40 relative h-3 w-full overflow-hidden rounded-full border border-border/20 shadow-inner">
                      {/* Background track shimmer */}
                      <div className="absolute inset-0 opacity-10 bg-linear-to-r from-transparent via-white to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                      
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1.5, delay: i * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                        className="relative h-full rounded-full shadow-lg"
                        style={{ 
                          background: i === 0 
                            ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))' 
                            : 'hsl(var(--primary))'
                        }}
                      >
                        {/* Subtle inner glow */}
                        <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent" />
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Personality Profile */}
        {!isLoadingResult && topCareers.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="mb-6">
              <h2 className="text-foreground text-2xl font-bold">🧠 Hồ sơ tính cách</h2>
              <p className="text-muted-foreground mt-1 text-sm">Các đặc điểm nổi bật tạo nên thế mạnh của bạn</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {personalityTraits.map((trait, idx) => (
                <div 
                  key={trait.name} 
                  className="glass-card group flex flex-col rounded-2xl p-5 border-border/40 shadow-soft hover:shadow-elevated hover:border-primary/30 transition-all duration-500"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-foreground text-sm font-bold group-hover:text-primary transition-colors">{trait.name}</span>
                    <span className="text-primary text-xs font-black bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                      {trait.value}%
                    </span>
                  </div>
                  <div className="bg-muted/50 mb-4 h-2 w-full overflow-hidden rounded-full border border-border/20 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${trait.value}%` }}
                      transition={{ duration: 1.5, delay: 0.2 + (idx * 0.1), ease: [0.34, 1.56, 0.64, 1] }}
                      className="h-full bg-linear-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2 italic">
                    &quot;{trait.desc}&quot;
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default AssessmentResult;
