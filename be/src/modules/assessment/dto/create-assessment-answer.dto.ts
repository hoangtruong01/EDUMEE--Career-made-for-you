import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateAssessmentAnswerDto {
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsNotEmpty()
  answer!: any; // Can be string, number, array, object depending on question type

  @IsOptional()
  @IsNumber()
  rawScore?: number;

  @IsOptional()
  @IsNumber()
  normalizedScore?: number;

  @IsOptional()
  dimensionScores?: any;

  @IsOptional()
  confidenceLevel?: number;

  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @IsOptional()
  metadata?: any;
}