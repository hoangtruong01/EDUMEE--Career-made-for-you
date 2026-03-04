import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export enum ReviewCategory {
  OVERALL_CAREER = 'overall_career',
  EDUCATION_PATH = 'education_path',
  WORK_ENVIRONMENT = 'work_environment',
  SALARY_BENEFITS = 'salary_benefits',
  CAREER_GROWTH = 'career_growth',
  SKILL_REQUIREMENTS = 'skill_requirements',
  INDUSTRY_INSIGHTS = 'industry_insights',
  COMPANY_SPECIFIC = 'company_specific',
}

export enum ReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_MODERATION = 'under_moderation',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
  FLAGGED = 'flagged',
}

export class CreateCareerReviewDto {
  @ApiProperty({ description: 'User ID of the reviewer' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Career ID being reviewed' })
  @IsString()
  careerId!: string;

  @ApiProperty({ enum: ReviewCategory, description: 'Category of review' })
  @IsEnum(ReviewCategory)
  category!: ReviewCategory;

  @ApiProperty({ description: 'Review title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Review content' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'Overall rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @ApiPropertyOptional({ enum: ReviewStatus, description: 'Review status' })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

export class UpdateCareerReviewDto extends PartialType(CreateCareerReviewDto) {}

export class CareerReviewResponseDto {
  @ApiProperty({ description: 'Review ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Career ID' })
  careerId!: string;

  @ApiProperty({ enum: ReviewCategory, description: 'Review category' })
  category!: ReviewCategory;

  @ApiProperty({ description: 'Review title' })
  title!: string;

  @ApiProperty({ description: 'Review content' })
  content!: string;

  @ApiProperty({ description: 'Overall rating' })
  overallRating!: number;

  @ApiProperty({ enum: ReviewStatus, description: 'Review status' })
  status!: ReviewStatus;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}