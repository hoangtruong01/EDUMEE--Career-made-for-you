import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  WalletAccount,
  WalletAccountDocument,
  WalletAccountType,
  WalletCurrency,
  WalletLedgerEntry,
  WalletLedgerEntryDocument,
  WalletLedgerEntryType,
  WalletWithdrawalRequest,
  WalletWithdrawalRequestDocument,
  WalletWithdrawalStatus,
} from '../schemas';
import { Payment, PaymentDocument } from '../../payment/schema/payment.schema';
import { FinancialLedgerService } from '../../financial-ledger';

interface WalletOperationInput {
  userId: string;
  amount: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  accountType?: WalletAccountType;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface CreateWithdrawalInput {
  userId: string;
  accountType: WalletAccountType | string;
  amount: number;
  bankAccountSnapshot?: Record<string, unknown>;
}

const WALLET_ACCOUNT_TYPES = [
  WalletAccountType.EDUMEE_CREDIT,
  WalletAccountType.CASH_REFUND,
  WalletAccountType.MENTOR_EARNINGS,
] as const;

const WITHDRAWABLE_ACCOUNT_TYPES = [
  WalletAccountType.CASH_REFUND,
  WalletAccountType.MENTOR_EARNINGS,
] as const;

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletAccount.name)
    private readonly walletAccountModel: Model<WalletAccountDocument>,
    @InjectModel(WalletLedgerEntry.name)
    private readonly walletLedgerEntryModel: Model<WalletLedgerEntryDocument>,
    @InjectModel(WalletWithdrawalRequest.name)
    private readonly walletWithdrawalRequestModel: Model<WalletWithdrawalRequestDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly financialLedgerService: FinancialLedgerService,
  ) {}

  async getMyWallet(userId: string) {
    const accounts = await Promise.all(
      WALLET_ACCOUNT_TYPES.map((accountType) => this.getOrCreateAccount(userId, accountType)),
    );
    const totals = accounts.reduce(
      (acc, account) => {
        const availableBalance = Number(account.availableBalance || 0);
        const heldBalance = Number(account.heldBalance || 0);
        acc.availableBalance += availableBalance;
        acc.heldBalance += heldBalance;
        if (this.isWithdrawableAccountType(account.accountType)) {
          acc.withdrawableBalance += availableBalance;
          acc.withdrawableHeldBalance += heldBalance;
        }
        return acc;
      },
      {
        availableBalance: 0,
        heldBalance: 0,
        withdrawableBalance: 0,
        withdrawableHeldBalance: 0,
      },
    );

    return {
      userId,
      currency: WalletCurrency.VND,
      ...totals,
      accounts: accounts.map((account) => this.serializeAccount(account)),
    };
  }

  async listTransactions(userId: string): Promise<WalletLedgerEntryDocument[]> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    const entries = await this.walletLedgerEntryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    await this.hydratePaymentMetadata(entries);
    return entries;
  }

  async listMyWithdrawals(userId: string): Promise<WalletWithdrawalRequestDocument[]> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    return this.walletWithdrawalRequestModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async listWithdrawals(params: { status?: string; accountType?: string } = {}) {
    const filter: FilterQuery<WalletWithdrawalRequestDocument> = {};
    if (params.status && params.status !== 'all') {
      filter.status = params.status;
    }
    if (params.accountType && params.accountType !== 'all') {
      filter.accountType = this.normalizeAccountType(params.accountType);
    }
    return this.walletWithdrawalRequestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .exec();
  }

  async getAvailableBalance(userId: string, accountType = WalletAccountType.EDUMEE_CREDIT): Promise<number> {
    const account = await this.getOrCreateAccount(userId, accountType);
    return Number(account.availableBalance || 0);
  }

  async credit(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    return this.increaseAvailable(input, WalletLedgerEntryType.CREDIT);
  }

  async refund(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    return this.increaseAvailable(
      { ...input, accountType: input.accountType || WalletAccountType.EDUMEE_CREDIT },
      WalletLedgerEntryType.REFUND,
    );
  }

  async cashRefund(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    return this.increaseAvailable(
      { ...input, accountType: WalletAccountType.CASH_REFUND },
      WalletLedgerEntryType.CASH_REFUND_CREDIT,
    );
  }

  async creditMentorEarnings(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    return this.increaseAvailable(
      { ...input, accountType: WalletAccountType.MENTOR_EARNINGS },
      WalletLedgerEntryType.MENTOR_PAYOUT_CREDIT,
    );
  }

  async debit(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    this.validateAmount(input.amount);
    const account = await this.getOrCreateAccount(
      input.userId,
      input.accountType || WalletAccountType.EDUMEE_CREDIT,
    );
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: account._id, availableBalance: { $gte: input.amount } },
        { $inc: { availableBalance: -input.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('So du Edumee khong du');

    return this.createLedgerEntry(updated, WalletLedgerEntryType.DEBIT, input);
  }

  async hold(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    this.validateAmount(input.amount);
    const account = await this.getOrCreateAccount(
      input.userId,
      input.accountType || WalletAccountType.EDUMEE_CREDIT,
    );
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: account._id, availableBalance: { $gte: input.amount } },
        { $inc: { availableBalance: -input.amount, heldBalance: input.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('So du Edumee khong du');

    return this.createLedgerEntry(updated, WalletLedgerEntryType.HOLD, input);
  }

  async captureHold(holdEntryId: string, idempotencyKey: string, description?: string): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const holdEntry = await this.findHoldEntry(holdEntryId);
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: holdEntry.walletAccountId, heldBalance: { $gte: holdEntry.amount } },
        { $inc: { heldBalance: -holdEntry.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Khong the capture so du dang giu');

    return this.createLedgerEntry(updated, WalletLedgerEntryType.CAPTURE, {
      userId: holdEntry.userId.toString(),
      amount: holdEntry.amount,
      sourceType: holdEntry.sourceType || 'payment',
      sourceId: holdEntry.sourceId || holdEntry._id.toString(),
      idempotencyKey,
      description,
      metadata: holdEntry.metadata,
    }, holdEntry._id);
  }

  async releaseHold(holdEntryId: string, idempotencyKey: string, description?: string): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const holdEntry = await this.findHoldEntry(holdEntryId);
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: holdEntry.walletAccountId, heldBalance: { $gte: holdEntry.amount } },
        { $inc: { heldBalance: -holdEntry.amount, availableBalance: holdEntry.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Khong the hoan lai so du dang giu');

    return this.createLedgerEntry(updated, WalletLedgerEntryType.RELEASE, {
      userId: holdEntry.userId.toString(),
      amount: holdEntry.amount,
      sourceType: holdEntry.sourceType || 'payment',
      sourceId: holdEntry.sourceId || holdEntry._id.toString(),
      idempotencyKey,
      description,
      metadata: holdEntry.metadata,
    }, holdEntry._id);
  }

  async createWithdrawalRequest(input: CreateWithdrawalInput): Promise<WalletWithdrawalRequestDocument> {
    if (!Types.ObjectId.isValid(input.userId)) throw new BadRequestException('Invalid userId');
    const accountType = this.normalizeWithdrawableAccountType(input.accountType);
    this.validateAmount(input.amount);
    const bankAccountSnapshot = this.validateBankAccountSnapshot(input.bankAccountSnapshot);
    const account = await this.getOrCreateAccount(input.userId, accountType);

    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: account._id, availableBalance: { $gte: input.amount } },
        { $inc: { availableBalance: -input.amount, heldBalance: input.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('So du co the rut khong du');

    const request = await this.walletWithdrawalRequestModel.create({
      userId: new Types.ObjectId(input.userId),
      walletAccountId: updated._id,
      accountType,
      amount: input.amount,
      currency: updated.currency,
      status: WalletWithdrawalStatus.REQUESTED,
      bankAccountSnapshot,
      requestedAt: new Date(),
    });

    const holdLedger = await this.createLedgerEntry(updated, WalletLedgerEntryType.WITHDRAWAL_HOLD, {
      userId: input.userId,
      amount: input.amount,
      accountType,
      sourceType: 'wallet_withdrawal',
      sourceId: request._id.toString(),
      idempotencyKey: `withdrawal:${request._id.toString()}:hold`,
      description: 'Giu so du cho yeu cau rut tien',
      metadata: { accountType, withdrawalId: request._id.toString() },
    });
    request.holdLedgerEntryId = holdLedger._id;
    await request.save();
    return request;
  }

  async approveWithdrawalRequest(id: string, actorId?: string): Promise<WalletWithdrawalRequestDocument> {
    const request = await this.findWithdrawalRequest(id);
    if (request.status === WalletWithdrawalStatus.PAID) return request;
    if (![WalletWithdrawalStatus.REQUESTED, WalletWithdrawalStatus.PROCESSING].includes(request.status)) {
      throw new ConflictException('Withdrawal request cannot be approved');
    }
    request.status = WalletWithdrawalStatus.APPROVED;
    request.reviewedAt = new Date();
    if (actorId && Types.ObjectId.isValid(actorId)) {
      request.reviewedBy = new Types.ObjectId(actorId);
    }
    return request.save();
  }

  async rejectWithdrawalRequest(
    id: string,
    reason?: string,
    actorId?: string,
  ): Promise<WalletWithdrawalRequestDocument> {
    const request = await this.findWithdrawalRequest(id);
    if ([WalletWithdrawalStatus.REJECTED, WalletWithdrawalStatus.FAILED, WalletWithdrawalStatus.CANCELLED].includes(request.status)) {
      return request;
    }
    if (request.status === WalletWithdrawalStatus.PAID) {
      throw new ConflictException('Paid withdrawal cannot be rejected');
    }
    await this.releaseWithdrawalHold(request, WalletWithdrawalStatus.REJECTED, reason || 'Withdrawal rejected', actorId);
    return request;
  }

  async markWithdrawalPaid(
    id: string,
    transferReference?: string,
    actorId?: string,
  ): Promise<WalletWithdrawalRequestDocument> {
    const request = await this.findWithdrawalRequest(id);
    if (request.status === WalletWithdrawalStatus.PAID) return request;
    if ([WalletWithdrawalStatus.REJECTED, WalletWithdrawalStatus.FAILED, WalletWithdrawalStatus.CANCELLED].includes(request.status)) {
      throw new ConflictException('Withdrawal request is no longer payable');
    }

    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: request.walletAccountId, heldBalance: { $gte: request.amount } },
        { $inc: { heldBalance: -request.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Khong the tru so du dang giu cho yeu cau rut tien');

    const paidLedger = await this.createLedgerEntry(updated, WalletLedgerEntryType.WITHDRAWAL_PAID, {
      userId: request.userId.toString(),
      amount: request.amount,
      accountType: request.accountType,
      sourceType: 'wallet_withdrawal',
      sourceId: request._id.toString(),
      idempotencyKey: `withdrawal:${request._id.toString()}:paid`,
      description: 'Admin da chuyen khoan rut tien',
      metadata: { accountType: request.accountType, withdrawalId: request._id.toString(), transferReference },
    });

    request.status = WalletWithdrawalStatus.PAID;
    request.transferReference = transferReference || request.transferReference;
    request.finalLedgerEntryId = paidLedger._id;
    request.processedAt = new Date();
    request.reviewedAt = request.reviewedAt || new Date();
    if (actorId && Types.ObjectId.isValid(actorId)) {
      request.reviewedBy = new Types.ObjectId(actorId);
    }
    await request.save();
    await this.financialLedgerService.postWithdrawalPaid({
      withdrawalId: request._id.toString(),
      userId: request.userId,
      accountType: request.accountType,
      amount: request.amount,
      currency: request.currency,
      processedAt: request.processedAt,
      transferReference: request.transferReference,
    });
    return request;
  }

  async markWithdrawalFailed(
    id: string,
    reason?: string,
    actorId?: string,
  ): Promise<WalletWithdrawalRequestDocument> {
    const request = await this.findWithdrawalRequest(id);
    if (request.status === WalletWithdrawalStatus.FAILED) return request;
    if (request.status === WalletWithdrawalStatus.PAID) {
      throw new ConflictException('Paid withdrawal cannot be failed');
    }
    await this.releaseWithdrawalHold(request, WalletWithdrawalStatus.FAILED, reason || 'Withdrawal transfer failed', actorId);
    return request;
  }

  private async increaseAvailable(
    input: WalletOperationInput,
    type:
      | WalletLedgerEntryType.CREDIT
      | WalletLedgerEntryType.REFUND
      | WalletLedgerEntryType.CASH_REFUND_CREDIT
      | WalletLedgerEntryType.MENTOR_PAYOUT_CREDIT,
  ): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    this.validateAmount(input.amount);
    const account = await this.getOrCreateAccount(
      input.userId,
      input.accountType || WalletAccountType.EDUMEE_CREDIT,
    );
    const updated = await this.walletAccountModel
      .findByIdAndUpdate(account._id, { $inc: { availableBalance: input.amount } }, { new: true })
      .exec();
    if (!updated) throw new ConflictException('Khong the cap nhat so du Edumee');

    return this.createLedgerEntry(updated, type, input);
  }

  private async getOrCreateAccount(
    userId: string,
    accountType = WalletAccountType.EDUMEE_CREDIT,
  ): Promise<WalletAccountDocument> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    const normalizedAccountType = this.normalizeAccountType(accountType);
    const userObjectId = new Types.ObjectId(userId);
    return this.walletAccountModel
      .findOneAndUpdate(
        { userId: userObjectId, currency: WalletCurrency.VND, accountType: normalizedAccountType },
        {
          $setOnInsert: {
            userId: userObjectId,
            currency: WalletCurrency.VND,
            accountType: normalizedAccountType,
            availableBalance: 0,
            heldBalance: 0,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  private async findByIdempotencyKey(idempotencyKey: string): Promise<WalletLedgerEntryDocument | null> {
    if (!idempotencyKey) throw new BadRequestException('Missing idempotencyKey');
    return this.walletLedgerEntryModel.findOne({ idempotencyKey }).exec();
  }

  private async findHoldEntry(holdEntryId: string): Promise<WalletLedgerEntryDocument> {
    if (!Types.ObjectId.isValid(holdEntryId)) throw new BadRequestException('Invalid hold entry id');
    const holdEntry = await this.walletLedgerEntryModel.findById(holdEntryId).exec();
    if (!holdEntry || holdEntry.type !== WalletLedgerEntryType.HOLD) {
      throw new BadRequestException('Wallet hold not found');
    }
    return holdEntry;
  }

  private async findWithdrawalRequest(id: string): Promise<WalletWithdrawalRequestDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid withdrawal id');
    const request = await this.walletWithdrawalRequestModel.findById(id).exec();
    if (!request) throw new NotFoundException('Withdrawal request not found');
    return request;
  }

  private async releaseWithdrawalHold(
    request: WalletWithdrawalRequestDocument,
    status: WalletWithdrawalStatus.REJECTED | WalletWithdrawalStatus.FAILED,
    reason: string,
    actorId?: string,
  ): Promise<void> {
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: request.walletAccountId, heldBalance: { $gte: request.amount } },
        { $inc: { heldBalance: -request.amount, availableBalance: request.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Khong the hoan lai so du rut tien dang giu');

    const releaseLedger = await this.createLedgerEntry(updated, WalletLedgerEntryType.WITHDRAWAL_RELEASE, {
      userId: request.userId.toString(),
      amount: request.amount,
      accountType: request.accountType,
      sourceType: 'wallet_withdrawal',
      sourceId: request._id.toString(),
      idempotencyKey: `withdrawal:${request._id.toString()}:${status}`,
      description: reason,
      metadata: { accountType: request.accountType, withdrawalId: request._id.toString(), status },
    });

    request.status = status;
    request.rejectionReason = reason;
    request.finalLedgerEntryId = releaseLedger._id;
    request.reviewedAt = new Date();
    request.processedAt = new Date();
    if (actorId && Types.ObjectId.isValid(actorId)) {
      request.reviewedBy = new Types.ObjectId(actorId);
    }
    await request.save();
  }

  private createLedgerEntry(
    account: WalletAccountDocument,
    type: WalletLedgerEntryType,
    input: WalletOperationInput,
    relatedLedgerEntryId?: Types.ObjectId,
  ): Promise<WalletLedgerEntryDocument> {
    return this.walletLedgerEntryModel.create({
      userId: account.userId,
      walletAccountId: account._id,
      type,
      amount: input.amount,
      currency: account.currency,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      relatedLedgerEntryId,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      metadata: {
        ...(input.metadata || {}),
        accountType: account.accountType,
      },
    });
  }

  private async hydratePaymentMetadata(entries: WalletLedgerEntryDocument[]): Promise<void> {
    const paymentIds = [
      ...new Set(
        entries
          .filter((entry) => ['payment', 'payment_refund', 'mentor_payout'].includes(entry.sourceType || ''))
          .map((entry) => entry.sourceId)
          .filter((sourceId): sourceId is string => typeof sourceId === 'string' && Types.ObjectId.isValid(sourceId)),
      ),
    ];
    if (paymentIds.length === 0) return;

    const payments = await this.paymentModel
      .find({ _id: { $in: paymentIds.map((id) => new Types.ObjectId(id)) } })
      .select('checkoutReference purpose amount subtotalAmount creditAppliedAmount refundedAmount refundedAt refundReason currency')
      .exec();
    const paymentsById = new Map(payments.map((payment) => [payment._id.toString(), payment]));

    for (const entry of entries) {
      if (!entry.sourceId) continue;
      const payment = paymentsById.get(entry.sourceId);
      if (!payment) continue;
      entry.metadata = {
        ...(entry.metadata || {}),
        checkoutReference: payment.checkoutReference,
        paymentPurpose: payment.purpose,
        originalAmount: payment.amount,
        subtotalAmount: payment.subtotalAmount,
        creditAppliedAmount: payment.creditAppliedAmount,
        refundedAmount: payment.refundedAmount,
        refundedAt: payment.refundedAt,
        refundReason: payment.refundReason,
        currency: payment.currency,
      };
    }
  }

  private serializeAccount(account: WalletAccountDocument) {
    return {
      id: account._id.toString(),
      userId: account.userId.toString(),
      accountType: account.accountType,
      currency: account.currency,
      availableBalance: Number(account.availableBalance || 0),
      heldBalance: Number(account.heldBalance || 0),
      withdrawable: this.isWithdrawableAccountType(account.accountType),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid wallet amount');
    }
  }

  private normalizeAccountType(value: WalletAccountType | string): WalletAccountType {
    if (WALLET_ACCOUNT_TYPES.includes(value as WalletAccountType)) {
      return value as WalletAccountType;
    }
    throw new BadRequestException('Invalid wallet account type');
  }

  private normalizeWithdrawableAccountType(value: WalletAccountType | string): WalletAccountType {
    const accountType = this.normalizeAccountType(value);
    if (!this.isWithdrawableAccountType(accountType)) {
      throw new ConflictException('This wallet balance cannot be withdrawn');
    }
    return accountType;
  }

  private isWithdrawableAccountType(value: WalletAccountType): boolean {
    return (WITHDRAWABLE_ACCOUNT_TYPES as readonly WalletAccountType[]).includes(value);
  }

  private validateBankAccountSnapshot(value?: Record<string, unknown>): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Bank account info is required');
    }
    const bankName = this.readRequiredString(value.bankName, 'bankName');
    const accountNumber = this.readRequiredString(value.accountNumber, 'accountNumber');
    const accountHolderName = this.readRequiredString(value.accountHolderName, 'accountHolderName');
    return {
      ...value,
      bankName,
      accountNumber,
      accountHolderName,
    };
  }

  private readRequiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    return value.trim();
  }
}
