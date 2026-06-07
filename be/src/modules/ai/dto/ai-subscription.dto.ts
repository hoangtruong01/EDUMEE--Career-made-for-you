import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { BillingCycle } from '../../users/schemas/user-subscriptions';

export class UpsertAiSubscriptionDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiPropertyOptional({
    enum: BillingCycle,
    description: 'Supported values are plan-dependent. Current pricing flow uses monthly, three_months, and six_months.',
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AssignAiSubscriptionDto {
  @ApiPropertyOptional({ description: 'Selected user id from admin search' })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional({ description: 'Legacy fallback: user email or phone number' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiPropertyOptional({
    enum: BillingCycle,
    description: 'Billing cycle to assign. Defaults to monthly when omitted.',
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ImportAiSubscriptionUsersDto {
  @ApiProperty()
  @IsMongoId()
  planId!: string;

  @ApiPropertyOptional({
    enum: BillingCycle,
    description: 'Billing cycle to assign to every imported user.',
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}
