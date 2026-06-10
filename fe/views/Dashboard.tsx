'use client';

import { Button } from '@/components/ui/button';
import { PlanBenefitDetails } from '@/components/ai/PlanBenefitDetails';
import { useAssessment } from '@/context/assessment-context';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { getPlanFeatureLabels } from '@/lib/ai-plan-benefits';
import {
  aiBillingService,
  type AiPlanCatalogItem,
  type BillingCycle,
  type MyAiSubscription,
  type PaymentRecord,
  type PaymentStatus,
  type QuotaView,
} from '@/lib/ai-billing.service';
import { normalizePaymentCheckoutRedirectUrl } from '@/lib/payment-redirect';
import { getWalletAccount, walletService, type WalletSummary } from '@/lib/wallet.service';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  GitCompare,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Đang chờ',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  refund_pending: 'Chờ hoàn tiền',
};

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

type BillingBanner = {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
};

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
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<AiPlanCatalogItem[]>([]);
  const [subscription, setSubscription] = useState<MyAiSubscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedCycles, setSelectedCycles] = useState<Record<string, BillingCycle>>({});
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [syncingPaymentId, setSyncingPaymentId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useEdumeeCredit, setUseEdumeeCredit] = useState(true);

  const loadBilling = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsBillingLoading(true);
      setBillingError('');
      const [catalog, currentSubscription, paymentList, walletAccount] = await Promise.all([
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
      setPayments(paymentList.filter((payment) => payment.purpose === 'ai_plan').slice(0, 4));
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
    void loadBilling();
  }, [loadBilling]);

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
        setSyncingPaymentId(paymentId);
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
        } finally {
          if (isMounted) {
            setSyncingPaymentId(null);
          }
        }
      }

      if (!isMounted) return;

      const toastId = `payment-return:${paymentId || paymentResult}`;
      const banner = buildPaymentReturnBanner(paymentResult, payment);
      showPaymentToast(banner, toastId);
      cleanUrl();
      await loadBilling();
    };

    void handlePaymentReturn();

    return () => {
      isMounted = false;
    };
  }, [accessToken, loadBilling]);

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
    toast.success('Đã làm mới thông tin gói AI.');
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <div className="mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground mb-1">Xin chào</p>
                  <h1 className="font-display text-2xl font-bold md:text-3xl">
                    Hành trình của bạn
                  </h1>
                </div>
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
        <div className="mx-auto max-w-5xl space-y-8">
          {!hasResult ? (
            <WelcomeState />
          ) : (
            <>
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
                      phá thêm hướng Full-stack để mở rộng cơ hội.
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-primary mb-2 flex items-center gap-2 text-sm font-semibold">
                      <WalletCards className="h-4 w-4" />
                      Gói AI
                    </p>
                    <h2 className="font-display text-xl font-bold">Nâng cấp khả năng học với AI</h2>
                    <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                      Chọn gói AI phù hợp, thanh toán qua SePay và dashboard sẽ tự cập nhật sau khi
                      cổng thanh toán xác nhận.
                    </p>
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
                    )}
                    Làm mới
                  </Button>
                </div>

                {billingError ? (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{billingError}</span>
                  </div>
                ) : null}

                {isBillingLoading && plans.length === 0 ? (
                  <div className="flex h-56 items-center justify-center">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_0.85fr_1.25fr]">
                      <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
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
                      <div className="rounded-xl border border-secondary/10 bg-secondary/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-muted-foreground text-xs font-semibold uppercase">
                            Chu kỳ
                          </div>
                          <Clock className="text-secondary h-4 w-4" />
                        </div>
                        <div className="mt-2 text-xl font-bold">
                          {subscription?.billingCycle
                            ? formatBillingCycle(subscription.billingCycle)
                            : 'Free'}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {subscription?.subscriptionStatus === 'active'
                            ? 'Subscription đang hoạt động'
                            : 'Chưa có subscription trả phí'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-muted-foreground text-xs font-semibold uppercase">
                            Quota gói AI
                          </div>
                          <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                            {currentQuotaSummary.length || 0} mục
                          </span>
                        </div>
                        <div className="space-y-2">
                          {currentQuotaSummary.length > 0 ? (
                            currentQuotaSummary.slice(0, 3).map((item) => (
                              <div key={item.label} className="space-y-1">
                                <div className="flex items-center justify-between gap-3 text-xs">
                                  <span className="text-muted-foreground truncate">{item.label}</span>
                                  <span className="font-semibold">
                                    {formatQuotaUsageLabel(item.quota)}
                                  </span>
                                </div>
                                <div className="text-muted-foreground flex items-center justify-between gap-3 text-[10px]">
                                  <span>{formatQuotaRemainingLabel(item.quota)}</span>
                                  <span className="text-right">{formatQuotaResetLabel(item.quota)}</span>
                                </div>
                                {formatQuotaOverageLabel(item.quota) ? (
                                  <div className="text-[10px] font-medium text-amber-600">
                                    {formatQuotaOverageLabel(item.quota)}
                                  </div>
                                ) : null}
                                <div className="h-1.5 overflow-hidden rounded-full bg-background/80">
                                  <div
                                    className="bg-primary h-full rounded-full"
                                    style={{
                                      width: `${getQuotaPercent(item.quota.used, item.quota.limit)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-xs">Theo giới hạn gói hiện tại</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {syncingPaymentId ? (
                      <div className="mb-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang đồng bộ thanh toán {syncingPaymentId}
                      </div>
                    ) : null}

                    <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                          <WalletCards className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-emerald-800 dark:text-emerald-200">Dùng Số dư Edumee</span>
                          <span className="block truncate text-emerald-700/80 dark:text-emerald-200/80">
                            Khả dụng {formatCurrency(edumeeCreditAccount?.availableBalance || 0, wallet?.currency || 'VND')}
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
                      {plans.length > 0 ? (
                        plans.map((plan) => {
                          const selectedCycle = selectedCycles[plan.id] || getDefaultBillingCycle(plan);
                          const pricing = getPricingForCycle(plan, selectedCycle);
                          const isCurrentPlan = activePlanId === plan.id;
                          const ctaLabel = !hasActivePaidPlan
                            ? 'Mua ngay'
                            : isCurrentPlan
                              ? 'Gia hạn'
                              : 'Đổi gói';
                          const isPurchasing = purchasingPlanId === plan.id;
                          const features = getPlanFeatureLabels(plan);

                          return (
                            <div
                              key={plan.id}
                              className={cn(
                                'flex h-full flex-col rounded-xl border bg-background/80 p-4 shadow-sm transition-shadow hover:shadow-md',
                                isCurrentPlan
                                  ? 'border-primary/50 ring-primary/10 ring-4'
                                  : 'border-border',
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-display truncate text-lg font-bold">{plan.name}</h3>
                                    {isCurrentPlan ? (
                                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                                        Đang dùng
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                    {plan.description || 'Mở rộng quota và tính năng AI cho hành trình nghề nghiệp.'}
                                  </p>
                                </div>
                                <div className="bg-primary/10 text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                              </div>

                              <div className="mt-4 flex items-end justify-between gap-3">
                                <div>
                                  <div className="font-display text-2xl font-bold">
                                    {formatCurrency(pricing.total, pricing.currency)}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {pricing.discountPercentage > 0
                                      ? `Tiết kiệm ${pricing.discountPercentage}% so với giá gốc`
                                      : `${formatCurrency(pricing.monthlyPrice, pricing.currency)} / tháng`}
                                  </div>
                                </div>
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                                  {formatBillingCycle(selectedCycle)}
                                </span>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {getAllowedBillingCycles(plan).map((cycle) => (
                                  <button
                                    key={cycle}
                                    type="button"
                                    className={cn(
                                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                                      selectedCycle === cycle
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background hover:bg-muted',
                                    )}
                                    onClick={() =>
                                      setSelectedCycles((current) => ({
                                        ...current,
                                        [plan.id]: cycle,
                                      }))
                                    }
                                  >
                                    {formatBillingCycle(cycle)}
                                  </button>
                                ))}
                              </div>

                              <div className="mt-4 grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Tạm tính</span>
                                  <span className="font-semibold">
                                    {formatCurrency(pricing.subtotal, pricing.currency)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Giảm giá</span>
                                  <span className="font-semibold">
                                    {formatCurrency(pricing.discountAmount, pricing.currency)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between border-t pt-2">
                                  <span className="font-semibold">Thanh toán</span>
                                  <span className="text-primary font-bold">
                                    {formatCurrency(pricing.total, pricing.currency)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {features.map((feature) => (
                                  <span
                                    key={feature}
                                    className="bg-primary/5 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>

                              <PlanBenefitDetails plan={plan} className="mt-4" />

                              <div className="mt-auto pt-4">
                                <Button
                                  className="w-full gap-2"
                                  disabled={isPurchasing || pricing.total <= 0}
                                  onClick={() => {
                                    void handlePurchase(plan);
                                  }}
                                >
                                  {isPurchasing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CreditCard className="h-4 w-4" />
                                  )}
                                  {ctaLabel}
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm lg:col-span-2">
                          Chưa có gói trả phí đang hoạt động để mua.
                        </div>
                      )}
                    </div>

                    {payments.length > 0 ? (
                      <div className="mt-5 rounded-2xl border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold">Thanh toán gần đây</h3>
                          <span className="text-muted-foreground text-xs">SePay</span>
                        </div>
                        <div className="space-y-2">
                          {payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <div className="font-semibold">
                                  {payment.checkoutReference || payment.id}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {formatDate(payment.createdAt)} · {formatBillingCycle(payment.billingCycle)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </span>
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-1 text-xs font-semibold',
                                    getPaymentStatusClassName(payment.status),
                                  )}
                                >
                                  {PAYMENT_STATUS_LABELS[payment.status]}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </motion.div>

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
  if (currency.toUpperCase() === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(numericAmount)} đ`;
  }

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
  if (!quota.limit || quota.resetPolicy === 'unlimited') return 'Không giới hạn';
  return `${getVisibleQuotaUsed(quota)}/${quota.limit}`;
}

function formatQuotaRemainingLabel(quota: QuotaView): string {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return 'Không giới hạn';
  return `Còn ${Math.max(0, quota.remaining || 0)} lượt`;
}

function formatQuotaOverageLabel(quota: QuotaView): string | null {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return null;
  const overage = Math.max(0, (quota.used || 0) - quota.limit);
  return overage > 0 ? `Đã vượt ${overage} lượt` : null;
}

function getVisibleQuotaUsed(quota: QuotaView): number {
  if (!quota.limit || quota.resetPolicy === 'unlimited') return Math.max(0, quota.used || 0);
  return Math.min(Math.max(0, quota.used || 0), quota.limit);
}

function formatQuotaResetLabel(quota: QuotaView): string {
  if (quota.resetPolicy === 'lifetime') return 'Không reset theo tháng';
  if (quota.resetPolicy === 'unlimited') return 'Không giới hạn';
  return quota.nextResetAt ? `Làm mới ${formatDate(quota.nextResetAt)}` : 'Làm mới theo chu kỳ';
}

function formatDate(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function buildDashboardReturnUrls() {
  if (typeof window === 'undefined') return undefined;
  const baseUrl = `${window.location.origin}/dashboard`;
  return {
    success: `${baseUrl}?payment=success`,
    error: `${baseUrl}?payment=error`,
    cancel: `${baseUrl}?payment=cancel`,
  };
}

function buildPaymentReturnBanner(result: string, payment: PaymentRecord | null): BillingBanner {
  if (payment?.status === 'paid') {
    return {
      tone: 'success',
      title: 'Thanh toán thành công',
      description: 'Gói AI của bạn đã được kích hoạt hoặc gia hạn.',
    };
  }

  if (payment?.status === 'pending') {
    return {
      tone: 'warning',
      title: 'Thanh toán đang chờ xác nhận',
      description: 'SePay chưa trả kết quả cuối cùng. Bạn có thể làm mới lại sau ít phút.',
    };
  }

  if (payment?.status === 'failed' || payment?.status === 'cancelled') {
    return {
      tone: 'error',
      title: 'Thanh toán chưa hoàn tất',
      description: 'Giao dịch chưa được xác nhận. Bạn có thể thử lại khi sẵn sàng.',
    };
  }

  if (payment?.status === 'refunded') {
    return {
      tone: 'warning',
      title: 'Thanh toán đã hoàn tiền',
      description: 'Gói liên quan đến giao dịch này đã được thu hồi.',
    };
  }

  if (result === 'success') {
    return {
      tone: 'info',
      title: 'Đã quay lại từ SePay',
      description: 'Hệ thống đang chờ gateway xác nhận thanh toán.',
    };
  }

  return {
    tone: 'error',
    title: result === 'cancel' ? 'Bạn đã hủy thanh toán' : 'Thanh toán gặp lỗi',
    description: 'Gói AI chưa được kích hoạt. Bạn có thể tạo giao dịch mới trên dashboard.',
  };
}

function showPaymentToast(banner: BillingBanner, toastId: string): void {
  const options = { id: toastId, description: banner.description };
  if (banner.tone === 'success') {
    toast.success(banner.title, options);
    return;
  }
  if (banner.tone === 'error') {
    toast.error(banner.title, options);
    return;
  }
  if (banner.tone === 'warning') {
    toast.warning(banner.title, options);
    return;
  }
  toast.info(banner.title, options);
}

function getPaymentStatusClassName(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'failed':
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'refunded':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default Dashboard;
