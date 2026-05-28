import { apiClient } from '@/lib/api-client';

export type WalletAccountType = 'edumee_credit' | 'cash_refund' | 'mentor_earnings';

export type WalletLedgerEntryType =
  | 'credit'
  | 'debit'
  | 'hold'
  | 'capture'
  | 'release'
  | 'refund'
  | 'cash_refund_credit'
  | 'mentor_payout_credit'
  | 'withdrawal_hold'
  | 'withdrawal_paid'
  | 'withdrawal_release';

export interface WalletAccount {
  id: string;
  userId: string;
  accountType: WalletAccountType;
  currency: 'VND';
  availableBalance: number;
  heldBalance: number;
  withdrawable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletSummary {
  userId: string;
  currency: 'VND';
  availableBalance: number;
  heldBalance: number;
  withdrawableBalance: number;
  withdrawableHeldBalance: number;
  accounts: WalletAccount[];
}

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  walletAccountId: string;
  type: WalletLedgerEntryType;
  amount: number;
  currency: 'VND';
  sourceType?: string;
  sourceId?: string;
  relatedLedgerEntryId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export type WalletWithdrawalStatus =
  | 'requested'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'failed'
  | 'cancelled';

export interface WalletWithdrawalRequest {
  id: string;
  userId: string;
  walletAccountId: string;
  accountType: WalletAccountType;
  amount: number;
  currency: 'VND';
  status: WalletWithdrawalStatus;
  bankAccountSnapshot?: Record<string, unknown>;
  transferReference?: string;
  rejectionReason?: string;
  requestedAt?: string;
  reviewedAt?: string;
  processedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWithdrawalPayload {
  accountType: WalletAccountType;
  amount: number;
  bankAccountSnapshot: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
}

export function getWalletAccount(
  wallet: WalletSummary | null | undefined,
  accountType: WalletAccountType,
): WalletAccount | null {
  return wallet?.accounts.find((account) => account.accountType === accountType) || null;
}

export const walletService = {
  getMine(token: string) {
    return apiClient.get<WalletSummary>('/wallet/me', token);
  },

  getMyTransactions(token: string) {
    return apiClient.get<WalletLedgerEntry[]>('/wallet/me/transactions', token);
  },

  getMyWithdrawals(token: string) {
    return apiClient.get<WalletWithdrawalRequest[]>('/wallet/me/withdrawals', token);
  },

  createWithdrawal(token: string, payload: CreateWithdrawalPayload) {
    return apiClient.post<WalletWithdrawalRequest>('/wallet/me/withdrawals', payload, token);
  },
};
