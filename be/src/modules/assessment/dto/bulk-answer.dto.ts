import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class BulkAnswerDto {

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Assessment session ID' })
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ example: 'string' })  
  @IsNotEmpty()
  @IsString()
  questionId!: string;


  @ApiProperty({ example: '1' })
  @IsNotEmpty()
  @IsString()
  answer!: string; // Điểm số (1-5) hoặc ABCD


  @ApiProperty({ example: 1500 })
  @IsOptional()
  @IsNumber()
  responseTime?: number; // Thời gian trả lời (milliseconds)

  @ApiProperty({ example: {} })
  @IsOptional()
  metadata?: any; // Thông tin bổ sung nếu cần
}
