import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WalletAccount,
  WalletAccountDocument,
  WalletCurrency,
  WalletLedgerEntry,
  WalletLedgerEntryDocument,
  WalletLedgerEntryType,
} from '../schemas';
import { Payment, PaymentDocument } from '../../payment/schema/payment.schema';

interface WalletOperationInput {
  userId: string;
  amount: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletAccount.name)
    private readonly walletAccountModel: Model<WalletAccountDocument>,
    @InjectModel(WalletLedgerEntry.name)
    private readonly walletLedgerEntryModel: Model<WalletLedgerEntryDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async getMyWallet(userId: string): Promise<WalletAccountDocument> {
    return this.getOrCreateAccount(userId);
  }

  async listTransactions(userId: string): Promise<WalletLedgerEntryDocument[]> {
    const account = await this.getOrCreateAccount(userId);
    const entries = await this.walletLedgerEntryModel
      .find({ walletAccountId: account._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    await this.hydratePaymentMetadata(entries);
    return entries;
  }

  async getAvailableBalance(userId: string): Promise<number> {
    const account = await this.getOrCreateAccount(userId);
    return Number(account.availableBalance || 0);
  }

  async credit(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    return this.increaseAvailable(input, WalletLedgerEntryType.CREDIT);
  }

  async refund(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    return this.increaseAvailable(input, WalletLedgerEntryType.REFUND);
  }

  async debit(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    this.validateAmount(input.amount);
    const account = await this.getOrCreateAccount(input.userId);
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: account._id, availableBalance: { $gte: input.amount } },
        { $inc: { availableBalance: -input.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Số dư Edumee không đủ');

    return this.createLedgerEntry(updated, WalletLedgerEntryType.DEBIT, input);
  }

  async hold(input: WalletOperationInput): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    this.validateAmount(input.amount);
    const account = await this.getOrCreateAccount(input.userId);
    const updated = await this.walletAccountModel
      .findOneAndUpdate(
        { _id: account._id, availableBalance: { $gte: input.amount } },
        { $inc: { availableBalance: -input.amount, heldBalance: input.amount } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Số dư Edumee không đủ');

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
    if (!updated) throw new ConflictException('Không thể capture số dư đang giữ');

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
    if (!updated) throw new ConflictException('Không thể hoàn lại số dư đang giữ');

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

  private async increaseAvailable(
    input: WalletOperationInput,
    type: WalletLedgerEntryType.CREDIT | WalletLedgerEntryType.REFUND,
  ): Promise<WalletLedgerEntryDocument> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    this.validateAmount(input.amount);
    const account = await this.getOrCreateAccount(input.userId);
    const updated = await this.walletAccountModel
      .findByIdAndUpdate(account._id, { $inc: { availableBalance: input.amount } }, { new: true })
      .exec();
    if (!updated) throw new ConflictException('Không thể cập nhật số dư Edumee');

    return this.createLedgerEntry(updated, type, input);
  }

  private async getOrCreateAccount(userId: string): Promise<WalletAccountDocument> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    const userObjectId = new Types.ObjectId(userId);
    return this.walletAccountModel
      .findOneAndUpdate(
        { userId: userObjectId, currency: WalletCurrency.VND },
        {
          $setOnInsert: {
            userId: userObjectId,
            currency: WalletCurrency.VND,
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
      metadata: input.metadata,
    });
  }

  private async hydratePaymentMetadata(entries: WalletLedgerEntryDocument[]): Promise<void> {
    const paymentIds = [
      ...new Set(
        entries
          .filter((entry) => ['payment', 'payment_refund'].includes(entry.sourceType || ''))
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

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid wallet amount');
    }
  }
}
