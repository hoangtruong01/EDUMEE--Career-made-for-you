import { IsOptional, IsNumber } from 'class-validator';

export class UpdateAssessmentAnswerDto {
  @IsOptional()
  answer?: any;

  @IsOptional()
  @IsNumber()
  rawScore?: number;

  @IsOptional()
  @IsNumber()
  normalizedScore?: number;

  @IsOptional()
  dimensionScores?: any;

  @IsOptional()
  @IsNumber()
  confidenceLevel?: number;

  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @IsOptional()
  metadata?: any;
}