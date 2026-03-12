import { IsOptional, IsString, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, AssessmentDimension } from '../schemas/assessment-question.schema';
import { ApiProperty } from '@nestjs/swagger';

class QuestionOptionDto {

  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsString()
  value?: 'A' | 'B' | 'C' | 'D';


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateAssessmentQuestionDto {

  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsString()
  questionText?: string;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsEnum(AssessmentDimension)
  dimension?: AssessmentDimension;


  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];


  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}