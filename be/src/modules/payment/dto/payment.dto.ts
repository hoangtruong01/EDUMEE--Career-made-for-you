import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { SepayPaymentMethod } from '../payment.constants';
import { PaymentProvider, PaymentPurpose } from '../schema/payment.schema';

export class PaymentReturnUrlsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  success?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancel?: string;
}

export class CreateAiPlanPurchaseDto {
  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiProperty({
    enum: BillingCycle,
    description: 'Plan-dependent values. Current pricing flow uses monthly, three_months, and six_months.',
  })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @ApiPropertyOptional({
    enum: SepayPaymentMethod,
    description: 'SePay payment method. Defaults to BANK_TRANSFER.',
  })
  @IsOptional()
  @IsEnum(SepayPaymentMethod)
  paymentMethod?: SepayPaymentMethod;

  @ApiPropertyOptional({ type: PaymentReturnUrlsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentReturnUrlsDto)
  returnUrls?: PaymentReturnUrlsDto;

  @ApiPropertyOptional({ description: 'Apply available Edumee Credit before creating SePay checkout.' })
  @IsOptional()
  @IsBoolean()
  useEdumeeCredit?: boolean;
}

export class CreateMentorBookingPurchaseDto {
  @ApiProperty()
  @IsString()
  bookingSessionId!: string;

  @ApiPropertyOptional({
    enum: SepayPaymentMethod,
    description: 'SePay payment method. Defaults to BANK_TRANSFER.',
  })
  @IsOptional()
  @IsEnum(SepayPaymentMethod)
  paymentMethod?: SepayPaymentMethod;

  @ApiPropertyOptional({ type: PaymentReturnUrlsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentReturnUrlsDto)
  returnUrls?: PaymentReturnUrlsDto;

  @ApiPropertyOptional({ description: 'Apply available Edumee Credit before creating SePay checkout.' })
  @IsOptional()
  @IsBoolean()
  useEdumeeCredit?: boolean;
}

export class CreatePaymentPurchaseDto {
  @ApiProperty({ enum: PaymentPurpose })
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @ApiProperty({ description: 'planId for AI plans or bookingSessionId for mentor bookings.' })
  @IsString()
  targetId!: string;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    description: 'Payment provider. Defaults to sepay for the current unified flow.',
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    enum: BillingCycle,
    description: 'Required when purpose is ai_plan.',
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    enum: SepayPaymentMethod,
    description: 'SePay payment method. Defaults to BANK_TRANSFER.',
  })
  @IsOptional()
  @IsEnum(SepayPaymentMethod)
  paymentMethod?: SepayPaymentMethod;

  @ApiPropertyOptional({ type: PaymentReturnUrlsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentReturnUrlsDto)
  returnUrls?: PaymentReturnUrlsDto;

  @ApiPropertyOptional({ description: 'Apply available Edumee Credit before creating checkout.' })
  @IsOptional()
  @IsBoolean()
  useEdumeeCredit?: boolean;
}

export enum TestPaymentEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
}

export class PaymentWebhookTestDto {
  @ApiProperty()
  @IsString()
  paymentId!: string;

  @ApiProperty()
  @IsString()
  eventId!: string;

  @ApiProperty({ enum: TestPaymentEventType })
  @IsEnum(TestPaymentEventType)
  eventType!: TestPaymentEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class TestBankTransferDto {
  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'EDU9F2A7C1B4D8E thanh toan mentor' })
  @IsString()
  content!: string;
}

export class RefundPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateMentorPlatformFeeConfigDto {
  @ApiProperty({ example: 15, description: 'Platform commission percent charged on mentor bookings.' })
  @IsNumber()
  @Min(0)
  @Max(100)
  mentorPlatformFeePercent!: number;
}
