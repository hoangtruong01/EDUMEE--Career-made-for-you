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
import { PlanStatus } from '../schemas/weekly-plan.schema';

class WeekPeriodDto {
  @ApiProperty({ description: 'Week start date' })
  @IsDateString()
  startDate!: Date;

  @ApiProperty({ description: 'Week end date' })
  @IsDateString()
  endDate!: Date;
}

class WeeklyGoalsDto {
  @ApiProperty({ description: 'Primary goals (must accomplish)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  primary!: string[];

  @ApiPropertyOptional({ description: 'Secondary goals (nice to have)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondary?: string[];

  @ApiProperty({ description: 'Skills to focus on this week', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skillFocus!: string[];
}

class ActivityResourceDto {
  @ApiProperty({ enum: ['material', 'tool', 'environment'], description: 'Resource type' })
  @IsEnum(['material', 'tool', 'environment'])
  type!: 'material' | 'tool' | 'environment';

  @ApiProperty({ description: 'Resource name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Resource URL' })
  @IsOptional()
  @IsString()
  url?: string;
}

class ScheduledDayDto {
  @ApiProperty({ enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], description: 'Day of week' })
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  day!: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

  @ApiPropertyOptional({ description: 'Time slot (e.g., "9:00-11:00")' })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiProperty({ description: 'Duration in hours' })
  @IsNumber()
  @Min(0)
  duration!: number;
}

class PlannedActivityDto {
  @ApiProperty({ description: 'Unique activity identifier' })
  @IsString()
  activityId!: string;

  @ApiProperty({ enum: ['simulation_task', 'study_material', 'practice', 'mentoring', 'checkpoint'], description: 'Activity type' })
  @IsEnum(['simulation_task', 'study_material', 'practice', 'mentoring', 'checkpoint'])
  type!: 'simulation_task' | 'study_material' | 'practice' | 'mentoring' | 'checkpoint';

  @ApiPropertyOptional({ description: 'Task ID if this is a simulation task' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({ description: 'Activity title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Activity description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Estimated hours to complete' })
  @IsNumber()
  @Min(0)
  estimatedHours!: number;

  @ApiProperty({ enum: ['high', 'medium', 'low'], description: 'Activity priority' })
  @IsEnum(['high', 'medium', 'low'])
  priority!: 'high' | 'medium' | 'low';

  @ApiPropertyOptional({ description: 'Activity deadline' })
  @IsOptional()
  @IsDateString()
  deadline?: Date;

  @ApiPropertyOptional({ description: 'Scheduled days for activity', type: [ScheduledDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduledDayDto)
  scheduledDays?: ScheduledDayDto[];

  @ApiPropertyOptional({ description: 'Dependencies on other activities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependsOn?: string[];

  @ApiPropertyOptional({ description: 'Required resources', type: [ActivityResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityResourceDto)
  resources?: ActivityResourceDto[];

  @ApiProperty({ enum: ['not_started', 'in_progress', 'completed', 'skipped', 'deferred'], description: 'Activity completion status' })
  @IsEnum(['not_started', 'in_progress', 'completed', 'skipped', 'deferred'])
  status!: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'deferred';

  @ApiPropertyOptional({ description: 'Actual hours spent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Completion date' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Activity notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

class WeeklyProgressDto {
  @ApiProperty({ description: 'Overall completion percentage (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallCompletion!: number;

  @ApiProperty({ description: 'Number of completed activities' })
  @IsNumber()
  @Min(0)
  completedActivities!: number;

  @ApiProperty({ description: 'Total number of activities' })
  @IsNumber()
  @Min(0)
  totalActivities!: number;

  @ApiProperty({ description: 'Time spent tracking' })
  @ValidateNested()
  @Type(() => Object)
  timeSpent!: {
    planned: number;
    actual: number;
    breakdown: {
      day: string;
      hours: number;
    }[];
  };

  @ApiPropertyOptional({ description: 'Skill progress tracking', type: Array })
  @IsOptional()
  @IsArray()
  skillProgress?: {
    skillName: string;
    practiceHours: number;
    improvement?: number;
  }[];

  @ApiProperty({ description: 'Weekly achievements', type: [String] })
  @IsArray()
  @IsString({ each: true })
  achievements!: string[];

  @ApiProperty({ description: 'Challenges faced', type: [String] })
  @IsArray()
  @IsString({ each: true })
  challenges!: string[];
}

class UserFeedbackDto {
  @ApiProperty({ description: 'Difficulty rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  difficultyRating!: number;

  @ApiProperty({ description: 'Satisfaction rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  satisfactionRating!: number;

  @ApiProperty({ description: 'Workload rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  workloadRating!: number;

  @ApiProperty({ description: 'Most valuable aspect of the week' })
  @IsString()
  mostValuable!: string;

  @ApiPropertyOptional({ description: 'Least valuable aspect' })
  @IsOptional()
  @IsString()
  leastValuable?: string;

  @ApiProperty({ description: 'Suggestions for improvement', type: [String] })
  @IsArray()
  @IsString({ each: true })
  suggestions!: string[];

  @ApiProperty({ description: 'Time management feedback' })
  @ValidateNested()
  @Type(() => Object)
  timeManagement!: {
    plannedHoursRealistic: boolean;
    actualTimeSpent: number;
    timeManagementChallenges: string[];
  };

  @ApiProperty({ description: 'Feedback submission date' })
  @IsDateString()
  feedbackDate!: Date;
}

export class CreateWeeklyPlanDto {
  @ApiProperty({ description: 'User ID who owns this plan' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Learning roadmap ID' })
  @IsString()
  roadmapId!: string;

  @ApiProperty({ description: 'Week number in roadmap' })
  @IsNumber()
  @Min(1)
  weekNumber!: number;

  @ApiProperty({ description: 'Week period', type: WeekPeriodDto })
  @ValidateNested()
  @Type(() => WeekPeriodDto)
  weekPeriod!: WeekPeriodDto;

  @ApiProperty({ description: 'Weekly goals and objectives', type: WeeklyGoalsDto })
  @ValidateNested()
  @Type(() => WeeklyGoalsDto)
  weeklyGoals!: WeeklyGoalsDto;

  @ApiProperty({ description: 'Planned activities for the week', type: [PlannedActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannedActivityDto)
  plannedActivities!: PlannedActivityDto[];

  @ApiPropertyOptional({ enum: PlanStatus, description: 'Plan status' })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional({ description: 'Weekly checkpoint ID' })
  @IsOptional()
  @IsString()
  weeklyCheckpoint?: string;
}

export class UpdateWeeklyPlanDto extends PartialType(CreateWeeklyPlanDto) {
  @ApiPropertyOptional({ description: 'Plan adaptations made during week', type: Array })
  @IsOptional()
  @IsArray()
  adaptations?: {
    adaptationDate: Date;
    reason: string;
    changes: {
      activityId: string;
      changeType: 'added' | 'removed' | 'modified' | 'rescheduled';
      oldValue?: any;
      newValue?: any;
    }[];
    triggeredBy: 'user' | 'ai_system' | 'mentor' | 'checkpoint_analysis';
  }[];

  @ApiPropertyOptional({ description: 'Weekly progress summary', type: WeeklyProgressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyProgressDto)
  weeklyProgress?: WeeklyProgressDto;

  @ApiPropertyOptional({ description: 'Next week preparation notes', type: Object })
  @IsOptional()
  @IsObject()
  nextWeekPreparation?: {
    carryOverTasks: string[];
    newFocusAreas: string[];
    adjustmentRecommendations: string[];
    mentorInputNeeded?: boolean;
  };

  @ApiPropertyOptional({ description: 'User feedback on week', type: UserFeedbackDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserFeedbackDto)
  userFeedback?: UserFeedbackDto;
}

export class WeeklyPlanResponseDto {
  @ApiProperty({ description: 'Weekly plan ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Roadmap ID' })
  roadmapId!: string;

  @ApiProperty({ description: 'Week number' })
  weekNumber!: number;

  @ApiProperty({ description: 'Week period', type: WeekPeriodDto })
  weekPeriod!: WeekPeriodDto;

  @ApiProperty({ enum: PlanStatus, description: 'Plan status' })
  status!: PlanStatus;

  @ApiProperty({ description: 'Weekly goals', type: WeeklyGoalsDto })
  weeklyGoals!: WeeklyGoalsDto;

  @ApiProperty({ description: 'Planned activities', type: [PlannedActivityDto] })
  plannedActivities!: PlannedActivityDto[];

  @ApiPropertyOptional({ description: 'Adaptations made', type: Array })
  adaptations?: any[];

  @ApiPropertyOptional({ description: 'Weekly checkpoint ID' })
  weeklyCheckpoint?: string;

  @ApiPropertyOptional({ description: 'Progress summary', type: WeeklyProgressDto })
  weeklyProgress?: WeeklyProgressDto;

  @ApiPropertyOptional({ description: 'Next week preparation', type: Object })
  nextWeekPreparation?: any;

  @ApiPropertyOptional({ description: 'User feedback', type: UserFeedbackDto })
  userFeedback?: UserFeedbackDto;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}

export class WeeklyPlanListResponseDto {
  @ApiProperty({ description: 'List of weekly plans', type: [WeeklyPlanResponseDto] })
  data!: WeeklyPlanResponseDto[];

  @ApiProperty({ description: 'Total number of plans' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;
}