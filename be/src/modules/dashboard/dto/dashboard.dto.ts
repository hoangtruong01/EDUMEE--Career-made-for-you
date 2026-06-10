// be/src/modules/dashboard/dto/dashboard.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString, ValidateNested } from 'class-validator';

export class DashboardStatsDto {
  @ApiProperty()
  @IsNumber()
  currentStreak!: number;

  @ApiProperty()
  @IsNumber()
  longestStreak!: number;

  @ApiProperty()
  @IsNumber()
  totalTasksCompleted!: number;

  @ApiProperty()
  @IsNumber()
  exploredCareersCount!: number;

  @ApiProperty()
  @IsNumber()
  uncompletedTasksCount!: number;

  // 🎯 ĐĂNG KÝ MẢNG DANH HIỆU LỘ TRÌNH MỚI
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  achievements!: string[];
}

export class CurrentLearningStateDto {
  @ApiProperty()
  @IsString()
  phaseTitle!: string;

  @ApiProperty()
  @IsString()
  taskTitle!: string;
}

export class ActiveRoadmapSummaryDto {
  @ApiProperty()
  @IsString()
  roadmapId!: string;

  @ApiProperty()
  @IsString()
  careerTitle!: string;

  @ApiProperty()
  @IsNumber()
  overallProgressPercentage!: number;

  @ApiProperty()
  @IsNumber()
  completedCount!: number;

  @ApiProperty()
  @IsNumber()
  remainingCount!: number;

  @ApiProperty({ type: CurrentLearningStateDto })
  @ValidateNested()
  @Type(() => CurrentLearningStateDto)
  currentState!: CurrentLearningStateDto;
}

export class AiCourseRecommendationDto {
  @ApiProperty()
  @IsString()
  courseName!: string;

  @ApiProperty()
  @IsString()
  provider!: string;

  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty()
  @IsString()
  type!: 'Course' | 'Video series' | 'Book';

  @ApiProperty()
  @IsNumber()
  matchScore!: number;

  @ApiProperty()
  @IsNumber()
  authorityScore!: number;

  @ApiProperty()
  @IsString()
  dotColor!: string;
}

export class PendingTaskReminderDto {
  @ApiProperty()
  @IsString()
  taskId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  formatType!: string;

  @ApiProperty()
  @IsString()
  phaseTitle!: string;
}

export class DashboardResponseDto {
  @ApiProperty()
  @IsBoolean()
  hasActiveRoadmap!: boolean;

  @ApiProperty({ type: DashboardStatsDto })
  @ValidateNested()
  @Type(() => DashboardStatsDto)
  stats!: DashboardStatsDto;

  @ApiProperty({ type: ActiveRoadmapSummaryDto, required: false })
  @ValidateNested()
  @Type(() => ActiveRoadmapSummaryDto)
  activeRoadmap?: ActiveRoadmapSummaryDto;

  @ApiProperty({ type: [AiCourseRecommendationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiCourseRecommendationDto)
  aiRecommendations!: Array<AiCourseRecommendationDto>;

  @ApiProperty({ type: [PendingTaskReminderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingTaskReminderDto)
  pendingTasks!: Array<PendingTaskReminderDto>;
}
