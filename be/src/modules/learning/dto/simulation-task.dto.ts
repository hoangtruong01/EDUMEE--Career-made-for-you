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
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType, DifficultyLevel } from '../schemas/simulation-task.schema';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

class TaskMaterialDto {
  @ApiProperty({ enum: ['document', 'video', 'dataset', 'code_template', 'image'], description: 'Material type' })
  @IsEnum(['document', 'video', 'dataset', 'code_template', 'image'])
  type!: 'document' | 'video' | 'dataset' | 'code_template' | 'image';

  @ApiProperty({ description: 'Material title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Material URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Material content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Material description' })
  @IsOptional()
  @IsString()
  description?: string;
}

class TaskContentDto {
  @ApiProperty({ description: 'Task instructions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  instructions!: string[];

  @ApiPropertyOptional({ description: 'Task materials', type: [TaskMaterialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskMaterialDto)
  materials?: TaskMaterialDto[];

  @ApiPropertyOptional({ description: 'Background scenario for the task' })
  @IsOptional()
  @IsString()
  scenario?: string;

  @ApiPropertyOptional({ description: 'Task constraints', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @ApiPropertyOptional({ description: 'Optional hints', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];
}

class SkillEvaluatedDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  skillName!: string;

  @ApiProperty({ enum: ['technical', 'soft', 'leadership'], description: 'Skill category' })
  @IsEnum(['technical', 'soft', 'leadership'])
  skillCategory!: 'technical' | 'soft' | 'leadership';

  @ApiProperty({ description: 'Skill importance in this task (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  weight!: number;
}

class EvaluationLevelDto {
  @ApiProperty({ description: 'Score level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiProperty({ description: 'Level label (e.g., "Excellent")' })
  @IsString()
  label!: string;

  @ApiProperty({ description: 'Level description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Performance indicators', type: [String] })
  @IsArray()
  @IsString({ each: true })
  indicators!: string[];
}

class EvaluationRubricDto {
  @ApiProperty({ description: 'Evaluation criteria name' })
  @IsString()
  criteria!: string;

  @ApiProperty({ description: 'Criteria description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Performance levels', type: [EvaluationLevelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationLevelDto)
  levels!: EvaluationLevelDto[];

  @ApiProperty({ description: 'Weight in overall score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;
}

class TimeEstimationDto {
  @ApiProperty({ description: 'Minimum hours required' })
  @IsNumber()
  @Min(0)
  minHours!: number;

  @ApiProperty({ description: 'Maximum hours required' })
  @IsNumber()
  @Min(0)
  maxHours!: number;

  @ApiProperty({ description: 'Average hours required' })
  @IsNumber()
  @Min(0)
  averageHours!: number;

  @ApiPropertyOptional({ description: 'Time breakdown by phase', type: Array })
  @IsOptional()
  @IsArray()
  breakdown?: {
    phase: string;
    estimatedHours: number;
  }[];
}

class RealWorldContextDto {
  @ApiProperty({ description: 'Industry examples', type: [String] })
  @IsArray()
  @IsString({ each: true })
  industryExamples!: string[];

  @ApiProperty({ enum: ['startup', 'small', 'medium', 'large', 'enterprise', 'any'], description: 'Company size context' })
  @IsEnum(['startup', 'small', 'medium', 'large', 'enterprise', 'any'])
  companySize!: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | 'any';

  @ApiProperty({ description: 'Tools used in real scenarios', type: [String] })
  @IsArray()
  @IsString({ each: true })
  toolsUsed!: string[];

  @ApiProperty({ description: 'Common challenges faced', type: [String] })
  @IsArray()
  @IsString({ each: true })
  commonChallenges!: string[];
}

class SubmissionGuidelinesDto {
  @ApiProperty({ description: 'Expected deliverables', type: [String] })
  @IsArray()
  @IsString({ each: true })
  expectedDeliverables!: string[];

  @ApiPropertyOptional({ description: 'Accepted file types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileTypes?: string[];

  @ApiPropertyOptional({ description: 'Maximum file size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFileSize?: number;

  @ApiPropertyOptional({ description: 'Additional submission instructions' })
  @IsOptional()
  @IsString()
  additionalInstructions?: string;

  @ApiPropertyOptional({ description: 'Example submissions', type: Array })
  @IsOptional()
  @IsArray()
  examples?: {
    title: string;
    description: string;
    url?: string;
  }[];
}

export class CreateSimulationTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Task description' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: TaskType, description: 'Type of task' })
  @IsEnum(TaskType)
  taskType!: TaskType;

  @ApiProperty({ description: 'Career ID this task relates to' })
  @IsString()
  careerId!: string;

  @ApiProperty({ enum: ExperienceLevel, description: 'Target experience level' })
  @IsEnum(ExperienceLevel)
  targetLevel!: ExperienceLevel;

  @ApiProperty({ enum: DifficultyLevel, description: 'Task difficulty level' })
  @IsEnum(DifficultyLevel)
  difficulty!: DifficultyLevel;

  @ApiProperty({ description: 'Task content and materials', type: TaskContentDto })
  @ValidateNested()
  @Type(() => TaskContentDto)
  taskContent!: TaskContentDto;

  @ApiProperty({ description: 'Skills evaluated by this task', type: [SkillEvaluatedDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillEvaluatedDto)
  skillsEvaluated!: SkillEvaluatedDto[];

  @ApiProperty({ description: 'Evaluation rubric', type: [EvaluationRubricDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationRubricDto)
  evaluationRubric!: EvaluationRubricDto[];

  @ApiPropertyOptional({ description: 'Time estimation', type: TimeEstimationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeEstimationDto)
  timeEstimation?: TimeEstimationDto;

  @ApiPropertyOptional({ description: 'Prerequisites', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Recommended prerequisite tasks', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedBeforeTasks?: string[];

  @ApiPropertyOptional({ description: 'Follow-up tasks', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  followUpTasks?: string[];

  @ApiPropertyOptional({ description: 'Real-world context', type: RealWorldContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RealWorldContextDto)
  realWorldContext?: RealWorldContextDto;

  @ApiPropertyOptional({ description: 'Submission guidelines', type: SubmissionGuidelinesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubmissionGuidelinesDto)
  submissionGuidelines?: SubmissionGuidelinesDto;

  @ApiPropertyOptional({ description: 'AI evaluation configuration', type: Object })
  @IsOptional()
  @IsObject()
  aiEvaluationConfig?: {
    enabled: boolean;
    evaluationModel: string;
    evaluationCriteria: string[];
    humanReviewRequired: boolean;
    autoFeedbackEnabled: boolean;
  };

  @ApiPropertyOptional({ description: 'Whether task is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateSimulationTaskDto extends PartialType(CreateSimulationTaskDto) {
  @ApiPropertyOptional({ description: 'Usage statistics', type: Object })
  @IsOptional()
  @IsObject()
  stats?: {
    totalAttempts?: number;
    averageScore?: number;
    completionRate?: number;
    averageTimeSpent?: number;
    lastUpdated?: Date;
  };
}

export class SimulationTaskResponseDto {
  @ApiProperty({ description: 'Task ID' })
  id!: string;

  @ApiProperty({ description: 'Task title' })
  title!: string;

  @ApiProperty({ description: 'Task description' })
  description!: string;

  @ApiProperty({ enum: TaskType, description: 'Task type' })
  taskType!: TaskType;

  @ApiProperty({ description: 'Career ID' })
  careerId!: string;

  @ApiProperty({ enum: ExperienceLevel, description: 'Target level' })
  targetLevel!: ExperienceLevel;

  @ApiProperty({ enum: DifficultyLevel, description: 'Difficulty level' })
  difficulty!: DifficultyLevel;

  @ApiProperty({ description: 'Task content', type: TaskContentDto })
  taskContent!: TaskContentDto;

  @ApiProperty({ description: 'Skills evaluated', type: [SkillEvaluatedDto] })
  skillsEvaluated!: SkillEvaluatedDto[];

  @ApiProperty({ description: 'Evaluation rubric', type: [EvaluationRubricDto] })
  evaluationRubric!: EvaluationRubricDto[];

  @ApiPropertyOptional({ description: 'Time estimation', type: TimeEstimationDto })
  timeEstimation?: TimeEstimationDto;

  @ApiPropertyOptional({ description: 'Prerequisites', type: [String] })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Real-world context', type: RealWorldContextDto })
  realWorldContext?: RealWorldContextDto;

  @ApiPropertyOptional({ description: 'Submission guidelines', type: SubmissionGuidelinesDto })
  submissionGuidelines?: SubmissionGuidelinesDto;

  @ApiPropertyOptional({ description: 'AI evaluation config', type: Object })
  aiEvaluationConfig?: any;

  @ApiPropertyOptional({ description: 'Active status' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Usage statistics', type: Object })
  stats?: any;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}

export class SimulationTaskListResponseDto {
  @ApiProperty({ description: 'List of tasks', type: [SimulationTaskResponseDto] })
  data!: SimulationTaskResponseDto[];

  @ApiProperty({ description: 'Total number of tasks' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}