import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateAssessmentAnswerDto {

  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  questionId!: string;

  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ example: 'A' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  answer!: string; // Trắc nghiệm ABCD

  @IsOptional()
  @IsNumber()
  responseTime?: number; // Thời gian trả lời (milliseconds)


  @ApiProperty({ example: 'string' })
  @IsOptional()
  metadata?: any; // Thông tin bổ sung nếu cần
}