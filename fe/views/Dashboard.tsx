'use client';

import { PlanBenefitDetails } from '@/components/ai/PlanBenefitDetails';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  aiBillingService,
  type AiPlanCatalogItem,
  type BillingCycle,
  type MyAiSubscription,
  type PaymentRecord,
  type QuotaView,
} from '@/lib/ai-billing.service';
import { getPlanFeatureLabels } from '@/lib/ai-plan-benefits';
import { ApiError } from '@/lib/api-client';
import { dashboardService, type DashboardResponse } from '@/lib/dashboard.service';
import { normalizePaymentCheckoutRedirectUrl } from '@/lib/payment-redirect';
import { cn } from '@/lib/utils';
import { getWalletAccount, walletService, type WalletSummary } from '@/lib/wallet.service';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  FileText,
  Flame,
  GitCompare,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type BillingBanner = {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
};

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Hàng tháng',
  three_months: '3 tháng',
  six_months: '6 tháng',
  five_months: '5 tháng',
  nine_months: '9 tháng',
  yearly: '1 năm',
};

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  three_months: 3,
  six_months: 6,
  five_months: 5,
  nine_months: 9,
  yearly: 12,
};

const quickActions = [
  {
    icon: GitCompare,
    label: 'So sánh nghề',
    desc: 'Phân tích điểm mạnh/yếu',
    href: '/career-compare',
    color:
      'border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.02] to-transparent hover:border-indigo-500/40 shadow-indigo-500/5',
    iconBg: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20',
  },
  {
    icon: Compass,
    label: 'Mô phỏng nghề',
    desc: 'Trải nghiệm chặng thực tế',
    href: '/career-simulation',
    color:
      'border-sky-500/20 bg-gradient-to-br from-sky-500/[0.02] to-transparent hover:border-sky-500/40 shadow-sky-500/5',
    iconBg: 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20',
  },
  {
    icon: Users,
    label: 'Cộng đồng',
    desc: 'Kết nối mạng lưới Mentor',
    href: '/community',
    color:
      'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.02] to-transparent hover:border-emerald-500/40 shadow-emerald-500/5',
    iconBg: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20',
  },
];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const motionCardItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 16 } },
};

interface AiCourseRecommendation {
  courseName: string;
  provider: string;
  url: string;
  reason: string;
  type: string;
  matchScore: number;
  authorityScore: number;
  dotColor: string;
}

const Dashboard = () => {
  // 🎯 FIX ts-unused-vars: Xóa 'router' không xài đến
  const { accessToken } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const [aiRecommendations, setAiRecommendations] = useState<AiCourseRecommendation[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(false);

  const [plans, setPlans] = useState<AiPlanCatalogItem[]>([]);
  const [subscription, setSubscription] = useState<MyAiSubscription | null>(null);

  // 🎯 FIX ts-unused-vars: Xóa state 'payments' và 'syncingPaymentId' rác để linter thông qua
  const [selectedCycles, setSelectedCycles] = useState<Record<string, BillingCycle>>({});
  const [billingBanner, setBillingBanner] = useState<BillingBanner | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useEdumeeCredit, setUseEdumeeCredit] = useState(true);

  const badgeCatalog = useMemo(
    () => [
      {
        id: 'PHASE_LAUNCHER',
        title: 'Chiến Binh Khởi Động',
        desc: 'Xong bài đầu tiên lộ trình',
        icon: Target,
        color: 'text-sky-400',
        glow: 'border-sky-500/30 bg-sky-500/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
      },
      {
        id: 'PERFECT_SCORE',
        title: 'Điểm Số Tuyệt Đối',
        desc: 'AI chấm đạt 100 điểm',
        icon: Award,
        color: 'text-yellow-400',
        glow: 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]',
      },
      {
        id: 'SPEED_RUNNER',
        title: 'Siêu Tốc Độ',
        desc: 'Cày chặng vượt mốc tiến độ',
        icon: Zap,
        color: 'text-amber-400',
        glow: 'border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      },
      {
        id: 'EXPLORER_PRO',
        title: 'Thám Hiểm Bậc Thầy',
        desc: 'Xem sâu trên 3 nghề mô phỏng',
        icon: Compass,
        color: 'text-emerald-400',
        glow: 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      },
      {
        id: 'STREAK_MASTER',
        title: 'Kỷ Luật Thép',
        desc: 'Mạch học tập duy trì liên tục',
        icon: Flame,
        color: 'text-orange-400',
        glow: 'border-orange-500/30 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]',
      },
      {
        id: 'ROADMAP_CONQUEROR',
        title: 'Phá Đảo Lộ Trình',
        desc: 'Đạt 100% mục tiêu sự nghiệp',
        icon: Crown,
        color: 'text-violet-400',
        glow: 'border-violet-500/40 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]',
      },
    ],
    [],
  );

  useEffect(() => {
    if (
      dashboardData &&
      dashboardData.pendingTasks.length === 0 &&
      dashboardData.activeRoadmap?.overallProgressPercentage === 100
    ) {
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.65 },
          colors: ['#8b5cf6', '#3b82f6', '#10b981', '#eab308'],
        });
      });
    }
  }, [dashboardData]);

  const loadAiRecommendations = useCallback(
    async (careerTitle: string) => {
      if (!accessToken) return;
      try {
        setIsRecsLoading(true);
        const data = await dashboardService.getAiRecommendations(accessToken, careerTitle);
        setAiRecommendations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi nạp tài liệu mở rộng AI:', err);
      } finally {
        setIsRecsLoading(false);
      }
    },
    [accessToken],
  );

  const loadCoreDashboardInfo = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIsDashboardLoading(true);
      const res = await dashboardService.getDashboardData(accessToken);
      setDashboardData(res);

      if (res?.hasActiveRoadmap && res?.activeRoadmap?.careerTitle) {
        void loadAiRecommendations(res.activeRoadmap.careerTitle);
      }
    } catch {
      toast.error('Không thể kéo dữ liệu phân tích học tập.');
    } finally {
      setIsDashboardLoading(false);
    }
  }, [accessToken, loadAiRecommendations]);

  const loadBilling = useCallback(async () => {
    if (!accessToken) return;
    try {
      setIsBillingLoading(true);
      setBillingError('');
      const [catalog, currentSubscription, , walletAccount] = await Promise.all([
        aiBillingService.getCatalog(),
        aiBillingService.getMyAiSubscription(accessToken),
        aiBillingService.getMyPayments(accessToken),
        walletService.getMine(accessToken),
      ]);
      const visiblePlans = catalog.filter(
        (plan) => plan.isActive !== false && !plan.isDefaultPlan && Number(plan.price || 0) > 0,
      );

      setPlans(visiblePlans);
      setSubscription(currentSubscription);
      setWallet(walletAccount);
      setSelectedCycles((current) =>
        visiblePlans.reduce<Record<string, BillingCycle>>((acc, plan) => {
          acc[plan.id] = current[plan.id] || getDefaultBillingCycle(plan);
          return acc;
        }, {}),
      );
    } catch (error) {
      setBillingError(getErrorMessage(error, 'Không thể tải thông tin gói AI.'));
    } finally {
      setIsBillingLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCoreDashboardInfo();
    void loadBilling();

    const handleWindowFocus = () => {
      void loadCoreDashboardInfo();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadCoreDashboardInfo, loadBilling]);

  useEffect(() => {
    if (!accessToken || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    const paymentId = params.get('paymentId');
    if (!paymentResult || !['success', 'error', 'cancel'].includes(paymentResult)) return;

    let isMounted = true;
    const cleanUrl = () => {
      const nextUrl = `${window.location.pathname}${window.location.hash || ''}`;
      window.history.replaceState({}, '', nextUrl);
    };

    const handlePaymentReturn = async () => {
      let payment: PaymentRecord | null = null;

      if (paymentId) {
        try {
          const synced = await aiBillingService.syncPayment(accessToken, paymentId);
          payment = synced.payment;
        } catch {
          try {
            const detail = await aiBillingService.getPayment(accessToken, paymentId);
            payment = detail.payment;
          } catch {
            payment = null;
          }
        }
      }

      if (!isMounted) return;

      const toastId = `payment-return:${paymentId || paymentResult}`;
      const banner = buildPaymentReturnBanner(paymentResult, payment);
      setBillingBanner(banner);
      showPaymentToast(banner, toastId);
      cleanUrl();
      await loadBilling();
      await loadCoreDashboardInfo();
    };

    void handlePaymentReturn();
    return () => {
      isMounted = false;
    };
  }, [accessToken, loadBilling, loadCoreDashboardInfo]);

  const handlePurchase = async (plan: AiPlanCatalogItem) => {
    if (!accessToken) {
      toast.error('Vui lòng đăng nhập để mua gói AI.');
      return;
    }

    const billingCycle = selectedCycles[plan.id] || getDefaultBillingCycle(plan);

    try {
      setPurchasingPlanId(plan.id);
      const purchase = await aiBillingService.purchaseAiPlan(accessToken, {
        planId: plan.id,
        billingCycle,
        returnUrls: buildDashboardReturnUrls(),
        useEdumeeCredit,
      });
      window.location.href = normalizePaymentCheckoutRedirectUrl(purchase.redirectUrl);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tạo phiên thanh toán.'));
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const handleManualRefresh = async () => {
    await loadBilling();
    await loadCoreDashboardInfo();
    toast.success('Đã làm mới thông tin Dashboard.');
  };

  const hasActivePaidPlan =
    subscription?.subscriptionStatus === 'active' && subscription.currentPlan !== 'free';
  const activePlanId = hasActivePaidPlan ? subscription?.plan?.id : undefined;
  const edumeeCreditAccount = getWalletAccount(wallet, 'edumee_credit');

  const currentQuotaSummary = useMemo(() => {
    if (!subscription?.quotas) return [];
    return [
      { label: 'Assessment', quota: subscription.quotas.assessment },
      { label: 'AI chat', quota: subscription.quotas.aiChat },
      { label: 'Roadmap', quota: subscription.quotas.roadmap },
    ].filter((item) => item.quota && item.quota.limit > 0);
  }, [subscription]);

  if (isDashboardLoading && !dashboardData) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
          <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Đang đồng bộ dữ liệu học tập thông minh...
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.hasActiveRoadmap) {
    return (
      <div className="container mx-auto flex min-h-[85vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card max-w-xl rounded-2xl border p-8 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            Chào mừng bạn đến với EDUMEE!
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Hệ thống nhận diện bạn chưa có Lộ trình học tập cá nhân hóa. Hãy hoàn thành bài đánh giá
            tính cách nghề nghiệp Holland để khai phóng tiềm năng và mở khóa bảng điều khiển
            Dashboard ngay lập tức!
          </p>
          <Link href="/onboarding">
            <Button variant="hero" size="lg" className="mt-6 gap-2 font-bold shadow-lg">
              Bắt đầu bài kiểm tra năng lực <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const { stats: rawStats, activeRoadmap, pendingTasks } = dashboardData;
  const stats = rawStats as typeof rawStats & { achievements?: string[] };
  const isTasksCleared = pendingTasks.length === 0;

  return (
    <div className="container mx-auto min-h-screen space-y-6 px-4 py-6 pb-20">
      <div className="bg-gradient-card border-border/40 relative overflow-hidden rounded-2xl border p-6 md:p-8">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Không gian số điều hướng Edumee
          </div>
          <h1 className="text-foreground text-2xl font-black tracking-tight md:text-3xl">
            Không gian bứt phá sự nghiệp!
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hệ thống dữ liệu đã đồng bộ mạch cày cuốc của bạn. Toàn bộ chỉ số Streak, ma trận lộ
            trình và tài nguyên bổ trợ từ AI Mentor đã sẵn sàng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 lg:col-span-2"
        >
          <motion.div
            variants={motionCardItem}
            whileHover={{ y: -4 }}
            className="glass-card bg-card/50 flex items-center gap-3.5 rounded-xl border border-blue-500/15 p-4 shadow-md transition-all duration-300 hover:border-blue-500/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <CheckCircle2 className="h-5.5 w-5.5" />
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Nhiệm vụ xong
              </span>
              <span className="text-foreground text-lg font-black tracking-tight">
                {stats.totalTasksCompleted} Bài
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={motionCardItem}
            whileHover={{ y: -4 }}
            className="glass-card bg-card/50 flex items-center gap-3.5 rounded-xl border border-violet-500/15 p-4 shadow-md transition-all duration-300 hover:border-violet-500/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <BarChart2 className="h-5.5 w-5.5" />
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Nghề đã xem
              </span>
              <span className="text-foreground text-lg font-black tracking-tight">
                {stats.exploredCareersCount} Ngành
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={motionCardItem}
            whileHover={{ y: -4 }}
            className="glass-card bg-card/50 flex items-center gap-3.5 rounded-xl border border-orange-500/15 p-4 shadow-md transition-all duration-300 hover:border-orange-500/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Flame className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Học liên tiếp
              </span>
              <span className="text-lg font-black tracking-tight text-orange-400">
                {stats.currentStreak} Ngày
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={motionCardItem}
            whileHover={{ y: -4 }}
            className="glass-card bg-card/50 flex items-center gap-3.5 rounded-xl border border-emerald-500/15 p-4 shadow-md transition-all duration-300 hover:border-emerald-500/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Trophy className="h-5.5 w-5.5" />
            </div>
            <div className="min-w-0">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Danh hiệu mở
              </span>
              <span className="text-foreground text-lg font-black tracking-tight">
                {stats.achievements?.length || 0} Đạt
              </span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex h-full flex-col justify-between gap-3 lg:col-span-1"
        >
          {quickActions.map((action, idx) => {
            const ActionIcon = action.icon;
            return (
              <Link
                key={action.href || idx}
                href={action.href}
                className="group block h-full w-full"
              >
                <motion.div
                  variants={motionCardItem}
                  whileHover={{ scale: 1.01, x: 2 }}
                  className={cn(
                    'flex h-full min-h-[62px] cursor-pointer items-center justify-between rounded-xl border px-4 py-3 shadow-sm transition-all duration-300',
                    action.color,
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300',
                        action.iconBg,
                      )}
                    >
                      <ActionIcon className="h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-foreground text-xs font-black tracking-tight">
                        {action.label}
                      </div>
                      <div className="text-muted-foreground mt-0.5 truncate text-[10px] font-medium">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground shrink-0 transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="w-full space-y-6">
          <div className="glass-card border-border/50 bg-card space-y-6 rounded-2xl border p-6">
            <div className="border-border/40 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-base font-bold">
                  <Layers className="h-4 w-4 text-violet-400" /> Tiến trình ma trận chặng nghề
                  nghiệp
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Biểu đồ giám sát thời gian thực năng lực tích lũy
                </p>
              </div>
              <Badge
                variant="secondary"
                className="border border-violet-500/20 bg-violet-500/5 px-2.5 py-1 text-xs font-bold text-violet-400"
              >
                Mục tiêu: {activeRoadmap?.careerTitle}
              </Badge>
            </div>

            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
              <div className="bg-muted/20 border-border/30 flex flex-col items-center justify-center rounded-xl border p-4">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <circle
                      className="text-muted/20"
                      strokeWidth="3.2"
                      stroke="currentColor"
                      fill="none"
                      r="16"
                      cx="18"
                      cy="18"
                    />
                    <motion.circle
                      initial={{ strokeDasharray: '0, 100' }}
                      animate={{
                        strokeDasharray: `${activeRoadmap?.overallProgressPercentage || 0}, 100`,
                      }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="text-violet-500"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      r="16"
                      cx="18"
                      cy="18"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-foreground text-xl font-black">
                      {activeRoadmap?.overallProgressPercentage}%
                    </span>
                    <span className="text-muted-foreground text-[9px] font-bold tracking-wide uppercase">
                      Tiến độ
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-emerald-500/10 bg-emerald-50/[0.02] p-3">
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                      Bài tập bẻ khóa
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-emerald-400">
                      {activeRoadmap?.completedCount} Nhiệm vụ
                    </span>
                  </div>
                  <div className="border-border/60 bg-zinc-550/[0.02] rounded-xl border p-3">
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                      Cấu phần còn lại
                    </span>
                    <span className="text-foreground/80 mt-0.5 block text-sm font-bold">
                      {activeRoadmap?.remainingCount} Bài học
                    </span>
                  </div>
                </div>

                <div className="bg-muted/40 border-border/30 space-y-1 rounded-xl border p-3.5">
                  <span className="block text-[9px] font-black tracking-wider text-violet-400 uppercase">
                    📍 Đang thực hiện chặng:
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-foreground block truncate text-xs font-bold">
                        {activeRoadmap?.currentState.taskTitle}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-[10px] font-medium">
                        {activeRoadmap?.currentState.phaseTitle}
                      </span>
                    </div>
                    <Link href={`/learning-roadmap?id=${activeRoadmap?.roadmapId}`}>
                      <Button
                        size="sm"
                        variant="hero"
                        className="h-7 shrink-0 rounded-md px-2.5 text-[10px] font-bold shadow-md"
                      >
                        Vào phòng học
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'grid items-stretch gap-6 transition-all duration-500',
              isTasksCleared ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2',
            )}
          >
            <AnimatePresence>
              {!isTasksCleared && (
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  className="glass-card border-border/50 bg-card flex h-full flex-col justify-between rounded-2xl border p-6"
                >
                  <div className="w-full space-y-4">
                    <div>
                      <h2 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        <Clock className="h-4 w-4 text-amber-400" /> Bài học nhắc nhở chưa hoàn
                        thành
                      </h2>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        Hệ thống AI đề xuất các cấu phần cần bẻ khóa ngay
                      </p>
                    </div>
                    <div className="space-y-3">
                      {pendingTasks.map((task, idx) => (
                        <div
                          key={task.taskId || idx}
                          className="border-border/40 bg-background/50 flex items-center justify-between rounded-xl border p-3.5 transition-all hover:border-violet-500/20 hover:bg-violet-500/5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="bg-muted/60 text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                              {task.formatType === 'QUIZ' ? (
                                <Zap className="h-4 w-4 text-violet-400" />
                              ) : task.formatType === 'TEXT' ? (
                                <FileText className="h-4 w-4 text-blue-400" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-emerald-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-foreground block truncate text-xs font-bold">
                                {task.title}
                              </span>
                              <span className="text-muted-foreground mt-0.5 block truncate text-[10px]">
                                {task.phaseTitle}
                              </span>
                            </div>
                          </div>
                          <Link href={`/learning-roadmap?id=${activeRoadmap?.roadmapId}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-md px-2 text-[10px] font-bold"
                            >
                              Cày ngay
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass-card border-border/50 bg-card flex h-full flex-col justify-between rounded-2xl border p-6">
              <div className="w-full space-y-4">
                <div className="border-border/30 flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-foreground flex items-center gap-2 text-sm font-bold">
                      <Award className="h-4 w-4 text-violet-400" /> Bảng Vàng Danh Hiệu Lộ Trình
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Thành tựu từ kết quả bẻ khóa cấu phần thực tế
                    </p>
                  </div>
                  {isTasksCleared && (
                    <Badge className="animate-pulse border border-yellow-500/30 bg-yellow-500/10 text-[10px] font-bold text-yellow-500">
                      🎉 Đã dọn sạch bài học
                    </Badge>
                  )}
                </div>

                {isTasksCleared && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 flex items-center gap-4 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/[0.05] to-orange-500/[0.05] p-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <h4 className="text-foreground text-sm font-black">
                        Chinh phục đỉnh cao tuyệt đối!
                      </h4>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        Hệ thống ghi nhận bạn đã hoàn tất toàn bộ bài tập nhắc nhở. Các danh hiệu lộ
                        trình dưới đây đã được mở khóa toàn bộ!
                      </p>
                    </div>
                  </motion.div>
                )}

                <div
                  className={cn(
                    'grid gap-3 transition-all duration-500',
                    isTasksCleared
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2',
                    isTasksCleared ? 'pt-2' : 'pt-0',
                  )}
                >
                  {badgeCatalog.map((badge) => {
                    const isUnlocked = stats.achievements?.includes(badge.id);
                    const BadgeIcon = badge.icon;
                    return (
                      <div
                        key={badge.id}
                        className={cn(
                          'flex flex-col justify-between rounded-xl border p-4 transition-all duration-500',
                          isUnlocked
                            ? badge.glow
                            : 'border-border/30 bg-muted/10 opacity-40 grayscale',
                          isTasksCleared ? 'min-h-[115px] p-5' : 'min-h-[100px]',
                        )}
                      >
                        <div>
                          <BadgeIcon
                            className={cn(
                              'mb-2.5 h-5 w-5',
                              isUnlocked ? badge.color : 'text-muted-foreground',
                            )}
                          />
                          <h4 className="text-foreground text-xs font-bold tracking-tight">
                            {badge.title}
                          </h4>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[10px] leading-snug">
                          {badge.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:sticky lg:top-6">
          <div className="glass-card border-border/50 bg-card relative flex flex-col rounded-2xl border p-6">
            <div className="border-border/40 border-b pb-3">
              <h2 className="text-foreground flex items-center gap-1.5 text-base font-bold">
                <Bot className="h-4 w-4 text-violet-400" /> Định hướng mở rộng thông minh AI
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Khóa học, nguồn học liệu uy tín tối ưu riêng cho bạn
              </p>
            </div>

            <div className="scrollbar-thin scrollbar-thumb-violet-500/20 scrollbar-track-transparent mt-4 max-h-[600px] space-y-4 overflow-y-auto pr-1.5">
              {isRecsLoading ? (
                <div className="text-muted-foreground flex animate-pulse flex-col items-center justify-center gap-3 py-12 text-xs">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  <span className="font-bold tracking-wide">
                    AI đang lập bộ mục lục tài liệu chuyên sâu...
                  </span>
                </div>
              ) : aiRecommendations.length > 0 ? (
                aiRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="border-border/40 bg-background/30 space-y-3 rounded-xl border p-4 transition-all hover:border-violet-500/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${rec.dotColor || 'bg-blue-400'}`}
                          />
                          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                            {rec.type || 'Course'} • {rec.provider || 'Coursera'}
                          </span>
                        </div>
                        <h4 className="text-foreground mt-1 line-clamp-2 pr-1 text-xs leading-snug font-bold">
                          {rec.courseName}
                        </h4>
                      </div>
                    </div>
                    <p className="text-muted-foreground bg-muted/20 border-border/20 rounded-lg border p-2 text-[11px] leading-relaxed font-medium">
                      &quot;{rec.reason}&quot;
                    </p>
                    <div className="border-border/40 flex items-center justify-between border-t border-dashed pt-1 text-[10px]">
                      <div className="flex gap-3 font-bold">
                        <span className="text-violet-400">
                          Độ khớp: <span className="text-foreground">{rec.matchScore || 95}%</span>
                        </span>
                        <span className="text-blue-400">
                          Uy tín:{' '}
                          <span className="text-foreground">{rec.authorityScore || 90}/100</span>
                        </span>
                      </div>
                      <a
                        href={rec.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 font-bold text-violet-400 hover:underline"
                      >
                        Xem <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-6 text-center text-xs italic">
                  Hệ thống đang đồng bộ định hướng khóa học chuyên môn.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-border/40 border-t pt-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-primary mb-2 flex items-center gap-2 text-sm font-semibold">
              <WalletCards className="h-4 w-4" /> Phân hệ gói dịch vụ mở rộng AI
            </p>
            <h2 className="font-display text-xl font-bold">Nâng cấp đặc quyền tài khoản Mentor</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start"
            disabled={isBillingLoading}
            onClick={handleManualRefresh}
          >
            {isBillingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}{' '}
            Làm mới cổng SePay
          </Button>
        </div>

        {billingBanner ? <BillingReturnBanner banner={billingBanner} /> : null}
        {billingError ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{billingError}</span>
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_0.85fr_1.25fr]">
          <div className="border-primary/10 bg-primary/5 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground text-xs font-semibold uppercase">
                Gói hiện tại
              </div>
              <ShieldCheck className="text-primary h-4 w-4" />
            </div>
            <div className="mt-2 truncate text-xl font-bold">
              {subscription?.subscriptionStatus === 'active'
                ? subscription.plan?.name || subscription.currentPlan
                : 'Free'}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {subscription?.expiresAt
                ? `Hết hạn ${formatDate(subscription.expiresAt)}`
                : 'Đang dùng quyền mặc định'}
            </div>
          </div>
          <div className="border-secondary/10 bg-secondary/5 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground text-xs font-semibold uppercase">Chu kỳ</div>
              <ShieldCheck className="text-primary h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-bold">
              {subscription?.billingCycle ? formatBillingCycle(subscription.billingCycle) : 'Free'}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {subscription?.subscriptionStatus === 'active'
                ? 'Subscription đang hoạt động'
                : 'Chưa có subscription trả phí'}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/10 bg-emerald-50/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-emerald-400 uppercase">Quota gói AI</div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {currentQuotaSummary.length || 0} mục
              </span>
            </div>
            <div className="space-y-3">
              {currentQuotaSummary.length > 0 ? (
                currentQuotaSummary.slice(0, 3).map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-foreground/80 truncate font-medium">{item.label}</span>
                      <span className="text-foreground font-bold">
                        {formatQuotaUsageLabel(item.quota)}
                      </span>
                    </div>
                    <div className="bg-muted/60 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${getQuotaPercent(item.quota.used, item.quota.limit)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-1 text-xs italic">
                  Theo giới hạn gói hiện tại
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <WalletCards className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-emerald-800">Dùng Số dư Edumee</span>
              <span className="block truncate text-emerald-700/80">
                Khả dụng{' '}
                {formatCurrency(
                  edumeeCreditAccount?.availableBalance || 0,
                  wallet?.currency || 'VND',
                )}
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={useEdumeeCredit}
            onChange={(event) => setUseEdumeeCredit(event.target.checked)}
            className="sr-only"
          />
          <span
            className={cn(
              'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
              useEdumeeCredit ? 'bg-emerald-600' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                useEdumeeCredit ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </span>
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => {
            const selectedCycle = selectedCycles[plan.id] || getDefaultBillingCycle(plan);
            const pricing = getPricingForCycle(plan, selectedCycle);
            const isCurrentPlan = activePlanId === plan.id;
            const features = getPlanFeatureLabels(plan);

            return (
              <div
                key={plan.id}
                className={cn(
                  'bg-background/80 flex h-full flex-col rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md',
                  isCurrentPlan ? 'border-primary/50 ring-primary/10 ring-4' : 'border-border',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display truncate text-sm font-bold">{plan.name}</h3>
                      {isCurrentPlan ? (
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                          Đang dùng
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {plan.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="font-display text-xl font-bold">
                      {formatCurrency(pricing.total, pricing.currency)}
                    </div>
                  </div>
                  <span className="bg-muted rounded-full px-2.5 py-1 text-[10px] font-semibold">
                    {formatBillingCycle(selectedCycle)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {features.map((f) => (
                    <span
                      key={f}
                      className="bg-primary/5 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <PlanBenefitDetails plan={plan} className="mt-4" />
                <Button
                  className="mt-4 w-full gap-2"
                  disabled={purchasingPlanId === plan.id || pricing.total <= 0}
                  onClick={() => void handlePurchase(plan)}
                >
                  Mua ngay
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function BillingReturnBanner({ banner }: { banner: BillingBanner }) {
  return (
    <div
      className={cn(
        'mb-4 flex items-start gap-3 rounded-xl border p-4 text-sm',
        banner.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        banner.tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700',
        banner.tone === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
        banner.tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-700',
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <div className="font-semibold">{banner.title}</div>
        <div className="mt-1">{banner.description}</div>
      </div>
    </div>
  );
}

function getAllowedBillingCycles(plan: AiPlanCatalogItem): BillingCycle[] {
  if (plan.allowedBillingCycles?.length) return plan.allowedBillingCycles;
  const pricingCycles = Object.keys(plan.pricingByBillingCycle || {}) as BillingCycle[];
  return pricingCycles.length ? pricingCycles : ['monthly'];
}

function getDefaultBillingCycle(plan: AiPlanCatalogItem): BillingCycle {
  return getAllowedBillingCycles(plan)[0] || 'monthly';
}
function getPricingForCycle(plan: AiPlanCatalogItem, cycle: BillingCycle) {
  const serverPricing = plan.pricingByBillingCycle?.[cycle];
  if (serverPricing) return serverPricing;
  const months = BILLING_CYCLE_MONTHS[cycle] || 1;
  const monthlyPrice = Number(plan.price || 0);
  const subtotal = monthlyPrice * months;
  const discountPercentage = Math.min(Math.max(plan.billingCycleDiscounts?.[cycle] || 0, 0), 100);
  const discountAmount = (subtotal * discountPercentage) / 100;
  return {
    billingCycle: cycle,
    months,
    monthlyPrice,
    subtotal,
    discountPercentage,
    discountAmount,
    total: Math.max(subtotal - discountAmount, 0),
    currency: plan.currency || 'VND',
  };
}
function formatBillingCycle(cycle?: BillingCycle): string {
  if (!cycle) return '--';
  return BILLING_CYCLE_LABELS[cycle] || cycle;
}
function formatCurrency(amount?: number, currency = 'VND'): string {
  const numericAmount = amount ?? 0;
  if (currency.toUpperCase() === 'VND')
    return `${new Intl.NumberFormat('vi-VN').format(numericAmount)} đ`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}
function getQuotaPercent(used?: number, limit?: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(Math.max(((used || 0) / limit) * 100, 0), 100);
}

function formatQuotaUsageLabel(quota: QuotaView): string {
  if (!quota || !quota.limit) return 'Không giới hạn';
  return `${Math.min(Math.max(0, quota.used || 0), quota.limit)}/${quota.limit}`;
}

function formatDate(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function buildDashboardReturnUrls() {
  if (typeof window === 'undefined') return undefined;
  return {
    success: `${window.location.origin}/dashboard?payment=success`,
    error: `${window.location.origin}/dashboard?payment=error`,
    cancel: `${window.location.origin}/dashboard?payment=cancel`,
  };
}
function buildPaymentReturnBanner(result: string, payment: PaymentRecord | null): BillingBanner {
  if (payment?.status === 'paid')
    return {
      tone: 'success',
      title: 'Thanh toán thành công',
      description: 'Gói AI của bạn đã được kích hoạt hoặc gia hạn.',
    };
  if (payment?.status === 'pending')
    return {
      tone: 'warning',
      title: 'Thanh toán đang chờ xác nhận',
      description: 'SePay chưa trả kết quả cuối cùng. Bạn có thể làm mới lại sau ít phút.',
    };
  return {
    tone: 'error',
    title: result === 'cancel' ? 'Bạn đã hủy thanh toán' : 'Thanh toán gặp lỗi',
    description: 'Gói AI chưa được kích hoạt.',
  };
}
function showPaymentToast(banner: BillingBanner, toastId: string): void {
  if (banner.tone === 'success') toast.success(banner.title, { id: toastId });
  else if (banner.tone === 'error') toast.error(banner.title, { id: toastId });
  else toast.info(banner.title, { id: toastId });
}
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default Dashboard;
