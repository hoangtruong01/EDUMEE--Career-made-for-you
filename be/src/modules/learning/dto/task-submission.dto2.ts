import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TaskProgressStatus } from '../../../common/enums/learning.enum';

export class SubmissionFileDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  fileUrl!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;
}

// 👇 BỔ SUNG ĐỂ HỖ TRỢ TRẮC NGHIỆM BIẾN THIÊN (BỌC THÉP VALIDATION)
export class QuizAnswerRecordDto {
  @ApiProperty({ description: 'Vị trí index của câu hỏi trong bộ đề' })
  @IsNumber()
  questionIndex!: number;

  @ApiProperty({ description: 'Giá trị đáp án học viên chọn (1, 2, 3, 4)' })
  @IsNumber()
  selectedValue!: number;
}

export class SubmissionContentDto {
  @ApiProperty({ type: [SubmissionFileDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionFileDto)
  files?: SubmissionFileDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  textContent?: string;

  // 👇 CHỐT HẠ BẢO MẬT: Nhận đáp án trắc nghiệm từ Frontend gửi lên khi làm bài test Milestone
  @ApiProperty({ type: [QuizAnswerRecordDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerRecordDto)
  quizAnswers?: QuizAnswerRecordDto[];
}

export class CreateTaskSubmissionDto {
  @ApiProperty()
  @IsMongoId()
  taskId!: string;

  @ApiProperty()
  @IsMongoId()
  roadmapId!: string;

  @ApiProperty({ enum: TaskProgressStatus })
  @IsEnum(TaskProgressStatus)
  status!: TaskProgressStatus;

  @ApiProperty({ type: SubmissionContentDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubmissionContentDto)
  submissionContent?: SubmissionContentDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  timeSpentSeconds?: number;
}

export class CriteriaScoreDto {
  @ApiProperty()
  @IsString()
  criteriaName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiProperty()
  @IsString()
  feedback!: string;
}

export class EvaluateSubmissionDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore!: number;

  @ApiProperty()
  @IsBoolean()
  passed!: boolean;

  @ApiProperty({ type: [CriteriaScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaScoreDto)
  criteriaScores!: CriteriaScoreDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  strengths!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  areasForImprovement!: string[];
}

export class UpdateTaskSubmissionDto extends PartialType(
  OmitType(CreateTaskSubmissionDto, ['taskId', 'roadmapId'] as const),
) {}
