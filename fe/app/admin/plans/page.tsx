'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  CreditCard,
  Eye,
  Layers3,
  Loader2,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPanel, AdminSectionHeader, AdminStatCard } from '@/components/admin/AdminPrimitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
  type BillingCycle,
} from '@/lib/admin-ai-plan.service';
import { cn } from '@/lib/utils';

type SheetMode = 'create' | 'detail' | 'edit';
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
  { key: 'careerRecommendationRunsPerMonth', label: 'Career recommendation / tháng' },
  { key: 'maxCareerRecommendationsPerRun', label: 'Career recommendation tối đa / lần' },
  { key: 'careerComparisonsPerMonth', label: 'Career comparison / tháng' },
  { key: 'maxCareersPerComparison', label: 'Career tối đa / comparison' },
  { key: 'personalizedRoadmapsPerMonth', label: 'Roadmap / tháng' },
  { key: 'mentorBookingsPerMonth', label: 'Mentor booking / tháng' },
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
    limits: {
      ...state.limits,
      ...Object.fromEntries(
        Object.entries(plan.limits || {}).map(([key, value]) => [key, value === undefined ? '' : String(value)]),
      ),
    } as Record<LimitKey, string>,
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

function formatDateTime(value?: string): string {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
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
  if (seatLimit !== undefined) {
    payload.seatLimit = seatLimit;
  }

  const limits = LIMIT_FIELDS.reduce<Partial<Record<LimitKey, number>>>((acc, field) => {
    const numericValue = parseOptionalNumber(formState.limits[field.key]);
    if (numericValue !== undefined) {
      acc[field.key] = numericValue;
    }
    return acc;
  }, {});
  if (Object.keys(limits).length > 0) {
    payload.limits = limits;
  }

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

  return null;
}

export default function AdminPlansPage() {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<AdminAiPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('detail');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AdminAiPlan | null>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PlanFormState>(createInitialFormState());

  const loadPlans = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      const response = await adminAiPlanService.getAdminAiPlans(accessToken);
      setPlans(response);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách gói AI.'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const stats = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive !== false).length;
    const defaultPlan = plans.find((plan) => plan.isDefaultPlan);
    const multiCyclePlans = plans.filter((plan) => (plan.allowedBillingCycles?.length || 0) > 1).length;

    return {
      totalPlans: plans.length,
      activePlans,
      defaultPlanName: defaultPlan?.name || 'Chưa đặt',
      multiCyclePlans,
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
    setSelectedPlanId(null);
    setSelectedPlan(null);
    setFormState(createInitialFormState());
    setIsSheetOpen(true);
  };

  const openPlanSheet = async (mode: SheetMode, planId: string) => {
    if (!accessToken) return;

    try {
      setSheetMode(mode);
      setSelectedPlanId(planId);
      setIsSheetOpen(true);
      setIsSheetLoading(true);
      const plan = await adminAiPlanService.getAdminAiPlanById(accessToken, planId);
      setSelectedPlan(plan);
      setFormState(buildFormState(plan));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải chi tiết gói AI.'));
      setIsSheetOpen(false);
    } finally {
      setIsSheetLoading(false);
    }
  };

  const handleToggleActive = async (plan: AdminAiPlan, nextChecked: boolean) => {
    if (!accessToken || plan.isDefaultPlan) return;

    try {
      setTogglingPlanId(plan.id);
      const updatedPlan = await adminAiPlanService.updateAdminAiPlan(accessToken, plan.id, {
        isActive: nextChecked,
      });
      setPlans((currentPlans) =>
        currentPlans.map((currentPlan) => (currentPlan.id === plan.id ? updatedPlan : currentPlan)),
      );

      if (selectedPlan?.id === plan.id) {
        setSelectedPlan(updatedPlan);
        setFormState(buildFormState(updatedPlan));
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

    const confirmed = window.confirm(`Bạn có chắc muốn xóa gói "${plan.name}" không?`);
    if (!confirmed) return;

    try {
      setDeletingPlanId(plan.id);
      await adminAiPlanService.deleteAdminAiPlan(accessToken, plan.id);
      toast.success(`Đã xóa gói ${plan.name}.`);
      if (selectedPlanId === plan.id) {
        setIsSheetOpen(false);
      }
      await loadPlans();
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

      if (sheetMode === 'create') {
        await adminAiPlanService.createAdminAiPlan(accessToken, payload);
        toast.success('Đã tạo gói AI mới.');
      } else if (selectedPlanId) {
        await adminAiPlanService.updateAdminAiPlan(accessToken, selectedPlanId, payload);
        toast.success('Đã cập nhật gói AI.');
      }

      setIsSheetOpen(false);
      await loadPlans();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể lưu gói AI.'));
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = sheetMode === 'detail';

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Gói AI"
        subtitle="Quản lý catalog gói AI, pricing theo billing cycle, limits và feature flags từ dữ liệu thật của backend."
        right={
          <Button className="h-11 rounded-xl bg-violet-600 px-5 font-bold hover:bg-violet-700" onClick={openCreateSheet}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo gói mới
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Tổng số gói" value={String(stats.totalPlans)} icon={CreditCard} iconClassName="bg-violet-500" />
        <AdminStatCard title="Gói đang active" value={String(stats.activePlans)} icon={ShieldCheck} iconClassName="bg-emerald-500" />
        <AdminStatCard title="Default plan" value={stats.defaultPlanName} icon={Layers3} iconClassName="bg-sky-500" />
        <AdminStatCard title="Gói nhiều chu kỳ" value={String(stats.multiCyclePlans)} icon={ArrowDownUp} iconClassName="bg-amber-500" />
      </div>

      <AdminPanel className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Danh sách gói AI</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Inline toggle chỉ cập nhật `isActive`. Các cấu hình sâu hơn được chỉnh trong drawer chi tiết.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Chưa có plan nào. Hãy tạo gói AI đầu tiên.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Billing cycles</TableHead>
                <TableHead>Seat limit</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const isPlanActive = plan.isActive !== false;

                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</p>
                          {plan.description ? (
                            <Badge variant="outline" className="border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                              Có mô tả
                            </Badge>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {plan.description || 'Chưa có mô tả'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isPlanActive}
                          disabled={plan.isDefaultPlan || togglingPlanId === plan.id}
                          onCheckedChange={(checked) => {
                            void handleToggleActive(plan, checked);
                          }}
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
                      </div>
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
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(plan.price, plan.currency || 'VND')}
                    </TableCell>
                    <TableCell className="max-w-56 text-sm text-slate-600 dark:text-slate-300">
                      {formatBillingCycles(plan.allowedBillingCycles)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                      {plan.seatLimit ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                      {plan.displayOrder ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDateTime(plan.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            void openPlanSheet('detail', plan.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            void openPlanSheet('edit', plan.id);
                          }}
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/20 dark:text-rose-300"
                          disabled={plan.isDefaultPlan || deletingPlanId === plan.id}
                          onClick={() => {
                            void handleDeletePlan(plan);
                          }}
                        >
                          {deletingPlanId === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AdminPanel>

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open && !isSaving) {
            setSelectedPlanId(null);
            setSelectedPlan(null);
            setFormState(createInitialFormState());
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader className="pr-8">
            <SheetTitle>
              {sheetMode === 'create'
                ? 'Tạo gói AI mới'
                : sheetMode === 'edit'
                  ? `Chỉnh sửa ${selectedPlan?.name || 'gói AI'}`
                  : `Chi tiết ${selectedPlan?.name || 'gói AI'}`}
            </SheetTitle>
            <SheetDescription>
              Quản lý metadata cơ bản, pricing theo billing cycle, limits sử dụng và feature flags cho từng plan.
            </SheetDescription>
          </SheetHeader>

          {isSheetLoading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {selectedPlan && sheetMode !== 'create' ? (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-4">
                  <InlineInfo label="ID" value={selectedPlan.id} />
                  <InlineInfo label="Updated" value={formatDateTime(selectedPlan.updatedAt)} />
                  <InlineInfo label="Created" value={formatDateTime(selectedPlan.createdAt)} />
                  <InlineInfo
                    label="Public status"
                    value={selectedPlan.isActive !== false ? 'Active' : 'Inactive'}
                    highlight={selectedPlan.isActive !== false ? 'success' : 'danger'}
                  />
                </div>
              ) : null}

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="limits">Limits</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
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
                        placeholder="Để trống nếu không áp dụng"
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

                <TabsContent value="limits" className="space-y-6 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {LIMIT_FIELDS.map((field) => (
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
                          placeholder="Để trống nếu không áp dụng"
                        />
                      </FieldBlock>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4 pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {FEATURE_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{field.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Feature flag được bật hoặc tắt theo plan này.
                          </p>
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
            </div>
          )}

          <SheetFooter className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
            {sheetMode === 'detail' ? (
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Đóng
                </Button>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  onClick={() => {
                    setSheetMode('edit');
                  }}
                >
                  <PencilLine className="mr-2 h-4 w-4" />
                  Chuyển sang chỉnh sửa
                </Button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={isSaving} onClick={() => setIsSheetOpen(false)}>
                  Hủy
                </Button>
                <Button className="bg-violet-600 hover:bg-violet-700" disabled={isSaving} onClick={handleSavePlan}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  {sheetMode === 'create' ? 'Tạo gói' : 'Lưu thay đổi'}
                </Button>
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
