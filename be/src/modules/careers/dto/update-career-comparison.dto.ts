import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateCareerComparisonDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  careerIds?: string[];

  @IsOptional()
  @IsString()
  comparisonName?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  comparisonCriteria?: any;

  @IsOptional()
  @IsArray()
  customWeights?: any[];

  @IsOptional()
  results?: any;

  @IsOptional()
  insights?: any;
}