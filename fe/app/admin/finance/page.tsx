'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import {
  adminService,
  type AdminFinanceFeeSettlement,
  type AdminFinanceFeesSummary,
  type AdminFinancePayment,
  type AdminFinanceSummary,
  type AdminFinanceTransaction,
  type AdminWithdrawalRequest,
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
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type FinanceRange = 'month' | 'quarter' | 'year';
type FinanceTab = 'overview' | 'transactions' | 'payments' | 'fees' | 'withdrawals';

const rangeLabels: Record<FinanceRange, string> = {
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
};

const tabLabels: Record<FinanceTab, string> = {
  overview: 'Tổng quan',
  transactions: 'Sổ giao dịch',
  payments: 'Giao dịch',
  fees: 'Quản lý phí',
  withdrawals: 'Rút tiền',
};

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [range, setRange] = useState<FinanceRange>('month');
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminFinanceTransaction[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [eventType, setEventType] = useState('all');
  const [sourceType, setSourceType] = useState('all');
  const [transactionSearchDraft, setTransactionSearchDraft] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  const [sepayPayments, setSepayPayments] = useState<AdminFinancePayment[]>([]);
  const [sepayProvider, setSepayProvider] = useState('all');
  const [sepayStatus, setSepayStatus] = useState('all');
  const [sepayPurpose, setSepayPurpose] = useState('all');
  const [sepaySearchDraft, setSepaySearchDraft] = useState('');
  const [sepaySearch, setSepaySearch] = useState('');
  const [sepayPage, setSepayPage] = useState(1);
  const [sepayTotalPages, setSepayTotalPages] = useState(1);
  const [isLoadingSepay, setIsLoadingSepay] = useState(false);

  const [feeSummary, setFeeSummary] = useState<AdminFinanceFeesSummary | null>(null);
  const [settlements, setSettlements] = useState<AdminFinanceFeeSettlement[]>([]);
  const [feeStatus, setFeeStatus] = useState('all');
  const [feeSearchDraft, setFeeSearchDraft] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [feePage, setFeePage] = useState(1);
  const [feeTotalPages, setFeeTotalPages] = useState(1);
  const [feePercentDraft, setFeePercentDraft] = useState('15');
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isSavingFee, setIsSavingFee] = useState(false);

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState('all');
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  const fetchLedger = useCallback(async () => {
    setIsLoadingTransactions(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const isAiPlanRevenueFilter = eventType === 'ai_plan_revenue';
      const [summaryRes, transactionsRes] = await Promise.all([
        adminService.getFinanceSummary(token, range),
        adminService.getFinanceTransactions(token, {
          page: transactionPage,
          limit: 10,
          eventType: isAiPlanRevenueFilter ? 'payment_paid' : eventType,
          sourceType: isAiPlanRevenueFilter ? 'payment' : sourceType,
          purpose: isAiPlanRevenueFilter ? 'ai_plan' : undefined,
          search: transactionSearch,
        }),
      ]);
      setSummary(summaryRes);
      setTransactions(transactionsRes.transactions);
      setTransactionTotalPages(transactionsRes.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải sổ cái tài chính.');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [eventType, range, sourceType, transactionPage, transactionSearch]);

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
      setError(err instanceof Error ? err.message : 'Không thể tải settlement mentor.');
    } finally {
      setIsLoadingFees(false);
    }
  }, [feePage, feeSearch, feeStatus, range]);

  const fetchWithdrawals = useCallback(async () => {
    setIsLoadingWithdrawals(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const rows = await adminService.getWithdrawals(token, { status: withdrawalStatus });
      setWithdrawals(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải yêu cầu rút tiền.');
    } finally {
      setIsLoadingWithdrawals(false);
    }
  }, [withdrawalStatus]);

  const fetchPayments = useCallback(async () => {
    setIsLoadingSepay(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const result = await adminService.getFinancePayments(token, {
        page: sepayPage,
        limit: 10,
        provider: sepayProvider,
        status: sepayStatus,
        purpose: sepayPurpose,
        search: sepaySearch,
      });
      setSepayPayments(result.payments);
      setSepayTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải giao dịch thanh toán.');
    } finally {
      setIsLoadingSepay(false);
    }
  }, [sepayPage, sepayProvider, sepayPurpose, sepaySearch, sepayStatus]);

  useEffect(() => {
    if (activeTab === 'fees') {
      void fetchFees();
    } else if (activeTab === 'payments') {
      void fetchPayments();
    } else if (activeTab === 'withdrawals') {
      void fetchWithdrawals();
    } else {
      void fetchLedger();
    }
  }, [activeTab, fetchFees, fetchLedger, fetchPayments, fetchWithdrawals]);

  const stats = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Lợi nhuận EDUMEE',
        value: formatMoney(summary.netRevenue ?? summary.totalRevenue, summary.currency),
        delta: formatDelta(summary.revenueDelta),
        trend: summary.revenueDelta >= 0 ? ('up' as const) : ('down' as const),
        icon: DollarSign,
        color: 'bg-emerald-500',
      },
      {
        label: 'Tổng tiền thu vào',
        value: formatMoney(summary.grossCashIn ?? summary.systemBalance, summary.currency),
        icon: CreditCard,
        color: 'bg-violet-500',
      },
      {
        label: 'Khoản phải trả mentor',
        value: formatMoney(summary.mentorPayableBalance || 0, summary.currency),
        icon: Wallet,
        color: 'bg-sky-500',
      },
    ];
  }, [summary]);

  const feeStats = useMemo(() => {
    if (!feeSummary) return [];
    return [
      {
        label: 'Tổng tiền đã chốt',
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
        label: 'Số khoản sẵn sàng',
        value: feeSummary.readyCount.toLocaleString('vi-VN'),
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
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật tỷ lệ phí.');
    } finally {
      setIsSavingFee(false);
    }
  };

  const runWithdrawalAction = async (
    withdrawal: AdminWithdrawalRequest,
    action: 'approve' | 'reject' | 'mark-paid' | 'mark-failed',
  ) => {
    const token = authStorage.getAccessToken();
    setActionId(`${withdrawal.id}:${action}`);
    try {
      if (action === 'approve') await adminService.approveWithdrawal(token, withdrawal.id);
      if (action === 'reject') await adminService.rejectWithdrawal(token, withdrawal.id, 'Admin từ chối');
      if (action === 'mark-paid') await adminService.markWithdrawalPaid(token, withdrawal.id);
      if (action === 'mark-failed') await adminService.markWithdrawalFailed(token, withdrawal.id, 'Chuyển khoản thất bại');
      await fetchWithdrawals();
      await fetchLedger();
      toast.success('Đã cập nhật yêu cầu rút tiền.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật yêu cầu rút tiền.');
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý giao dịch và doanh thu"
        subtitle="Sổ cái tài chính là nguồn dữ liệu chính thức cho doanh thu, hoàn tiền, chốt settlement mentor và rút tiền."
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
                setTransactionPage(1);
                setFeePage(1);
                setSepayPage(1);
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

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      ) : null}

      {activeTab === 'overview' ? (
        <OverviewPanel summary={summary} stats={stats} isLoading={isLoadingTransactions} />
      ) : null}

      {activeTab === 'transactions' ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {stats.map((item) => (
              <FinanceStatCard key={item.label} {...item} />
            ))}
          </div>
          <TransactionPanel
            isLoading={isLoadingTransactions}
            transactions={transactions}
            page={transactionPage}
            totalPages={transactionTotalPages}
            eventType={eventType}
            sourceType={sourceType}
            searchDraft={transactionSearchDraft}
            onEventTypeChange={(value) => {
              setEventType(value);
              if (value === 'ai_plan_revenue') setSourceType('payment');
              setTransactionPage(1);
            }}
            onSourceTypeChange={(value) => {
              setSourceType(value);
              setTransactionPage(1);
            }}
            onSearchDraftChange={setTransactionSearchDraft}
            onSearch={() => {
              setTransactionSearch(transactionSearchDraft);
              setTransactionPage(1);
            }}
            onPageChange={setTransactionPage}
          />
        </>
      ) : null}

      {activeTab === 'payments' ? (
        <PaymentTransactionsPanel
          isLoading={isLoadingSepay}
          payments={sepayPayments}
          page={sepayPage}
          totalPages={sepayTotalPages}
          provider={sepayProvider}
          status={sepayStatus}
          purpose={sepayPurpose}
          onProviderChange={(value) => {
            setSepayProvider(value);
            setSepayPage(1);
          }}
          searchDraft={sepaySearchDraft}
          onStatusChange={(value) => {
            setSepayStatus(value);
            setSepayPage(1);
          }}
          onPurposeChange={(value) => {
            setSepayPurpose(value);
            setSepayPage(1);
          }}
          onSearchDraftChange={setSepaySearchDraft}
          onSearch={() => {
            setSepaySearch(sepaySearchDraft);
            setSepayPage(1);
          }}
          onPageChange={setSepayPage}
        />
      ) : null}

      {activeTab === 'fees' ? (
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
      ) : null}

      {activeTab === 'withdrawals' ? (
        <WithdrawalPanel
          isLoading={isLoadingWithdrawals}
          withdrawals={withdrawals}
          status={withdrawalStatus}
          actionId={actionId}
          onStatusChange={setWithdrawalStatus}
          onRunAction={runWithdrawalAction}
        />
      ) : null}
    </div>
  );
}

function OverviewPanel({
  summary,
  stats,
  isLoading,
}: {
  summary: AdminFinanceSummary | null;
  stats: Array<{
    label: string;
    value: string;
    delta?: string;
    trend?: 'up' | 'down';
    icon: LucideIcon;
    color: string;
  }>;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <FinanceStatCard key={item.label} {...item} />
        ))}
      </div>
      <AdminPanel className="p-5">
        <h2 className="font-display text-xl font-bold text-slate-950">Đối soát doanh thu</h2>
        {isLoading || !summary ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">Đang tải số liệu sổ cái...</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric label="Tổng tiền thu vào" value={formatMoney(summary.grossCashIn, summary.currency)} />
            <OverviewMetric label="Doanh thu gói AI" value={formatMoney(summary.aiPlanRevenue, summary.currency)} />
            <OverviewMetric label="Phí nền tảng" value={formatMoney(summary.platformFeeRevenue, summary.currency)} />
            <OverviewMetric label="Tổng hoàn tiền" value={formatMoney(summary.refunds, summary.currency)} tone="rose" />
            <OverviewMetric label="Tiền booking đang giữ" value={formatMoney(summary.mentorEscrowBalance, summary.currency)} />
            <OverviewMetric label="Khoản phải trả mentor" value={formatMoney(summary.mentorPayableBalance, summary.currency)} />
            <OverviewMetric label="Đã rút tiền" value={formatMoney(summary.withdrawalsPaid, summary.currency)} />
            <OverviewMetric label="Lợi nhuận EDUMEE" value={formatMoney(summary.netRevenue, summary.currency)} tone="emerald" />
          </div>
        )}
      </AdminPanel>
    </div>
  );
}

function OverviewMetric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'emerald' | 'rose' }) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'rose'
        ? 'text-rose-700'
        : 'text-slate-950';
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={cn('mt-2 text-lg font-black', toneClass)}>{value}</p>
    </div>
  );
}

function TransactionPanel({
  isLoading,
  transactions,
  page,
  totalPages,
  eventType,
  sourceType,
  searchDraft,
  onEventTypeChange,
  onSourceTypeChange,
  onSearchDraftChange,
  onSearch,
  onPageChange,
}: {
  isLoading: boolean;
  transactions: AdminFinanceTransaction[];
  page: number;
  totalPages: number;
  eventType: string;
  sourceType: string;
  searchDraft: string;
  onEventTypeChange: (value: string) => void;
  onSourceTypeChange: (value: string) => void;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (value: number) => void;
}) {
  const isAiPlanRevenueFilter = eventType === 'ai_plan_revenue';

  return (
    <AdminPanel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {['all', 'ai_plan_revenue', 'payment_paid', 'payment_refunded', 'mentor_settlement_ready', 'withdrawal_paid'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onEventTypeChange(item)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-bold transition',
                eventType === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {item === 'all' ? 'Tất cả' : eventTypeLabel(item)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={isAiPlanRevenueFilter ? 'payment' : sourceType}
            disabled={isAiPlanRevenueFilter}
            onChange={(event) => onSourceTypeChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="all">Tất cả nguồn</option>
            <option value="payment">Thanh toán</option>
            <option value="wallet_withdrawal">Rút tiền ví</option>
          </select>
          <SearchBox
            value={searchDraft}
            placeholder="Tìm sự kiện, mã thanh toán..."
            onChange={onSearchDraftChange}
            onSearch={onSearch}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4 text-left">Sự kiện</th>
              <th className="px-6 py-4 text-left">Nguồn</th>
              <th className="px-6 py-4 text-left">Mục đích</th>
              <th className="px-6 py-4 text-left">Nợ</th>
              <th className="px-6 py-4 text-left">Có</th>
              <th className="px-6 py-4 text-left">Ngày</th>
              <th className="px-6 py-4 text-left">Dòng sổ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Đang tải sổ giao dịch...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Chưa có bút toán phù hợp.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {eventTypeLabel(transaction.eventType, metadataString(transaction.metadata, 'purpose'))}
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                      {String(transaction.metadata?.checkoutReference || transaction.eventKey)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{sourceTypeLabel(transaction.sourceType)}</p>
                    <p className="font-mono text-xs text-slate-500">{transaction.sourceId}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {transactionPurposeLabel(transaction)}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {formatMoney(transaction.debitTotal, transaction.currency)}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {formatMoney(transaction.creditTotal, transaction.currency)}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(transaction.occurredAt)}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {transaction.lines.slice(0, 3).map((line, index) => (
                        <p key={`${line.accountCode}-${index}`} className="text-xs text-slate-600">
                          <span className="font-semibold">{directionLabel(line.direction)}</span> {accountCodeLabel(line.accountCode)}:{' '}
                          {formatMoney(line.amount, transaction.currency)}
                        </p>
                      ))}
                      {transaction.lines.length > 3 ? (
                        <p className="text-xs text-slate-400">+{transaction.lines.length - 3} dòng</p>
                      ) : null}
                    </div>
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

function PaymentTransactionsPanel({
  isLoading,
  payments,
  page,
  totalPages,
  provider,
  status,
  purpose,
  searchDraft,
  onProviderChange,
  onStatusChange,
  onPurposeChange,
  onSearchDraftChange,
  onSearch,
  onPageChange,
}: {
  isLoading: boolean;
  payments: AdminFinancePayment[];
  page: number;
  totalPages: number;
  provider: string;
  status: string;
  purpose: string;
  searchDraft: string;
  onProviderChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onPageChange: (value: number) => void;
}) {
  return (
    <AdminPanel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <p className="text-sm font-bold text-slate-900">Giao dịch thanh toán</p>
          <p className="mt-1 text-xs text-slate-500">
            Danh sách tất cả payment để đối soát. Doanh thu chỉ tính từ giao dịch đã thanh toán.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả nguồn</option>
            <option value="sepay">SePay</option>
            <option value="edumee_credit">Edumee Credit</option>
          </select>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Đang chờ</option>
            <option value="paid">Đã thanh toán</option>
            <option value="failed">Thất bại</option>
            <option value="cancelled">Đã hủy</option>
            <option value="refunded">Đã hoàn tiền</option>
            <option value="refund_pending">Chờ hoàn tiền</option>
          </select>
          <select
            value={purpose}
            onChange={(event) => onPurposeChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả mục đích</option>
            <option value="ai_plan">Gói AI</option>
            <option value="mentor_booking">Booking mentor</option>
          </select>
          <SearchBox
            value={searchDraft}
            placeholder="Tìm mã giao dịch, người dùng..."
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
              <th className="px-6 py-4 text-left">Mục đích</th>
              <th className="px-6 py-4 text-left">Số tiền</th>
              <th className="px-6 py-4 text-left">Trạng thái</th>
              <th className="px-6 py-4 text-left">Ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Đang tải giao dịch thanh toán...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Chưa có giao dịch thanh toán phù hợp.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-mono text-xs font-bold text-slate-700">{payment.checkoutReference || payment.id}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{paymentProviderLabel(payment.provider)}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{payment.providerPaymentId || 'Chưa có mã gateway'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{payment.userName}</p>
                    <p className="text-xs text-slate-500">{payment.userEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{payment.planName}</p>
                    <p className="text-xs text-slate-500">{paymentPurposeLabel(payment.purpose)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{formatMoney(payment.totalAmount, payment.currency)}</p>
                    {Number(payment.creditAppliedAmount || 0) > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Credit: {formatMoney(payment.creditAppliedAmount || 0, payment.currency)} · {paymentProviderLabel(payment.provider)}:{' '}
                        {formatMoney(payment.amount, payment.currency)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(payment.eventDate || payment.paidAt || payment.createdAt)}
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
            Áp dụng cho giao dịch mentor mới. Giao dịch đã tạo giữ nguyên tỷ lệ snapshot.
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
          <p className="text-sm font-bold text-slate-900">Chốt settlement mentor</p>
          <p className="mt-1 text-xs text-slate-500">Theo dõi phí nền tảng và khoản mentor nhận.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">Tất cả settlement</option>
            <option value="pending">Đang chờ</option>
            <option value="ready">Sẵn sàng</option>
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
              <th className="px-6 py-4 text-left">Lịch đặt</th>
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
                  Đang tải settlement mentor...
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

function WithdrawalPanel({
  isLoading,
  withdrawals,
  status,
  actionId,
  onStatusChange,
  onRunAction,
}: {
  isLoading: boolean;
  withdrawals: AdminWithdrawalRequest[];
  status: string;
  actionId: string;
  onStatusChange: (value: string) => void;
  onRunAction: (
    withdrawal: AdminWithdrawalRequest,
    action: 'approve' | 'reject' | 'mark-paid' | 'mark-failed',
  ) => void;
}) {
  return (
    <AdminPanel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <p className="text-sm font-bold text-slate-900">Yêu cầu rút tiền</p>
          <p className="mt-1 text-xs text-slate-500">Admin chuyển khoản thủ công rồi đánh dấu đã chuyển.</p>
        </div>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
        >
          <option value="all">Tất cả</option>
          <option value="requested">Đã yêu cầu</option>
          <option value="approved">Đã duyệt</option>
          <option value="paid">Đã chuyển</option>
          <option value="rejected">Từ chối</option>
          <option value="failed">Thất bại</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4 text-left">Người dùng</th>
              <th className="px-6 py-4 text-left">Loại ví</th>
              <th className="px-6 py-4 text-left">Số tiền</th>
              <th className="px-6 py-4 text-left">Ngân hàng</th>
              <th className="px-6 py-4 text-left">Trạng thái</th>
              <th className="px-6 py-4 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Đang tải yêu cầu rút tiền...
                </td>
              </tr>
            ) : withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  Chưa có yêu cầu rút tiền phù hợp.
                </td>
              </tr>
            ) : (
              withdrawals.map((withdrawal) => {
                const bank = withdrawal.bankAccountSnapshot || {};
                return (
                  <tr key={withdrawal.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{getWithdrawalUserLabel(withdrawal)}</p>
                      <p className="font-mono text-xs text-slate-500">{getWithdrawalUserId(withdrawal)}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{accountTypeLabel(withdrawal.accountType)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatMoney(withdrawal.amount, withdrawal.currency)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{String(bank.bankName || '--')}</p>
                      <p className="text-xs">{String(bank.accountNumber || '--')}</p>
                      <p className="text-xs">{String(bank.accountHolderName || '--')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <WithdrawalBadge status={withdrawal.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {withdrawal.status === 'requested' ? (
                          <>
                            <ActionButton
                              disabled={actionId === `${withdrawal.id}:approve`}
                              onClick={() => onRunAction(withdrawal, 'approve')}
                            >
                              Duyệt
                            </ActionButton>
                            <ActionButton
                              tone="danger"
                              disabled={actionId === `${withdrawal.id}:reject`}
                              onClick={() => onRunAction(withdrawal, 'reject')}
                            >
                              Từ chối
                            </ActionButton>
                          </>
                        ) : null}
                        {['requested', 'approved', 'processing'].includes(withdrawal.status) ? (
                          <ActionButton
                            disabled={actionId === `${withdrawal.id}:mark-paid`}
                            onClick={() => onRunAction(withdrawal, 'mark-paid')}
                          >
                            Đã chuyển
                          </ActionButton>
                        ) : null}
                        {['requested', 'approved', 'processing'].includes(withdrawal.status) ? (
                          <ActionButton
                            tone="danger"
                            disabled={actionId === `${withdrawal.id}:mark-failed`}
                            onClick={() => onRunAction(withdrawal, 'mark-failed')}
                          >
                            Thất bại
                          </ActionButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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
        {delta ? (
          <div
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold',
              trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
            )}
          >
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        ) : null}
      </div>
      <p className="mb-1 text-xs font-bold text-slate-500">{label}</p>
      <h3 className="text-2xl font-black tracking-tight text-slate-900">{value}</h3>
    </AdminPanel>
  );
}

function ActionButton({
  children,
  disabled,
  tone = 'primary',
  onClick,
}: {
  children: string;
  disabled?: boolean;
  tone?: 'primary' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50',
        tone === 'danger'
          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'bg-violet-50 text-violet-700 hover:bg-violet-100',
      )}
    >
      {children}
    </button>
  );
}

function SettlementBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'Đang chờ', className: 'bg-amber-100 text-amber-700' },
    ready: { label: 'Sẵn sàng', className: 'bg-emerald-100 text-emerald-700' },
    withheld: { label: 'Tạm giữ', className: 'bg-rose-100 text-rose-700' },
    refunded: { label: 'Đã hoàn tiền', className: 'bg-violet-100 text-violet-700' },
  };
  const config = configs[status] || configs.pending;
  return <span className={cn('rounded-full px-3 py-1 text-xs font-bold', config.className)}>{config.label}</span>;
}

function WithdrawalBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    requested: { label: 'Đã yêu cầu', className: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Đã duyệt', className: 'bg-sky-100 text-sky-700' },
    processing: { label: 'Đang xử lý', className: 'bg-sky-100 text-sky-700' },
    paid: { label: 'Đã chuyển', className: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Từ chối', className: 'bg-rose-100 text-rose-700' },
    failed: { label: 'Thất bại', className: 'bg-rose-100 text-rose-700' },
    cancelled: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600' },
  };
  const config = configs[status] || configs.requested;
  return <span className={cn('rounded-full px-3 py-1 text-xs font-bold', config.className)}>{config.label}</span>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: { label: 'Đang chờ', className: 'bg-amber-100 text-amber-700' },
    paid: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Thất bại', className: 'bg-rose-100 text-rose-700' },
    cancelled: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600' },
    refunded: { label: 'Đã hoàn tiền', className: 'bg-violet-100 text-violet-700' },
    refund_pending: { label: 'Chờ hoàn tiền', className: 'bg-amber-100 text-amber-700' },
  };
  const config = configs[status] || configs.pending;
  return <span className={cn('rounded-full px-3 py-1 text-xs font-bold', config.className)}>{config.label}</span>;
}

function formatMoney(amount = 0, currency = 'VND') {
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
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function eventTypeLabel(value: string, purpose?: string) {
  if (value === 'ai_plan_revenue') return 'Doanh thu gói AI';
  if (value === 'payment_paid' && purpose === 'ai_plan') return 'Thanh toán gói AI thành công';
  if (value === 'payment_paid' && purpose === 'mentor_booking') return 'Thanh toán booking mentor';
  const labels: Record<string, string> = {
    payment_paid: 'Thanh toán thành công',
    payment_refunded: 'Hoàn tiền',
    mentor_settlement_ready: 'Chốt settlement mentor',
    withdrawal_paid: 'Rút tiền đã chuyển khoản',
  };
  return labels[value] || value;
}

function sourceTypeLabel(value: string) {
  if (value === 'wallet_withdrawal') return 'Rút tiền ví';
  if (value === 'payment') return 'Thanh toán';
  return value;
}

function accountTypeLabel(value: string) {
  if (value === 'mentor_earnings') return 'Thu nhập mentor';
  if (value === 'cash_refund') return 'Hoàn tiền rút được';
  if (value === 'edumee_credit') return 'Edumee Credit';
  return value;
}

function accountCodeLabel(value: string) {
  const labels: Record<string, string> = {
    cash_sepay: 'Tiền qua SePay',
    edumee_credit_liability: 'Edumee Credit',
    mentor_booking_escrow: 'Tiền booking đang giữ',
    cash_refund_liability: 'Hoàn tiền rút được',
    mentor_earnings_liability: 'Khoản phải trả mentor',
    ai_plan_revenue: 'Doanh thu gói AI',
    platform_fee_revenue: 'Phí nền tảng',
    refund_contra_revenue: 'Giảm trừ hoàn tiền',
  };
  return labels[value] || value;
}

function directionLabel(value: string) {
  if (value === 'debit') return 'Nợ';
  if (value === 'credit') return 'Có';
  return value;
}

function transactionPurposeLabel(transaction: AdminFinanceTransaction) {
  const purpose = metadataString(transaction.metadata, 'purpose');
  if (purpose === 'ai_plan') return 'Gói AI';
  if (purpose === 'mentor_booking') return 'Booking mentor';
  if (transaction.sourceType === 'wallet_withdrawal') return accountTypeLabel(metadataString(transaction.metadata, 'accountType') || '');
  return 'Khác';
}

function paymentPurposeLabel(value: string) {
  if (value === 'ai_plan') return 'Gói AI';
  if (value === 'mentor_booking') return 'Booking mentor';
  return value;
}

function paymentProviderLabel(value: string) {
  if (value === 'sepay') return 'SePay';
  if (value === 'edumee_credit') return 'Edumee Credit';
  return value;
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getWithdrawalUserLabel(withdrawal: AdminWithdrawalRequest) {
  if (typeof withdrawal.userId === 'object') return withdrawal.userId.name || withdrawal.userId.email || 'Người dùng';
  return 'Người dùng';
}

function getWithdrawalUserId(withdrawal: AdminWithdrawalRequest) {
  if (typeof withdrawal.userId === 'object') return withdrawal.userId.id || '';
  return withdrawal.userId;
}
