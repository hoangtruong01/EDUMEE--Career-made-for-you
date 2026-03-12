import { IsArray, IsOptional, ValidateNested, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssessmentAnswerInputDto {

  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId!: string;

  @ApiProperty({ description: 'Answer (A, B, C, or D)', enum: ['A', 'B', 'C', 'D'] })
  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  answer!: string;

  @ApiPropertyOptional({ description: 'Question text (optional for context)' })
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiPropertyOptional({ description: 'Question dimension (optional for context)' })
  @IsOptional()
  @IsString()
  dimension?: string;
}

export class GenerateAIAnalysisDto {
  @ApiProperty({ 
    description: 'Array of assessment answers',
    type: [AssessmentAnswerInputDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerInputDto)
  assessmentAnswers!: AssessmentAnswerInputDto[];

  @ApiPropertyOptional({ 
    description: 'Available careers to match against (optional)'
  })
  @IsOptional()
  @IsArray()
  availableCareers?: any[];
}
