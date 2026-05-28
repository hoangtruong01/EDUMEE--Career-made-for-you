'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  walletService,
  type WalletAccountType,
  type WalletLedgerEntry,
  type WalletSummary,
  type WalletWithdrawalRequest,
} from '@/lib/wallet.service';
import { cn } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type LedgerVisual = {
  label: string;
  status: string;
  tone: string;
  icon: LucideIcon;
  positive: boolean;
};

const ledgerVisuals: Record<WalletLedgerEntry['type'], LedgerVisual> = {
  credit: {
    label: 'Cộng tiền',
    status: 'Đã cộng vào ví',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: ArrowDownLeft,
    positive: true,
  },
  debit: {
    label: 'Thanh toán',
    status: 'Đã thanh toán',
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    icon: ArrowUpRight,
    positive: false,
  },
  hold: {
    label: 'Tạm giữ',
    status: 'Đang tạm giữ',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    icon: Lock,
    positive: false,
  },
  capture: {
    label: 'Trừ tiền giữ',
    status: 'Đã tất toán',
    tone: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    icon: CheckCircle2,
    positive: false,
  },
  release: {
    label: 'Hoàn tạm giữ',
    status: 'Đã trả về ví',
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    icon: RotateCcw,
    positive: true,
  },
  refund: {
    label: 'Hoàn tiền',
    status: 'Đã hoàn tiền',
    tone: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
    icon: RotateCcw,
    positive: true,
  },
  cash_refund_credit: {
    label: 'Hoàn tiền rút được',
    status: 'Đã cộng vào ví',
    tone: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
    icon: ArrowDownLeft,
    positive: true,
  },
  mentor_payout_credit: {
    label: 'Thu nhập mentor',
    status: 'Sẵn sàng rút',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: ArrowDownLeft,
    positive: true,
  },
  withdrawal_hold: {
    label: 'Yêu cầu rút tiền',
    status: 'Đang chờ duyệt',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    icon: Lock,
    positive: false,
  },
  withdrawal_paid: {
    label: 'Rút tiền',
    status: 'Đã chuyển khoản',
    tone: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    icon: CheckCircle2,
    positive: false,
  },
  withdrawal_release: {
    label: 'Hoàn yêu cầu rút',
    status: 'Đã trả về ví',
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    icon: RotateCcw,
    positive: true,
  },
};

function formatCurrency(amount?: number, currency = 'VND'): string {
  const numericAmount = Number(amount || 0);
  if (currency.toUpperCase() === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(numericAmount)} đ`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatDate(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function describeSource(entry: WalletLedgerEntry): string {
  if (entry.description?.trim()) return entry.description.trim();
  if (entry.sourceType === 'payment') return 'Giao dịch thanh toán';
  if (entry.sourceType === 'payment_refund') return 'Hoàn tiền thanh toán';
  if (entry.sourceType === 'mentor_payout') return 'Thu nhập booking mentor';
  if (entry.sourceType === 'wallet_withdrawal') return 'Yêu cầu rút tiền';
  if (entry.sourceType === 'booking') return 'Booking mentor';
  return 'Giao dịch ví Edumee';
}

function getMetadataString(entry: WalletLedgerEntry, key: string): string {
  const value = entry.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getSourceReference(entry: WalletLedgerEntry): string {
  return getMetadataString(entry, 'checkoutReference') || entry.sourceId || '';
}

const accountTypeLabels: Record<WalletAccountType, string> = {
  edumee_credit: 'Edumee Credit',
  cash_refund: 'Hoàn tiền rút được',
  mentor_earnings: 'Thu nhập mentor',
};

const withdrawalStatusLabels: Record<string, string> = {
  requested: 'Chờ duyệt',
  approved: 'Đã duyệt',
  processing: 'Đang chuyển',
  paid: 'Đã chuyển khoản',
  rejected: 'Từ chối',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

export default function Wallet() {
  const { accessToken } = useAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletLedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [withdrawalForm, setWithdrawalForm] = useState({
    accountType: 'cash_refund' as WalletAccountType,
    amount: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
  });

  const loadWallet = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const [walletAccount, entries, withdrawalRows] = await Promise.all([
        walletService.getMine(accessToken),
        walletService.getMyTransactions(accessToken),
        walletService.getMyWithdrawals(accessToken),
      ]);
      setWallet(walletAccount);
      setTransactions(entries);
      setWithdrawals(withdrawalRows);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu ví.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, entry) => {
        const visual = ledgerVisuals[entry.type];
        if (visual?.positive) acc.incoming += Number(entry.amount || 0);
        if (visual && !visual.positive) acc.outgoing += Number(entry.amount || 0);
        return acc;
      },
      { incoming: 0, outgoing: 0 },
    );
  }, [transactions]);

  const withdrawableAccounts = useMemo(
    () => wallet?.accounts.filter((account) => account.withdrawable) ?? [],
    [wallet?.accounts],
  );

  useEffect(() => {
    if (withdrawableAccounts.length === 0) return;
    if (!withdrawableAccounts.some((account) => account.accountType === withdrawalForm.accountType)) {
      setWithdrawalForm((current) => ({ ...current, accountType: withdrawableAccounts[0].accountType }));
    }
  }, [withdrawableAccounts, withdrawalForm.accountType]);

  const handleRefresh = async () => {
    await loadWallet();
    toast.success('Đã làm mới ví của tôi.');
  };

  const submitWithdrawal = async () => {
    if (!accessToken) return;
    const amount = Number(withdrawalForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Nhập số tiền rút hợp lệ.');
      return;
    }
    setIsWithdrawing(true);
    try {
      await walletService.createWithdrawal(accessToken, {
        accountType: withdrawalForm.accountType,
        amount,
        bankAccountSnapshot: {
          bankName: withdrawalForm.bankName,
          accountNumber: withdrawalForm.accountNumber,
          accountHolderName: withdrawalForm.accountHolderName,
        },
      });
      setWithdrawalForm((current) => ({ ...current, amount: '' }));
      await loadWallet();
      toast.success('Đã gửi yêu cầu rút tiền.');
    } catch (withdrawError) {
      toast.error(withdrawError instanceof Error ? withdrawError.message : 'Không thể gửi yêu cầu rút tiền.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-16 dark:bg-slate-950">
      <div className="container max-w-6xl py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-600">
              <WalletCards className="h-4 w-4" />
              Ví Edumee
            </p>
            <h1 className="font-display text-3xl font-bold text-slate-950 dark:text-slate-50">Ví của tôi</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Theo dõi số dư khả dụng, khoản đang tạm giữ và toàn bộ lịch sử thanh toán, hoàn tiền.
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-2 self-start" disabled={isLoading} onClick={handleRefresh}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </Button>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Số dư khả dụng</p>
            <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-slate-50">
              {isLoading ? '...' : formatCurrency(wallet?.availableBalance || 0, wallet?.currency || 'VND')}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Có thể dùng để thanh toán gói AI hoặc booking mentor.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Đang tạm giữ</p>
            <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-slate-50">
              {isLoading ? '...' : formatCurrency(wallet?.heldBalance || 0, wallet?.currency || 'VND')}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Các khoản đang chờ xác nhận hoặc tất toán.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng luồng tiền</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Đã cộng/hoàn</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(totals.incoming, wallet?.currency || 'VND')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Đã thanh toán/giữ</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(totals.outgoing, wallet?.currency || 'VND')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-50">Số dư theo nguồn</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(wallet?.accounts || []).map((account) => (
                <div key={account.accountType} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {accountTypeLabels[account.accountType]}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {account.withdrawable ? 'Có thể rút' : 'Chỉ dùng trong EDUMEE'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-black text-slate-950 dark:text-slate-50">
                    {formatCurrency(account.availableBalance, account.currency)}
                  </p>
                  {account.heldBalance > 0 ? (
                    <p className="mt-1 text-xs text-amber-600">
                      Đang giữ {formatCurrency(account.heldBalance, account.currency)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-50">Rút tiền</h2>
            <div className="mt-4 space-y-3">
              <select
                value={withdrawalForm.accountType}
                onChange={(event) =>
                  setWithdrawalForm((current) => ({
                    ...current,
                    accountType: event.target.value as WalletAccountType,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              >
                {withdrawableAccounts.map((account) => (
                  <option key={account.accountType} value={account.accountType}>
                    {accountTypeLabels[account.accountType]} - {formatCurrency(account.availableBalance, account.currency)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={withdrawalForm.amount}
                placeholder="Số tiền"
                onChange={(event) => setWithdrawalForm((current) => ({ ...current, amount: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              />
              <input
                value={withdrawalForm.bankName}
                placeholder="Ngân hàng"
                onChange={(event) => setWithdrawalForm((current) => ({ ...current, bankName: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              />
              <input
                value={withdrawalForm.accountNumber}
                placeholder="Số tài khoản"
                onChange={(event) => setWithdrawalForm((current) => ({ ...current, accountNumber: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              />
              <input
                value={withdrawalForm.accountHolderName}
                placeholder="Tên chủ tài khoản"
                onChange={(event) => setWithdrawalForm((current) => ({ ...current, accountHolderName: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              />
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isWithdrawing || withdrawableAccounts.length === 0}
                onClick={submitWithdrawal}
              >
                {isWithdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                Gửi yêu cầu rút
              </Button>
            </div>

            {withdrawals.length > 0 ? (
              <div className="mt-5 space-y-2">
                {withdrawals.slice(0, 3).map((withdrawal) => (
                  <div key={withdrawal.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {formatCurrency(withdrawal.amount, withdrawal.currency)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {withdrawalStatusLabels[withdrawal.status] || withdrawal.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{accountTypeLabels[withdrawal.accountType]}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-950 dark:text-slate-50">
                <History className="h-5 w-5 text-sky-600" />
                Lịch sử giao dịch
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thanh toán, hoàn tiền và các thay đổi số dư ví.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Clock className="h-6 w-6" />
              </div>
              <p className="font-semibold text-slate-950 dark:text-slate-50">Chưa có giao dịch nào.</p>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Các khoản thanh toán, hoàn tiền hoặc số dư được cộng sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((entry) => {
                const visual = ledgerVisuals[entry.type];
                const Icon = visual.icon;
                const signedPrefix = visual.positive ? '+' : '-';
                const sourceReference = getSourceReference(entry);

                return (
                  <article key={entry.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl', visual.tone)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950 dark:text-slate-50">{visual.label}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {visual.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{describeSource(entry)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={cn('text-lg font-bold', visual.positive ? 'text-emerald-600' : 'text-slate-950 dark:text-slate-50')}>
                        {signedPrefix}
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                      {sourceReference ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          Mã giao dịch: {sourceReference}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
