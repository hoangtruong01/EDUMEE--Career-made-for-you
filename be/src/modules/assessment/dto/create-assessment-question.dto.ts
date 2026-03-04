import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { QuestionType, AssessmentDimension } from '../schemas/assessment-question.schema';

export class CreateAssessmentQuestionDto {
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsNotEmpty()
  @IsString()
  questionText!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AssessmentDimension)
  dimension?: AssessmentDimension;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  questionConfig?: any;

  @IsOptional()
  answerOptions?: any;

  @IsOptional()
  validationRules?: any;

  @IsOptional()
  scoringLogic?: any;
}