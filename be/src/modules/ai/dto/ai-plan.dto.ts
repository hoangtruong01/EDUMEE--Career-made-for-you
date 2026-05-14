import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
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

export class AiPlanLimitsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) assessmentsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) assessmentsLifetimeLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) chatMessagesPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) simulationsPerMonth?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) careerRecommendationRunsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxCareerRecommendationsPerRun?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) careerComparisonsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxCareersPerComparison?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) personalizedRoadmapsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) mentorBookingsPerMonth?: number;
}

export class AiPlanFeaturesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() careerRecommendation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() jobSimulation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mentorBooking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() careerComparison?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aiChatbot?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() personalizedRoadmap?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() teamDashboard?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() reportExport?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() multiUserManagement?: boolean;
}

export class AiPlanBillingCycleDiscountsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) monthly?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) three_months?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) six_months?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) five_months?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) nine_months?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) yearly?: number;
}

export class CreateAiPlanDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Controls whether this plan is visible in the public catalog and purchasable.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Marks this plan as the default fallback plan for users without an active subscription.',
  })
  @IsOptional()
  @IsBoolean()
  isDefaultPlan?: boolean;

  @ApiPropertyOptional({
    description: 'Smaller values appear first in admin and public plan listings.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    type: AiPlanBillingCycleDiscountsDto,
    description: 'Discount percentage by billing cycle for this plan.',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AiPlanBillingCycleDiscountsDto)
  billingCycleDiscounts?: AiPlanBillingCycleDiscountsDto;

  @ApiPropertyOptional({
    enum: BillingCycle,
    isArray: true,
    description: 'Billing cycles that the plan can be purchased with.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(BillingCycle, { each: true })
  allowedBillingCycles?: BillingCycle[];

  @ApiPropertyOptional({
    description: 'Optional seat cap for business/team plans.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seatLimit?: number;

  @ApiPropertyOptional({ type: AiPlanLimitsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiPlanLimitsDto)
  limits?: AiPlanLimitsDto;

  @ApiPropertyOptional({ type: AiPlanFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiPlanFeaturesDto)
  features?: AiPlanFeaturesDto;
}

export class UpdateAiPlanDto extends PartialType(CreateAiPlanDto) {}
