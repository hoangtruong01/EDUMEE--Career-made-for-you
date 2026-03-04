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
import { RoadmapStatus, LearningPhase } from '../schemas/learning-roadmap.schema';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

class TaskDto {
  @ApiProperty({ description: 'Task ID reference' })
  @IsString()
  taskId!: string;

  @ApiProperty({ description: 'Task title (cached)' })
  @IsString()
  taskTitle!: string;

  @ApiProperty({ description: 'Whether task is required' })
  @IsBoolean()
  isRequired!: boolean;

  @ApiProperty({ description: 'Estimated hours for task' })
  @IsNumber()
  @Min(0)
  estimatedHours!: number;

  @ApiProperty({ description: 'Task order in milestone' })
  @IsNumber()
  @Min(1)
  order!: number;
}

class SkillDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  skillName!: string;

  @ApiProperty({ description: 'Target skill level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  targetLevel!: number;

  @ApiPropertyOptional({ description: 'Current skill level (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  currentLevel?: number;
}

class CompletionCriteriaDto {
  @ApiPropertyOptional({ description: 'Minimum score required', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumScore?: number;

  @ApiProperty({ description: 'Required task IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  requiredTasks!: string[];

  @ApiPropertyOptional({ description: 'Optional task IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalTasks?: string[];
}

class MilestoneDto {
  @ApiProperty({ description: 'Unique milestone identifier' })
  @IsString()
  milestoneId!: string;

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Milestone description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Tasks in this milestone', type: [TaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks!: TaskDto[];

  @ApiProperty({ description: 'Skills to develop', type: [SkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills!: SkillDto[];

  @ApiProperty({ description: 'Completion criteria', type: CompletionCriteriaDto })
  @ValidateNested()
  @Type(() => CompletionCriteriaDto)
  completionCriteria!: CompletionCriteriaDto;
}

class PhaseDto {
  @ApiProperty({ description: 'Unique phase identifier' })
  @IsString()
  phaseId!: string;

  @ApiProperty({ enum: LearningPhase, description: 'Learning phase type' })
  @IsEnum(LearningPhase)
  phase!: LearningPhase;

  @ApiProperty({ description: 'Phase title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Phase description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Estimated duration (e.g., "4-6 weeks")' })
  @IsString()
  estimatedDuration!: string;

  @ApiProperty({ description: 'Learning objectives', type: [String] })
  @IsArray()
  @IsString({ each: true })
  objectives!: string[];

  @ApiProperty({ description: 'Milestones in this phase', type: [MilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones!: MilestoneDto[];

  @ApiProperty({ description: 'Phase order' })
  @IsNumber()
  @Min(1)
  order!: number;

  @ApiPropertyOptional({ description: 'Prerequisites (previous phase IDs)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}

class PersonalizationDto {
  @ApiProperty({ description: 'Assessment result ID this roadmap is based on' })
  @IsString()
  basedOnAssessment!: string;

  @ApiProperty({ description: 'Identified skill gaps', type: Array })
  @IsArray()
  skillGaps!: {
    skillName: string;
    currentLevel: number;
    targetLevel: number;
    priority: 'high' | 'medium' | 'low';
  }[];

  @ApiProperty({ description: 'Learning style preference' })
  @IsString()
  learningStyle!: string;

  @ApiProperty({ description: 'Available hours per week' })
  @IsNumber()
  @Min(1)
  timeAvailability!: number;

  @ApiProperty({ enum: ['slow', 'normal', 'fast'], description: 'Preferred learning pace' })
  @IsEnum(['slow', 'normal', 'fast'])
  preferredPace!: 'slow' | 'normal' | 'fast';

  @ApiProperty({ description: 'Roadmap adaptations made', type: [String] })
  @IsArray()
  @IsString({ each: true })
  adaptations!: string[];
}

export class CreateLearningRoadmapDto {
  @ApiProperty({ description: 'User ID who owns this roadmap' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Target career ID' })
  @IsString()
  targetCareer!: string;

  @ApiProperty({ enum: ExperienceLevel, description: 'Target experience level' })
  @IsEnum(ExperienceLevel)
  targetLevel!: ExperienceLevel;

  @ApiProperty({ description: 'Roadmap title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Roadmap description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Learning phases and milestones', type: [PhaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDto)
  phases!: PhaseDto[];

  @ApiPropertyOptional({ description: 'Personalization settings', type: PersonalizationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalizationDto)
  personalization?: PersonalizationDto;

  @ApiPropertyOptional({ enum: RoadmapStatus, description: 'Roadmap status' })
  @IsOptional()
  @IsEnum(RoadmapStatus)
  status?: RoadmapStatus;

  @ApiPropertyOptional({ description: 'Whether this can be used as template' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Whether roadmap is public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateLearningRoadmapDto extends PartialType(CreateLearningRoadmapDto) {
  @ApiPropertyOptional({ description: 'Progress tracking information', type: Object })
  @IsOptional()
  @IsObject()
  progress?: {
    currentPhase: string;
    currentMilestone: string;
    overallProgress: number;
    phaseProgress: {
      phaseId: string;
      progress: number;
      completedTasks: number;
      totalTasks: number;
      startedAt?: Date;
      completedAt?: Date;
    }[];
    skillProgress: {
      skillName: string;
      startingLevel: number;
      currentLevel: number;
      targetLevel: number;
      lastUpdated: Date;
    }[];
    timeSpent: {
      totalHours: number;
      weeklyHours?: number;
      lastActiveDate: Date;
    };
  };

  @ApiPropertyOptional({ description: 'Roadmap adaptations', type: Array })
  @IsOptional()
  @IsArray()
  adaptations?: {
    adaptationDate: Date;
    reason: string;
    changes: {
      type: 'added_task' | 'removed_task' | 'modified_task' | 'reordered_phases' | 'adjusted_timeline';
      description: string;
      oldValue?: any;
      newValue?: any;
    }[];
    triggeredBy: 'user_request' | 'ai_recommendation' | 'mentor_suggestion' | 'performance_analysis';
  }[];

  @ApiPropertyOptional({ description: 'Success metrics tracking', type: Object })
  @IsOptional()
  @IsObject()
  successMetrics?: {
    targetCompletionDate: Date;
    actualCompletionDate?: Date;
    targetJobReadiness: number;
    currentJobReadiness?: number;
    milestoneDeadlines: {
      milestoneId: string;
      targetDate: Date;
      actualDate?: Date;
    }[];
  };
}

export class LearningRoadmapResponseDto {
  @ApiProperty({ description: 'Roadmap ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Target career ID' })
  targetCareer!: string;

  @ApiProperty({ enum: ExperienceLevel, description: 'Target experience level' })
  targetLevel!: ExperienceLevel;

  @ApiProperty({ description: 'Roadmap title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Roadmap description' })
  description?: string;

  @ApiProperty({ enum: RoadmapStatus, description: 'Roadmap status' })
  status!: RoadmapStatus;

  @ApiProperty({ description: 'Learning phases', type: [PhaseDto] })
  phases!: PhaseDto[];

  @ApiPropertyOptional({ description: 'Personalization settings', type: PersonalizationDto })
  personalization?: PersonalizationDto;

  @ApiPropertyOptional({ description: 'Progress tracking', type: Object })
  progress?: any;

  @ApiPropertyOptional({ description: 'Adaptations made', type: Array })
  adaptations?: any[];

  @ApiPropertyOptional({ description: 'Weekly plan IDs', type: [String] })
  weeklyPlans?: string[];

  @ApiPropertyOptional({ description: 'Template flag' })
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Public flag' })
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Success metrics', type: Object })
  successMetrics?: any;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}

export class LearningRoadmapListResponseDto {
  @ApiProperty({ description: 'List of roadmaps', type: [LearningRoadmapResponseDto] })
  data!: LearningRoadmapResponseDto[];

  @ApiProperty({ description: 'Total number of roadmaps' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}