'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Check,
  Crown,
  Edit3,
  Eye,
  Star,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

/* ── types & data ─────────────────────────────── */

type PlanTier = 'Free' | 'Plus' | 'Pro';

interface PlanFeature {
  label: string;
  free: boolean | string;
  plus: boolean | string;
  pro: boolean | string;
}

interface PlanData {
  tier: PlanTier;
  name: string;
  price: number;
  period: 'tháng';
  badge: string;
  color: string;
  bgGradient: string;
  icon: typeof Star;
  subscribers: number;
  revenue: string;
  popular: boolean;
  active: boolean;
  description: string;
}

const initialPlans: PlanData[] = [
  {
    tier: 'Free',
    name: 'Free',
    price: 0,
    period: 'tháng',
    badge: 'Cơ bản',
    color: 'text-slate-600',
    bgGradient: 'from-slate-50 to-slate-100',
    icon: Star,
    subscribers: 8742,
    revenue: '0',
    popular: false,
    active: true,
    description: 'Dùng thử miễn phí, truy cập các tính năng cơ bản của Career AI.',
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
    subscribers: 2847,
    revenue: '281,853,000',
    popular: true,
    active: true,
    description: 'Mở khóa bài test nâng cao, lộ trình học tập và kết nối mentor.',
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
    subscribers: 864,
    revenue: '215,136,000',
    popular: false,
    active: true,
    description: 'Toàn bộ tính năng. AI cá nhân hóa, mentor 1-1, chứng chỉ.',
  },
];

const featureList: PlanFeature[] = [
  {
    label: 'Bài test tính cách (Holland, MBTI)',
    free: '1 lần',
    plus: '3 lần',
    pro: '5 lần',
  },
  { label: 'Gợi ý nghề nghiệp AI', free: '1 nghề', plus: '3 nghề', pro: '5 nghề' },
  { label: 'Lộ trình học tập cá nhân', free: false, plus: true, pro: true },
  { label: 'So sánh nghề nghiệp', free: false, plus: '3 nghề', pro: '10 nghề' },
  { label: 'Mô phỏng nghề nghiệp', free: false, plus: false, pro: true },
  { label: 'Cộng đồng thảo luận', free: 'Đọc', plus: 'Đọc và viết', pro: 'Đọc và viết' },
  { label: 'Báo cáo phân tích chi tiết', free: false, plus: true, pro: true },
  { label: 'Xuất PDF hồ sơ nghề nghiệp', free: false, plus: false, pro: true },
  { label: 'Chứng chỉ hoàn thành lộ trình', free: false, plus: false, pro: true },

];

const planStats = [
  {
    label: 'Tổng doanh thu (tháng)',
    value: '496,989,000 VND',
    color: 'bg-emerald-100 text-emerald-600',
  },
  { label: 'Tổng người đăng ký', value: '12,453', color: 'bg-indigo-100 text-indigo-600' },
  { label: 'Tỷ lệ chuyển đổi Free → Plus', value: '18.4%', color: 'bg-amber-100 text-amber-600' },
  { label: 'Tỷ lệ chuyển đổi Plus → Pro', value: '9.2%', color: 'bg-violet-100 text-violet-600' },
];

/* ── component ────────────────────────────────── */

export default function AdminPlansPage() {
  const [plans, setPlans] = useState(initialPlans);
  const [message, setMessage] = useState('');
  const [editingPlan, setEditingPlan] = useState<PlanTier | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [detailPlan, setDetailPlan] = useState<PlanTier | null>(null);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  const handleToggleActive = (tier: PlanTier) => {
    if (tier === 'Free') {
      flash('Không thể tắt gói Free vì đây là gói mặc định cho mọi người dùng');
      return;
    }
    setPlans((prev) => prev.map((p) => (p.tier === tier ? { ...p, active: !p.active } : p)));
    const plan = plans.find((p) => p.tier === tier);
    flash(`Đã ${plan?.active ? 'tắt' : 'bật'} gói ${tier}`);
  };

  const startEdit = (tier: PlanTier) => {
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
    setPlans((prev) =>
      prev.map((p) => (p.tier === editingPlan ? { ...p, price, description: editDesc } : p)),
    );
    flash(`Đã cập nhật gói ${editingPlan}`);
    setEditingPlan(null);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + ' VND';
  };

  return (
    <div className="max-w-6xl">
      <AdminSectionHeader
        title="Gói dịch vụ"
        subtitle="Quản lý các gói Free, Plus và Pro: định giá, tính năng và trạng thái."
      />

      {/* stats */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {planStats.map((s) => (
          <article
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="mb-2 text-xs text-slate-500">{s.label}</p>
            <div className={`rounded-lg px-3 py-2 text-2xl font-bold ${s.color}`}>{s.value}</div>
          </article>
        ))}
      </div>

      {/* plan cards */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
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
            {/* popular badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-white shadow">
                Phổ biến nhất
              </div>
            )}

            {/* header */}
            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-white',
                  plan.tier === 'Free' && 'bg-slate-500',
                  plan.tier === 'Plus' && 'bg-amber-500',
                  plan.tier === 'Pro' && 'bg-violet-500',
                )}
              >
                <plan.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn('text-lg font-bold', plan.color)}>{plan.name}</p>
                <span className="text-xs text-slate-500">{plan.badge}</span>
              </div>
            </div>

            {/* price */}
            <div className="mb-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatPrice(plan.price)}
              </span>
              {plan.price > 0 && (
                <span className="ml-1 text-sm text-slate-500">/ {plan.period}</span>
              )}
            </div>
            <p className="mb-5 text-sm text-slate-500">{plan.description}</p>

            {/* subscriber count */}
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                {plan.subscribers.toLocaleString('vi-VN')} người dùng
              </span>
            </div>

            {/* quick features */}
            <div className="mb-5 flex-1 space-y-2">
              {featureList.slice(0, 5).map((f) => {
                const val = plan.tier === 'Free' ? f.free : plan.tier === 'Plus' ? f.plus : f.pro;
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

            {/* actions */}
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

      {/* feature comparison table */}
      <AdminPanel title="So sánh tính năng chi tiết" className="mt-6">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Tính năng</th>
                <th className="px-4 py-3 text-center">Free</th>
                <th className="px-4 py-3 text-center">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Plus</span>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
                    Pro
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {featureList.map((f) => (
                <tr key={f.label} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-700">{f.label}</td>
                  <FeatureCell value={f.free} />
                  <FeatureCell value={f.plus} />
                  <FeatureCell value={f.pro} />
                </tr>
              ))}
              {/* price row */}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-slate-900">Giá hàng tháng</td>
                <td className="px-4 py-3 text-center text-slate-600">Miễn phí</td>
                <td className="px-4 py-3 text-center text-amber-700">
                  {formatPrice(plans.find((p) => p.tier === 'Plus')?.price ?? 99000)}
                </td>
                <td className="px-4 py-3 text-center text-violet-700">
                  {formatPrice(plans.find((p) => p.tier === 'Pro')?.price ?? 249000)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminPanel>

      {/* toast */}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </p>
      )}

      {/* ── edit drawer ── */}
      {editingPlan && (
        <Overlay onClose={() => setEditingPlan(null)}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa gói {editingPlan}</h2>
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
              disabled={editingPlan === 'Free'}
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

      {/* ── detail drawer ── */}
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
                {/* plan icon + name */}
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl text-white',
                      plan.tier === 'Free' && 'bg-slate-500',
                      plan.tier === 'Plus' && 'bg-amber-500',
                      plan.tier === 'Pro' && 'bg-violet-500',
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
                  <InfoRow label="Người dùng:" value={plan.subscribers.toLocaleString('vi-VN')} />
                  <InfoRow label="Doanh thu:" value={plan.revenue + ' VND'} />
                  <InfoRow
                    label="Trạng thái:"
                    value={plan.active ? 'Đang hoạt động' : 'Đã tắt'}
                    valueClass={plan.active ? 'text-emerald-600' : 'text-rose-500'}
                  />
                </div>

                <h3 className="mb-2 text-sm font-bold text-slate-800">Tính năng bao gồm:</h3>
                <div className="space-y-2">
                  {featureList.map((f) => {
                    const val =
                      plan.tier === 'Free' ? f.free : plan.tier === 'Plus' ? f.plus : f.pro;
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

/* ── helpers ── */

function FeatureCell({ value }: { value: boolean | string }) {
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
