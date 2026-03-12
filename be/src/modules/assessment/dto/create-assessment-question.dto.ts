import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, AssessmentDimension } from '../schemas/assessment-question.schema';
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';

class QuestionOptionDto {

  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  value!: 'A' | 'B' | 'C' | 'D';


  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  label!: string;
}

export class CreateAssessmentQuestionDto {
  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsString()
  questionText!: string;

  @ApiProperty({ example: 'string' })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;
  
  
  // Mặc định là MULTIPLE_CHOICE

  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsEnum(AssessmentDimension)
  dimension!: AssessmentDimension;

  @ApiProperty({ example: 'string' })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[]; // Phải có đúng 4 đáp án A, B, C, D

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}