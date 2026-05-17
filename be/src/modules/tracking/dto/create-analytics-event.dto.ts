import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnalyticsEventDto {
  @ApiProperty({ example: 'page_view' })
  @IsString()
  @MaxLength(80)
  eventType!: string;

  @ApiProperty({ example: '/dashboard' })
  @IsString()
  @MaxLength(300)
  path!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  anonymousId!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
