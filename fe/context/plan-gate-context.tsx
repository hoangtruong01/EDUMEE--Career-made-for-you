'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { aiBillingService, type MyAiSubscription, type QuotaView } from '@/lib/ai-billing.service';
import { Clock, Crown, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type PlanGateFeature =
  | 'assessment'
  | 'aiChat'
  | 'roadmap'
  | 'simulation'
  | 'careerComparison'
  | 'mentorBooking';

type PlanGateReason = 'feature_disabled' | 'quota_exceeded';

type PlanGateDialogState = {
  feature: PlanGateFeature;
  reason: PlanGateReason;
  currentPlan?: string;
  planName?: string;
  quota?: QuotaView;
  nextResetAt?: string | null;
};

type PlanGateContextValue = {
  subscription: MyAiSubscription | null;
  refreshSubscription: () => Promise<MyAiSubscription | null>;
  ensureFeatureAvailable: (feature: PlanGateFeature, subscriptionOverride?: MyAiSubscription | null) => Promise<boolean>;
  handlePlanError: (error: unknown, fallbackFeature?: PlanGateFeature) => boolean;
  openPlanGate: (feature: PlanGateFeature, reason?: PlanGateReason) => void;
};

const FEATURE_LABELS: Record<PlanGateFeature, string> = {
  assessment: 'làm bài đánh giá',
  aiChat: 'AI chat',
  roadmap: 'tạo lộ trình AI',
  simulation: 'mô phỏng nghề nghiệp',
  careerComparison: 'so sánh nghề nghiệp',
  mentorBooking: 'đặt lịch mentor',
};

const BACKEND_FEATURE_TO_GATE: Record<string, PlanGateFeature> = {
  assessment: 'assessment',
  chatbot: 'aiChat',
  personalized_roadmap: 'roadmap',
  simulation: 'simulation',
  career_comparison: 'careerComparison',
  mentor_booking: 'mentorBooking',
};

const FEATURE_FLAGS: Partial<Record<PlanGateFeature, keyof MyAiSubscription['features']>> = {
  aiChat: 'aiChatbot',
  roadmap: 'personalizedRoadmap',
  simulation: 'jobSimulation',
  careerComparison: 'careerComparison',
  mentorBooking: 'mentorBooking',
};

const QUOTA_KEYS: Record<PlanGateFeature, string> = {
  assessment: 'assessment',
  aiChat: 'aiChat',
  roadmap: 'roadmap',
  simulation: 'simulation',
  careerComparison: 'careerComparison',
  mentorBooking: 'mentorBooking',
};

const PlanGateContext = createContext<PlanGateContextValue | null>(null);

export function PlanGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [subscription, setSubscription] = useState<MyAiSubscription | null>(null);
  const subscriptionRef = useRef<MyAiSubscription | null>(null);
  const [dialogState, setDialogState] = useState<PlanGateDialogState | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!accessToken) {
      subscriptionRef.current = null;
      setSubscription(null);
      return null;
    }

    try {
      const nextSubscription = await aiBillingService.getMyAiSubscription(accessToken);
      subscriptionRef.current = nextSubscription;
      setSubscription(nextSubscription);
      return nextSubscription;
    } catch {
      return null;
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const openPlanGate = useCallback(
    (feature: PlanGateFeature, reason: PlanGateReason = 'feature_disabled') => {
      setDialogState({
        feature,
        reason,
        currentPlan: subscription?.currentPlan,
        planName: subscription?.plan?.name,
        quota: subscription?.quotas?.[QUOTA_KEYS[feature]],
        nextResetAt: subscription?.quotas?.[QUOTA_KEYS[feature]]?.nextResetAt,
      });
    },
    [subscription],
  );

  const ensureFeatureAvailable = useCallback(
    async (feature: PlanGateFeature, subscriptionOverride?: MyAiSubscription | null) => {
      const latestSubscription =
        subscriptionOverride ?? subscriptionRef.current ?? (await refreshSubscription());
      if (!latestSubscription) return true;

      const state = buildSubscriptionGateState(feature, latestSubscription);
      if (!state) return true;

      setDialogState(state);
      return false;
    },
    [refreshSubscription],
  );

  const handlePlanError = useCallback(
    (error: unknown, fallbackFeature?: PlanGateFeature) => {
      const state = buildApiErrorGateState(error, fallbackFeature);
      if (!state) return false;
      const latestSubscription = subscriptionRef.current;

      setDialogState((current) => ({
        ...state,
        currentPlan: state.currentPlan || current?.currentPlan || latestSubscription?.currentPlan,
        planName: state.planName || current?.planName || latestSubscription?.plan?.name,
      }));
      void refreshSubscription();
      return true;
    },
    [refreshSubscription],
  );

  const value = useMemo<PlanGateContextValue>(
    () => ({
      subscription,
      refreshSubscription,
      ensureFeatureAvailable,
      handlePlanError,
      openPlanGate,
    }),
    [ensureFeatureAvailable, handlePlanError, openPlanGate, refreshSubscription, subscription],
  );

  const goToUpgrade = () => {
    setDialogState(null);
    router.push('/profile?upgrade=ai');
  };

  const goToCurrentPlan = () => {
    setDialogState(null);
    router.push('/profile');
  };

  return (
    <PlanGateContext.Provider value={value}>
      {children}
      <PlanLimitDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
        onUpgrade={goToUpgrade}
        onViewPlan={goToCurrentPlan}
      />
    </PlanGateContext.Provider>
  );
}

export function usePlanGate() {
  const context = useContext(PlanGateContext);
  if (!context) {
    throw new Error('usePlanGate must be used within PlanGateProvider');
  }
  return context;
}

function buildSubscriptionGateState(
  feature: PlanGateFeature,
  subscription: MyAiSubscription,
): PlanGateDialogState | null {
  const featureFlag = FEATURE_FLAGS[feature];
  if (featureFlag && subscription.features?.[featureFlag] === false) {
    return {
      feature,
      reason: 'feature_disabled',
      currentPlan: subscription.currentPlan,
      planName: subscription.plan?.name,
    };
  }

  const quota = subscription.quotas?.[QUOTA_KEYS[feature]];
  if (isQuotaDepleted(quota)) {
    return {
      feature,
      reason: 'quota_exceeded',
      currentPlan: subscription.currentPlan,
      planName: subscription.plan?.name,
      quota,
      nextResetAt: quota.nextResetAt,
    };
  }

  return null;
}

function buildApiErrorGateState(error: unknown, fallbackFeature?: PlanGateFeature): PlanGateDialogState | null {
  if (!(error instanceof ApiError)) return null;
  const payload = error.payload;
  const code = payload?.code || payload?.error;
  const feature = resolveGateFeature(payload?.feature, fallbackFeature);
  if (!feature) return null;

  if (code === 'PLAN_FEATURE_DISABLED' || code === 'AI_PLAN_REQUIRED') {
    return {
      feature,
      reason: 'feature_disabled',
      currentPlan: payload?.currentPlan,
      planName: payload?.planName,
    };
  }

  if (code === 'PLAN_QUOTA_EXCEEDED') {
    return {
      feature,
      reason: 'quota_exceeded',
      currentPlan: payload?.currentPlan,
      planName: payload?.planName,
      quota: payload?.quota as QuotaView | undefined,
      nextResetAt: payload?.nextResetAt || payload?.quota?.nextResetAt,
    };
  }

  if (error.statusCode === 403 && typeof payload?.message === 'string' && payload.message.includes('plan')) {
    return { feature, reason: 'feature_disabled' };
  }

  if (error.statusCode === 429 && typeof payload?.message === 'string' && payload.message.includes('quota')) {
    return { feature, reason: 'quota_exceeded' };
  }

  return null;
}

function resolveGateFeature(rawFeature: string | undefined, fallbackFeature?: PlanGateFeature): PlanGateFeature | null {
  if (!rawFeature) return fallbackFeature || null;
  return BACKEND_FEATURE_TO_GATE[rawFeature] || fallbackFeature || null;
}

function isQuotaDepleted(quota: QuotaView | undefined): boolean {
  if (!quota || quota.resetPolicy === 'unlimited') return false;
  const hasFiniteLimit = typeof quota.limit === 'number';
  return hasFiniteLimit && Math.max(0, quota.remaining || 0) <= 0;
}

function PlanLimitDialog({
  state,
  onClose,
  onUpgrade,
  onViewPlan,
}: {
  state: PlanGateDialogState | null;
  onClose: () => void;
  onUpgrade: () => void;
  onViewPlan: () => void;
}) {
  const label = state ? FEATURE_LABELS[state.feature] : '';
  const planName = state?.planName || formatPlanName(state?.currentPlan);
  const isQuotaExceeded = state?.reason === 'quota_exceeded';
  const resetText = formatResetText(state?.nextResetAt || state?.quota?.nextResetAt, state?.quota?.resetPolicy);

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl border-border/70">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
            {isQuotaExceeded ? <Clock className="h-6 w-6" /> : <Crown className="h-6 w-6" />}
          </div>
          <DialogTitle>
            {isQuotaExceeded ? 'Bạn đã hết quota AI' : 'Cần nâng cấp gói AI'}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {isQuotaExceeded
              ? buildQuotaDescription(label, state?.quota, resetText)
              : `Chức năng ${label} chưa có trong gói ${planName}. Nâng cấp gói AI để mở khóa và tiếp tục hành trình học tập.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            <span>Gói Plus/Business mở rộng quota cho roadmap, mô phỏng, so sánh nghề và mentor booking.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onViewPlan}>
            Xem gói hiện tại
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700" onClick={onUpgrade}>
            Nâng cấp gói AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildQuotaDescription(label: string, quota: QuotaView | undefined, resetText: string): string {
  if (!quota || !quota.limit) {
    return `Bạn đã dùng hết quota cho ${label}. ${resetText}`;
  }

  return `Bạn đã dùng ${quota.used}/${quota.limit} lượt cho ${label}. ${resetText}`;
}

function formatResetText(nextResetAt?: string | null, resetPolicy?: QuotaView['resetPolicy']): string {
  if (resetPolicy === 'lifetime') return 'Quota này không tự làm mới trong gói hiện tại.';
  if (!nextResetAt) return 'Bạn có thể chờ chu kỳ mới hoặc nâng cấp gói để tiếp tục.';

  const resetDate = new Date(nextResetAt);
  if (Number.isNaN(resetDate.getTime())) return 'Bạn có thể chờ chu kỳ mới hoặc nâng cấp gói để tiếp tục.';
  return `Quota sẽ làm mới vào ${resetDate.toLocaleDateString('vi-VN')}.`;
}

function formatPlanName(currentPlan?: string): string {
  if (!currentPlan) return 'hiện tại';
  if (currentPlan === 'free') return 'Free';
  if (currentPlan === 'plus') return 'Plus';
  if (currentPlan === 'business') return 'Business';
  return currentPlan;
}
