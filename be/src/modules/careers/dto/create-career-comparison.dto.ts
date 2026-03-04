import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateCareerComparisonDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  careerIds!: string[];

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