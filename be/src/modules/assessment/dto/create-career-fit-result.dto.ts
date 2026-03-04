import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateCareerFitResultDto {
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsNotEmpty()
  @IsString()
  careerId!: string;

  @IsNotEmpty()
  @IsNumber()
  overallFitScore!: number;

  @IsOptional()
  dimensionScores?: any;

  @IsOptional()
  strengths?: string[];

  @IsOptional()
  developmentAreas?: string[];

  @IsOptional()
  careerRecommendations?: any;

  @IsOptional()
  learningPath?: any;

  @IsOptional()
  confidenceMetrics?: any;
}