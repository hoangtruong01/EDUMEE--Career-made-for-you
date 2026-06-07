'use client';

import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Layers3,
  Loader2,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPanel } from '@/components/admin/AdminPrimitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import {
  adminAiPlanService,
  type AdminAiPlan,
  type AdminAiPlanPayload,
  type AiPlanFeatures,
  type AiPlanLimits,
  type AdminAiPlanSubscriberStatusFilter,
  type AdminAiPlanSubscribersResponse,
  type BillingCycle,
  type ImportAiPlanUsersResult,
} from '@/lib/admin-ai-plan.service';
import { adminService, type AdminUser } from '@/lib/admin.service';
import { cn } from '@/lib/utils';

type SheetMode = 'create' | 'detail' | 'edit';
type DetailTab = 'overview' | 'subscribers' | 'users' | 'settings';
type LimitKey = keyof AiPlanLimits;
type FeatureKey = keyof AiPlanFeatures;

type PlanFormState = {
  name: string;
  description: string;
  price: string;
  currency: string;
  isActive: boolean;
  isDefaultPlan: boolean;
  displayOrder: string;
  allowedBillingCycles: BillingCycle[];
  billingCycleDiscounts: Record<BillingCycle, string>;
  seatLimit: string;
  limits: Record<LimitKey, string>;
  features: Record<FeatureKey, boolean>;
};

const BILLING_CYCLE_OPTIONS: Array<{ value: BillingCycle; label: string; months: number }> = [
  { value: 'monthly', label: 'Hàng tháng', months: 1 },
  { value: 'three_months', label: '3 tháng', months: 3 },
  { value: 'six_months', label: '6 tháng', months: 6 },
  { value: 'five_months', label: '5 tháng', months: 5 },
  { value: 'nine_months', label: '9 tháng', months: 9 },
  { value: 'yearly', label: '1 năm', months: 12 },
];

const LIMIT_FIELDS: Array<{ key: LimitKey; label: string }> = [
  { key: 'assessmentsPerMonth', label: 'Assessments / tháng' },
  { key: 'assessmentsLifetimeLimit', label: 'Assessments trọn đời' },
  { key: 'chatMessagesPerMonth', label: 'Tin nhắn AI / tháng' },
  { key: 'simulationsPerMonth', label: 'Simulation / tháng' },
  { key: 'careerRecommendationRunsPerMonth', label: 'Lượt AI gợi ý nghề / tháng' },
  { key: 'maxCareerRecommendationsPerRun', label: 'Số nghề AI tạo/lưu / lần làm bài' },
  { key: 'visibleCareerRecommendationsPerRun', label: 'Số nghề user được xem / lần làm bài' },
  { key: 'careerComparisonsPerMonth', label: 'Career comparison / tháng' },
  { key: 'maxCareersPerComparison', label: 'Career tối đa / comparison' },
  { key: 'personalizedRoadmapsPerMonth', label: 'Roadmap / tháng' },
  { key: 'mentorBookingsPerMonth', label: 'Mentor booking / tháng' },
];

const LIMIT_FIELD_LABELS = LIMIT_FIELDS.reduce<Record<LimitKey, string>>((acc, field) => {
  acc[field.key] = field.label;
  return acc;
}, {} as Record<LimitKey, string>);

const CAREER_RECOMMENDATION_LIMIT_FIELDS: Array<{
  key: LimitKey;
  label: string;
  helper: string;
}> = [
  {
    key: 'careerRecommendationRunsPerMonth',
    label: 'Lượt gen/tháng',
    helper: 'Số lần user được chạy AI để tạo bộ nghề mới trong một tháng.',
  },
  {
    key: 'maxCareerRecommendationsPerRun',
    label: 'Số nghề AI tạo/lưu mỗi lần',
    helper: 'Backend lưu đủ số nghề này để có thể mở khóa sau khi user nâng cấp.',
  },
  {
    key: 'visibleCareerRecommendationsPerRun',
    label: 'Số nghề user được xem mỗi lần',
    helper: 'Các nghề vượt số này sẽ hiển thị thành card khóa ẩn danh.',
  },
];

const FEATURE_FIELDS: Array<{ key: FeatureKey; label: string }> = [
  { key: 'careerRecommendation', label: 'Career Recommendation' },
  { key: 'jobSimulation', label: 'Job Simulation' },
  { key: 'mentorBooking', label: 'Mentor Booking' },
  { key: 'careerComparison', label: 'Career Comparison' },
  { key: 'aiChatbot', label: 'AI Chatbot' },
  { key: 'personalizedRoadmap', label: 'Personalized Roadmap' },
  { key: 'teamDashboard', label: 'Team Dashboard' },
  { key: 'reportExport', label: 'Report Export' },
  { key: 'multiUserManagement', label: 'Multi User Management' },
];

const ACCESS_CONTROL_GROUPS: Array<{
  title: string;
  description: string;
  featureKey?: FeatureKey;
  limitKeys: LimitKey[];
}> = [
  {
    title: 'Assessment',
    description: 'Assessment luôn được phép; quota quyết định số lượt người dùng có thể làm.',
    limitKeys: ['assessmentsPerMonth', 'assessmentsLifetimeLimit'],
  },
  {
    title: 'AI Chatbot',
    description: 'Bật/tắt chatbot AI và giới hạn số tin nhắn trong tháng.',
    featureKey: 'aiChatbot',
    limitKeys: ['chatMessagesPerMonth'],
  },
  {
    title: 'Job Simulation',
    description: 'Bật/tắt mô phỏng nghề và giới hạn số lượt simulation trong tháng.',
    featureKey: 'jobSimulation',
    limitKeys: ['simulationsPerMonth'],
  },
  {
    title: 'Career Comparison',
    description: 'Bật/tắt so sánh nghề và giới hạn số lần so sánh hoặc số nghề mỗi lần.',
    featureKey: 'careerComparison',
    limitKeys: ['careerComparisonsPerMonth', 'maxCareersPerComparison'],
  },
  {
    title: 'Personalized Roadmap',
    description: 'Bật/tắt roadmap cá nhân và giới hạn số roadmap tạo trong tháng.',
    featureKey: 'personalizedRoadmap',
    limitKeys: ['personalizedRoadmapsPerMonth'],
  },
  {
    title: 'Mentor Booking',
    description: 'Bật/tắt đặt lịch mentor và giới hạn số booking trong tháng.',
    featureKey: 'mentorBooking',
    limitKeys: ['mentorBookingsPerMonth'],
  },
];

const STANDALONE_FEATURE_FIELDS: Array<{ key: FeatureKey; label: string; description: string }> = [
  {
    key: 'teamDashboard',
    label: 'Team Dashboard',
    description: 'Bật/tắt dashboard dành cho team hoặc business plan.',
  },
  {
    key: 'reportExport',
    label: 'Report Export',
    description: 'Bật/tắt quyền xuất báo cáo.',
  },
  {
    key: 'multiUserManagement',
    label: 'Multi User Management',
    description: 'Bật/tắt quản lý nhiều người dùng trong cùng một plan.',
  },
];

const BILLING_CYCLE_MONTHS = BILLING_CYCLE_OPTIONS.reduce<Record<BillingCycle, number>>(
  (acc, option) => {
    acc[option.value] = option.months;
    return acc;
  },
  {
    monthly: 1,
    three_months: 3,
    six_months: 6,
    five_months: 5,
    nine_months: 9,
    yearly: 12,
  },
);

function createEmptyDiscounts(): Record<BillingCycle, string> {
  return {
    monthly: '',
    three_months: '',
    six_months: '',
    five_months: '',
    nine_months: '',
    yearly: '',
  };
}

function createEmptyLimits(): Record<LimitKey, string> {
  return {
    assessmentsPerMonth: '',
    assessmentsLifetimeLimit: '',
    chatMessagesPerMonth: '',
    simulationsPerMonth: '',
    careerRecommendationRunsPerMonth: '',
    maxCareerRecommendationsPerRun: '',
    visibleCareerRecommendationsPerRun: '',
    careerComparisonsPerMonth: '',
    maxCareersPerComparison: '',
    personalizedRoadmapsPerMonth: '',
    mentorBookingsPerMonth: '',
  };
}

function createEmptyFeatures(): Record<FeatureKey, boolean> {
  return {
    careerRecommendation: false,
    jobSimulation: false,
    mentorBooking: false,
    careerComparison: false,
    aiChatbot: false,
    personalizedRoadmap: false,
    teamDashboard: false,
    reportExport: false,
    multiUserManagement: false,
  };
}

function createInitialFormState(): PlanFormState {
  return {
    name: '',
    description: '',
    price: '0',
    currency: 'VND',
    isActive: true,
    isDefaultPlan: false,
    displayOrder: '0',
    allowedBillingCycles: ['monthly'],
    billingCycleDiscounts: createEmptyDiscounts(),
    seatLimit: '',
    limits: createEmptyLimits(),
    features: createEmptyFeatures(),
  };
}

function buildFormState(plan: AdminAiPlan): PlanFormState {
  const state = createInitialFormState();
  const limits = {
    ...state.limits,
    ...Object.fromEntries(
      Object.entries(plan.limits || {}).map(([key, value]) => [key, value === undefined ? '' : String(value)]),
    ),
  } as Record<LimitKey, string>;

  if (!limits.visibleCareerRecommendationsPerRun && limits.maxCareerRecommendationsPerRun) {
    limits.visibleCareerRecommendationsPerRun = limits.maxCareerRecommendationsPerRun;
  }

  return {
    name: plan.name || '',
    description: plan.description || '',
    price: String(plan.price ?? 0),
    currency: plan.currency || 'VND',
    isActive: plan.isActive !== false,
    isDefaultPlan: plan.isDefaultPlan === true,
    displayOrder: String(plan.displayOrder ?? 0),
    allowedBillingCycles: plan.allowedBillingCycles?.length ? plan.allowedBillingCycles : ['monthly'],
    billingCycleDiscounts: {
      ...state.billingCycleDiscounts,
      ...Object.fromEntries(
        Object.entries(plan.billingCycleDiscounts || {}).map(([key, value]) => [
          key,
          value === undefined ? '' : String(value),
        ]),
      ),
    } as Record<BillingCycle, string>,
    seatLimit: plan.seatLimit === undefined || plan.seatLimit === null ? '' : String(plan.seatLimit),
    limits,
    features: {
      ...state.features,
      ...Object.fromEntries(
        Object.entries(plan.features || {}).map(([key, value]) => [key, value === true]),
      ),
    } as Record<FeatureKey, boolean>,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatBillingCycleLabel(cycle: BillingCycle): string {
  return BILLING_CYCLE_OPTIONS.find((option) => option.value === cycle)?.label ?? cycle;
}

function formatBillingCycles(cycles?: BillingCycle[]): string {
  if (!cycles?.length) return '--';
  return cycles.map((cycle) => formatBillingCycleLabel(cycle)).join(', ');
}

function formatCurrency(amount: number | undefined, currency = 'VND'): string {
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

function getPlanBillingCycles(plan: AdminAiPlan): BillingCycle[] {
  if (plan.allowedBillingCycles?.length) return plan.allowedBillingCycles;

  const pricingCycles = Object.keys(plan.pricingByBillingCycle || {}) as BillingCycle[];
  return pricingCycles.length ? pricingCycles : ['monthly'];
}

function getPlanPricingForCycle(plan: AdminAiPlan, cycle: BillingCycle) {
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

function formatDateTime(value?: string): string {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatNumber(value: number | undefined): string {
  return new Intl.NumberFormat('vi-VN').format(value || 0);
}

function getSubscriberStats(plan?: AdminAiPlan | null) {
  return {
    activeSubscribers: plan?.subscriberStats?.activeSubscribers || 0,
    totalSubscribers: plan?.subscriberStats?.totalSubscribers || 0,
    cancelledSubscribers: plan?.subscriberStats?.cancelledSubscribers || 0,
    expiredSubscribers: plan?.subscriberStats?.expiredSubscribers || 0,
  };
}

function buildPlanPayload(formState: PlanFormState): AdminAiPlanPayload {
  const payload: AdminAiPlanPayload = {
    name: formState.name.trim(),
    price: Number(formState.price.trim() || '0'),
    currency: formState.currency.trim() || 'VND',
    isActive: formState.isDefaultPlan ? true : formState.isActive,
    isDefaultPlan: formState.isDefaultPlan,
    displayOrder: Number(formState.displayOrder.trim() || '0'),
    allowedBillingCycles: formState.allowedBillingCycles,
    features: FEATURE_FIELDS.reduce<Record<FeatureKey, boolean>>((acc, field) => {
      acc[field.key] = formState.features[field.key];
      return acc;
    }, createEmptyFeatures()),
  };

  const description = formState.description.trim();
  if (description) {
    payload.description = description;
  }

  const billingCycleDiscounts = formState.allowedBillingCycles.reduce<Partial<Record<BillingCycle, number>>>(
    (acc, cycle) => {
      const numericValue = parseOptionalNumber(formState.billingCycleDiscounts[cycle]);
      if (numericValue !== undefined) {
        acc[cycle] = numericValue;
      }
      return acc;
    },
    {},
  );
  if (Object.keys(billingCycleDiscounts).length > 0) {
    payload.billingCycleDiscounts = billingCycleDiscounts;
  }

  const seatLimit = parseOptionalNumber(formState.seatLimit);
  payload.seatLimit = seatLimit ?? null;

  const limits = LIMIT_FIELDS.reduce<Partial<Record<LimitKey, number>>>((acc, field) => {
    const numericValue = parseOptionalNumber(formState.limits[field.key]);
    if (numericValue !== undefined) {
      acc[field.key] = numericValue;
    }
    return acc;
  }, {});
  payload.limits = limits;

  return payload;
}

function validatePlanForm(formState: PlanFormState): string | null {
  if (!formState.name.trim()) {
    return 'Tên gói là bắt buộc.';
  }

  const price = parseOptionalNumber(formState.price);
  if (price === undefined || price < 0) {
    return 'Giá gói phải là số lớn hơn hoặc bằng 0.';
  }

  const displayOrder = parseOptionalNumber(formState.displayOrder);
  if (displayOrder === undefined || displayOrder < 0) {
    return 'Display order phải là số lớn hơn hoặc bằng 0.';
  }

  if (!formState.allowedBillingCycles.length) {
    return 'Cần chọn ít nhất một billing cycle.';
  }

  const seatLimit = parseOptionalNumber(formState.seatLimit);
  if (seatLimit !== undefined && seatLimit < 1) {
    return 'Seat limit phải lớn hơn hoặc bằng 1.';
  }

  for (const cycle of formState.allowedBillingCycles) {
    const discountValue = parseOptionalNumber(formState.billingCycleDiscounts[cycle]);
    if (discountValue !== undefined && (discountValue < 0 || discountValue > 100)) {
      return `Discount của ${formatBillingCycleLabel(cycle)} phải nằm trong khoảng 0 đến 100.`;
    }
  }

  for (const field of LIMIT_FIELDS) {
    const limitValue = parseOptionalNumber(formState.limits[field.key]);
    if (limitValue !== undefined && limitValue < 0) {
      return `${field.label} phải lớn hơn hoặc bằng 0.`;
    }
  }

  const generatedCareerCount = parseOptionalNumber(
    formState.limits.maxCareerRecommendationsPerRun,
  );
  const visibleCareerCount = parseOptionalNumber(
    formState.limits.visibleCareerRecommendationsPerRun,
  );

  if (visibleCareerCount !== undefined && generatedCareerCount === undefined) {
    return 'Cần nhập số nghề AI tạo/lưu khi đặt số nghề user được xem.';
  }

  if (
    visibleCareerCount !== undefined &&
    generatedCareerCount !== undefined &&
    visibleCareerCount > generatedCareerCount
  ) {
    return 'Số nghề user được xem không được lớn hơn số nghề AI tạo/lưu.';
  }

  return null;
}

export default function AdminPlansPage() {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<AdminAiPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('detail');
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('overview');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AdminAiPlan | null>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PlanFormState>(createInitialFormState());
  const [assignBillingCycle, setAssignBillingCycle] = useState<BillingCycle>('monthly');
  const [isAssigningUser, setIsAssigningUser] = useState(false);
  const [pendingDeletePlan, setPendingDeletePlan] = useState<AdminAiPlan | null>(null);

  const loadPlans = useCallback(async () => {
    if (!accessToken) return [];

    try {
      setIsLoading(true);
      const response = await adminAiPlanService.getAdminAiPlans(accessToken);
      setPlans(response);
      return response;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách gói AI.'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((firstPlan, secondPlan) => {
        const firstOrder = firstPlan.displayOrder ?? 0;
        const secondOrder = secondPlan.displayOrder ?? 0;
        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
        return firstPlan.name.localeCompare(secondPlan.name);
      }),
    [plans],
  );

  const stats = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive !== false).length;
    const defaultPlan = plans.find((plan) => plan.isDefaultPlan);
    const activeSubscribers = plans.reduce(
      (sum, plan) => sum + getSubscriberStats(plan).activeSubscribers,
      0,
    );

    return {
      totalPlans: plans.length,
      activePlans,
      defaultPlanName: defaultPlan?.name || 'Chưa đặt',
      activeSubscribers,
    };
  }, [plans]);

  const pricingPreview = useMemo(() => {
    const basePrice = Number(formState.price.trim() || '0');
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return [];
    }

    return formState.allowedBillingCycles.map((cycle) => {
      const months = BILLING_CYCLE_MONTHS[cycle];
      const subtotal = basePrice * months;
      const discountPercentage = Number(formState.billingCycleDiscounts[cycle] || '0');
      const safeDiscount = Number.isFinite(discountPercentage)
        ? Math.min(Math.max(discountPercentage, 0), 100)
        : 0;
      const discountAmount = (subtotal * safeDiscount) / 100;
      const total = Math.max(subtotal - discountAmount, 0);

      return {
        cycle,
        subtotal,
        discountPercentage: safeDiscount,
        total,
      };
    });
  }, [formState.allowedBillingCycles, formState.billingCycleDiscounts, formState.price]);

  const openCreateSheet = () => {
    setSheetMode('create');
    setActiveDetailTab('settings');
    setSelectedPlanId(null);
    setSelectedPlan(null);
    setFormState(createInitialFormState());
    setAssignBillingCycle('monthly');
    setIsSheetOpen(true);
  };

  const openPlanSheet = useCallback(async (
    mode: SheetMode,
    planId: string,
    tab: DetailTab = mode === 'edit' ? 'settings' : 'overview',
    sourcePlans: AdminAiPlan[] = plans,
  ) => {
    if (!accessToken) return;

    try {
      setSheetMode(mode);
      setActiveDetailTab(tab);
      setSelectedPlanId(planId);
      setIsSheetOpen(true);
      setIsSheetLoading(true);
      const plan = await adminAiPlanService.getAdminAiPlanById(accessToken, planId);
      const planFromList = sourcePlans.find((currentPlan) => currentPlan.id === planId);
      const planWithStats = {
        ...plan,
        subscriberStats: plan.subscriberStats || planFromList?.subscriberStats,
      };
      setSelectedPlan(planWithStats);
      setFormState(buildFormState(planWithStats));
      setAssignBillingCycle(getPlanBillingCycles(planWithStats)[0] || 'monthly');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải chi tiết gói AI.'));
      setSelectedPlanId(null);
      setSelectedPlan(null);
      setIsSheetOpen(false);
    } finally {
      setIsSheetLoading(false);
    }
  }, [accessToken, plans]);

  const handleToggleActive = async (plan: AdminAiPlan, nextChecked: boolean) => {
    if (!accessToken || plan.isDefaultPlan) return;

    try {
      setTogglingPlanId(plan.id);
      const updatedPlan = await adminAiPlanService.updateAdminAiPlan(accessToken, plan.id, {
        isActive: nextChecked,
      });
      const updatedPlanWithStats = {
        ...updatedPlan,
        subscriberStats: updatedPlan.subscriberStats || plan.subscriberStats,
      };
      setPlans((currentPlans) =>
        currentPlans.map((currentPlan) => (currentPlan.id === plan.id ? updatedPlanWithStats : currentPlan)),
      );

      if (selectedPlan?.id === plan.id) {
        setSelectedPlan(updatedPlanWithStats);
        setFormState(buildFormState(updatedPlanWithStats));
      }

      toast.success(`Đã ${nextChecked ? 'bật' : 'tắt'} gói ${plan.name}.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật trạng thái gói.'));
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleDeletePlan = async (plan: AdminAiPlan) => {
    if (!accessToken || plan.isDefaultPlan) return;

    try {
      setDeletingPlanId(plan.id);
      await adminAiPlanService.deleteAdminAiPlan(accessToken, plan.id);
      toast.success(`Đã xóa gói ${plan.name}.`);
      setPendingDeletePlan(null);
      const refreshedPlans = await loadPlans();
      const nextPlan = refreshedPlans
        .filter((currentPlan) => currentPlan.id !== plan.id)
        .sort((firstPlan, secondPlan) => (firstPlan.displayOrder ?? 0) - (secondPlan.displayOrder ?? 0))[0];

      if (selectedPlanId === plan.id) {
        if (nextPlan) {
          await openPlanSheet('detail', nextPlan.id, 'overview', refreshedPlans);
        } else {
          setSelectedPlanId(null);
          setSelectedPlan(null);
          setSheetMode('detail');
          setActiveDetailTab('overview');
          setFormState(createInitialFormState());
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa gói AI.'));
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleSavePlan = async () => {
    if (!accessToken) return;

    const validationError = validatePlanForm(formState);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = buildPlanPayload(formState);

    try {
      setIsSaving(true);
      let savedPlanId = selectedPlanId;

      if (sheetMode === 'create') {
        const createdPlan = await adminAiPlanService.createAdminAiPlan(accessToken, payload);
        savedPlanId = createdPlan.id;
        toast.success('Đã tạo gói AI mới.');
      } else if (selectedPlanId) {
        const updatedPlan = await adminAiPlanService.updateAdminAiPlan(accessToken, selectedPlanId, payload);
        savedPlanId = updatedPlan.id;
        toast.success('Đã cập nhật gói AI.');
      }

      const refreshedPlans = await loadPlans();
      if (savedPlanId) {
        await openPlanSheet('detail', savedPlanId, 'overview', refreshedPlans);
      } else {
        setIsSheetOpen(false);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể lưu gói AI.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignUserToPlan = async (
    user: AdminUser,
    planOverride?: AdminAiPlan | null,
  ): Promise<boolean> => {
    const targetPlan = planOverride || selectedPlan;
    if (!accessToken || !targetPlan) return false;

    if (!user.id) {
      toast.error('Chọn user từ kết quả tìm kiếm trước khi add vào plan.');
      return false;
    }

    const availableCycles = getPlanBillingCycles(targetPlan);
    const billingCycle = availableCycles.includes(assignBillingCycle)
      ? assignBillingCycle
      : availableCycles[0] || 'monthly';

    try {
      setIsAssigningUser(true);
      await adminAiPlanService.assignUserToPlan(accessToken, {
        userId: user.id,
        planId: targetPlan.id,
        billingCycle,
      });

      toast.success(`Đã add ${user.name || user.email} vào gói ${targetPlan.name}.`);

      const refreshedPlans = await loadPlans();
      const refreshedPlan = refreshedPlans.find((plan) => plan.id === targetPlan.id);
      if (refreshedPlan) {
        setSelectedPlan((currentPlan) =>
          currentPlan && currentPlan.id === refreshedPlan.id
            ? {
                ...currentPlan,
                subscriberStats: refreshedPlan.subscriberStats,
              }
            : currentPlan,
        );
      }
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể add user vào plan.'));
      return false;
    } finally {
      setIsAssigningUser(false);
    }
  };

  const handleImportUsersComplete = async (
    plan: AdminAiPlan,
    result: ImportAiPlanUsersResult,
  ) => {
    const successCount = result.createdUsers + result.assignedExistingUsers;
    toast.success(
      `Import hoàn tất: ${successCount} user thành công${
        result.failedRows ? `, ${result.failedRows} dòng lỗi` : ''
      }.`,
    );

    const refreshedPlans = await loadPlans();
    const refreshedPlan = refreshedPlans.find((currentPlan) => currentPlan.id === plan.id);
    if (!refreshedPlan) return;

    setSelectedPlan((currentPlan) =>
      currentPlan && currentPlan.id === refreshedPlan.id
        ? {
            ...currentPlan,
            subscriberStats: refreshedPlan.subscriberStats,
          }
        : currentPlan,
    );
  };

  const handleCancelConfiguration = () => {
    if (sheetMode === 'create') {
      setSelectedPlanId(null);
      setSelectedPlan(null);
      setSheetMode('detail');
      setActiveDetailTab('overview');
      setFormState(createInitialFormState());
      setIsSheetOpen(false);
      return;
    }

    if (selectedPlan) {
      setSheetMode('detail');
      setFormState(buildFormState(selectedPlan));
      setAssignBillingCycle(getPlanBillingCycles(selectedPlan)[0] || 'monthly');
    }
  };

  const isReadOnly = sheetMode === 'detail';

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Gói AI
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Quản lý catalog gói AI, pricing theo billing cycle, limits và người dùng đang sử dụng từng gói.
          </p>
        </div>
        <Button className="h-10 rounded-xl bg-violet-600 px-4 font-bold hover:bg-violet-700" onClick={openCreateSheet}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo gói mới
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanSummaryCard title="Tổng số gói" value={String(stats.totalPlans)} icon={CreditCard} iconClassName="bg-violet-500" />
        <PlanSummaryCard title="Gói active" value={String(stats.activePlans)} icon={ShieldCheck} iconClassName="bg-emerald-500" />
        <PlanSummaryCard title="Default plan" value={stats.defaultPlanName} icon={Layers3} iconClassName="bg-sky-500" />
        <PlanSummaryCard title="User có gói AI" value={formatNumber(stats.activeSubscribers)} icon={Users} iconClassName="bg-amber-500" />
      </div>

      <PlanTablePanel
          plans={sortedPlans}
          selectedPlanId={selectedPlanId}
          isLoading={isLoading}
          togglingPlanId={togglingPlanId}
          deletingPlanId={deletingPlanId}
          onCreate={openCreateSheet}
          onSelect={(plan) => {
            void openPlanSheet('detail', plan.id, 'overview', sortedPlans);
          }}
          onEdit={(plan) => {
            void openPlanSheet('edit', plan.id, 'settings', sortedPlans);
          }}
          onSubscribers={(plan) => {
            void openPlanSheet('detail', plan.id, 'subscribers', sortedPlans);
          }}
          onAddUsers={(plan) => {
            void openPlanSheet('detail', plan.id, 'users', sortedPlans);
          }}
          onDeleteRequest={setPendingDeletePlan}
          onToggleActive={handleToggleActive}
        />

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open && !isSaving) {
            setSelectedPlanId(null);
            setSelectedPlan(null);
            setSheetMode('detail');
            setActiveDetailTab('overview');
            setFormState(createInitialFormState());
            setAssignBillingCycle('monthly');
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-4xl">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <SheetHeader className="space-y-1 pr-10 text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Gói dịch vụ
                  </p>
                  <SheetTitle className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
                    {sheetMode === 'create'
                      ? 'Tạo gói AI mới'
                      : sheetMode === 'edit'
                        ? `Chỉnh sửa ${selectedPlan?.name || 'gói AI'}`
                        : `Chi tiết ${selectedPlan?.name || 'gói AI'}`}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Cấu hình, người đăng ký và thao tác thêm user.
                  </SheetDescription>
                  {selectedPlan && sheetMode !== 'create' ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge
                        className={cn(
                          'border-0',
                          selectedPlan.isActive !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
                        )}
                      >
                        {selectedPlan.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                      {selectedPlan.isDefaultPlan ? (
                        <Badge className="border-0 bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          Default
                        </Badge>
                      ) : null}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Cập nhật {formatDateTime(selectedPlan.updatedAt)}
                      </span>
                    </div>
                  ) : null}
                </SheetHeader>
              </div>
              {selectedPlan && sheetMode !== 'create' ? (
                <div className="flex flex-wrap gap-2 pr-8 lg:pr-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSheetMode('edit');
                      setActiveDetailTab('settings');
                    }}
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/20 dark:text-rose-300"
                    disabled={selectedPlan.isDefaultPlan || deletingPlanId === selectedPlan.id}
                    onClick={() => setPendingDeletePlan(selectedPlan)}
                  >
                    {deletingPlanId === selectedPlan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Xóa
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {isSheetLoading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : !selectedPlan && sheetMode !== 'create' ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
                Chọn một gói để xem chi tiết
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Nếu chưa có gói nào, hãy tạo gói AI đầu tiên để bắt đầu cấu hình pricing và quyền sử dụng.
              </p>
              <Button className="mt-4 bg-violet-600 hover:bg-violet-700" onClick={openCreateSheet}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo gói mới
              </Button>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <Tabs value={activeDetailTab} onValueChange={(value) => setActiveDetailTab(value as DetailTab)}>
                <TabsList className="sticky top-0 z-10 grid h-10 w-full grid-cols-2 bg-slate-100/90 p-1 backdrop-blur dark:bg-slate-900/90 lg:grid-cols-4">
                  <TabsTrigger value="overview" className="h-8 text-sm" disabled={sheetMode === 'create'}>Tổng quan</TabsTrigger>
                  <TabsTrigger value="subscribers" className="h-8 text-sm" disabled={sheetMode === 'create'}>Người đăng ký</TabsTrigger>
                  <TabsTrigger value="users" className="h-8 text-sm" disabled={sheetMode === 'create'}>Thêm user</TabsTrigger>
                  <TabsTrigger value="settings" className="h-8 text-sm">Cấu hình</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-3">
                  {selectedPlan && sheetMode !== 'create' ? (
                    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-3">
                      <InlineInfo label="ID" value={selectedPlan.id} />
                      <InlineInfo label="Created" value={formatDateTime(selectedPlan.createdAt)} />
                      <InlineInfo label="Updated" value={formatDateTime(selectedPlan.updatedAt)} />
                    </div>
                  ) : null}

                  {selectedPlan && sheetMode !== 'create' ? (
                    <SubscriberStatsPanel plan={selectedPlan} />
                  ) : null}

                  {selectedPlan && sheetMode !== 'create' ? (
                    <PlanOverviewSummary plan={selectedPlan} />
                  ) : null}
                </TabsContent>

                <TabsContent value="subscribers" className="pt-3">
                  {selectedPlan ? (
                    <PlanSubscribersPanel accessToken={accessToken} plan={selectedPlan} />
                  ) : null}
                </TabsContent>

                <TabsContent value="users" className="pt-3">
                  {selectedPlan ? (
                    <Tabs defaultValue="single" className="w-full">
                      <TabsList className="grid h-10 w-full grid-cols-2 p-1">
                        <TabsTrigger value="single" className="h-8 text-sm">Thêm 1 user</TabsTrigger>
                        <TabsTrigger value="import" className="h-8 text-sm">Import Excel</TabsTrigger>
                      </TabsList>
                      <TabsContent value="single" className="pt-4">
                        <AssignUserToPlanPanel
                          accessToken={accessToken}
                          plan={selectedPlan}
                          billingCycle={assignBillingCycle}
                          isSubmitting={isAssigningUser}
                          onBillingCycleChange={setAssignBillingCycle}
                          onSubmit={handleAssignUserToPlan}
                        />
                      </TabsContent>
                      <TabsContent value="import" className="pt-4">
                        <ImportUsersToPlanPanel
                          accessToken={accessToken}
                          plan={selectedPlan}
                          billingCycle={assignBillingCycle}
                          onBillingCycleChange={setAssignBillingCycle}
                          onImported={(result) => handleImportUsersComplete(selectedPlan, result)}
                        />
                      </TabsContent>
                    </Tabs>
                  ) : null}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 pt-3">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid h-10 w-full grid-cols-3 p-1">
                  <TabsTrigger value="basic" className="h-8 text-sm">Basic</TabsTrigger>
                  <TabsTrigger value="pricing" className="h-8 text-sm">Pricing</TabsTrigger>
                  <TabsTrigger value="access" className="h-8 text-sm">Quyền & giới hạn</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldBlock label="Tên gói">
                      <Input
                        value={formState.name}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          setFormState((current) => ({ ...current, name: event.target.value }));
                        }}
                        placeholder="Ví dụ: Plus"
                      />
                    </FieldBlock>

                    <FieldBlock label="Currency">
                      <Input
                        value={formState.currency}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          setFormState((current) => ({ ...current, currency: event.target.value.toUpperCase() }));
                        }}
                        placeholder="VND"
                      />
                    </FieldBlock>

                    <FieldBlock label="Display order">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={formState.displayOrder}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          setFormState((current) => ({ ...current, displayOrder: event.target.value }));
                        }}
                      />
                    </FieldBlock>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ToggleBlock label="Active">
                        <Switch
                          checked={formState.isDefaultPlan ? true : formState.isActive}
                          disabled={isReadOnly || formState.isDefaultPlan}
                          onCheckedChange={(checked) => {
                            setFormState((current) => ({ ...current, isActive: checked }));
                          }}
                        />
                      </ToggleBlock>

                      <ToggleBlock label="Default plan">
                        <Switch
                          checked={formState.isDefaultPlan}
                          disabled={isReadOnly}
                          onCheckedChange={(checked) => {
                            setFormState((current) => ({
                              ...current,
                              isDefaultPlan: checked,
                              isActive: checked ? true : current.isActive,
                            }));
                          }}
                        />
                      </ToggleBlock>
                    </div>
                  </div>

                  <FieldBlock label="Mô tả">
                    <Textarea
                      rows={5}
                      value={formState.description}
                      disabled={isReadOnly}
                      onChange={(event) => {
                        setFormState((current) => ({ ...current, description: event.target.value }));
                      }}
                      placeholder="Mô tả ngắn về gói AI, đối tượng sử dụng hoặc nội dung hiển thị ngoài public."
                    />
                  </FieldBlock>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-6 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldBlock label="Giá cơ sở">
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        value={formState.price}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          setFormState((current) => ({ ...current, price: event.target.value }));
                        }}
                      />
                    </FieldBlock>
                  </div>

                  <FieldBlock label="Billing cycles">
                    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-2 xl:grid-cols-3">
                      {BILLING_CYCLE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm',
                            formState.allowedBillingCycles.includes(option.value)
                              ? 'border-violet-300 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10'
                              : 'border-slate-200 dark:border-slate-800',
                            isReadOnly && 'opacity-80',
                          )}
                        >
                          <Checkbox
                            checked={formState.allowedBillingCycles.includes(option.value)}
                            disabled={isReadOnly}
                            onCheckedChange={(checked) => {
                              setFormState((current) => {
                                const isChecked = checked === true;
                                const nextCycles = isChecked
                                  ? Array.from(new Set([...current.allowedBillingCycles, option.value]))
                                  : current.allowedBillingCycles.filter((cycle) => cycle !== option.value);

                                return {
                                  ...current,
                                  allowedBillingCycles: nextCycles,
                                  billingCycleDiscounts: isChecked
                                    ? current.billingCycleDiscounts
                                    : {
                                        ...current.billingCycleDiscounts,
                                        [option.value]: '',
                                      },
                                };
                              });
                            }}
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{option.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{option.months} tháng</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FieldBlock>

                  <FieldBlock label="Discount theo chu kỳ (%)">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {formState.allowedBillingCycles.map((cycle) => (
                        <div key={cycle} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <Label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {formatBillingCycleLabel(cycle)}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={formState.billingCycleDiscounts[cycle]}
                            disabled={isReadOnly}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setFormState((current) => ({
                                ...current,
                                billingCycleDiscounts: {
                                  ...current.billingCycleDiscounts,
                                  [cycle]: nextValue,
                                },
                              }));
                            }}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </FieldBlock>

                  <FieldBlock label="Pricing preview">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {pricingPreview.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          Chưa có billing cycle nào được chọn.
                        </div>
                      ) : (
                        pricingPreview.map((preview) => (
                          <div key={preview.cycle} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {formatBillingCycleLabel(preview.cycle)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Giá gốc: {formatCurrency(preview.subtotal, formState.currency || 'VND')}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Discount: {preview.discountPercentage}%
                            </p>
                            <p className="mt-3 text-lg font-bold text-violet-600 dark:text-violet-300">
                              {formatCurrency(preview.total, formState.currency || 'VND')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </FieldBlock>
                </TabsContent>

                <TabsContent value="access" className="space-y-6 pt-4">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Cách hiểu quyền & giới hạn</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <p>Để trống = không giới hạn quota đó.</p>
                      <p>Nhập 0 = không cho sử dụng quota đó.</p>
                      <p>Tắt feature = user không dùng được feature này, kể cả khi limit có số.</p>
                      <p>Seat limit chỉ áp dụng cho gói team/business; để trống nếu không giới hạn hoặc không áp dụng.</p>
                    </div>
                  </div>

                  <FieldBlock label="Seat limit">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={formState.seatLimit}
                      disabled={isReadOnly}
                      onChange={(event) => {
                        setFormState((current) => ({ ...current, seatLimit: event.target.value }));
                      }}
                      placeholder="Để trống nếu không giới hạn hoặc không áp dụng"
                    />
                  </FieldBlock>

                  <CareerRecommendationAccessCard
                    formState={formState}
                    setFormState={setFormState}
                    isReadOnly={isReadOnly}
                  />

                  <div className="space-y-4">
                    {ACCESS_CONTROL_GROUPS.map((group) => (
                      <div
                        key={group.title}
                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{group.title}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
                          </div>
                          {group.featureKey ? (
                            <Switch
                              checked={formState.features[group.featureKey]}
                              disabled={isReadOnly}
                              onCheckedChange={(checked) => {
                                setFormState((current) => ({
                                  ...current,
                                  features: {
                                    ...current.features,
                                    [group.featureKey as FeatureKey]: checked,
                                  },
                                }));
                              }}
                            />
                          ) : (
                            <Badge className="w-fit border-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Quota only
                            </Badge>
                          )}
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          {group.limitKeys.map((limitKey) => (
                            <FieldBlock key={limitKey} label={LIMIT_FIELD_LABELS[limitKey]}>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={formState.limits[limitKey]}
                                disabled={isReadOnly}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  setFormState((current) => ({
                                    ...current,
                                    limits: {
                                      ...current.limits,
                                      [limitKey]: nextValue,
                                    },
                                  }));
                                }}
                                placeholder="Trống = không giới hạn, 0 = khóa"
                              />
                            </FieldBlock>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {STANDALONE_FEATURE_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{field.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
                        </div>
                        <Switch
                          checked={formState.features[field.key]}
                          disabled={isReadOnly}
                          onCheckedChange={(checked) => {
                            setFormState((current) => ({
                              ...current,
                              features: {
                                ...current.features,
                                [field.key]: checked,
                              },
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
                  <div className="sticky bottom-0 z-10 mt-6 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                    {sheetMode === 'detail' ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button
                          className="bg-violet-600 hover:bg-violet-700"
                          onClick={() => {
                            setSheetMode('edit');
                            setActiveDetailTab('settings');
                          }}
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          Chuyển sang chỉnh sửa
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button variant="outline" disabled={isSaving} onClick={handleCancelConfiguration}>
                          Hủy
                        </Button>
                        <Button className="bg-violet-600 hover:bg-violet-700" disabled={isSaving} onClick={handleSavePlan}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                          {sheetMode === 'create' ? 'Tạo gói' : 'Lưu thay đổi'}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(pendingDeletePlan)} onOpenChange={(open) => !open && setPendingDeletePlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa gói {pendingDeletePlan?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa cấu hình gói khỏi catalog. Default plan không thể xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingPlanId)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!pendingDeletePlan || pendingDeletePlan.isDefaultPlan || Boolean(deletingPlanId)}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDeletePlan) {
                  void handleDeletePlan(pendingDeletePlan);
                }
              }}
            >
              {deletingPlanId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Xóa gói
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlanSummaryCard({
  title,
  value,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
        </div>
      </div>
    </article>
  );
}

function PlanTablePanel({
  plans,
  selectedPlanId,
  isLoading,
  togglingPlanId,
  deletingPlanId,
  onCreate,
  onSelect,
  onEdit,
  onSubscribers,
  onAddUsers,
  onDeleteRequest,
  onToggleActive,
}: {
  plans: AdminAiPlan[];
  selectedPlanId: string | null;
  isLoading: boolean;
  togglingPlanId: string | null;
  deletingPlanId: string | null;
  onCreate: () => void;
  onSelect: (plan: AdminAiPlan) => void;
  onEdit: (plan: AdminAiPlan) => void;
  onSubscribers: (plan: AdminAiPlan) => void;
  onAddUsers: (plan: AdminAiPlan) => void;
  onDeleteRequest: (plan: AdminAiPlan) => void;
  onToggleActive: (plan: AdminAiPlan, checked: boolean) => void;
}) {
  return (
    <AdminPanel className="min-w-0 overflow-hidden p-0">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Danh sách gói AI</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Click vào một dòng để mở chi tiết. Bảng chỉ giữ thông tin chính để dễ quét.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-80 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center px-5 text-center">
          <CreditCard className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Chưa có plan nào</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tạo gói đầu tiên để bắt đầu quản lý pricing và quyền AI.
          </p>
          <Button className="mt-4 bg-violet-600 hover:bg-violet-700" size="sm" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo gói mới
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Tên gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Giá chính</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isPlanActive = plan.isActive !== false;
                const subscriberStats = getSubscriberStats(plan);
                const primaryCycle = getPlanBillingCycles(plan)[0] || 'monthly';
                const primaryPricing = getPlanPricingForCycle(plan, primaryCycle);

                return (
                  <TableRow
                    key={plan.id}
                    className={cn(
                      'cursor-pointer',
                      isSelected && 'bg-violet-50/70 dark:bg-violet-500/10',
                    )}
                    onClick={() => onSelect(plan)}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{plan.name}</p>
                          {plan.description ? (
                            <Badge variant="outline" className="border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                              Có mô tả
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {plan.description || 'Chưa có mô tả'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isPlanActive}
                          disabled={plan.isDefaultPlan || togglingPlanId === plan.id}
                          onCheckedChange={(checked) => onToggleActive(plan, checked)}
                        />
                        <Badge
                          className={cn(
                            'border-0',
                            isPlanActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
                          )}
                        >
                          {isPlanActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {togglingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(primaryPricing.total, primaryPricing.currency || plan.currency || 'VND')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatBillingCycleLabel(primaryPricing.billingCycle)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSubscribers(plan);
                        }}
                      >
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {formatNumber(subscriberStats.activeSubscribers)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {plan.isDefaultPlan ? 'đang dùng Free' : `${formatNumber(subscriberStats.totalSubscribers)} tổng`}
                        </p>
                      </button>
                    </TableCell>
                    <TableCell>
                      {plan.isDefaultPlan ? (
                        <Badge className="border-0 bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          Default
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">--</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => onEdit(plan)} aria-label="Chỉnh sửa">
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 border-sky-200 text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:border-sky-500/20 dark:text-sky-300"
                          onClick={() => onSubscribers(plan)}
                          aria-label="Người đăng ký"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 border-sky-200 text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:border-sky-500/20 dark:text-sky-300"
                          onClick={() => onAddUsers(plan)}
                          aria-label="Thêm user"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/20 dark:text-rose-300"
                          disabled={plan.isDefaultPlan || deletingPlanId === plan.id}
                          onClick={() => onDeleteRequest(plan)}
                          aria-label="Xóa gói"
                        >
                          {deletingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminPanel>
  );
}

function PlanOverviewSummary({ plan }: { plan: AdminAiPlan }) {
  const pricing = getPlanBillingCycles(plan).map((cycle) => getPlanPricingForCycle(plan, cycle));
  const enabledFeatures = Object.values(plan.features || {}).filter(Boolean).length;
  const configuredLimits = Object.values(plan.limits || {}).filter((value) => value !== undefined && value !== null).length;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Pricing đang public</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {pricing.map((item) => (
            <div key={item.billingCycle} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {formatBillingCycleLabel(item.billingCycle)}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(item.total, item.currency || plan.currency || 'VND')}
              </p>
              {item.discountPercentage > 0 ? (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">
                  Giảm {item.discountPercentage}% so với giá cơ sở
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Không có discount</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Quyền & giới hạn</p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <InlineInfo label="Seat limit" value={plan.seatLimit ? String(plan.seatLimit) : '--'} />
          <InlineInfo label="Limit đã cấu hình" value={String(configuredLimits)} />
          <InlineInfo label="Feature đang bật" value={String(enabledFeatures)} highlight={enabledFeatures > 0 ? 'success' : undefined} />
          <InlineInfo label="Billing cycles" value={formatBillingCycles(plan.allowedBillingCycles)} />
        </div>
      </div>
    </div>
  );
}

function SubscriberStatsPanel({ plan }: { plan: AdminAiPlan }) {
  const stats = getSubscriberStats(plan);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Thống kê người đăng ký
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {plan.isDefaultPlan
              ? 'Free là entitlement mặc định cho user chưa có paid plan active.'
              : 'Số liệu được đếm theo user distinct, không đếm trùng các lần gia hạn.'}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <Users className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SubscriberMetric label="Đang dùng" value={stats.activeSubscribers} tone="success" />
        <SubscriberMetric label="Từng đăng ký" value={stats.totalSubscribers} />
        <SubscriberMetric label="Đã hủy" value={stats.cancelledSubscribers} tone="warning" />
        <SubscriberMetric label="Hết hạn" value={stats.expiredSubscribers} tone="danger" />
      </div>
    </div>
  );
}

function PlanSubscribersPanel({
  accessToken,
  plan,
}: {
  accessToken: string | null;
  plan: AdminAiPlan;
}) {
  const pageSize = 8;
  const [status, setStatus] = useState<AdminAiPlanSubscriberStatusFilter>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminAiPlanSubscribersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus('active');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setPage(1);
    setData(null);
    setErrorMessage(null);
  }, [plan.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let isActive = true;

    const loadSubscribers = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await adminAiPlanService.getPlanSubscribers(accessToken, plan.id, {
          page,
          limit: pageSize,
          search: debouncedSearchTerm,
          status,
        });
        if (!isActive) return;
        setData(response);
      } catch (error) {
        if (!isActive) return;
        setData(null);
        setErrorMessage(getErrorMessage(error, 'Không thể tải danh sách người đăng ký.'));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadSubscribers();

    return () => {
      isActive = false;
    };
  }, [accessToken, debouncedSearchTerm, page, plan.id, status]);

  const stats = data?.stats || getSubscriberStats(plan);
  const totalPages = data?.totalPages || 1;
  const subscribers = data?.subscribers || [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] xl:min-w-[520px]">
            <FieldBlock label="Tìm user">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-9 pl-9"
                  value={searchTerm}
                  disabled={isLoading}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nhập tên, email hoặc SĐT"
                />
              </div>
            </FieldBlock>

            <FieldBlock label="Trạng thái">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
                value={status}
                disabled={isLoading}
                onChange={(event) => {
                  setStatus(event.target.value as AdminAiPlanSubscriberStatusFilter);
                  setPage(1);
                }}
              >
                <option value="active">Đang dùng</option>
                <option value="all">Từng đăng ký</option>
                <option value="cancelled">Đã hủy</option>
                <option value="expired">Hết hạn</option>
              </select>
            </FieldBlock>
          </div>

          <div className="flex flex-wrap gap-2">
            <SubscriberMetric label="Đang dùng" value={stats.activeSubscribers} tone="success" />
            <SubscriberMetric label="Từng đăng ký" value={stats.totalSubscribers} />
            <SubscriberMetric label="Đã hủy" value={stats.cancelledSubscribers} tone="warning" />
            <SubscriberMetric label="Hết hạn" value={stats.expiredSubscribers} tone="danger" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                </TableCell>
              </TableRow>
            ) : errorMessage ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sm text-rose-600 dark:text-rose-300">
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : subscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sm text-slate-500 dark:text-slate-400">
                  Chưa có user phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((subscriber) => (
                <TableRow key={`${subscriber.userId}-${subscriber.subscriptionId || 'free'}`}>
                  <TableCell className="py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {subscriber.name || subscriber.email}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary">{subscriber.role || 'user'}</Badge>
                        <Badge className={cn('border-0', getUserStatusBadgeClassName(subscriber.userStatus))}>
                          {subscriber.userStatus}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-300">
                    <p className="truncate">{subscriber.email}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {subscriber.phone_number || '--'}
                    </p>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <Badge className={cn('border-0', getSubscriptionStatusClassName(subscriber.subscriptionStatus))}>
                        {formatSubscriptionStatus(subscriber.subscriptionStatus)}
                      </Badge>
                      {subscriber.isCurrentPlanUser ? (
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300">Đang ở gói này</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-300">
                    {subscriber.billingCycle ? formatBillingCycleLabel(subscriber.billingCycle) : '--'}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>Bắt đầu: {formatOptionalDateTime(subscriber.startDate)}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Hết hạn: {formatOptionalDateTime(subscriber.endDate)}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Tổng {formatNumber(data?.total || 0)} user · Trang {page}/{totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
          >
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || page >= totalPages}
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssignUserToPlanPanel({
  accessToken,
  plan,
  billingCycle,
  isSubmitting,
  onBillingCycleChange,
  onSubmit,
}: {
  accessToken: string | null;
  plan: AdminAiPlan;
  billingCycle: BillingCycle;
  isSubmitting: boolean;
  onBillingCycleChange: (value: BillingCycle) => void;
  onSubmit: (user: AdminUser) => Promise<boolean>;
}) {
  const cycles = getPlanBillingCycles(plan);
  const selectedCycle = cycles.includes(billingCycle) ? billingCycle : cycles[0] || 'monthly';
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let isActive = true;

    const loadUsers = async () => {
      if (!accessToken || debouncedSearchTerm.length < 2 || selectedUser) {
        setResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      try {
        setIsSearching(true);
        setSearchError(null);
        const response = await adminService.getAllUsers(accessToken, 1, 8, {
          search: debouncedSearchTerm,
        });
        if (!isActive) return;
        setResults(response.users);
      } catch (error) {
        if (!isActive) return;
        setResults([]);
        setSearchError(getErrorMessage(error, 'Không thể tìm user.'));
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isActive = false;
    };
  }, [accessToken, debouncedSearchTerm, selectedUser]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (selectedUser) {
      setSelectedUser(null);
    }
  };

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setSearchTerm(formatAdminUserLabel(user));
    setDebouncedSearchTerm('');
    setResults([]);
    setSearchError(null);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setResults([]);
    setSearchError(null);
  };

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!selectedUser) return;
        const didAssign = await onSubmit(selectedUser);
        if (didAssign) {
          handleClearUser();
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Add user vào plan</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tìm kiếm rồi chọn đúng user trước khi add. Nếu user đang có plan active, hệ thống sẽ chuyển sang plan này.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
          <UserPlus className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
        <FieldBlock label="Tìm user">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 pr-10"
              value={searchTerm}
              disabled={isSubmitting}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Nhập tên, email hoặc SĐT"
            />
            {selectedUser ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={handleClearUser}
                disabled={isSubmitting}
                aria-label="Đổi user"
              >
                <X className="h-4 w-4" />
              </button>
            ) : isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            ) : null}
          </div>
        </FieldBlock>

        <FieldBlock label="Billing cycle">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
            value={selectedCycle}
            disabled={isSubmitting}
            onChange={(event) => onBillingCycleChange(event.target.value as BillingCycle)}
          >
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                {formatBillingCycleLabel(cycle)}
              </option>
            ))}
          </select>
        </FieldBlock>

        <Button
          type="submit"
          className="bg-sky-600 hover:bg-sky-700"
          disabled={isSubmitting || !selectedUser}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Add user
        </Button>
      </div>

      {selectedUser ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-emerald-900 dark:text-emerald-100">{selectedUser.name || selectedUser.email}</p>
              <p className="truncate text-xs text-emerald-700 dark:text-emerald-200">
                {selectedUser.email}
                {getAdminUserPhone(selectedUser) ? ` · ${getAdminUserPhone(selectedUser)}` : ''}
                {selectedUser.plan ? ` · Plan hiện tại: ${selectedUser.plan}` : ''}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleClearUser} disabled={isSubmitting}>
            Đổi user
          </Button>
        </div>
      ) : null}

      {!selectedUser && debouncedSearchTerm.length >= 2 ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {searchError ? (
            <div className="px-3 py-3 text-sm text-rose-600 dark:text-rose-300">{searchError}</div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-900"
                  disabled={isSubmitting}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name || user.email}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                      {getAdminUserPhone(user) ? ` · ${getAdminUserPhone(user)}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="secondary">{user.plan || 'Free'}</Badge>
                    <p className="mt-1 text-[11px] text-slate-400">{user.status}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : isSearching ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tìm user...
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Không tìm thấy user phù hợp.</div>
          )}
        </div>
      ) : null}
    </form>
  );
}

function ImportUsersToPlanPanel({
  accessToken,
  plan,
  billingCycle,
  onBillingCycleChange,
  onImported,
}: {
  accessToken: string | null;
  plan: AdminAiPlan;
  billingCycle: BillingCycle;
  onBillingCycleChange: (value: BillingCycle) => void;
  onImported: (result: ImportAiPlanUsersResult) => Promise<void> | void;
}) {
  const cycles = getPlanBillingCycles(plan);
  const selectedCycle = cycles.includes(billingCycle) ? billingCycle : cycles[0] || 'monthly';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportAiPlanUsersResult | null>(null);

  const handleFileChange = (file: File | null) => {
    setResult(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error('Chỉ hỗ trợ file .xlsx hoặc .xls.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Excel không được vượt quá 5MB.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'name',
      'email',
      'gender',
      'date_of_birth',
      'phone_number',
      'street',
      'ward',
      'district',
      'city',
      'country',
      'zipcode',
      'note',
    ];
    const rows = [
      [
        'Nguyen Van A',
        'nguyenvana@example.com',
        'Nam',
        '2002-05-20',
        '0901234567',
        '12 Nguyen Trai',
        'Phuong 1',
        'Quan 1',
        'TP HCM',
        'Vietnam',
        '700000',
        'Dong mau',
      ],
    ];
    const html = [
      '<html><head><meta charset="utf-8" /></head><body><table>',
      `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>`,
      ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`),
      '</table></body></html>',
    ].join('');
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'edumee-import-users-template.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken || !selectedFile) return;

    try {
      setIsImporting(true);
      const response = await adminAiPlanService.importUsersToPlan(accessToken, {
        file: selectedFile,
        planId: plan.id,
        billingCycle: selectedCycle,
      });
      setResult(response);
      await onImported(response);
    if (response.failedRows === 0) {
      setSelectedFile(null);
      setFileInputKey((current) => current + 1);
    }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể import user từ Excel.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      onSubmit={handleImport}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Import user bằng Excel</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cột bắt buộc: name, email, gender, date_of_birth. User trùng email sẽ chỉ được gán plan.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
        <FieldBlock label="Billing cycle">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100"
            value={selectedCycle}
            disabled={isImporting}
            onChange={(event) => onBillingCycleChange(event.target.value as BillingCycle)}
          >
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                {formatBillingCycleLabel(cycle)}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock label="File Excel">
          <Input
            key={fileInputKey}
            type="file"
            accept=".xlsx,.xls"
            disabled={isImporting}
            onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
          />
        </FieldBlock>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleDownloadTemplate} disabled={isImporting}>
            <Download className="mr-2 h-4 w-4" />
            File mẫu
          </Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isImporting || !selectedFile}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import
          </Button>
        </div>
      </div>

      {selectedFile ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <ImportMetric label="Tổng dòng" value={result.totalRows} />
            <ImportMetric label="Tạo mới" value={result.createdUsers} tone="success" />
            <ImportMetric label="User có sẵn" value={result.assignedExistingUsers} />
            <ImportMetric label="Dòng lỗi" value={result.failedRows} tone={result.failedRows ? 'danger' : 'success'} />
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow key={`${row.rowNumber}-${row.email || row.name || row.message}`}>
                    <TableCell className="text-sm text-slate-500">{row.rowNumber}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{row.name || '--'}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.email || '--'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-0', getImportStatusClassName(row.status))}>
                        {formatImportStatus(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
                      <p>{row.message}</p>
                      {row.warnings?.length ? (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">{row.warnings.join(', ')}</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ImportMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : tone === 'danger'
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
      )}
    >
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-bold">{formatNumber(value)}</p>
    </div>
  );
}

function formatImportStatus(status: ImportAiPlanUsersResult['rows'][number]['status']): string {
  if (status === 'created_assigned') return 'Tạo mới';
  if (status === 'existing_assigned') return 'Đã có user';
  return 'Lỗi';
}

function getImportStatusClassName(status: ImportAiPlanUsersResult['rows'][number]['status']): string {
  if (status === 'failed') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  if (status === 'created_assigned') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  return 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
}

function formatSubscriptionStatus(status?: string): string {
  if (status === 'cancelled') return 'Đã hủy';
  if (status === 'expired') return 'Hết hạn';
  if (status === 'active') return 'Active';
  return status || '--';
}

function getSubscriptionStatusClassName(status?: string): string {
  if (status === 'cancelled') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  if (status === 'expired') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
}

function getUserStatusBadgeClassName(status?: string): string {
  const normalized = status?.toLowerCase() || '';
  if (normalized.includes('khóa') || normalized.includes('banned')) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function formatOptionalDateTime(value?: string): string {
  return value ? formatDateTime(value) : '--';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAdminUserPhone(user: AdminUser): string {
  return user.phone_number?.trim() || '';
}

function formatAdminUserLabel(user: AdminUser): string {
  const phone = getAdminUserPhone(user);
  return [user.name || user.email, user.email, phone].filter(Boolean).join(' · ');
}

function SubscriberMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-300'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-300'
        : tone === 'danger'
          ? 'text-rose-600 dark:text-rose-300'
          : 'text-slate-900 dark:text-slate-100';

  return (
    <div className="flex min-w-28 items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={cn('text-base font-black', toneClass)}>{formatNumber(value)}</p>
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</Label>
      {children}
    </div>
  );
}

function CareerRecommendationAccessCard({
  formState,
  setFormState,
  isReadOnly,
}: {
  formState: PlanFormState;
  setFormState: Dispatch<SetStateAction<PlanFormState>>;
  isReadOnly: boolean;
}) {
  const generatedCareerCount = parseOptionalNumber(
    formState.limits.maxCareerRecommendationsPerRun,
  );
  const visibleCareerCount = parseOptionalNumber(
    formState.limits.visibleCareerRecommendationsPerRun,
  );
  const effectiveVisibleCareerCount = visibleCareerCount ?? generatedCareerCount;
  const lockedCareerCount =
    generatedCareerCount !== undefined && effectiveVisibleCareerCount !== undefined
      ? Math.max(generatedCareerCount - effectiveVisibleCareerCount, 0)
      : undefined;
  const hasInvalidVisibility =
    visibleCareerCount !== undefined &&
    generatedCareerCount !== undefined &&
    visibleCareerCount > generatedCareerCount;
  const hasMissingGeneratedCount =
    visibleCareerCount !== undefined && generatedCareerCount === undefined;
  const planLabel = formState.name.trim() || 'Plan này';

  let previewText = 'Nhập số nghề AI tạo/lưu để xem preview.';
  if (hasMissingGeneratedCount) {
    previewText = 'Cần nhập số nghề AI tạo/lưu khi đặt số nghề user được xem.';
  } else if (hasInvalidVisibility) {
    previewText = 'Số nghề user được xem đang lớn hơn số nghề AI tạo/lưu.';
  } else if (generatedCareerCount !== undefined && lockedCareerCount !== undefined) {
    previewText =
      lockedCareerCount > 0
        ? `${planLabel} sẽ hiển thị ${effectiveVisibleCareerCount} nghề và khóa ${lockedCareerCount} nghề.`
        : `${planLabel} mở toàn bộ ${generatedCareerCount} nghề.`;
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Career Recommendation
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cấu hình riêng phần AI gợi ý nghề: lượt chạy, số nghề backend lưu, và số nghề user được xem.
          </p>
        </div>
        <Switch
          checked={formState.features.careerRecommendation}
          disabled={isReadOnly}
          onCheckedChange={(checked) => {
            setFormState((current) => ({
              ...current,
              features: {
                ...current.features,
                careerRecommendation: checked,
              },
            }));
          }}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {CAREER_RECOMMENDATION_LIMIT_FIELDS.map((field) => (
          <FieldBlock key={field.key} label={field.label}>
            <Input
              type="number"
              min={0}
              step={1}
              value={formState.limits[field.key]}
              disabled={isReadOnly}
              onChange={(event) => {
                const nextValue = event.target.value;
                setFormState((current) => ({
                  ...current,
                  limits: {
                    ...current.limits,
                    [field.key]: nextValue,
                  },
                }));
              }}
              placeholder="Trống = không giới hạn, 0 = khóa"
              aria-invalid={
                field.key === 'visibleCareerRecommendationsPerRun' &&
                (hasInvalidVisibility || hasMissingGeneratedCount)
              }
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{field.helper}</p>
          </FieldBlock>
        ))}
      </div>

      <div
        className={cn(
          'mt-4 rounded-xl border px-4 py-3 text-sm',
          hasInvalidVisibility || hasMissingGeneratedCount
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
            : 'border-violet-200 bg-white/70 text-violet-700 dark:border-violet-500/30 dark:bg-slate-950/30 dark:text-violet-200',
        )}
      >
        <p className="font-semibold">Preview khóa nghề</p>
        <p className="mt-1">{previewText}</p>
      </div>
    </div>
  );
}

function ToggleBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật trạng thái trực tiếp trên plan.</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function InlineInfo({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'success' | 'danger';
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100',
          highlight === 'success' && 'text-emerald-600 dark:text-emerald-300',
          highlight === 'danger' && 'text-rose-600 dark:text-rose-300',
        )}
      >
        {value}
      </p>
    </div>
  );
}
