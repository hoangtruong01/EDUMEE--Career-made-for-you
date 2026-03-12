import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsIn } from 'class-validator';

export class UpdateAssessmentAnswerDto {

  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  answer?: string; // Chỉ A, B, C, D


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsNumber()
  responseTime?: number; // Thời gian trả lời (milliseconds)


  @ApiProperty({ example: 'string' })
  @IsOptional()
  metadata?: {
    skipped?: boolean;
    notes?: string;
  };
}