import { apiClient } from '@/lib/api-client';

export type WalletLedgerEntryType = 'credit' | 'debit' | 'hold' | 'capture' | 'release' | 'refund';

export interface WalletAccount {
  id: string;
  userId: string;
  currency: 'VND';
  availableBalance: number;
  heldBalance: number;
  createdAt?: string;
  updatedAt?: string;
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

export const walletService = {
  getMine(token: string) {
    return apiClient.get<WalletAccount>('/wallet/me', token);
  },

  getMyTransactions(token: string) {
    return apiClient.get<WalletLedgerEntry[]>('/wallet/me/transactions', token);
  },
};
