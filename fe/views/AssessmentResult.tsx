'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { assessmentService, type CareerFitResultHistoryItem } from '@/lib/assessment.service';
import { CareerDetailedAnalysis, roadmapService } from '@/lib/roadmap.service';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Eye,
  History,
  Info,
  Lock,
  Rocket,
  RotateCcw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

const formatHistoryDate = (value?: string) => {
  if (!value) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getHistoryLabel = (item?: CareerFitResultHistoryItem) => {
  if (!item) return 'Mới nhất';
  if (item.isLatest) return 'Mới nhất';
  return `Lượt #${item.attemptNumber || 'cũ'}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

interface MappedCareer {
  title: string;
  match: number | null;
  icon: string;
  insight: string;
  growth: string;
  demandLabel: string;
  skills: string[];
  gradient: string;
  rank: number;
  isLocked: boolean;
}

type DetailLoadResult =
  | { status: 'success'; title: string; detail: CareerDetailedAnalysis }
  | { status: 'error'; title: string; error: string };

/* ─── Career Card ─── */
const CareerCard = ({
  career,
  index,
  details,
  detailError,
  onNavigate,
  onUpgrade,
  onRetryDetails,
}: {
  career: MappedCareer;
  index: number;
  details?: CareerDetailedAnalysis;
  detailError?: string;
  onNavigate: (title: string) => void;
  onUpgrade: () => void;
  onRetryDetails: (title: string) => void;
}) => {
  const isLocked = career.isLocked;
  const showDetailError = !isLocked && Boolean(detailError);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card border-border/50 shadow-soft relative flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-300 ${
        isLocked ? 'border-primary/20' : 'hover:shadow-elevated'
      }`}
    >
      {/* Gradient top strip */}
      <div
        className={`h-1.5 w-full bg-linear-to-r ${isLocked ? 'from-slate-400 to-zinc-500' : career.gradient}`}
      />

      <div
        className={`flex flex-1 flex-col p-5 ${isLocked ? 'pointer-events-none opacity-60 blur-[4px] select-none' : ''}`}
      >
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="bg-muted border-border/50 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl shadow-sm">
              {career.icon}
            </span>
            <div>
              <div className="flex items-start gap-2">
                <h3 className="font-display text-base leading-tight font-bold">{career.title}</h3>
                {index === 0 && (
                  <span className="mt-0.5 shrink-0 rounded-full border border-amber-400/30 bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-600 uppercase dark:text-amber-400">
                    TOP
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="bg-muted border-border/30 h-1.5 w-24 overflow-hidden rounded-full border">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${isLocked || career.match === null ? 100 : career.match}%`,
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full bg-linear-to-r ${career.gradient}`}
                  />
                </div>
                <span className="text-primary text-[10px] font-bold">
                  {isLocked || career.match === null ? 'Đã khóa' : `${career.match}% match`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Insight snippet - Fixed height to keep cards equal */}
        <div className="mb-4 min-h-[40px]">
          <p className="text-muted-foreground border-primary/30 line-clamp-2 border-l-2 pl-3 text-xs italic">
            &quot;{career.insight}&quot;
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-primary/5 border-primary/10 rounded-xl border p-2.5">
            <div className="text-primary mb-1 flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              <span className="text-[9px] font-bold tracking-wider uppercase">Lương</span>
            </div>
            <p className="text-foreground truncate text-xs font-bold">
              {showDetailError ? 'Không tải được' : details?.salaryRange || 'Đang phân tích...'}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-emerald-500">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[9px] font-bold tracking-wider uppercase">Nhu cầu</span>
            </div>
            <p className="text-foreground truncate text-xs font-bold">
              {showDetailError ? 'Không tải được' : details?.demandLevel || career.demandLabel}
            </p>
          </div>
        </div>

        {/* Concise AI Details */}
        <div className="flex-1 space-y-4">
          {showDetailError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Không tải được phân tích chi tiết</p>
                  <p className="mt-1 text-[11px] leading-relaxed">{detailError}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-8 gap-1.5 rounded-lg text-xs"
                onClick={() => onRetryDetails(career.title)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="min-h-[60px]">
                <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    Tóm tắt ngành
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-3 text-[11px] leading-relaxed">
                  {details?.overview ||
                    'Đang chờ AI cập nhật thông tin tổng quan về ngành nghề này...'}
                </p>
              </div>

              {/* 5-Year Outlook & Skills in a small grid */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">
                      Tầm nhìn 5 năm
                    </span>
                  </div>
                  <div className="bg-muted/30 border-border/40 rounded-xl border p-2">
                    <p className="text-foreground/80 line-clamp-2 text-[10px] leading-snug">
                      {details?.trends?.[0]?.description ||
                        'Xu hướng phát triển đang được AI phân tích...'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">
                      Kỹ năng cần học
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(details?.keySkills || career.skills || [])
                      .slice(0, 3)
                      .map((skill: string, i: number) => (
                        <span
                          key={i}
                          className="bg-primary/5 text-primary border-primary/10 rounded-lg border px-2 py-0.5 text-[9px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    {(details?.keySkills || career.skills || []).length === 0 && (
                      <span className="text-muted-foreground text-[10px] italic">Đang tải...</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="border-border/50 mt-5 border-t pt-4">
          <Button
            variant="hero"
            className="shadow-primary/20 w-full gap-2 rounded-2xl py-5 text-xs shadow-lg"
            onClick={() => onNavigate(career.title)}
          >
            <Rocket className="h-3.5 w-3.5" />
            Lộ trình chi tiết
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="bg-background/35 absolute inset-0 z-10 flex items-center justify-center p-5 backdrop-blur-[2px]">
          <div className="border-primary/20 bg-background/90 shadow-elevated w-full max-w-[260px] rounded-2xl border p-4 text-center">
            <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Nghề #{career.rank}
            </p>
            <p className="text-foreground mt-1 text-sm font-bold">Mở khóa để xem chi tiết</p>
            <Button
              variant="hero"
              className="mt-4 w-full gap-2 rounded-xl py-4 text-xs"
              onClick={onUpgrade}
            >
              <Lock className="h-3.5 w-3.5" />
              Nâng cấp gói AI
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ─── Main view ─── */
const AssessmentResult = () => {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [topCareers, setTopCareers] = useState<MappedCareer[]>([]);
  const [detailedAnalyses, setDetailedAnalyses] = useState<Record<string, CareerDetailedAnalysis>>(
    {},
  );
  const [radarData, setRadarData] = useState<{ subject: string; A: number }[]>([]);
  const [barData, setBarData] = useState<{ name: string; score: number; color: string }[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<
    { name: string; value: number; desc: string }[]
  >([]);
  const [isLoadingResult, setIsLoadingResult] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState<CareerFitResultHistoryItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [resultError, setResultError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const resultRequestSeqRef = useRef(0);
  const inFlightResultKeyRef = useRef<string | null>(null);
  const loadedResultKeyRef = useRef<string | null>(null);
  const loadedHistoryTokenRef = useRef('');
  const inFlightHistoryTokenRef = useRef('');
  const detailedAnalysesRef = useRef<Record<string, CareerDetailedAnalysis>>({});

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

  const replaceDetailedAnalyses = useCallback((next: Record<string, CareerDetailedAnalysis>) => {
    detailedAnalysesRef.current = next;
    setDetailedAnalyses(next);
  }, []);

  const mergeDetailedAnalyses = useCallback((updates: Record<string, CareerDetailedAnalysis>) => {
    setDetailedAnalyses((current) => {
      const next = { ...current, ...updates };
      detailedAnalysesRef.current = next;
      return next;
    });
  }, []);

  const loadCareerDetails = useCallback(
    async (careers: MappedCareer[], requestId: number) => {
      if (!accessToken) {
        return;
      }

      const targets = careers.filter(
        (career) => !career.isLocked && !detailedAnalysesRef.current[career.title],
      );
      if (targets.length === 0) {
        return;
      }

      setDetailErrors((current) => {
        const next = { ...current };
        targets.forEach((career) => delete next[career.title]);
        return next;
      });

      const detailResults: DetailLoadResult[] = await Promise.all(
        targets.map(async (career) => {
          try {
            const detail = await roadmapService.getDetailedAnalysis(accessToken, career.title);
            return { status: 'success', title: career.title, detail };
          } catch (error) {
            return {
              status: 'error',
              title: career.title,
              error: getErrorMessage(error, 'Không tải được phân tích chi tiết.'),
            };
          }
        }),
      );

      if (requestId !== resultRequestSeqRef.current) {
        return;
      }

      const updates: Record<string, CareerDetailedAnalysis> = {};
      const errors: Record<string, string> = {};
      detailResults.forEach((result) => {
        if (result.status === 'error') {
          errors[result.title] = result.error;
        } else {
          updates[result.title] = result.detail;
        }
      });

      if (Object.keys(updates).length > 0) {
        mergeDetailedAnalyses(updates);
      }
      if (Object.keys(errors).length > 0) {
        setDetailErrors((current) => ({ ...current, ...errors }));
      }
    },
    [accessToken, mergeDetailedAnalyses],
  );

  const handleRetryDetails = useCallback(
    async (careerTitle: string) => {
      if (!accessToken) {
        return;
      }

      setDetailErrors((current) => {
        const next = { ...current };
        delete next[careerTitle];
        return next;
      });

      try {
        const detail = await roadmapService.getDetailedAnalysis(accessToken, careerTitle);
        mergeDetailedAnalyses({ [careerTitle]: detail });
      } catch (error) {
        setDetailErrors((current) => ({
          ...current,
          [careerTitle]: getErrorMessage(error, 'Không tải được phân tích chi tiết.'),
        }));
      }
    },
    [accessToken, mergeDetailedAnalyses],
  );

  const loadHistory = useCallback(async () => {
    if (!accessToken) {
      setIsLoadingHistory(false);
      return;
    }

    if (
      loadedHistoryTokenRef.current === accessToken ||
      inFlightHistoryTokenRef.current === accessToken
    ) {
      return;
    }

    inFlightHistoryTokenRef.current = accessToken;
    setIsLoadingHistory(true);
    setHistoryError('');
    try {
      const rows = await assessmentService.getMyHistory(accessToken);
      setHistory(Array.isArray(rows) ? rows : []);
      loadedHistoryTokenRef.current = accessToken;
    } catch (error) {
      setHistoryError(getErrorMessage(error, 'Không tải được lịch sử làm bài.'));
    } finally {
      inFlightHistoryTokenRef.current = '';
      setIsLoadingHistory(false);
    }
  }, [accessToken]);

  const loadResults = useCallback(
    async (sessionId?: string, force = false) => {
      if (!accessToken) {
        setIsLoadingResult(false);
        return;
      }

      const requestKey = sessionId || 'latest';
      if (
        !force &&
        (inFlightResultKeyRef.current === requestKey || loadedResultKeyRef.current === requestKey)
      ) {
        return;
      }

      inFlightResultKeyRef.current = requestKey;
      const requestId = resultRequestSeqRef.current + 1;
      resultRequestSeqRef.current = requestId;
      setIsLoadingResult(true);
      setResultError('');

      try {
        const results = await assessmentService.getMyResults(accessToken, { sessionId });
        if (requestId !== resultRequestSeqRef.current) {
          return;
        }

        if (!Array.isArray(results) || results.length === 0) {
          setTopCareers([]);
          setBarData([]);
          replaceDetailedAnalyses({});
          setDetailErrors({});
          loadedResultKeyRef.current = requestKey;
          return;
        }
        setSelectedSessionId(sessionId || results[0]?.assessmentSessionId || '');

        const palette = [
          { gradient: 'from-violet-600 to-indigo-600', icon: '💻' },
          { gradient: 'from-fuchsia-600 to-purple-600', icon: '🤖' },
          { gradient: 'from-blue-600 to-cyan-500', icon: '📊' },
          { gradient: 'from-emerald-600 to-teal-500', icon: '🧭' },
          { gradient: 'from-amber-500 to-orange-500', icon: '🚀' },
        ];

        // Map careers
        const mapped = results.slice(0, 5).map((item, idx) => {
          const style = palette[idx] || palette[0];
          const rank = Number(item.rank || item.recommendationRank || idx + 1);
          const isLocked = item.isLocked === true;
          const fallbackTitle = `Nghề #${rank}`;
          return {
            title: isLocked ? fallbackTitle : item.careerTitle || fallbackTitle,
            match: isLocked ? null : Math.round(Number(item.overallFitScore || 0)),
            icon: style.icon,
            insight: isLocked
              ? ''
              : item.aiExplanation ||
                'AI đánh giá ngành này có sự tương đồng lớn với phong cách làm việc của bạn.',
            growth: 'Tăng trưởng mạnh',
            demandLabel: 'Rất cao',
            skills: isLocked ? [] : (item.strengths || []).slice(0, 3),
            gradient: style.gradient,
            rank,
            isLocked,
          };
        });
        setTopCareers(mapped);

        // Map bar data
        setBarData(
          mapped
            .filter((r) => !r.isLocked)
            .slice(0, 5)
            .map((r) => ({
              name: r.title || 'Nghề nghiệp',
              score: Math.round(Number(r.match || 0)),
              color: '#7c3aed',
            })),
        );

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

        loadedResultKeyRef.current = requestKey;
        setIsLoadingResult(false);
        void loadCareerDetails(mapped, requestId);
      } catch (error) {
        if (requestId === resultRequestSeqRef.current) {
          setResultError(getErrorMessage(error, 'Không tải được kết quả assessment.'));
        }
      } finally {
        if (inFlightResultKeyRef.current === requestKey) {
          inFlightResultKeyRef.current = null;
        }
        if (requestId === resultRequestSeqRef.current) {
          setIsLoadingResult(false);
        }
      }
    },
    [accessToken, loadCareerDetails, replaceDetailedAnalyses],
  );

  useEffect(() => {
    if (!accessToken) {
      setIsLoadingResult(false);
      setIsLoadingHistory(false);
      return;
    }

    void loadResults();
    void loadHistory();
  }, [accessToken, loadHistory, loadResults]);

  const handleNavigate = (title: string) => {
    router.push(`/career-analysis?career=${encodeURIComponent(title)}`);
  };

  const handleUpgrade = () => {
    router.push('/dashboard');
  };

  const activeHistoryItem = history.find((item) => item.sessionId === selectedSessionId);

  const handleRetake = () => {
    router.push('/personality-test?retake=1');
  };

  const handleViewHistory = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    void loadResults(sessionId);
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-card border-border/60 border-b py-12 text-center">
        <div className="absolute top-0 left-1/2 h-64 w-full -translate-x-1/2 bg-purple-500/5 blur-3xl" />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm backdrop-blur-md text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Phân tích AI hoàn tất
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm backdrop-blur-md text-primary">
              <History className="h-3.5 w-3.5" /> {getHistoryLabel(activeHistoryItem)}
            </span>
          </div>
          <h1 className="text-gradient-animate font-display mb-4 py-2 text-4xl leading-[1.2] font-extrabold tracking-tight md:text-6xl">
            Nghề nghiệp phù hợp
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed font-medium md:text-lg">
            Dựa trên 30 câu trả lời về tính cách và sở thích, Edumee AI đã chọn lọc ra những lộ
            trình sự nghiệp tối ưu nhất dành riêng cho bạn.
          </p>
        </motion.div>
      </div>

      <div className="container mt-4 space-y-12 px-4">
        {/* Top Careers Grid */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
              <TrendingUp className="text-primary h-6 w-6" />
              Ngành nghề đề xuất
            </h2>
          </div>

          {resultError && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Không tải được kết quả assessment</p>
                    <p className="mt-1 text-sm">{resultError}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2"
                  onClick={() => void loadResults(selectedSessionId || undefined, true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {isLoadingResult ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted h-64 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : topCareers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {topCareers.map((career, idx) => (
                <CareerCard
                  key={career.isLocked ? `locked-${career.rank}` : career.title}
                  career={career}
                  index={idx}
                  details={detailedAnalyses[career.title]}
                  detailError={detailErrors[career.title]}
                  onNavigate={handleNavigate}
                  onUpgrade={handleUpgrade}
                  onRetryDetails={handleRetryDetails}
                />
              ))}
            </div>
          ) : (
            <div className="border-border flex flex-col items-center justify-center rounded-3xl border-2 border-dashed py-20 text-center">
              <Rocket className="text-muted-foreground/30 mb-4 h-16 w-16" />
              <h3 className="text-xl font-bold">Chưa có dữ liệu</h3>
              <p className="text-muted-foreground mt-2">
                Hãy bắt đầu bài trắc nghiệm để khám phá lộ trình của bạn.
              </p>
              <Link href="/personality-test" className="mt-6">
                <Button variant="hero">Làm bài ngay</Button>
              </Link>
            </div>
          )}
        </motion.section>

        {(isLoadingHistory || history.length > 0 || historyError) && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
                  <History className="text-primary h-6 w-6" />
                  Lịch sử làm bài
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Trang đang hiển thị {getHistoryLabel(activeHistoryItem).toLowerCase()}.
                </p>
              </div>
            </div>

            {historyError && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {historyError}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => {
                      loadedHistoryTokenRef.current = '';
                      void loadHistory();
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Thử lại
                  </Button>
                </div>
              </div>
            )}

            {(isLoadingHistory || history.length > 0) && (
              <div className="glass-card border-border/50 shadow-soft overflow-hidden rounded-2xl border">
                {isLoadingHistory ? (
                  <div className="space-y-3 p-5">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="bg-muted h-16 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="divide-border/60 divide-y">
                    {history.map((item) => {
                      const isSelected = item.sessionId === selectedSessionId;
                      return (
                        <div
                          key={item.sessionId}
                          className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
                            isSelected ? 'bg-primary/5' : 'bg-background/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="text-foreground font-bold">
                                {item.isLatest ? 'Mới nhất' : `Lượt #${item.attemptNumber || '-'}`}
                              </span>
                              {isSelected && (
                                <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                  Đang xem
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {formatHistoryDate(item.completedAt || item.generatedAt)}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              Top 1: {item.topCareerTitle || 'Chưa có nghề'} ·{' '}
                              {Math.round(Number(item.topFitScore || 0))}% · {item.resultCount} gợi
                              ý
                            </p>
                          </div>
                          <Button
                            variant={isSelected ? 'secondary' : 'outline'}
                            className="shrink-0 gap-2"
                            disabled={isSelected}
                            onClick={() => handleViewHistory(item.sessionId)}
                          >
                            <Eye className="h-4 w-4" />
                            {isSelected ? 'Đang xem' : 'Xem'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.section>
        )}

        {/* Charts Section */}
        {!isLoadingResult && topCareers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Competency Radar */}
            {/* Competency Radar */}
            <div className="glass-card border-border/50 shadow-soft hover:shadow-elevated rounded-2xl p-6 transition-all duration-500">
              <div className="mb-6 flex items-center gap-2">
                <div className="bg-primary/10 rounded-xl p-2.5">
                  <BarChart3 className="text-primary h-5 w-5" />
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
                        className: 'uppercase tracking-tight',
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
                        stroke: 'hsl(var(--background))',
                      }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fit Score - Modernized List */}
            <div className="glass-card border-border/50 shadow-soft hover:shadow-elevated rounded-2xl p-6 transition-all duration-500">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded-xl p-2.5">
                    <Bot className="text-primary h-5 w-5" />
                  </div>
                  <h3 className="text-foreground font-bold">Phân tích độ phù hợp</h3>
                </div>
                <span className="text-primary bg-primary/10 border-primary/20 rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-widest uppercase">
                  Top {barData.length}
                </span>
              </div>

              <div className="space-y-6 py-2">
                {barData.map((item, i) => (
                  <div key={i} className="group">
                    <div className="mb-2.5 flex items-end justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          Xếp hạng #{i + 1}
                        </span>
                        <span className="text-foreground group-hover:text-primary line-clamp-1 text-sm font-bold transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-primary font-display text-lg leading-none font-black">
                        {item.score}
                        <span className="ml-0.5 text-[10px]">%</span>
                      </span>
                    </div>
                    <div className="bg-muted/40 border-border/20 relative h-3 w-full overflow-hidden rounded-full border shadow-inner">
                      {/* Background track shimmer */}
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-linear-to-r from-transparent via-white to-transparent opacity-10" />

                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1.5, delay: i * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                        className="relative h-full rounded-full shadow-lg"
                        style={{
                          background:
                            i === 0
                              ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))'
                              : 'hsl(var(--primary))',
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
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-6">
              <h2 className="text-foreground text-2xl font-bold">🧠 Hồ sơ tính cách</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Các đặc điểm nổi bật tạo nên thế mạnh của bạn
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {personalityTraits.map((trait, idx) => (
                <div
                  key={trait.name}
                  className="glass-card group border-border/40 shadow-soft hover:shadow-elevated hover:border-primary/30 flex flex-col rounded-2xl p-5 transition-all duration-500"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-foreground group-hover:text-primary text-sm font-bold transition-colors">
                      {trait.name}
                    </span>
                    <span className="text-primary bg-primary/5 border-primary/10 rounded-lg border px-2 py-0.5 text-xs font-black">
                      {trait.value}%
                    </span>
                  </div>
                  <div className="bg-muted/50 border-border/20 mb-4 h-2 w-full overflow-hidden rounded-full border shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${trait.value}%` }}
                      transition={{
                        duration: 1.5,
                        delay: 0.2 + idx * 0.1,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      className="from-primary to-secondary h-full rounded-full bg-linear-to-r"
                    />
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed italic">
                    &quot;{trait.desc}&quot;
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Retake Button at the bottom */}
        <div className="flex justify-center pt-8 pb-4">
          <Button variant="hero" className="gap-2 rounded-2xl px-8 py-6 text-sm shadow-lg shadow-primary/20" onClick={handleRetake}>
            <RotateCcw className="h-4.5 w-4.5" />
            Làm lại bài kiểm tra
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResult;
