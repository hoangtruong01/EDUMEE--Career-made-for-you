import { IsOptional, IsNumber, IsArray, IsString } from 'class-validator';

export class UpdateCareerFitResultDto {
  @IsOptional()
  @IsNumber()
  overallFitScore?: number;

  @IsOptional()
  dimensionScores?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  developmentAreas?: string[];

  @IsOptional()
  careerRecommendations?: any;

  @IsOptional()
  learningPath?: any;

  @IsOptional()
  confidenceMetrics?: any;
}