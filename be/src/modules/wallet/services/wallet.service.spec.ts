import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WalletService } from './wallet.service';
import {
  WalletAccountType,
  WalletCurrency,
  WalletLedgerEntryType,
  WalletWithdrawalStatus,
} from '../schemas';

describe('WalletService', () => {
  let service: WalletService;
  let walletAccountModel: any;
  let walletLedgerEntryModel: any;
  let walletWithdrawalRequestModel: any;
  let paymentModel: any;
  let financialLedgerService: any;

  const userId = '507f1f77bcf86cd799439011';
  const accountId = new Types.ObjectId('507f1f77bcf86cd799439071');
  const withdrawalId = new Types.ObjectId('507f1f77bcf86cd799439081');

  beforeEach(() => {
    jest.clearAllMocks();
    walletAccountModel = {
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    walletLedgerEntryModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(createQuery([])),
      findOne: jest.fn().mockReturnValue(createQuery(null)),
      findById: jest.fn(),
    };
    walletWithdrawalRequestModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(createQuery([])),
      findById: jest.fn(),
    };
    paymentModel = {
      find: jest.fn().mockReturnValue(createQuery([])),
    };
    financialLedgerService = {
      postWithdrawalPaid: jest.fn(),
    };
    service = new WalletService(
      walletAccountModel,
      walletLedgerEntryModel,
      walletWithdrawalRequestModel,
      paymentModel,
      financialLedgerService,
    );
  });

  it('rejects withdrawal requests from Edumee Credit', async () => {
    await expect(
      service.createWithdrawalRequest({
        userId,
        accountType: WalletAccountType.EDUMEE_CREDIT,
        amount: 100000,
        bankAccountSnapshot: buildBankAccount(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(walletAccountModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('creates a withdrawal request by holding withdrawable mentor earnings', async () => {
    const account = buildAccount(200000, 0);
    const updatedAccount = buildAccount(100000, 100000);
    const withdrawal = buildWithdrawalRequest();
    walletAccountModel.findOneAndUpdate
      .mockReturnValueOnce(createQuery(account))
      .mockReturnValueOnce(createQuery(updatedAccount));
    walletWithdrawalRequestModel.create.mockResolvedValue(withdrawal);
    walletLedgerEntryModel.create.mockResolvedValue({ _id: new Types.ObjectId('507f1f77bcf86cd799439091') });

    const result = await service.createWithdrawalRequest({
      userId,
      accountType: WalletAccountType.MENTOR_EARNINGS,
      amount: 100000,
      bankAccountSnapshot: buildBankAccount(),
    });

    expect(result).toBe(withdrawal);
    expect(walletAccountModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: accountId, availableBalance: { $gte: 100000 } },
      { $inc: { availableBalance: -100000, heldBalance: 100000 } },
      { new: true },
    );
    expect(walletLedgerEntryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WalletLedgerEntryType.WITHDRAWAL_HOLD,
        amount: 100000,
        sourceType: 'wallet_withdrawal',
        sourceId: withdrawalId.toString(),
      }),
    );
    expect(withdrawal.holdLedgerEntryId).toBeDefined();
    expect(withdrawal.save).toHaveBeenCalledTimes(1);
  });

  it('marks an approved withdrawal as paid by consuming held balance', async () => {
    const withdrawal = buildWithdrawalRequest({ status: WalletWithdrawalStatus.APPROVED });
    walletWithdrawalRequestModel.findById.mockReturnValue(createQuery(withdrawal));
    walletAccountModel.findOneAndUpdate.mockReturnValue(createQuery(buildAccount(0, 0)));
    walletLedgerEntryModel.create.mockResolvedValue({ _id: new Types.ObjectId('507f1f77bcf86cd799439092') });

    const result = await service.markWithdrawalPaid(withdrawalId.toString(), 'BANK-REF-1', userId);

    expect(result.status).toBe(WalletWithdrawalStatus.PAID);
    expect(walletAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: accountId, heldBalance: { $gte: 100000 } },
      { $inc: { heldBalance: -100000 } },
      { new: true },
    );
    expect(walletLedgerEntryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WalletLedgerEntryType.WITHDRAWAL_PAID,
        amount: 100000,
      }),
    );
    expect(withdrawal.transferReference).toBe('BANK-REF-1');
    expect(financialLedgerService.postWithdrawalPaid).toHaveBeenCalledWith(
      expect.objectContaining({
        withdrawalId: withdrawalId.toString(),
        accountType: WalletAccountType.MENTOR_EARNINGS,
        amount: 100000,
        transferReference: 'BANK-REF-1',
      }),
    );
    expect(withdrawal.save).toHaveBeenCalledTimes(1);
  });

  it('releases held balance when a withdrawal is rejected', async () => {
    const withdrawal = buildWithdrawalRequest();
    walletWithdrawalRequestModel.findById.mockReturnValue(createQuery(withdrawal));
    walletAccountModel.findOneAndUpdate.mockReturnValue(createQuery(buildAccount(100000, 0)));
    walletLedgerEntryModel.create.mockResolvedValue({ _id: new Types.ObjectId('507f1f77bcf86cd799439093') });

    const result = await service.rejectWithdrawalRequest(withdrawalId.toString(), 'Invalid bank account', userId);

    expect(result.status).toBe(WalletWithdrawalStatus.REJECTED);
    expect(walletAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: accountId, heldBalance: { $gte: 100000 } },
      { $inc: { heldBalance: -100000, availableBalance: 100000 } },
      { new: true },
    );
    expect(walletLedgerEntryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WalletLedgerEntryType.WITHDRAWAL_RELEASE,
        amount: 100000,
      }),
    );
    expect(withdrawal.rejectionReason).toBe('Invalid bank account');
    expect(withdrawal.save).toHaveBeenCalledTimes(1);
  });

  function buildAccount(availableBalance: number, heldBalance: number) {
    return {
      _id: accountId,
      userId: new Types.ObjectId(userId),
      accountType: WalletAccountType.MENTOR_EARNINGS,
      currency: WalletCurrency.VND,
      availableBalance,
      heldBalance,
    };
  }

  function buildWithdrawalRequest(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      _id: withdrawalId,
      userId: new Types.ObjectId(userId),
      walletAccountId: accountId,
      accountType: WalletAccountType.MENTOR_EARNINGS,
      amount: 100000,
      currency: WalletCurrency.VND,
      status: WalletWithdrawalStatus.REQUESTED,
      bankAccountSnapshot: buildBankAccount(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function buildBankAccount() {
    return {
      bankName: 'VCB',
      accountNumber: '0123456789',
      accountHolderName: 'NGUYEN VAN A',
    };
  }
});

function createQuery<T>(value: T) {
  return {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}
