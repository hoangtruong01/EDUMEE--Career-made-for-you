import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { AssessmentStatus, AssessmentType } from '../schemas/assessment-session.schema';

export class CreateAssessmentSessionDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsNotEmpty()
  @IsEnum(AssessmentType)
  type!: AssessmentType;

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
  estimatedDuration?: number;

  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}