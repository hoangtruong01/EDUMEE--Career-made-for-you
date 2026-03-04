import { IsOptional, IsString, IsEnum, IsArray, IsNumber } from 'class-validator';
import { AssessmentStatus, AssessmentType } from '../schemas/assessment-session.schema';

export class UpdateAssessmentSessionDto {
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetDimensions?: string[];

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsEnum(AssessmentStatus) 
  status?: AssessmentStatus;

  @IsOptional()
  progressTracking?: any;

  @IsOptional()
  results?: any;

  @IsOptional()
  sessionMetrics?: any;
}