import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { SePayPgClient } from 'sepay-pg-node';
import { Model, Types } from 'mongoose';
import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import { AiPlanPricingSummary, AiPlanService } from '../../ai/services/ai-plan.service';
import { AiSubscriptionService } from '../../ai/services/ai-subscription.service';
import {
  CreateAiPlanPurchaseDto,
  PaymentWebhookTestDto,
  RefundPaymentDto,
  TestPaymentEventType,
} from '../dto';
import {
  DEFAULT_SEPAY_CHECKOUT_TOKEN_TTL_MS,
  SepayPaymentMethod,
} from '../payment.constants';
import {
  Payment,
  PaymentDocument,
  PaymentProvider,
  PaymentStatus,
} from '../schema/payment.schema';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentTransactionStatus,
} from '../schema/payment-transaction.schema';

type CheckoutFieldValue = string | number | undefined;

type PaymentProcessingResult = {
  payment: PaymentDocument;
  idempotent: boolean;
};

type SepayOrderSnapshot = {
  orderInvoiceNumber?: string;
  orderStatus?: string;
  orderId?: string;
  transactionId?: string;
  raw: Record<string, unknown>;
};

type SepayApplyEventParams = {
  eventId: string;
  payload: Record<string, unknown>;
  providerPaymentId?: string;
  providerTransactionId?: string;
  failureReason?: string;
  outcome: 'paid' | 'failed' | 'cancelled' | 'ignored';
  source: 'ipn' | 'sync';
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentTransaction.name)
    private readonly paymentTransactionModel: Model<PaymentTransactionDocument>,
    private readonly aiPlanService: AiPlanService,
    private readonly aiSubscriptionService: AiSubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  async purchaseAiPlan(
    userId: string,
    dto: CreateAiPlanPurchaseDto,
  ): Promise<{
    paymentId: string;
    checkoutReference: string;
    redirectUrl: string;
  }> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(dto.planId)) throw new BadRequestException('Invalid planId');

    const activeSubscription = await this.aiSubscriptionService.getActiveSubscriptionForUser(userId);
    if (activeSubscription) {
      throw new ConflictException('User already has an active AI subscription');
    }

    const reusablePendingPayment = await this.findReusablePendingAiPlanPayment(userId);
    if (reusablePendingPayment) {
      const refreshedCheckout = await this.refreshCheckoutTokenForPayment(reusablePendingPayment);
      return {
        paymentId: reusablePendingPayment._id.toString(),
        checkoutReference: reusablePendingPayment.checkoutReference || this.generateCheckoutReference(),
        redirectUrl: this.buildCheckoutRedirectUrl(refreshedCheckout.token),
      };
    }

    const plan = await this.aiPlanService.findOne(dto.planId);
    if (plan.price <= 0) {
      throw new BadRequestException('Selected plan is not purchasable until a positive price is configured');
    }

    const checkoutReference = this.generateCheckoutReference();
    const checkoutToken = this.generateCheckoutToken();
    const checkoutTokenHash = this.hashCheckoutToken(checkoutToken);
    const checkoutTokenExpiresAt = new Date(Date.now() + DEFAULT_SEPAY_CHECKOUT_TOKEN_TTL_MS);
    const pricing: AiPlanPricingSummary = this.aiPlanService.calculatePricing(plan, dto.billingCycle);
    const payment = new this.paymentModel({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(dto.planId),
      billingCycle: dto.billingCycle,
      amount: pricing.total,
      currency: plan.currency || 'USD',
      provider: PaymentProvider.SEPAY,
      paymentMethod: dto.paymentMethod || SepayPaymentMethod.BANK_TRANSFER,
      checkoutReference,
      checkoutTokenHash,
      checkoutTokenExpiresAt,
      successUrl: dto.returnUrls?.success,
      errorUrl: dto.returnUrls?.error,
      cancelUrl: dto.returnUrls?.cancel,
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await payment.save();
    return {
      paymentId: savedPayment._id.toString(),
      checkoutReference,
      redirectUrl: this.buildCheckoutRedirectUrl(checkoutToken),
    };
  }

  async syncSepayPayment(id: string, actor: AuthUserLike): Promise<{
    payment: PaymentDocument;
    idempotent: boolean;
    order: Record<string, unknown>;
  }> {
    const { payment } = await this.findOneForActor(id, actor);
    if (payment.provider !== PaymentProvider.SEPAY) {
      throw new BadRequestException('Payment provider is not SePay');
    }
    return this.syncSepayPaymentWithGateway(payment);
  }

  async handleSepayIpn(
    secretKey: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<{
    received: boolean;
    processed: boolean;
    idempotent?: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    reason?: string;
  }> {
    const expectedSecret = this.getSepayIpnSecret();
    if (!secretKey || secretKey !== expectedSecret) {
      throw new UnauthorizedException('Invalid SePay IPN secret');
    }

    const record = this.ensureRecord(payload);
    const orderInvoiceNumber = this.readString(record.order_invoice_number);
    if (!orderInvoiceNumber) {
      return {
        received: true,
        processed: false,
        reason: 'missing_order_invoice_number',
      };
    }

    const payment = await this.paymentModel
      .findOne({
        provider: PaymentProvider.SEPAY,
        checkoutReference: orderInvoiceNumber,
      })
      .exec();

    if (!payment) {
      return {
        received: true,
        processed: false,
        reason: 'payment_not_found',
      };
    }

    const notificationType = this.readString(record.notification_type);
    const transaction = this.ensureRecord(record.transaction);
    const providerTransactionId =
      this.readString(transaction.transaction_id) ||
      this.readString(record.transaction_id);
    const providerPaymentId =
      this.readString(transaction.order_id) ||
      this.readString(record.order_id);

    const processing = await this.applySepayEvent(payment, {
      eventId: this.buildSepayIpnEventId(orderInvoiceNumber, notificationType, providerTransactionId),
      payload: record,
      providerPaymentId,
      providerTransactionId,
      failureReason: notificationType
        ? `SePay notification ${notificationType}`
        : 'Unhandled SePay IPN notification',
      outcome: this.mapSepayNotificationOutcome(notificationType),
      source: 'ipn',
    });

    return {
      received: true,
      processed: processing.payment.status !== PaymentStatus.PENDING,
      idempotent: processing.idempotent,
      paymentId: payment._id.toString(),
      status: processing.payment.status,
    };
  }

  async handleVerifiedPaymentEvent(dto: PaymentWebhookTestDto): Promise<{
    payment: PaymentDocument;
    idempotent: boolean;
  }> {
    if (!Types.ObjectId.isValid(dto.paymentId)) throw new BadRequestException('Invalid paymentId');

    const payment = await this.paymentModel.findById(dto.paymentId).exec();
    if (!payment) throw new NotFoundException('Payment not found');

    if (dto.eventType === TestPaymentEventType.PAYMENT_SUCCEEDED) {
      return this.markPaymentPaid(payment, {
        eventId: dto.eventId,
        providerPaymentId: dto.providerPaymentId,
        providerTransactionId: dto.providerTransactionId,
        payload: dto.payload || {},
        sourceLabel: 'verified webhook',
      });
    }

    return this.markPaymentFailed(payment, {
      eventId: dto.eventId,
      providerPaymentId: dto.providerPaymentId,
      providerTransactionId: dto.providerTransactionId,
      failureReason: dto.failureReason || 'Payment failed in verified test webhook flow',
      payload: dto.payload || {},
      sourceLabel: 'verified webhook',
    });
  }

  async refundPayment(id: string, dto: RefundPaymentDto): Promise<{
    payment: PaymentDocument;
    revokedSubscription: boolean;
  }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid payment id');

    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID) {
      throw new ConflictException('Only paid payments can be refunded');
    }

    const refundAmount = dto.amount ?? payment.amount;
    if (refundAmount !== payment.amount) {
      throw new BadRequestException('Partial refunds are not supported in this v1 flow');
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.refundReason = dto.reason || 'Admin refund';
    await payment.save();

    await this.paymentTransactionModel.create({
      paymentId: payment._id,
      eventId: `manual-refund-${payment._id.toString()}`,
      eventType: 'payment_refunded',
      status: PaymentTransactionStatus.SUCCESS,
      payload: { refundAmount, reason: payment.refundReason },
    });

    const revokedSubscription = await this.aiSubscriptionService.revokeSubscriptionForPayment(payment._id.toString());
    return { payment, revokedSubscription: Boolean(revokedSubscription) };
  }

  async findMine(userId: string): Promise<PaymentDocument[]> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    return this.paymentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOneForActor(id: string, actor: AuthUserLike): Promise<{
    payment: PaymentDocument;
    transactions: PaymentTransactionDocument[];
  }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid payment id');
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) throw new NotFoundException('Payment not found');

    const actorId = getAuthUserId(actor);
    if (!isAdmin(actor) && payment.userId.toString() !== actorId) {
      throw new ForbiddenException('Forbidden');
    }

    return {
      payment,
      transactions: await this.listTransactionsForPayment(payment._id),
    };
  }

  async renderSepayCheckoutPage(token: string): Promise<string> {
    const payment = await this.findPendingPaymentByCheckoutToken(token);

    if (!payment) {
      return this.buildCheckoutErrorPageHtml(
        'Checkout unavailable',
        'This checkout link is invalid, expired, or no longer available.',
      );
    }

    if (payment.provider !== PaymentProvider.SEPAY) {
      return this.buildCheckoutErrorPageHtml(
        'Unsupported provider',
        'This payment link does not belong to the SePay web purchase flow.',
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return this.buildCheckoutErrorPageHtml(
        'Checkout already closed',
        `This payment is already ${payment.status} and can no longer be sent to SePay.`,
      );
    }

    const checkout = this.buildSepayCheckout(payment);
    return this.buildSepayCheckoutPageHtml(payment, checkout.url, checkout.fields);
  }

  async renderPaymentReturnPage(
    expectedStatus: 'success' | 'error' | 'cancel',
    paymentId: string,
  ): Promise<string> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new BadRequestException('Invalid payment id');
    }

    const foundPayment = await this.paymentModel.findById(paymentId).exec();
    if (!foundPayment) throw new NotFoundException('Payment not found');
    let payment: PaymentDocument = foundPayment;

    if (payment.provider === PaymentProvider.SEPAY && payment.checkoutReference) {
      try {
        const synced = await this.syncSepayPaymentWithGateway(payment);
        payment = synced.payment;
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof ConflictException ||
          error instanceof ServiceUnavailableException
        ) {
          // Keep the current persisted payment state when sync cannot confirm a final gateway result.
        } else {
          throw error;
        }
      }
    }

    const latestTransaction = await this.findLatestTransactionForPayment(payment._id);
    return this.buildPaymentReturnHtml(expectedStatus, payment, latestTransaction);
  }

  private async syncSepayPaymentWithGateway(payment: PaymentDocument): Promise<{
    payment: PaymentDocument;
    idempotent: boolean;
    order: Record<string, unknown>;
  }> {
    if (!payment.checkoutReference) {
      throw new ConflictException('SePay payment is missing checkoutReference');
    }

    const client = this.getSepayClient();
    const response = await client.order.retrieve(payment.checkoutReference);
    const snapshot = this.extractSepayOrderSnapshot(response.data);
    const processing = await this.applySepayEvent(payment, {
      eventId: this.buildSepaySyncEventId(payment.checkoutReference, snapshot.orderStatus),
      payload: this.ensureRecord(response.data),
      providerPaymentId: snapshot.orderId,
      providerTransactionId: snapshot.transactionId,
      failureReason: snapshot.orderStatus
        ? `SePay order status ${snapshot.orderStatus}`
        : 'Unable to confirm SePay payment',
      outcome: this.mapSepayOrderOutcome(snapshot.orderStatus),
      source: 'sync',
    });

    return {
      ...processing,
      order: snapshot.raw,
    };
  }

  private buildSepayCheckout(
    payment: PaymentDocument,
  ): {
    type: 'form_post';
    method: 'POST';
    url: string;
    fields: Record<string, CheckoutFieldValue>;
  } {
    const client = this.getSepayClient();
    const checkoutURL = client.checkout.initCheckoutUrl();
    const checkoutFormFields = client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method: payment.paymentMethod || SepayPaymentMethod.BANK_TRANSFER,
      order_invoice_number: payment.checkoutReference || this.generateCheckoutReference(),
      order_amount: payment.amount,
      currency: payment.currency,
      order_description: `Thanh toan don hang ${payment.checkoutReference}`,
      customer_id: payment.userId.toString(),
      success_url: this.resolveCheckoutReturnUrl('success', payment),
      error_url: this.resolveCheckoutReturnUrl('error', payment),
      cancel_url: this.resolveCheckoutReturnUrl('cancel', payment),
      custom_data: JSON.stringify({
        paymentId: payment._id.toString(),
        checkoutReference: payment.checkoutReference,
        provider: payment.provider,
      }),
    });

    return {
      type: 'form_post',
      method: 'POST',
      url: checkoutURL,
      fields: checkoutFormFields,
    };
  }

  private resolveCheckoutReturnUrl(
    status: 'success' | 'error' | 'cancel',
    payment: PaymentDocument,
  ): string | undefined {
    const providedUrl = this.getStoredReturnUrl(status, payment);
    if (providedUrl) {
      return this.attachPaymentIdToReturnUrl(providedUrl, payment._id.toString());
    }

    const baseUrl =
      this.configService.get<string>('PAYMENT_RETURN_BASE_URL') ||
      this.configService.get<string>('CLIENT_APP_URL') ||
      this.configService.get<string>('app.corsOrigin');

    if (!baseUrl) return undefined;

    try {
      const url = new URL(baseUrl);
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/${status}`;
      url.searchParams.set('paymentId', payment._id.toString());
      return url.toString();
    } catch {
      const normalizedBase = baseUrl.replace(/\/+$/, '');
      return `${normalizedBase}/${status}?paymentId=${encodeURIComponent(payment._id.toString())}`;
    }
  }

  private attachPaymentIdToReturnUrl(urlValue: string, paymentId: string): string {
    try {
      const url = new URL(urlValue);
      url.searchParams.set('paymentId', paymentId);
      return url.toString();
    } catch {
      const separator = urlValue.includes('?') ? '&' : '?';
      return `${urlValue}${separator}paymentId=${encodeURIComponent(paymentId)}`;
    }
  }

  private getSepayClient(): SePayPgClient {
    const merchantId = this.configService.get<string>('SEPAY_MERCHANT_ID');
    const secretKey = this.configService.get<string>('SEPAY_SECRET_KEY');
    const env = this.configService.get<'sandbox' | 'production'>('SEPAY_ENV', 'sandbox');

    if (!merchantId || !secretKey) {
      throw new BadRequestException('SePay credentials are not configured');
    }

    return new SePayPgClient({
      env,
      merchant_id: merchantId,
      secret_key: secretKey,
    });
  }

  private getSepayIpnSecret(): string {
    const ipnSecret = this.configService.get<string>('SEPAY_IPN_SECRET_KEY');
    const secretKey = this.configService.get<string>('SEPAY_SECRET_KEY');
    if (ipnSecret) return ipnSecret;
    if (secretKey) return secretKey;
    throw new BadRequestException('SePay IPN secret is not configured');
  }

  private async applySepayEvent(
    payment: PaymentDocument,
    params: SepayApplyEventParams,
  ): Promise<PaymentProcessingResult> {
    switch (params.outcome) {
      case 'paid':
        return this.markPaymentPaid(payment, {
          eventId: params.eventId,
          providerPaymentId: params.providerPaymentId,
          providerTransactionId: params.providerTransactionId,
          payload: params.payload,
          sourceLabel: params.source,
        });
      case 'failed':
        return this.markPaymentFailed(payment, {
          eventId: params.eventId,
          providerPaymentId: params.providerPaymentId,
          providerTransactionId: params.providerTransactionId,
          failureReason: params.failureReason,
          payload: params.payload,
          sourceLabel: params.source,
        });
      case 'cancelled':
        return this.markPaymentCancelled(payment, {
          eventId: params.eventId,
          providerPaymentId: params.providerPaymentId,
          providerTransactionId: params.providerTransactionId,
          failureReason: params.failureReason,
          payload: params.payload,
          sourceLabel: params.source,
        });
      case 'ignored':
      default:
        return {
          payment,
          idempotent: true,
        };
    }
  }

  private async markPaymentPaid(
    payment: PaymentDocument,
    params: {
      eventId: string;
      providerPaymentId?: string;
      providerTransactionId?: string;
      payload: Record<string, unknown>;
      sourceLabel: string;
    },
  ): Promise<PaymentProcessingResult> {
    const existingEvent = await this.findExistingEvent(payment, params.eventId);
    if (existingEvent) {
      return {
        payment,
        idempotent: true,
      };
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        payment,
        idempotent: true,
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`Payment is not in a mutable pending state for ${params.sourceLabel}`);
    }

    if (!payment.planId) {
      throw new ConflictException('Payment is missing a linked AI plan');
    }

    payment.status = PaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.failureReason = undefined;
    payment.providerPaymentId = params.providerPaymentId || payment.providerPaymentId;
    await payment.save();

    await this.aiSubscriptionService.activateSubscriptionFromPayment({
      userId: payment.userId.toString(),
      planId: payment.planId.toString(),
      paymentId: payment._id.toString(),
      billingCycle: payment.billingCycle,
      startDate: payment.paidAt,
    });

    await this.paymentTransactionModel.create({
      paymentId: payment._id,
      eventId: params.eventId,
      providerTransactionId: params.providerTransactionId,
      eventType: 'payment_succeeded',
      status: PaymentTransactionStatus.SUCCESS,
      payload: params.payload,
    });

    return { payment, idempotent: false };
  }

  private async markPaymentFailed(
    payment: PaymentDocument,
    params: {
      eventId: string;
      providerPaymentId?: string;
      providerTransactionId?: string;
      failureReason?: string;
      payload: Record<string, unknown>;
      sourceLabel: string;
    },
  ): Promise<PaymentProcessingResult> {
    const existingEvent = await this.findExistingEvent(payment, params.eventId);
    if (existingEvent) {
      return {
        payment,
        idempotent: true,
      };
    }

    if (payment.status === PaymentStatus.FAILED) {
      return {
        payment,
        idempotent: true,
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`Payment is not in a mutable pending state for ${params.sourceLabel}`);
    }

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = params.failureReason || 'Payment failed';
    payment.providerPaymentId = params.providerPaymentId || payment.providerPaymentId;
    await payment.save();

    await this.paymentTransactionModel.create({
      paymentId: payment._id,
      eventId: params.eventId,
      providerTransactionId: params.providerTransactionId,
      eventType: 'payment_failed',
      status: PaymentTransactionStatus.FAILED,
      payload: params.payload,
    });

    return { payment, idempotent: false };
  }

  private async markPaymentCancelled(
    payment: PaymentDocument,
    params: {
      eventId: string;
      providerPaymentId?: string;
      providerTransactionId?: string;
      failureReason?: string;
      payload: Record<string, unknown>;
      sourceLabel: string;
    },
  ): Promise<PaymentProcessingResult> {
    const existingEvent = await this.findExistingEvent(payment, params.eventId);
    if (existingEvent) {
      return {
        payment,
        idempotent: true,
      };
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      return {
        payment,
        idempotent: true,
      };
    }

    if (payment.status === PaymentStatus.PAID) {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundReason = params.failureReason || 'SePay transaction voided';
      payment.providerPaymentId = params.providerPaymentId || payment.providerPaymentId;
      await payment.save();

      await this.paymentTransactionModel.create({
        paymentId: payment._id,
        eventId: params.eventId,
        providerTransactionId: params.providerTransactionId,
        eventType: 'payment_refunded',
        status: PaymentTransactionStatus.SUCCESS,
        payload: params.payload,
      });

      await this.aiSubscriptionService.revokeSubscriptionForPayment(payment._id.toString());
      return {
        payment,
        idempotent: false,
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`Payment is not in a mutable pending state for ${params.sourceLabel}`);
    }

    payment.status = PaymentStatus.CANCELLED;
    payment.failureReason = params.failureReason || 'Payment cancelled';
    payment.providerPaymentId = params.providerPaymentId || payment.providerPaymentId;
    await payment.save();

    await this.paymentTransactionModel.create({
      paymentId: payment._id,
      eventId: params.eventId,
      providerTransactionId: params.providerTransactionId,
      eventType: 'payment_cancelled',
      status: PaymentTransactionStatus.FAILED,
      payload: params.payload,
    });

    return { payment, idempotent: false };
  }

  private async findExistingEvent(
    payment: PaymentDocument,
    eventId: string,
  ): Promise<PaymentTransactionDocument | null> {
    return this.paymentTransactionModel
      .findOne({
        paymentId: payment._id,
        eventId,
      })
      .exec();
  }

  private extractSepayOrderSnapshot(payload: unknown): SepayOrderSnapshot {
    const topLevel = this.ensureRecord(payload);
    const levelOne = this.ensureRecord(topLevel.data);
    const levelTwo = this.ensureRecord(levelOne.data);
    const candidate = this.readString(levelTwo.order_invoice_number)
      ? levelTwo
      : this.readString(levelOne.order_invoice_number)
        ? levelOne
        : topLevel;

    const transaction = this.ensureRecord(candidate.transaction);

    return {
      orderInvoiceNumber: this.readString(candidate.order_invoice_number),
      orderStatus: this.readString(candidate.order_status),
      orderId: this.readString(candidate.order_id) || this.readString(transaction.order_id),
      transactionId:
        this.readString(transaction.transaction_id) ||
        this.readString(candidate.transaction_id),
      raw: candidate,
    };
  }

  private mapSepayOrderOutcome(status?: string): SepayApplyEventParams['outcome'] {
    const normalized = status?.trim().toUpperCase();
    if (!normalized) return 'ignored';
    if (['CAPTURED', 'COMPLETED', 'SUCCESS', 'PAID'].includes(normalized)) return 'paid';
    if (['VOIDED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(normalized)) return 'cancelled';
    if (['FAILED', 'DECLINED', 'ERROR'].includes(normalized)) return 'failed';
    return 'ignored';
  }

  private mapSepayNotificationOutcome(
    notificationType?: string,
  ): SepayApplyEventParams['outcome'] {
    const normalized = notificationType?.trim().toUpperCase();
    if (!normalized) return 'ignored';
    if (normalized === 'ORDER_PAID') return 'paid';
    if (normalized === 'TRANSACTION_VOID') return 'cancelled';
    return 'ignored';
  }

  private buildSepayIpnEventId(
    orderInvoiceNumber: string,
    notificationType?: string,
    providerTransactionId?: string,
  ): string {
    return [
      'sepay-ipn',
      notificationType || 'unknown',
      orderInvoiceNumber,
      providerTransactionId || 'na',
    ].join('-');
  }

  private buildSepaySyncEventId(orderInvoiceNumber: string, orderStatus?: string): string {
    return ['sepay-sync', orderStatus || 'unknown', orderInvoiceNumber].join('-');
  }

  private ensureRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private getStoredReturnUrl(
    status: 'success' | 'error' | 'cancel',
    payment: PaymentDocument,
  ): string | undefined {
    switch (status) {
      case 'success':
        return payment.successUrl;
      case 'error':
        return payment.errorUrl;
      case 'cancel':
        return payment.cancelUrl;
      default:
        return undefined;
    }
  }

  private async findReusablePendingAiPlanPayment(
    userId: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        userId: new Types.ObjectId(userId),
        provider: PaymentProvider.SEPAY,
        status: PaymentStatus.PENDING,
        planId: { $exists: true, $ne: null },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async refreshCheckoutTokenForPayment(
    payment: PaymentDocument,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateCheckoutToken();
    const expiresAt = new Date(Date.now() + DEFAULT_SEPAY_CHECKOUT_TOKEN_TTL_MS);

    payment.checkoutTokenHash = this.hashCheckoutToken(token);
    payment.checkoutTokenExpiresAt = expiresAt;
    await payment.save();

    return { token, expiresAt };
  }

  private generateCheckoutToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashCheckoutToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildCheckoutRedirectUrl(token: string): string {
    const configuredBaseUrl = this.configService.get<string>('PAYMENT_PUBLIC_BASE_URL');
    const appPort = this.configService.get<number>('app.port', 3001);
    const baseUrl = configuredBaseUrl || `http://localhost:${appPort}`;
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/payments/sepay/checkout/${encodeURIComponent(token)}`;
  }

  private async findPendingPaymentByCheckoutToken(
    token: string,
  ): Promise<PaymentDocument | null> {
    if (!token?.trim()) return null;

    const payment = await this.paymentModel
      .findOne({ checkoutTokenHash: this.hashCheckoutToken(token) })
      .exec();

    if (!payment?.checkoutTokenExpiresAt) return null;
    if (payment.checkoutTokenExpiresAt.getTime() < Date.now()) return null;
    return payment;
  }

  private async findLatestTransactionForPayment(
    paymentId: Types.ObjectId,
  ): Promise<PaymentTransactionDocument | null> {
    return this.paymentTransactionModel.findOne({ paymentId }).sort({ createdAt: -1 }).exec();
  }

  private async listTransactionsForPayment(
    paymentId: Types.ObjectId,
  ): Promise<PaymentTransactionDocument[]> {
    return this.paymentTransactionModel.find({ paymentId }).sort({ createdAt: -1 }).exec();
  }

  private buildSepayCheckoutPageHtml(
    payment: PaymentDocument,
    actionUrl: string,
    fields: Record<string, CheckoutFieldValue>,
  ): string {
    const checkoutReference = payment.checkoutReference || 'N/A';
    const orderDescription = `Thanh toán chuyển khoản đơn hàng ${checkoutReference}`;
    const formattedAmount = this.formatPaymentAmount(payment.amount, payment.currency);
    const hiddenInputs = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${this.escapeHtml(name)}" value="${this.escapeHtml(String(value))}" />`,
      )
      .join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Xác nhận thanh toán SePay</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(180deg, #f3f6fb 0%, #e9eef9 100%);
      font-family: Arial, sans-serif;
      color: #101828;
    }
    .shell {
      width: 100%;
      max-width: 640px;
      border-radius: 28px;
      background: linear-gradient(90deg, #6c63ff 0%, #24c8d3 52%, #19d38a 100%);
      padding: 4px;
      box-shadow: 0 28px 60px rgba(17, 24, 39, 0.16);
    }
    .card {
      border-radius: 24px;
      background: #ffffff;
      padding: 48px 52px;
      box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 44px;
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(108, 99, 255, 0.12);
      color: #5b46ff;
      font-size: 26px;
      font-weight: 700;
    }
    .title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #111827;
    }
    .meta {
      display: grid;
      gap: 14px;
      margin-bottom: 40px;
    }
    .meta-item {
      font-size: 20px;
      line-height: 1.45;
      color: #4b5563;
    }
    .meta-label {
      font-weight: 500;
      color: #1f2937;
    }
    .meta-value {
      font-weight: 600;
      color: #6b7280;
    }
    .amount {
      margin: 0 0 44px;
      text-align: center;
      font-size: 72px;
      line-height: 1;
      font-weight: 500;
      letter-spacing: -0.04em;
      color: #111827;
    }
    .submit-button {
      width: 100%;
      border: 0;
      border-radius: 18px;
      padding: 20px 24px;
      font-size: 22px;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      background: linear-gradient(90deg, #5b34f2 0%, #4f39f5 48%, #5137f0 100%);
      box-shadow: 0 18px 30px rgba(91, 52, 242, 0.28);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .submit-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 22px 36px rgba(91, 52, 242, 0.32);
    }
    .helper {
      margin-top: 18px;
      text-align: center;
      font-size: 14px;
      color: #667085;
    }
    @media (max-width: 640px) {
      .card { padding: 32px 24px; }
      .title { font-size: 24px; }
      .meta-item { font-size: 17px; }
      .amount { font-size: 56px; margin-bottom: 32px; }
      .submit-button { font-size: 20px; padding: 18px 20px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="card">
      <div class="header">
        <div class="icon">⌘</div>
        <h1 class="title">Thông tin đơn hàng</h1>
      </div>
      <div class="meta">
        <div class="meta-item">
          <span class="meta-label">Mã hóa đơn:</span>
          <span class="meta-value">${this.escapeHtml(checkoutReference)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Mô tả:</span>
          <span class="meta-value">${this.escapeHtml(orderDescription)}</span>
        </div>
      </div>
      <div class="amount">${this.escapeHtml(formattedAmount)}</div>
      <form method="POST" action="${this.escapeHtml(actionUrl)}">
        ${hiddenInputs}
        <button class="submit-button" type="submit">Thanh toán ngay</button>
      </form>
      <p class="helper">Bạn sẽ được chuyển sang cổng thanh toán SePay để hoàn tất đơn hàng.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private buildCheckoutErrorPageHtml(title: string, message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; color: #1f2937; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 64px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); padding: 32px; }
    h1 { margin: 0 0 12px; font-size: 28px; color: #dc2626; }
    p { margin: 0; line-height: 1.7; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${this.escapeHtml(title)}</h1>
    <p>${this.escapeHtml(message)}</p>
  </div>
</body>
</html>`;
  }

  private buildPaymentReturnHtml(
    expectedStatus: 'success' | 'error' | 'cancel',
    payment: PaymentDocument,
    latestTransaction: PaymentTransactionDocument | null,
  ): string {
    const visual = this.getPaymentReturnVisual(payment.status, expectedStatus);
    const checkoutReference = payment.checkoutReference || 'N/A';
    const transactionStatus = latestTransaction?.status || 'not_recorded';
    const transactionType = latestTransaction?.eventType || 'not_recorded';
    const providerTransactionId = latestTransaction?.providerTransactionId || 'Not recorded';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHtml(visual.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7fb; color: #1f2937; margin: 0; padding: 24px; }
    .card { max-width: 640px; margin: 48px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); overflow: hidden; }
    .banner { padding: 20px 24px; color: #ffffff; font-weight: 700; background: ${visual.bannerColor}; }
    .content { padding: 24px; }
    .content h1 { margin: 0 0 12px; font-size: 28px; }
    .content p { margin: 0 0 16px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
    .item { background: #f8fafc; border-radius: 12px; padding: 14px; }
    .label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px; }
    .value { font-size: 16px; font-weight: 600; color: #0f172a; word-break: break-word; }
    .hint { margin-top: 20px; font-size: 14px; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <div class="banner">${this.escapeHtml(visual.bannerLabel)}</div>
    <div class="content">
      <h1>${this.escapeHtml(visual.title)}</h1>
      <p>${this.escapeHtml(visual.message)}</p>
      <div class="grid">
        <div class="item">
          <span class="label">Payment status</span>
          <span class="value">${this.escapeHtml(payment.status)}</span>
        </div>
        <div class="item">
          <span class="label">Transaction status</span>
          <span class="value">${this.escapeHtml(transactionStatus)}</span>
        </div>
        <div class="item">
          <span class="label">Transaction type</span>
          <span class="value">${this.escapeHtml(transactionType)}</span>
        </div>
        <div class="item">
          <span class="label">Checkout reference</span>
          <span class="value">${this.escapeHtml(checkoutReference)}</span>
        </div>
        <div class="item">
          <span class="label">Amount</span>
          <span class="value">${this.escapeHtml(`${payment.amount} ${payment.currency}`)}</span>
        </div>
        <div class="item">
          <span class="label">Provider transaction id</span>
          <span class="value">${this.escapeHtml(providerTransactionId)}</span>
        </div>
      </div>
      <p class="hint">Payment ID: ${this.escapeHtml(payment._id.toString())}</p>
      <p class="hint">${this.escapeHtml(visual.hint)}</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getPaymentReturnVisual(
    paymentStatus: PaymentStatus,
    expectedStatus: 'success' | 'error' | 'cancel',
  ): {
    title: string;
    message: string;
    hint: string;
    bannerLabel: string;
    bannerColor: string;
  } {
    switch (paymentStatus) {
      case PaymentStatus.PAID:
        return {
          title: 'Payment successful',
          message: 'Your payment has been confirmed and your AI plan is now active.',
          hint: 'You can continue using the plan features that belong to this subscription.',
          bannerLabel: 'Success',
          bannerColor: '#16a34a',
        };
      case PaymentStatus.FAILED:
        return {
          title: 'Payment failed',
          message: 'The gateway did not confirm this payment successfully.',
          hint: 'Please try again or create a new payment attempt.',
          bannerLabel: 'Failed',
          bannerColor: '#dc2626',
        };
      case PaymentStatus.CANCELLED:
        return {
          title: 'Payment cancelled',
          message: 'This payment was cancelled before it was completed.',
          hint: 'You can start a new checkout whenever you are ready.',
          bannerLabel: 'Cancelled',
          bannerColor: '#f59e0b',
        };
      case PaymentStatus.REFUNDED:
        return {
          title: 'Payment refunded',
          message: 'The payment was reversed and any linked subscription has been revoked.',
          hint: 'Contact support if you did not expect this change.',
          bannerLabel: 'Refunded',
          bannerColor: '#7c3aed',
        };
      case PaymentStatus.PENDING:
      default:
        return {
          title: 'Payment is still pending',
          message: `The gateway returned to the ${expectedStatus} page, but the backend has not confirmed a final payment result yet.`,
          hint: 'Refresh this page later or wait for the payment notification to arrive.',
          bannerLabel: 'Pending',
          bannerColor: '#2563eb',
        };
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatPaymentAmount(amount: number, currency: string): string {
    if (currency.toUpperCase() === 'VND') {
      return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private generateCheckoutReference(): string {
    return `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}
