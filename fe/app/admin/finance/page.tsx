'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import {
  adminService,
  type AdminFinancePayment,
  type AdminFinanceSummary,
} from '@/lib/admin.service';
import { authStorage } from '@/lib/auth-storage';
import { cn } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  LucideIcon,
  Search,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type FinanceRange = 'month' | 'quarter' | 'year';

const rangeLabels: Record<FinanceRange, string> = {
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
};

export default function AdminFinancePage() {
  const [range, setRange] = useState<FinanceRange>('month');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [payments, setPayments] = useState<AdminFinancePayment[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFinance = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const [summaryRes, paymentsRes] = await Promise.all([
        adminService.getFinanceSummary(token, range),
        adminService.getFinancePayments(token, {
          page,
          limit: 10,
          status,
          plan,
          search,
        }),
      ]);
      setSummary(summaryRes);
      setPayments(paymentsRes.payments);
      setTotalPages(paymentsRes.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu tài chính');
    } finally {
      setIsLoading(false);
    }
  }, [page, plan, range, search, status]);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  const stats = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Doanh thu',
        value: formatMoney(summary.totalRevenue, summary.currency),
        delta: formatDelta(summary.revenueDelta),
        trend: summary.revenueDelta >= 0 ? 'up' as const : 'down' as const,
        icon: DollarSign,
        color: 'bg-emerald-500',
      },
      {
        label: 'Giao dịch',
        value: summary.transactionCount.toLocaleString('vi-VN'),
        delta: formatDelta(summary.transactionDelta),
        trend: summary.transactionDelta >= 0 ? 'up' as const : 'down' as const,
        icon: CreditCard,
        color: 'bg-violet-500',
      },
      {
        label: 'Số dư hệ thống',
        value: formatMoney(summary.systemBalance, summary.currency),
        icon: Wallet,
        color: 'bg-sky-500',
      },
    ];
  }, [summary]);

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Tài chính"
        subtitle="Theo dõi doanh thu gói AI, booking mentor và trạng thái thanh toán."
        right={
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            <Download className="h-4 w-4" /> Xuất báo cáo
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(rangeLabels) as FinanceRange[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setRange(item);
              setPage(1);
            }}
            className={cn(
              'rounded-xl border px-4 py-2 text-xs font-bold transition',
              range === item
                ? 'border-violet-500 bg-violet-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {rangeLabels[item]}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <FinanceStatCard key={item.label} {...item} />
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      <AdminPanel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {['all', 'Plus', 'Business'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setPlan(item);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-xs font-bold transition',
                  plan === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {item === 'all' ? 'Tất cả' : item}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="pending">Đang chờ</option>
              <option value="failed">Thất bại</option>
              <option value="cancelled">Đã hủy</option>
              <option value="refunded">Hoàn tiền</option>
            </select>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSearch(searchDraft);
                    setPage(1);
                  }
                }}
                className="h-10 w-64 rounded-xl border border-slate-200 pl-10 text-sm outline-none focus:border-violet-400"
                placeholder="Tìm mã giao dịch, email..."
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch(searchDraft);
                setPage(1);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <Filter className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4 text-left">Mã giao dịch</th>
                <th className="px-6 py-4 text-left">Người dùng</th>
                <th className="px-6 py-4 text-left">Gói / Mục đích</th>
                <th className="px-6 py-4 text-left">Số tiền</th>
                <th className="px-6 py-4 text-left">Ngày</th>
                <th className="px-6 py-4 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                    Chưa có giao dịch phù hợp.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                      {payment.checkoutReference || payment.id}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{payment.userName}</p>
                      <p className="text-xs text-slate-500">{payment.userEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{payment.planName}</p>
                      <p className="text-xs text-slate-500">{purposeLabel(payment.purpose)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {formatMoney(payment.totalAmount ?? payment.amount, payment.currency)}
                      </p>
                      {Number(payment.creditAppliedAmount || 0) > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Ví Edumee: {formatMoney(payment.creditAppliedAmount || 0, payment.currency)} · Cổng ngoài:{' '}
                          {formatMoney(payment.amount, payment.currency)}
                        </p>
                      ) : null}
                      {payment.status === 'refunded' && Number(payment.refundedAmount || 0) > 0 ? (
                        <p className="mt-1 text-xs font-semibold text-violet-600">
                          Đã hoàn {formatMoney(payment.refundedAmount || 0, payment.currency)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {payment.status === 'refunded' ? 'Hoàn lúc ' : ''}
                      {formatDate(payment.eventDate || payment.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span>Trang {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}

function FinanceStatCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
  icon: LucideIcon;
  color: string;
}) {
  return (
    <AdminPanel className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', color)}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold',
              trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
            )}
          >
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </div>
      <p className="mb-1 text-xs font-bold text-slate-500">{label}</p>
      <h3 className="text-2xl font-black tracking-tight text-slate-900">{value}</h3>
    </AdminPanel>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    paid: { label: 'Thành công', className: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-700' },
    failed: { label: 'Thất bại', className: 'bg-rose-100 text-rose-700' },
    cancelled: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600' },
    refunded: { label: 'Hoàn tiền', className: 'bg-violet-100 text-violet-700' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-bold', config.className)}>
      {config.label}
    </span>
  );
}

function formatMoney(amount: number, currency: string) {
  if (currency?.toUpperCase() === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function purposeLabel(purpose: string) {
  if (purpose === 'ai_plan') return 'Gói AI';
  if (purpose === 'mentor_booking') return 'Booking mentor';
  return purpose;
}
