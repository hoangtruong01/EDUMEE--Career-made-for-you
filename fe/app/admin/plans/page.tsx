'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Building2,
  Check,
  Crown,
  Edit3,
  Eye,
  Star,
  ToggleLeft,
  ToggleRight,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

/* -- types & data --------------------------------------------------------- */

type PlanAudience = 'individual_monthly' | 'individual_multi' | 'business';

type FeatureValue = boolean | string;

interface PlanFeature {
  label: string;
  values: Record<string, FeatureValue>;
}

interface PlanData {
  tier: string;
  name: string;
  price: number;
  period: string;
  badge: string;
  color: string;
  bgGradient: string;
  icon: typeof Star;
  iconBg: string;
  subscribers: number;
  subscribersLabel: string;
  revenue: string;
  popular: boolean;
  active: boolean;
  locked: boolean;
  description: string;
  tableBadgeClass: string;
  tablePriceClass: string;
}

interface PlanStat {
  label: string;
  value: string;
  color: string;
}

interface PlanConfig {
  subtitle: string;
  plans: PlanData[];
  features: PlanFeature[];
  stats: PlanStat[];
}

const planConfigs: Record<PlanAudience, PlanConfig> = {
  individual_monthly: {
    subtitle: 'Quản lý các gói Free, Plus và Pro: định giá, tính năng và trạng thái.',
    plans: [
      {
        tier: 'Free',
        name: 'Free',
        price: 0,
        period: 'tháng',
        badge: 'Cơ bản',
        color: 'text-slate-600',
        bgGradient: 'from-slate-50 to-slate-100',
        icon: Star,
        iconBg: 'bg-slate-500',
        subscribers: 8742,
        subscribersLabel: 'người dùng',
        revenue: '0',
        popular: false,
        active: true,
        locked: true,
        description: 'Dùng thử miễn phí, truy cập các tính năng cơ bản của Career AI.',
        tableBadgeClass: 'bg-slate-100 text-slate-700',
        tablePriceClass: 'text-slate-600',
      },
      {
        tier: 'Plus',
        name: 'Plus',
        price: 99000,
        period: 'tháng',
        badge: 'Phổ biến',
        color: 'text-amber-600',
        bgGradient: 'from-amber-50 to-orange-50',
        icon: Zap,
        iconBg: 'bg-amber-500',
        subscribers: 2847,
        subscribersLabel: 'người dùng',
        revenue: '281,853,000',
        popular: true,
        active: true,
        locked: false,
        description: 'Mở khóa bài test nâng cao, lộ trình học tập và kết nối mentor.',
        tableBadgeClass: 'bg-amber-100 text-amber-700',
        tablePriceClass: 'text-amber-700',
      },
      {
        tier: 'Pro',
        name: 'Pro',
        price: 249000,
        period: 'tháng',
        badge: 'Cao cấp',
        color: 'text-violet-600',
        bgGradient: 'from-violet-50 to-indigo-50',
        icon: Crown,
        iconBg: 'bg-violet-500',
        subscribers: 864,
        subscribersLabel: 'người dùng',
        revenue: '215,136,000',
        popular: false,
        active: true,
        locked: false,
        description: 'Toàn bộ tính năng. AI cá nhân hóa, mentor 1-1, chứng chỉ.',
        tableBadgeClass: 'bg-violet-100 text-violet-700',
        tablePriceClass: 'text-violet-700',
      },
    ],
    features: [
      {
        label: 'Bài test tính cách (Holland, MBTI)',
        values: { Free: '1 lần', Plus: '3 lần', Pro: '5 lần' },
      },
      { label: 'Gợi ý nghề nghiệp AI', values: { Free: '1 nghề', Plus: '3 nghề', Pro: '5 nghề' } },
      { label: 'Lộ trình học tập cá nhân', values: { Free: false, Plus: true, Pro: true } },
      { label: 'So sánh nghề nghiệp', values: { Free: false, Plus: '3 nghề', Pro: '10 nghề' } },
      { label: 'Mô phỏng nghề nghiệp', values: { Free: false, Plus: false, Pro: true } },
      {
        label: 'Cộng đồng thảo luận',
        values: { Free: 'Đọc', Plus: 'Đọc và viết', Pro: 'Đọc và viết' },
      },
      { label: 'Báo cáo phân tích chi tiết', values: { Free: false, Plus: true, Pro: true } },
      { label: 'Xuất PDF hồ sơ nghề nghiệp', values: { Free: false, Plus: false, Pro: true } },
      { label: 'Chứng chỉ hoàn thành lộ trình', values: { Free: false, Plus: false, Pro: true } },
    ],
    stats: [
      {
        label: 'Tổng doanh thu (tháng)',
        value: '496,989,000 VND',
        color: 'bg-emerald-100 text-emerald-600',
      },
      { label: 'Tổng người đăng ký', value: '12,453', color: 'bg-indigo-100 text-indigo-600' },
      {
        label: 'Tỷ lệ chuyển đổi Free -> Plus',
        value: '18.4%',
        color: 'bg-amber-100 text-amber-600',
      },
      {
        label: 'Tỷ lệ chuyển đổi Plus -> Pro',
        value: '9.2%',
        color: 'bg-violet-100 text-violet-600',
      },
    ],
  },
  individual_multi: {
    subtitle:
      'Quản lý gói cá nhân dài hạn 3 và 12 tháng với mức giảm giá để tăng tỷ lệ giữ chân người dùng.',
    plans: [
      {
        tier: '3M',
        name: 'Plus 3 tháng',
        price: 261000,
        period: '3 tháng',
        badge: 'Tiết kiệm 12%',
        color: 'text-amber-600',
        bgGradient: 'from-amber-50 to-orange-50',
        icon: Zap,
        iconBg: 'bg-amber-500',
        subscribers: 1342,
        subscribersLabel: 'người dùng',
        revenue: '350,262,000',
        popular: true,
        active: true,
        locked: false,
        description:
          'Gói cá nhân 3 tháng, phù hợp người dùng muốn cam kết trung hạn với chi phí hợp lý.',
        tableBadgeClass: 'bg-amber-100 text-amber-700',
        tablePriceClass: 'text-amber-700',
      },
      {
        tier: '12M',
        name: 'Pro 12 tháng',
        price: 2091600,
        period: '12 tháng',
        badge: 'Tiết kiệm 30%',
        color: 'text-violet-600',
        bgGradient: 'from-violet-50 to-indigo-50',
        icon: Crown,
        iconBg: 'bg-violet-500',
        subscribers: 527,
        subscribersLabel: 'người dùng',
        revenue: '1,102,273,200',
        popular: false,
        active: true,
        locked: false,
        description: 'Gói cá nhân 12 tháng, tối ưu chi phí cho người dùng muốn đồng hành dài hạn.',
        tableBadgeClass: 'bg-violet-100 text-violet-700',
        tablePriceClass: 'text-violet-700',
      },
    ],
    features: [
      {
        label: 'Bài test tính cách (Holland, MBTI)',
        values: { 'Plus 3 tháng': '10 lần', 'Pro 12 tháng': 'Không giới hạn' },
      },
      {
        label: 'Gợi ý nghề nghiệp AI',
        values: { 'Plus 3 tháng': '8 nghề', 'Pro 12 tháng': 'Không giới hạn' },
      },
      {
        label: 'Lộ trình học tập cá nhân',
        values: { 'Plus 3 tháng': true, 'Pro 12 tháng': true },
      },
      {
        label: 'So sánh nghề nghiệp',
        values: { 'Plus 3 tháng': '10 nghề', 'Pro 12 tháng': 'Không giới hạn' },
      },
      {
        label: 'Mô phỏng nghề nghiệp',
        values: { 'Plus 3 tháng': true, 'Pro 12 tháng': true },
      },
      {
        label: 'Cộng đồng thảo luận',
        values: { 'Plus 3 tháng': 'Đọc và viết', 'Pro 12 tháng': 'Đọc và viết' },
      },
      {
        label: 'Báo cáo phân tích chi tiết',
        values: { 'Plus 3 tháng': true, 'Pro 12 tháng': true },
      },
      {
        label: 'Xuất PDF hồ sơ nghề nghiệp',
        values: { 'Plus 3 tháng': true, 'Pro 12 tháng': true },
      },
      {
        label: 'Mentor 1-1',
        values: { 'Plus 3 tháng': '2 buổi/tháng', 'Pro 12 tháng': '4 buổi/tháng' },
      },
    ],
    stats: [
      {
        label: 'Doanh thu gói dài hạn (tháng)',
        value: '1,452,535,200 VND',
        color: 'bg-emerald-100 text-emerald-600',
      },
      {
        label: 'Tổng thuê bao dài hạn',
        value: '1,869',
        color: 'bg-indigo-100 text-indigo-600',
      },
      {
        label: 'Tỷ lệ chọn gói 3 tháng',
        value: '71.8%',
        color: 'bg-amber-100 text-amber-600',
      },
      {
        label: 'Tỷ lệ gia hạn sau 12 tháng',
        value: '64.5%',
        color: 'bg-violet-100 text-violet-600',
      },
    ],
  },
  business: {
    subtitle:
      'Quản lý gói doanh nghiệp duy nhất: dành cho công ty triển khai toàn diện AI tư vấn nghề nghiệp nội bộ.',
    plans: [
      {
        tier: 'Enterprise',
        name: 'Gói Doanh nghiệp',
        price: 8990000,
        period: 'tháng',
        badge: 'Toàn diện',
        color: 'text-rose-700',
        bgGradient: 'from-rose-50 to-orange-50',
        icon: Building2,
        iconBg: 'bg-rose-500',
        subscribers: 219,
        subscribersLabel: 'doanh nghiệp',
        revenue: '1,968,810,000',
        popular: true,
        active: true,
        locked: false,
        description:
          'Áp dụng cho tổ chức cần quản trị kỹ năng nhân sự, lộ trình nghề nghiệp và báo cáo tập trung.',
        tableBadgeClass: 'bg-rose-100 text-rose-700',
        tablePriceClass: 'text-rose-700',
      },
    ],
    features: [
      {
        label: 'Số lượng tài khoản nhân sự',
        values: { 'Gói Doanh nghiệp': 'Không giới hạn' },
      },
      {
        label: 'Bài test năng lực & tính cách theo phòng ban',
        values: { 'Gói Doanh nghiệp': 'Không giới hạn' },
      },
      {
        label: 'Dashboard phân tích kỹ năng đội ngũ',
        values: { 'Gói Doanh nghiệp': true },
      },
      {
        label: 'AI gợi ý lộ trình upskill theo vị trí',
        values: { 'Gói Doanh nghiệp': true },
      },
      {
        label: 'Theo dõi KPI học tập theo team',
        values: { 'Gói Doanh nghiệp': true },
      },
      {
        label: 'Tích hợp ATS/LMS',
        values: { 'Gói Doanh nghiệp': 'Không giới hạn' },
      },
      {
        label: 'SSO + phân quyền theo phòng ban',
        values: { 'Gói Doanh nghiệp': true },
      },
      {
        label: 'API dữ liệu báo cáo',
        values: { 'Gói Doanh nghiệp': 'Nâng cao' },
      },
      {
        label: 'Chuyên gia triển khai riêng',
        values: { 'Gói Doanh nghiệp': true },
      },
    ],
    stats: [
      {
        label: 'Doanh thu gói doanh nghiệp (tháng)',
        value: '1,968,810,000 VND',
        color: 'bg-emerald-100 text-emerald-700',
      },
      { label: 'Số doanh nghiệp đang dùng', value: '219', color: 'bg-sky-100 text-sky-700' },
      {
        label: 'Tỷ lệ gia hạn hằng năm',
        value: '91.3%',
        color: 'bg-teal-100 text-teal-700',
      },
      {
        label: 'NPS doanh nghiệp',
        value: '61',
        color: 'bg-rose-100 text-rose-700',
      },
    ],
  },
};

/* -- component ------------------------------------------------------------- */

export default function AdminPlansPage() {
  const [audience, setAudience] = useState<PlanAudience>('individual_monthly');
  const [plansByAudience, setPlansByAudience] = useState<Record<PlanAudience, PlanData[]>>({
    individual_monthly: planConfigs.individual_monthly.plans,
    individual_multi: planConfigs.individual_multi.plans,
    business: planConfigs.business.plans,
  });
  const [message, setMessage] = useState('');
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [detailPlan, setDetailPlan] = useState<string | null>(null);

  const config = planConfigs[audience];
  const plans = plansByAudience[audience];
  const priceRowLabel = audience === 'individual_monthly' ? 'Giá hàng tháng' : 'Giá gói';

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  const resetDrawers = () => {
    setEditingPlan(null);
    setDetailPlan(null);
    setEditPrice('');
    setEditDesc('');
  };

  const getFeatureValue = (feature: PlanFeature, plan: PlanData): FeatureValue => {
    return feature.values[plan.name] ?? feature.values[plan.tier] ?? false;
  };

  const handleToggleActive = (tier: string) => {
    const currentPlan = plans.find((p) => p.tier === tier);
    if (!currentPlan) return;

    if (currentPlan.locked) {
      flash(`Không thể tắt gói ${currentPlan.name} vì đây là gói mặc định.`);
      return;
    }

    setPlansByAudience((prev) => ({
      ...prev,
      [audience]: prev[audience].map((p) => (p.tier === tier ? { ...p, active: !p.active } : p)),
    }));
    flash(`Đã ${currentPlan.active ? 'tắt' : 'bật'} gói ${currentPlan.name}`);
  };

  const startEdit = (tier: string) => {
    const plan = plans.find((p) => p.tier === tier);
    if (!plan) return;
    setEditingPlan(tier);
    setEditPrice(plan.price.toString());
    setEditDesc(plan.description);
  };

  const saveEdit = () => {
    if (!editingPlan) return;
    const price = parseInt(editPrice, 10);
    if (isNaN(price) || price < 0) {
      flash('Giá không hợp lệ');
      return;
    }

    const selectedPlan = plans.find((p) => p.tier === editingPlan);
    setPlansByAudience((prev) => ({
      ...prev,
      [audience]: prev[audience].map((p) =>
        p.tier === editingPlan ? { ...p, price, description: editDesc } : p,
      ),
    }));

    flash(`Đã cập nhật gói ${selectedPlan?.name ?? editingPlan}`);
    setEditingPlan(null);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + ' VND';
  };

  return (
    <div className="max-w-6xl">
      <AdminSectionHeader title="Gói dịch vụ" subtitle={config.subtitle} />

      <div className="mb-4 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setAudience('individual_monthly');
            setMessage('');
            resetDrawers();
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
            audience === 'individual_monthly'
              ? 'bg-violet-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <UserRound className="h-4 w-4" />
          Cá nhân từng tháng
        </button>
        <button
          type="button"
          onClick={() => {
            setAudience('individual_multi');
            setMessage('');
            resetDrawers();
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
            audience === 'individual_multi'
              ? 'bg-violet-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <Zap className="h-4 w-4" />
          Cá nhân nhiều tháng
        </button>
        <button
          type="button"
          onClick={() => {
            setAudience('business');
            setMessage('');
            resetDrawers();
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
            audience === 'business'
              ? 'bg-violet-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <Building2 className="h-4 w-4" />
          Doanh nghiệp
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((s) => (
          <article
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="mb-2 text-xs text-slate-500">{s.label}</p>
            <div className={`rounded-lg px-3 py-2 text-2xl font-bold ${s.color}`}>{s.value}</div>
          </article>
        ))}
      </div>

      <div
        className={cn(
          'mt-6 grid gap-5',
          plans.length === 1 && 'max-w-xl grid-cols-1',
          plans.length === 2 && 'lg:grid-cols-2',
          plans.length >= 3 && 'lg:grid-cols-3',
        )}
      >
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={cn(
              'relative flex flex-col rounded-2xl border-2 bg-linear-to-b p-5 shadow-sm transition',
              plan.popular ? 'border-amber-300' : 'border-slate-200',
              plan.bgGradient,
              !plan.active && 'opacity-50',
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-white shadow">
                Phổ biến nhất
              </div>
            )}

            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-white',
                  plan.iconBg,
                )}
              >
                <plan.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn('text-lg font-bold', plan.color)}>{plan.name}</p>
                <span className="text-xs text-slate-500">{plan.badge}</span>
              </div>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatPrice(plan.price)}
              </span>
              {plan.price > 0 && (
                <span className="ml-1 text-sm text-slate-500">/ {plan.period}</span>
              )}
            </div>
            <p className="mb-5 text-sm text-slate-500">{plan.description}</p>

            <div className="mb-5 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                {plan.subscribers.toLocaleString('vi-VN')} {plan.subscribersLabel}
              </span>
            </div>

            <div className="mb-5 flex-1 space-y-2">
              {config.features.slice(0, 5).map((f) => {
                const val = getFeatureValue(f, plan);
                const enabled = val !== false;
                return (
                  <div key={f.label} className="flex items-start gap-2 text-sm">
                    {enabled ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>
                      {f.label}
                      {typeof val === 'string' && (
                        <span className="ml-1 text-xs font-medium text-slate-500">({val})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDetailPlan(plan.tier)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                Chi tiết
              </button>
              <button
                type="button"
                onClick={() => startEdit(plan.tier)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-500 py-2 text-sm font-semibold text-white hover:bg-violet-600"
              >
                <Edit3 className="h-4 w-4" />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(plan.tier)}
                title={plan.active ? 'Tắt gói' : 'Bật gói'}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-500 hover:bg-slate-50"
              >
                {plan.active ? (
                  <ToggleRight className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <AdminPanel title="So sánh tính năng chi tiết" className="mt-6">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Tính năng</th>
                {plans.map((plan) => (
                  <th key={plan.tier} className="px-4 py-3 text-center">
                    <span className={cn('rounded-full px-2 py-0.5', plan.tableBadgeClass)}>
                      {plan.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.features.map((feature) => (
                <tr key={feature.label} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-700">{feature.label}</td>
                  {plans.map((plan) => (
                    <FeatureCell
                      key={`${feature.label}-${plan.tier}`}
                      value={getFeatureValue(feature, plan)}
                    />
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-slate-900">{priceRowLabel}</td>
                {plans.map((plan) => (
                  <td key={plan.tier} className={cn('px-4 py-3 text-center', plan.tablePriceClass)}>
                    {formatPrice(plan.price)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </AdminPanel>

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </p>
      )}

      {editingPlan && (
        <Overlay onClose={() => setEditingPlan(null)}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Chỉnh sửa gói {plans.find((p) => p.tier === editingPlan)?.name ?? editingPlan}
            </h2>
            <button
              type="button"
              onClick={() => setEditingPlan(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Giá (VND / tháng)
            </label>
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              min={0}
              step={1000}
              className="mb-4 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
              disabled={plans.find((p) => p.tier === editingPlan)?.locked ?? false}
            />

            <label className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
            />

            <button
              type="button"
              onClick={saveEdit}
              className="w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-600"
            >
              Lưu thay đổi
            </button>
          </div>
        </Overlay>
      )}

      {detailPlan &&
        (() => {
          const plan = plans.find((p) => p.tier === detailPlan);
          if (!plan) return null;
          return (
            <Overlay onClose={() => setDetailPlan(null)}>
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Chi tiết gói {plan.name}</h2>
                <button
                  type="button"
                  onClick={() => setDetailPlan(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl text-white',
                      plan.iconBg,
                    )}
                  >
                    <plan.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn('text-xl font-bold', plan.color)}>{plan.name}</p>
                    <p className="text-sm text-slate-500">{plan.badge}</p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-slate-600">{plan.description}</p>

                <div className="mb-4 space-y-3">
                  <InfoRow
                    label="Giá:"
                    value={formatPrice(plan.price) + (plan.price > 0 ? ' / tháng' : '')}
                  />
                  <InfoRow
                    label="Đăng ký:"
                    value={`${plan.subscribers.toLocaleString('vi-VN')} ${plan.subscribersLabel}`}
                  />
                  <InfoRow label="Doanh thu:" value={plan.revenue + ' VND'} />
                  <InfoRow
                    label="Trạng thái:"
                    value={plan.active ? 'Đang hoạt động' : 'Đã tắt'}
                    valueClass={plan.active ? 'text-emerald-600' : 'text-rose-500'}
                  />
                </div>

                <h3 className="mb-2 text-sm font-bold text-slate-800">Tính năng bao gồm:</h3>
                <div className="space-y-2">
                  {config.features.map((feature) => {
                    const val = getFeatureValue(feature, plan);
                    const enabled = val !== false;
                    return (
                      <div key={feature.label} className="flex items-start gap-2 text-sm">
                        {enabled ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>
                          {feature.label}
                          {typeof val === 'string' && (
                            <span className="ml-1 text-xs font-medium text-slate-500">({val})</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailPlan(null);
                      startEdit(plan.tier);
                    }}
                    className="flex-1 rounded-xl bg-violet-500 py-2 text-sm font-semibold text-white hover:bg-violet-600"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailPlan(null);
                      handleToggleActive(plan.tier);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {plan.active ? 'Tắt gói' : 'Bật gói'}
                  </button>
                </div>
              </div>
            </Overlay>
          );
        })()}
    </div>
  );
}

/* -- helpers --------------------------------------------------------------- */

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === false) {
    return (
      <td className="px-4 py-3 text-center">
        <X className="mx-auto h-4 w-4 text-slate-300" />
      </td>
    );
  }
  if (value === true) {
    return (
      <td className="px-4 py-3 text-center">
        <Check className="mx-auto h-4 w-4 text-emerald-500" />
      </td>
    );
  }
  return <td className="px-4 py-3 text-center text-xs font-medium text-slate-600">{value}</td>;
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Đóng"
      />
      <aside className="relative z-10 flex h-full w-96 flex-col bg-white shadow-xl">
        {children}
      </aside>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={cn('font-semibold text-slate-700', valueClass)}>{value}</span>
    </div>
  );
}
