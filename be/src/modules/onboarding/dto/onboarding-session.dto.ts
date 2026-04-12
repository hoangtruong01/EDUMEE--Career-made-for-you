import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  OnboardingStatus,
  OnboardingStep,
} from '../schemas/onboarding-session.schema';

type StepProgressStatus = 'not_reached' | 'current' | 'completed' | 'skipped';

class StepProgressDto {
  @IsEnum(OnboardingStep)
  stepId!: OnboardingStep;

  @IsIn(['not_reached', 'current', 'completed', 'skipped'])
  status!: StepProgressStatus;

  @IsOptional()
  @IsObject()
  stepData?: Record<string, unknown>;
}

export class CreateOnboardingSessionDto {
  @ApiPropertyOptional({ description: 'Optional user intent object (stored as-is)' })
  @IsOptional()
  @IsObject()
  userIntent?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional baseline data object (stored as-is)' })
  @IsOptional()
  @IsObject()
  baselineData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional feature education object (stored as-is)' })
  @IsOptional()
  @IsObject()
  featureEducation?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional personalization settings (stored as-is)' })
  @IsOptional()
  @IsObject()
  personalizationSettings?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional experience feedback (stored as-is)' })
  @IsOptional()
  @IsObject()
  experienceFeedback?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional next steps (stored as-is)' })
  @IsOptional()
  @IsObject()
  nextSteps?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: OnboardingStatus })
  @IsOptional()
  @IsEnum(OnboardingStatus)
  status?: OnboardingStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional({ type: [StepProgressDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StepProgressDto)
  stepProgress?: StepProgressDto[];
}

export class UpdateOnboardingSessionDto extends PartialType(CreateOnboardingSessionDto) {}

