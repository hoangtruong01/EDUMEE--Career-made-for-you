import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsArray, IsString } from 'class-validator';

export class UpdateCareerFitResultDto {

  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsNumber()
  overallFitScore?: number;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  dimensionScores?: any;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  developmentAreas?: string[];


  @ApiProperty({ example: 'string' })
  @IsOptional()
  careerRecommendations?: any;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  learningPath?: any;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  confidenceMetrics?: any;
}