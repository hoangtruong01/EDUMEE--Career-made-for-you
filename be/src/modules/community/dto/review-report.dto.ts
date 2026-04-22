import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ReportReason, ReportSeverity } from '../schemas/review-interactions.schema';

class ReportDetailsDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  @IsIn(['low', 'medium', 'high'])
  impactLevel!: 'low' | 'medium' | 'high';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  affectedUsers?: string;
}

export class CreateReviewReportDto {
  @ApiProperty()
  @IsString()
  reviewId!: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reportReason!: ReportReason;

  @ApiPropertyOptional({ enum: ReportSeverity })
  @IsOptional()
  @IsEnum(ReportSeverity)
  severity?: ReportSeverity;

  @ApiProperty({ type: ReportDetailsDto })
  @ValidateNested()
  @Type(() => ReportDetailsDto)
  reportDetails!: ReportDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  reporterContext?: Record<string, unknown>;
}

