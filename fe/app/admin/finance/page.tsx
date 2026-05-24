'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import {
  adminService,
  type AdminFinanceFeeSettlement,
  type AdminFinanceFeesSummary,
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
  HandCoins,
  Percent,
  ReceiptText,
  Save,
  Search,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type FinanceRange = 'month' | 'quarter' | 'year';
type FinanceTab = 'transactions' | 'fees';

const rangeLabels: Record<FinanceRange, string> = {
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
};

const tabLabels: Record<FinanceTab, string> = {
  transactions: 'Giao dịch',
  fees: 'Quản lý phí',
};

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('transactions');
  const [range, setRange] = useState<FinanceRange>('month');

  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [payments, setPayments] = useState<AdminFinancePayment[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const [feeStatus, setFeeStatus] = useState('all');
  const [feeSearchDraft, setFeeSearchDraft] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [feePage, setFeePage] = useState(1);
  const [feeSummary, setFeeSummary] = useState<AdminFinanceFeesSummary | null>(null);
  const [settlements, setSettlements] = useState<AdminFinanceFeeSettlement[]>([]);
  const [feeTotalPages, setFeeTotalPages] = useState(1);
  const [feePercentDraft, setFeePercentDraft] = useState('15');
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
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
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu giao dịch');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [page, plan, range, search, status]);

  const fetchFees = useCallback(async () => {
    setIsLoadingFees(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const [summaryRes, settlementsRes] = await Promise.all([
        adminService.getFinanceFeesSummary(token, range),
        adminService.getFinanceFeeSettlements(token, {
          page: feePage,
          limit: 10,
          status: feeStatus,
          search: feeSearch,
        }),
      ]);
      setFeeSummary(summaryRes);
      setFeePercentDraft(String(summaryRes.config.mentorPlatformFeePercent));
      setSettlements(settlementsRes.settlements);
      setFeeTotalPages(settlementsRes.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phí mentor');
    } finally {
      setIsLoadingFees(false);
    }
  }, [feePage, feeSearch, feeStatus, range]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      void fetchTransactions();
    } else {
      void fetchFees();
    }
  }, [activeTab, fetchFees, fetchTransactions]);

  const transactionStats = useMemo(() => {
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

  const feeStats = useMemo(() => {
    if (!feeSummary) return [];
    return [
      {
        label: 'Doanh thu mentor',
        value: formatMoney(feeSummary.grossRevenue, feeSummary.currency),
        icon: ReceiptText,
        color: 'bg-sky-500',
      },
      {
        label: 'Phí nền tảng',
        value: formatMoney(feeSummary.platformFeeAmount, feeSummary.currency),
        icon: Percent,
        color: 'bg-violet-500',
      },
      {
        label: 'Mentor nhận',
        value: formatMoney(feeSummary.mentorPayoutAmount, feeSummary.currency),
        icon: HandCoins,
        color: 'bg-emerald-500',
      },
      {
        label: 'Sẵn sàng chi trả',
        value: formatMoney(feeSummary.readyPayoutAmount, feeSummary.currency),
        icon: Wallet,
        color: 'bg-amber-500',
      },
    ];
  }, [feeSummary]);

  const handleSaveFeeConfig = async () => {
    const percent = Number(feePercentDraft);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      toast.error('Tỷ lệ phí phải nằm trong khoảng 0-100%.');
      return;
    }

    setIsSavingFee(true);
    try {
      const token = authStorage.getAccessToken();
      await adminService.updateMentorPlatformFeeConfig(token, percent);
      toast.success('Đã cập nhật tỷ lệ phí mentor.');
      await fetchFees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật tỷ lệ phí');
    } finally {
      setIsSavingFee(false);
    }
  };

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý giao dịch"
        subtitle="Theo dõi giao dịch thanh toán, phí nền tảng và khoản mentor nhận."
        right={
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            <Download className="h-4 w-4" /> Xuất báo cáo
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(Object.keys(tabLabels) as FinanceTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveTab(item)}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-bold transition',
                activeTab === item ? 'bg-violet-500 text-white' : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(rangeLabels) as FinanceRange[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setRange(item);
                setPage(1);
                setFeePage(1);
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
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      {activeTab === 'transactions' ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {transactionStats.map((item) => (
              <FinanceStatCard key={item.label} {...item} />
            ))}
          </div>
          <TransactionPanel
            isLoading={isLoadingTransactions}
            payments={payments}
            page={page}
            totalPages={totalPages}
            plan={plan}
            status={status}
            searchDraft={searchDraft}
            onPlanChange={(value) => {
              setPlan(value);
              setPage(1);
            }}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            onSearchDraftChange={setSearchDraft}
            onSearch={() => {
              setSearch(searchDraft);
              setPage(1);
            }}
            onPageChange={setPage}
          />
        </>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {feeStats.map((item) => (
              <FinanceStatCard key={item.label} {...item} />
            ))}
          </div>
          <FeeConfigPanel
            summary={feeSummary}
            feePercentDraft={feePercentDraft}
            isSaving={isSavingFee}
            onDraftChange={setFeePercentDraft}
            onSave={handleSaveFeeConfig}
          />
          <FeeSettlementPanel
            isLoading={isLoadingFees}
            settlements={settlements}
            page={feePage}
            totalPages={feeTotalPages}
            status={feeStatus}
            searchDraft={feeSearchDraft}
            onStatusChange={(value) => {
              setFeeStatus(value);
              setFeePage(1);
            }}
            onSearchDraftChange={setFeeSearchDraft}
            onSearch={() => {
              setFeeSearch(feeSearchDraft);
              setFeePage(1);
            }}
            onPageChange={setFeePage}
          />
        </>
      )}
    </div>
  );
}

function TransactionPanel({
  isLoading,
  payments,
  page,
  totalPages,
  plan,
  status,
  searchDraft,
  onPlanChange,
  onStatusChange,
  onSearchDraftChange,
  onSearch,
  onPageChange,
}: {
  isLoading: boolean;
  payments: AdminFinancePayment[];
  page: number;
  totalPages: number;
  plan: string;
  status: string;
  searchDraft: string;
  onPlanChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (value: number) => void;
}) {
  return (
    <AdminPanel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {['all', 'Plus', 'Business'].map((item) => (
            <button
              key={item}
              onClick={() => onPlanChange(item)}
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
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="paid">Đã thanh toán</option>
            <option value="pending">Đang chờ</option>
            <option value="failed">Thất bại</option>
            <option value="cancelled">Đã hủy</option>
            <option value="refunded">Hoàn tiền</option>
          </select>
          <SearchBox
            value={searchDraft}
            placeholder="Tìm mã giao dịch, email..."
            onChange={onSearchDraftChange}
            onSearch={onSearch}
          />
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

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </AdminPanel>
  );
}

function FeeConfigPanel({
  summary,
  feePercentDraft,
  isSaving,
  onDraftChange,
  onSave,
}: {
  summary: AdminFinanceFeesSummary | null;
  feePercentDraft: string;
  isSaving: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <AdminPanel className="mb-6 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900">Tỷ lệ chia phí mentor</p>
          <p className="mt-1 text-sm text-slate-500">
            Áp dụng cho giao dịch mentor mới. Giao dịch đã tạo giữ nguyên tỷ lệ đã snapshot.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={feePercentDraft}
              onChange={(event) => onDraftChange(event.target.value)}
              className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-right text-sm font-bold text-slate-900 outline-none focus:border-violet-400"
            />
            <Percent className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Lưu tỷ lệ
          </button>
        </div>
      </div>
      {summary ? (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Nền tảng</p>
            <p className="mt-1 text-lg font-black text-slate-900">{summary.config.mentorPlatformFeePercent}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Mentor nhận</p>
            <p className="mt-1 text-lg font-black text-slate-900">{summary.config.mentorPayoutPercent}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Settlement sẵn sàng</p>
            <p className="mt-1 text-lg font-black text-slate-900">{summary.readyCount}</p>
          </div>
        </div>
      ) : null}
    </AdminPanel>
  );
}

function FeeSettlementPanel({
  isLoading,
  settlements,
  page,
  totalPages,
  status,
  searchDraft,
  onStatusChange,
  onSearchDraftChange,
  onSearch,
  onPageChange,
}: {
  isLoading: boolean;
  settlements: AdminFinanceFeeSettlement[];
  page: number;
  totalPages: number;
  status: string;
  searchDraft: string;
  onStatusChange: (value: string) => void;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (value: number) => void;
}) {
  return (
    <AdminPanel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <p className="text-sm font-bold text-slate-900">Settlement mentor</p>
          <p className="mt-1 text-xs text-slate-500">Theo dõi phí nền tảng và khoản mentor được nhận.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả settlement</option>
            <option value="pending">Đang chờ</option>
            <option value="ready">Sẵn sàng chi trả</option>
            <option value="withheld">Tạm giữ</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
          <SearchBox
            value={searchDraft}
            placeholder="Tìm mentor, học viên, mã..."
            onChange={onSearchDraftChange}
            onSearch={onSearch}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4 text-left">Booking</th>
              <th className="px-6 py-4 text-left">Mentor</th>
              <th className="px-6 py-4 text-left">Học viên</th>
              <th className="px-6 py-4 text-left">Giá phiên</th>
              <th className="px-6 py-4 text-left">Phí nền tảng</th>
              <th className="px-6 py-4 text-left">Mentor nhận</th>
              <th className="px-6 py-4 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Đang tải dữ liệu phí mentor...
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Chưa có settlement phù hợp.
                </td>
              </tr>
            ) : (
              settlements.map((settlement) => (
                <tr key={settlement.paymentId} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-mono text-xs font-bold text-slate-500">
                      {settlement.checkoutReference || settlement.paymentId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(settlement.sessionDate || settlement.paidAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{settlement.mentorName}</p>
                    <p className="text-xs text-slate-500">{settlement.mentorEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{settlement.menteeName}</p>
                    <p className="text-xs text-slate-500">{settlement.menteeEmail}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {formatMoney(settlement.settlementBaseAmount, settlement.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-violet-700">{formatMoney(settlement.platformFeeAmount, settlement.currency)}</p>
                    <p className="text-xs text-slate-500">{formatPercent(settlement.platformFeeRate)}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-700">
                    {formatMoney(settlement.mentorPayoutAmount, settlement.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <SettlementBadge status={settlement.settlementStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </AdminPanel>
  );
}

function SearchBox({
  value,
  placeholder,
  onChange,
  onSearch,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch();
          }}
          className="h-10 w-64 rounded-xl border border-slate-200 pl-10 text-sm outline-none focus:border-violet-400"
          placeholder={placeholder}
        />
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
      >
        <Filter className="h-4 w-4 text-slate-500" />
      </button>
    </>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
      <span>
        Trang {page} / {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-50"
        >
          Sau
        </button>
      </div>
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
  return <span className={cn('rounded-full px-3 py-1 text-xs font-bold', config.className)}>{config.label}</span>;
}

function SettlementBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'Đang chờ', className: 'bg-amber-100 text-amber-700' },
    ready: { label: 'Sẵn sàng chi trả', className: 'bg-emerald-100 text-emerald-700' },
    withheld: { label: 'Tạm giữ', className: 'bg-rose-100 text-rose-700' },
    refunded: { label: 'Đã hoàn tiền', className: 'bg-violet-100 text-violet-700' },
  };
  const config = configs[status] || configs.pending;
  return <span className={cn('rounded-full px-3 py-1 text-xs font-bold', config.className)}>{config.label}</span>;
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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value * 100)}%`;
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
