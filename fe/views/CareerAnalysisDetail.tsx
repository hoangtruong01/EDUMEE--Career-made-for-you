'use client';

import { useAuth } from '@/context/auth-context';
import { roadmapService, CareerDetailedAnalysis } from '@/lib/roadmap.service';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Zap,
  Building2,
  Rocket,
  Loader2,
  ChevronRight,
  BarChart3,
  Star,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } },
};

/* ── Demand badge ── */
const DemandBadge = ({ level }: { level: string }) => {
  const cfg =
    level.toLowerCase().includes('rất cao')
      ? { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: level }
      : level.toLowerCase().includes('cao')
      ? { color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: level }
      : { color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: level };
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

/* ── Career Analysis Detail Component ── */

export default function CareerAnalysisDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const careerTitle = searchParams.get('career') ?? '';
  const isFromDiscovery = searchParams.get('from') === 'discovery';

  const [analysis, setAnalysis] = useState<CareerDetailedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Fetch detailed analysis */
  useEffect(() => {
    if (!accessToken || !careerTitle) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await roadmapService.getDetailedAnalysis(accessToken, careerTitle);
        setAnalysis(data);
      } catch {
        setError('Không thể tải phân tích. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [accessToken, careerTitle]);

  /* Generate roadmap and redirect */
  const handleStartRoadmap = async () => {
    if (!accessToken) return;
    try {
      setIsGenerating(true);
      const roadmap = await roadmapService.generateAIRoadmap(accessToken, careerTitle);
      const id = roadmap.id ?? (roadmap as { _id?: string })._id ?? '';
      router.push(`/learning-roadmap?id=${id}&career=${encodeURIComponent(careerTitle)}`);
    } catch {
      setError('Không thể tạo lộ trình. Vui lòng thử lại sau.');
      setIsGenerating(false);
    }
  };

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
            <div className="absolute inset-0 rounded-full animate-ping bg-violet-500/10" />
          </div>
          <p className="text-foreground font-semibold text-lg">AI đang phân tích nghề nghiệp...</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Đang phân tích xu hướng thị trường và phù hợp với hồ sơ của bạn
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/20 via-purple-500/10 to-pink-500/10 border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="container py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại kết quả
            </button>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-400">
                    Phân tích AI
                  </span>
                  {analysis && <DemandBadge level={analysis.demandLevel} />}
                </div>
                <h1 className="font-display text-foreground text-3xl font-extrabold sm:text-4xl">
                  {careerTitle}
                </h1>
                {analysis && (
                  <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    {analysis.salaryRange}
                  </p>
                )}
              </div>

              {/* CTA button */}
              {!isFromDiscovery && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartRoadmap}
                  disabled={isGenerating}
                  id="btn-start-roadmap"
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo lộ trình...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Bắt đầu lộ trình
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 text-center text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mt-8 space-y-8">
        {analysis ? (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
            {/* Overview */}
            <motion.div variants={fadeUp} className="glass-card rounded-2xl p-6">
              <h2 className="text-foreground mb-3 flex items-center gap-2 text-lg font-bold">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Tổng quan nghề nghiệp
              </h2>
              <p className="text-muted-foreground leading-relaxed">{analysis.overview}</p>
            </motion.div>

            {/* Pros & Cons */}
            <motion.div variants={fadeUp} className="grid gap-5 md:grid-cols-2">
              {/* Pros */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-foreground mb-4 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Ưu điểm
                </h3>
                <ul className="space-y-3">
                  {analysis.pros.map((pro, i) => (
                    <motion.li
                      key={i}
                      variants={fadeUp}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-foreground/80">{pro}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-foreground mb-4 flex items-center gap-2 font-bold">
                  <XCircle className="h-5 w-5 text-rose-500" />
                  Thách thức
                </h3>
                <ul className="space-y-3">
                  {analysis.cons.map((con, i) => (
                    <motion.li
                      key={i}
                      variants={fadeUp}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                        <XCircle className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-foreground/80">{con}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* 5-year Trends */}
            <motion.div variants={fadeUp} className="glass-card rounded-2xl p-6">
              <h2 className="text-foreground mb-5 flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Xu hướng ngành trong 5 năm tới
              </h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-0 h-full w-0.5 bg-gradient-to-b from-violet-500 to-pink-500 opacity-30" />
                <div className="space-y-5">
                  {analysis.trends.map((trend, i) => (
                    <motion.div
                      key={trend.year}
                      variants={fadeUp}
                      className="flex items-start gap-4"
                    >
                      <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-violet-500/20">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="glass-card flex-1 rounded-xl px-4 py-3">
                        <span className="text-xs font-bold text-violet-400">{trend.year}</span>
                        <p className="text-foreground/80 mt-0.5 text-sm">{trend.description}</p>
                      </div>
                      {i === 0 && (
                        <span className="mt-2 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
                          Hiện tại
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Roadmap Preview */}
            <motion.div variants={fadeUp} className="glass-card rounded-2xl p-6">
              <h3 className="text-foreground mb-4 flex items-center gap-2 font-bold">
                <Rocket className="h-5 w-5 text-violet-500" />
                Lộ trình phát triển gợi ý
              </h3>
              <div className="space-y-4">
                {[
                  'Giai đoạn 1: Xây dựng nền tảng kiến thức cơ bản',
                  'Giai đoạn 2: Phát triển kỹ năng chuyên sâu và thực hành',
                  'Giai đoạn 3: Thực hiện dự án thực tế và xây dựng Portfolio',
                  'Giai đoạn 4: Chuẩn bị hồ sơ và ứng tuyển',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-sm font-bold text-violet-400">
                      {i + 1}
                    </div>
                    <p className="text-foreground/80 text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Key Skills & Top Companies */}
            <motion.div variants={fadeUp} className="grid gap-5 md:grid-cols-2">
              {/* Key Skills */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-foreground mb-4 flex items-center gap-2 font-bold">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Kỹ năng cốt lõi cần có
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.keySkills.map((skill, i) => (
                    <motion.span
                      key={i}
                      variants={fadeUp}
                      className="flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-400"
                    >
                      <Star className="h-3 w-3" />
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Top Companies */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-foreground mb-4 flex items-center gap-2 font-bold">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Công ty tuyển dụng hàng đầu
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {analysis.topCompanies.map((company, i) => (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      className="glass-card flex items-center gap-2 rounded-xl px-3 py-2"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sm font-bold text-blue-400">
                        {company.charAt(0)}
                      </span>
                      <span className="text-foreground/80 text-sm font-medium truncate">{company}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Bottom CTA */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-gradient-to-r from-violet-600/20 via-purple-500/15 to-pink-500/10 border border-violet-500/20 p-8 text-center">
              <h3 className="text-foreground text-xl font-bold mb-2">
                🚀 Sẵn sàng bắt đầu hành trình?
              </h3>
              <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto">
                AI sẽ tạo lộ trình học tập cá nhân hóa theo đúng hồ sơ và mục tiêu của bạn — bao gồm giai đoạn, milestone và task chi tiết.
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStartRoadmap}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-violet-500/50 disabled:opacity-60 text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI đang thiết lập lộ trình của bạn...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Bắt đầu lộ trình học tập
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          /* Fallback: no data */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-10 text-center"
          >
            <p className="text-muted-foreground">Không thể tải dữ liệu phân tích.</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-sm text-violet-400 hover:text-violet-300 underline"
            >
              Quay lại
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
