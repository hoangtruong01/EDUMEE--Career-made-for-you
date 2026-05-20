import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH,
  ANALYTICS_EVENT_PATH_MAX_LENGTH,
  ANALYTICS_EVENT_TYPE_MAX_LENGTH,
} from '../tracking.constants';

function truncateString(value: unknown, maxLength: number): unknown {
  return typeof value === 'string' ? value.slice(0, maxLength) : value;
}

export class CreateAnalyticsEventDto {
  @ApiProperty({ example: 'page_view' })
  @Transform(({ value }) => truncateString(value, ANALYTICS_EVENT_TYPE_MAX_LENGTH))
  @IsString()
  @MaxLength(ANALYTICS_EVENT_TYPE_MAX_LENGTH)
  eventType!: string;

  @ApiProperty({ example: '/dashboard' })
  @Transform(({ value }) => truncateString(value, ANALYTICS_EVENT_PATH_MAX_LENGTH))
  @IsString()
  @MaxLength(ANALYTICS_EVENT_PATH_MAX_LENGTH)
  path!: string;

  @ApiProperty()
  @Transform(({ value }) => truncateString(value, ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH))
  @IsString()
  @MaxLength(ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH)
  anonymousId!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
