import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ReviewCategory,
  ReviewStatus,
  ReviewerBackground,
} from '../schemas/career-review.schema';

class ReviewerContextDto {
  @ApiProperty({ enum: ReviewerBackground })
  @IsEnum(ReviewerBackground)
  background!: ReviewerBackground;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verifiedExperience?: boolean;

  @ApiPropertyOptional({ description: "bronze|silver|gold|platinum" })
  @IsOptional()
  @IsString()
  reviewerTier?: string;
}

class ReviewContentDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @ApiProperty()
  @IsBoolean()
  wouldRecommend!: boolean;

  @ApiProperty({ description: "strongly|somewhat|neutral|not_really|strongly_not" })
  @IsString()
  recommendationStrength!: string;

  @ApiProperty()
  @IsString()
  mainReviewText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  aspectRatings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  prosAndCons?: { pros?: string[]; cons?: string[] };
}

export class CreateCareerReviewDto {
  @ApiProperty({ description: 'Career ID being reviewed' })
  @IsString()
  careerId!: string;

  @ApiProperty({ description: 'Career title (cached for performance)' })
  @IsString()
  careerTitle!: string;

  @ApiProperty({ enum: ReviewCategory })
  @IsEnum(ReviewCategory)
  reviewCategory!: ReviewCategory;

  @ApiProperty({ type: ReviewerContextDto })
  @ValidateNested()
  @Type(() => ReviewerContextDto)
  reviewerContext!: ReviewerContextDto;

  @ApiProperty({ type: ReviewContentDto })
  @ValidateNested()
  @Type(() => ReviewContentDto)
  reviewContent!: ReviewContentDto;

  @ApiPropertyOptional({ enum: ReviewStatus, description: 'Defaults to submitted' })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ description: 'If true, enforce moderation workflow' })
  @IsOptional()
  @IsBoolean()
  moderationRequired?: boolean;
}

export class UpdateCareerReviewDto extends PartialType(CreateCareerReviewDto) {}

