import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export class CreateOnboardingSessionDto {
  @ApiProperty({ description: 'User ID for this onboarding session' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Session type or category' })
  @IsString()
  sessionType!: string;

  @ApiProperty({ description: 'Session data and progress' })
  @IsObject()
  sessionData!: {
    steps: {
      stepId: string;
      stepName: string;
      completed: boolean;
      data?: any;
    }[];
    currentStep: number;
    totalSteps: number;
  };

  @ApiPropertyOptional({ enum: OnboardingStatus, description: 'Session status' })
  @IsOptional()
  @IsEnum(OnboardingStatus)
  status?: OnboardingStatus;
}

export class UpdateOnboardingSessionDto extends PartialType(CreateOnboardingSessionDto) {}

export class OnboardingSessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Session type' })
  sessionType!: string;

  @ApiProperty({ description: 'Session data' })
  sessionData!: any;

  @ApiProperty({ enum: OnboardingStatus, description: 'Session status' })
  status!: OnboardingStatus;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}