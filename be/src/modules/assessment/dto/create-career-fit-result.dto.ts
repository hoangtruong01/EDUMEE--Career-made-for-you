import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCareerFitResultDto {
  // sessionId removed - no longer using sessions
  // @IsOptional()
  // @IsString() 
  // sessionId?: string;

  
  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  userId!: string;


  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  careerId!: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  overallFitScore!: number;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  dimensionScores?: any;

  @ApiProperty({ example: 'string' }) 
  @IsOptional()
  strengths?: string[];


  @ApiProperty({ example: 'string' })
  @IsOptional()
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