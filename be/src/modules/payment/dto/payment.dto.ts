import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingCycle } from '../../users/schemas/user-subscriptions';
import { SepayPaymentMethod } from '../payment.constants';

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
