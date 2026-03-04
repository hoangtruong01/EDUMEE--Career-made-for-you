import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CheckpointType, CheckpointStatus } from '../schemas/checkpoint.schema';

class AssessmentAreaDto {
  @ApiProperty({
    enum: ['progress', 'skills', 'goals', 'timeline', 'satisfaction', 'challenges'],
    description: 'Area to assess at checkpoint',
  })
  @IsEnum(['progress', 'skills', 'goals', 'timeline', 'satisfaction', 'challenges'])
  area!: 'progress' | 'skills' | 'goals' | 'timeline' | 'satisfaction' | 'challenges';

  @ApiProperty({ description: 'Importance of this area (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  weight!: number;

  @ApiProperty({ description: 'Specific questions to address', type: [String] })
  @IsArray()
  @IsString({ each: true })
  questions!: string[];
}

class ProgressEvaluationDto {
  @ApiProperty({ description: 'Overall progress percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallProgress!: number;

  @ApiProperty({ description: 'Number of tasks completed' })
  @IsNumber()
  @Min(0)
  tasksCompleted!: number;

  @ApiProperty({ description: 'Total number of tasks' })
  @IsNumber()
  @Min(0)
  totalTasks!: number;

  @ApiProperty({ description: 'Hours spent on learning' })
  @IsNumber()
  @Min(0)
  hoursSpent!: number;

  @ApiPropertyOptional({ description: 'Goals achievement tracking', type: Array })
  @IsOptional()
  @IsArray()
  goalsAchieved?: {
    goal: string;
    achieved: boolean;
    partiallyAchieved?: boolean;
    explanation?: string;
  }[];

  @ApiProperty({ description: 'Whether user is on schedule' })
  @IsBoolean()
  onSchedule!: boolean;

  @ApiPropertyOptional({ description: 'Days ahead (positive) or behind (negative) schedule' })
  @IsOptional()
  @IsNumber()
  daysAheadBehind?: number;

  @ApiPropertyOptional({ description: 'Skills assessment results', type: Array })
  @IsOptional()
  @IsArray()
  skillsAssessment?: {
    skillName: string;
    previousLevel: number;
    currentLevel: number;
    improvement: number;
    evidence: string[];
    nextLevelRequirements: string[];
  }[];
}

class UserReflectionDto {
  @ApiProperty({ description: 'Self-rating metrics on 1-5 scale' })
  @ValidateNested()
  @Type(() => Object)
  selfRating!: {
    progress: number;
    effort: number;
    satisfaction: number;
    confidence: number;
  };

  @ApiProperty({ description: 'What the user is most proud of' })
  @IsString()
  achievements!: string;

  @ApiProperty({ description: 'What the user learned about themselves' })
  @IsString()
  learnings!: string;

  @ApiProperty({ description: 'What was most challenging' })
  @IsString()
  challenges!: string;

  @ApiPropertyOptional({ description: 'What surprised the user' })
  @IsOptional()
  @IsString()
  surprises?: string;

  @ApiProperty({ description: 'Goals for next period', type: [String] })
  @IsArray()
  @IsString({ each: true })
  nextPeriodGoals!: string[];

  @ApiProperty({ description: 'Areas identified for improvement', type: [String] })
  @IsArray()
  @IsString({ each: true })
  areasForImprovement!: string[];

  @ApiPropertyOptional({ description: 'Support needed', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportNeeded?: string[];

  @ApiProperty({ description: 'Motivation level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  motivationLevel!: number;

  @ApiProperty({ description: 'Engagement level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  engagementLevel!: number;

  @ApiPropertyOptional({ description: 'Burnout risk assessment (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  burnoutRisk?: number;
}

export class CreateCheckpointDto {
  @ApiProperty({ description: 'User ID who owns this checkpoint' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Learning roadmap ID' })
  @IsString()
  roadmapId!: string;

  @ApiPropertyOptional({ description: 'Weekly plan ID if applicable' })
  @IsOptional()
  @IsString()
  weeklyPlanId?: string;

  @ApiProperty({ enum: CheckpointType, description: 'Type of checkpoint' })
  @IsEnum(CheckpointType)
  checkpointType!: CheckpointType;

  @ApiProperty({ description: 'Checkpoint title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Checkpoint description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Scheduled date for checkpoint' })
  @IsDateString()
  scheduledDate!: string;

  @ApiProperty({ description: 'Areas to assess at this checkpoint', type: [AssessmentAreaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAreaDto)
  assessmentAreas!: AssessmentAreaDto[];

  @ApiPropertyOptional({ enum: CheckpointStatus, description: 'Checkpoint status' })
  @IsOptional()
  @IsEnum(CheckpointStatus)
  status?: CheckpointStatus;
}

export class UpdateCheckpointDto extends PartialType(CreateCheckpointDto) {
  @ApiPropertyOptional({ description: 'Completion date' })
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @ApiPropertyOptional({ description: 'Progress evaluation results', type: ProgressEvaluationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProgressEvaluationDto)
  progressEvaluation?: ProgressEvaluationDto;

  @ApiPropertyOptional({ description: 'Challenges identified during checkpoint', type: Array })
  @IsOptional()
  @IsArray()
  challengesIdentified?: {
    challenge: string;
    impact: 'low' | 'medium' | 'high';
    category: 'time_management' | 'skill_difficulty' | 'motivation' | 'resources' | 'external' | 'other';
    description: string;
    proposedSolutions: {
      solution: string;
      feasibility: number;
      estimatedTimeline: string;
      resourcesRequired: string[];
    }[];
  }[];

  @ApiPropertyOptional({ description: 'User reflection and feedback', type: UserReflectionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserReflectionDto)
  userReflection?: UserReflectionDto;

  @ApiPropertyOptional({ description: 'Action items generated from checkpoint', type: Array })
  @IsOptional()
  @IsArray()
  actionItems?: {
    actionId: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: Date;
    assignedTo: 'user' | 'mentor' | 'system';
    category: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    completedDate?: Date;
  }[];
}

export class CheckpointResponseDto {
  @ApiProperty({ description: 'Checkpoint ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Learning roadmap ID' })
  roadmapId!: string;

  @ApiPropertyOptional({ description: 'Weekly plan ID' })
  weeklyPlanId?: string;

  @ApiProperty({ enum: CheckpointType, description: 'Type of checkpoint' })
  checkpointType!: CheckpointType;

  @ApiProperty({ description: 'Checkpoint title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Checkpoint description' })
  description?: string;

  @ApiProperty({ description: 'Scheduled date' })
  scheduledDate!: Date;

  @ApiPropertyOptional({ description: 'Completion date' })
  completedDate?: Date;

  @ApiProperty({ enum: CheckpointStatus, description: 'Checkpoint status' })
  status!: CheckpointStatus;

  @ApiProperty({ description: 'Areas to assess', type: [AssessmentAreaDto] })
  assessmentAreas!: AssessmentAreaDto[];

  @ApiPropertyOptional({ description: 'Progress evaluation', type: ProgressEvaluationDto })
  progressEvaluation?: ProgressEvaluationDto;

  @ApiPropertyOptional({ description: 'User reflection', type: UserReflectionDto })
  userReflection?: UserReflectionDto;

  @ApiPropertyOptional({ description: 'Challenges identified', type: Array })
  challengesIdentified?: any[];

  @ApiPropertyOptional({ description: 'Action items', type: Array })
  actionItems?: any[];

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}

export class CheckpointListResponseDto {
  @ApiProperty({ description: 'List of checkpoints', type: [CheckpointResponseDto] })
  data!: CheckpointResponseDto[];

  @ApiProperty({ description: 'Total number of checkpoints' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}