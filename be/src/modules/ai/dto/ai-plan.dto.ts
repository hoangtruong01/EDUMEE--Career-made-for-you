import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, Min } from 'class-validator';
import { PlanName } from '../schema/ai-plan.schema';

export class AiPlanLimitsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) assessmentsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) chatMessagesPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) simulationsPerMonth?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) careerRecommendationRunsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxCareerRecommendationsPerRun?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) careerComparisonsPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxCareersPerComparison?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) personalizedRoadmapsPerMonth?: number;
}

export class AiPlanFeaturesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() careerRecommendation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() jobSimulation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mentorBooking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() careerComparison?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aiChatbot?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() personalizedRoadmap?: boolean;
}

export class CreateAiPlanDto {
  @ApiProperty({ enum: PlanName })
  @IsEnum(PlanName)
  name!: PlanName;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: AiPlanLimitsDto })
  @IsOptional()
  @IsObject()
  limits?: AiPlanLimitsDto;

  @ApiPropertyOptional({ type: AiPlanFeaturesDto })
  @IsOptional()
  @IsObject()
  features?: AiPlanFeaturesDto;
}

export class UpdateAiPlanDto extends PartialType(CreateAiPlanDto) {}
