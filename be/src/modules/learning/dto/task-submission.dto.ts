import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsObject,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus, EvaluationType } from '../schemas/task-submission.schema';

class FileSubmissionDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  filename!: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  originalName!: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(0)
  size!: number;

  @ApiProperty({ description: 'File URL' })
  @IsString()
  url!: string;

  @ApiProperty({ description: 'Upload timestamp' })
  @IsDateString()
  uploadedAt!: Date;
}

class LinkSubmissionDto {
  @ApiProperty({ description: 'Link title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'URL' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ description: 'Link description' })
  @IsOptional()
  @IsString()
  description?: string;
}

class SubmissionContentDto {
  @ApiPropertyOptional({ description: 'Uploaded files', type: [FileSubmissionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileSubmissionDto)
  files?: FileSubmissionDto[];

  @ApiPropertyOptional({ description: 'Text content for text-based submissions' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Reference links', type: [LinkSubmissionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkSubmissionDto)
  links?: LinkSubmissionDto[];

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

class TimeTrackingDto {
  @ApiProperty({ description: 'When user started working' })
  @IsDateString()
  startedAt!: Date;

  @ApiPropertyOptional({ description: 'When submitted' })
  @IsOptional()
  @IsDateString()
  submittedAt?: Date;

  @ApiPropertyOptional({ description: 'Total time spent in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTimeSpent?: number;

  @ApiPropertyOptional({ description: 'Session breakdown', type: Array })
  @IsOptional()
  @IsArray()
  sessionBreakdown?: {
    sessionStart: Date;
    sessionEnd: Date;
    timeSpent: number;
  }[];
}

class CriteriaScoreDto {
  @ApiProperty({ description: 'Criteria name' })
  @IsString()
  criteriaName!: string;

  @ApiProperty({ description: 'Score for this criteria', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({ description: 'Feedback for this criteria' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'AI confidence level', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;
}

class SkillAssessmentDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  skillName!: string;

  @ApiProperty({ description: 'Current skill level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  currentLevel!: number;

  @ApiProperty({ description: 'Improvement from previous assessment' })
  @IsNumber()
  improvement!: number;

  @ApiProperty({ description: 'Evidence of skill demonstration', type: [String] })
  @IsArray()
  @IsString({ each: true })
  evidence!: string[];
}

class EvaluationDto {
  @ApiProperty({ enum: EvaluationType, description: 'Evaluation type' })
  @IsEnum(EvaluationType)
  evaluationType!: EvaluationType;

  @ApiProperty({ description: 'Overall score (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore!: number;

  @ApiProperty({ description: 'Whether submission passed' })
  @IsBoolean()
  passed!: boolean;

  @ApiProperty({ description: 'Detailed scores per criteria', type: [CriteriaScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaScoreDto)
  criteriaScores!: CriteriaScoreDto[];

  @ApiPropertyOptional({ description: 'Skills assessment', type: [SkillAssessmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillAssessmentDto)
  skillsAssessment?: SkillAssessmentDto[];

  @ApiProperty({ description: 'Identified strengths', type: [String] })
  @IsArray()
  @IsString({ each: true })
  strengths!: string[];

  @ApiProperty({ description: 'Areas for improvement', type: [String] })
  @IsArray()
  @IsString({ each: true })
  areasForImprovement!: string[];

  @ApiProperty({ description: 'Specific feedback' })
  @IsString()
  specificFeedback!: string;

  @ApiPropertyOptional({ description: 'AI evaluation details', type: Object })
  @IsOptional()
  @IsObject()
  aiEvaluation?: {
    modelUsed: string;
    confidence: number;
    evaluationTime: Date;
    rawOutput?: any;
  };

  @ApiPropertyOptional({ description: 'Human evaluation details', type: Array })
  @IsOptional()
  @IsArray()
  humanEvaluation?: {
    evaluatorId: string;
    evaluatorType: 'mentor' | 'peer' | 'admin';
    evaluationTime: Date;
    notes?: string;
  }[];
}

class SelfAssessmentDto {
  @ApiProperty({ description: 'Difficulty rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  difficultyRating!: number;

  @ApiProperty({ description: 'Confidence level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  confidenceLevel!: number;

  @ApiProperty({ description: 'Enjoyment level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  enjoymentLevel!: number;

  @ApiProperty({ description: 'Learning value (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  learningValue!: number;

  @ApiProperty({ description: 'Realism rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  realismRating!: number;

  @ApiPropertyOptional({ description: 'Additional comments' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreateTaskSubmissionDto {
  @ApiPropertyOptional({ description: 'User ID (filled by server)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Task ID being submitted for' })
  @IsString()
  taskId!: string;

  @ApiPropertyOptional({ description: 'Learning roadmap ID if applicable' })
  @IsOptional()
  @IsString()
  roadmapId?: string;

  @ApiProperty({ description: 'Submission content', type: SubmissionContentDto })
  @ValidateNested()
  @Type(() => SubmissionContentDto)
  submission!: SubmissionContentDto;

  @ApiPropertyOptional({ description: 'Time tracking information', type: TimeTrackingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeTrackingDto)
  timeTracking?: TimeTrackingDto;

  @ApiPropertyOptional({ enum: SubmissionStatus, description: 'Submission status' })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Attempt number' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  attemptNumber?: number;

  @ApiPropertyOptional({ description: 'Previous attempt ID if this is a retry' })
  @IsOptional()
  @IsString()
  previousAttemptId?: string;

  @ApiPropertyOptional({ description: 'User self-assessment', type: SelfAssessmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SelfAssessmentDto)
  selfAssessment?: SelfAssessmentDto;

  @ApiPropertyOptional({ description: 'Collaboration information for team tasks', type: Object })
  @IsOptional()
  @IsObject()
  collaboration?: {
    teammates?: string[];
    role: string;
    contribution: string;
    teamDynamics: string;
  };
}

export class UpdateTaskSubmissionDto extends PartialType(CreateTaskSubmissionDto) {
  @ApiPropertyOptional({ description: 'Evaluation results', type: EvaluationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EvaluationDto)
  evaluation?: EvaluationDto;

  @ApiPropertyOptional({ description: 'Improvement recommendations', type: Object })
  @IsOptional()
  @IsObject()
  recommendations?: {
    nextSteps: string[];
    resourcesSuggested: {
      type: 'article' | 'video' | 'course' | 'practice' | 'mentoring';
      title: string;
      url?: string;
      description: string;
      estimatedTime?: string;
    }[];
    retakeRecommended?: boolean;
    alternativeTasks?: string[];
  };

  @ApiPropertyOptional({ description: 'Subsequent attempts', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subsequentAttempts?: string[];
}

export class TaskSubmissionResponseDto {
  @ApiProperty({ description: 'Submission ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Task ID' })
  taskId!: string;

  @ApiPropertyOptional({ description: 'Roadmap ID' })
  roadmapId?: string;

  @ApiProperty({ enum: SubmissionStatus, description: 'Submission status' })
  status!: SubmissionStatus;

  @ApiProperty({ description: 'Submission content', type: SubmissionContentDto })
  submission!: SubmissionContentDto;

  @ApiPropertyOptional({ description: 'Time tracking', type: TimeTrackingDto })
  timeTracking?: TimeTrackingDto;

  @ApiPropertyOptional({ description: 'Evaluation results', type: EvaluationDto })
  evaluation?: EvaluationDto;

  @ApiPropertyOptional({ description: 'Recommendations', type: Object })
  recommendations?: any;

  @ApiPropertyOptional({ description: 'Attempt number' })
  attemptNumber?: number;

  @ApiPropertyOptional({ description: 'Previous attempt ID' })
  previousAttemptId?: string;

  @ApiPropertyOptional({ description: 'Self-assessment', type: SelfAssessmentDto })
  selfAssessment?: SelfAssessmentDto;

  @ApiPropertyOptional({ description: 'Collaboration info', type: Object })
  collaboration?: any;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}

export class TaskSubmissionListResponseDto {
  @ApiProperty({ description: 'List of submissions', type: [TaskSubmissionResponseDto] })
  data!: TaskSubmissionResponseDto[];

  @ApiProperty({ description: 'Total number of submissions' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}
