import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
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
