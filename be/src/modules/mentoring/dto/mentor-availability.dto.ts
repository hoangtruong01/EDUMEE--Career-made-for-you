import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkAvailabilitySlotStartDto {
  @ApiProperty({ description: 'Day index in the selected week, Monday = 0, Sunday = 6' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayIndex!: number;

  @ApiProperty({ description: 'Slot start time in HH:mm format' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;
}

export class CreateBulkAvailabilitySlotsDto {
  @ApiProperty({ description: 'Tutor profile ID' })
  @IsString()
  tutorProfileId!: string;

  @ApiProperty({ description: 'Start date of the selected week' })
  @IsString()
  weekStart!: string;

  @ApiProperty({ type: [BulkAvailabilitySlotStartDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkAvailabilitySlotStartDto)
  slotStarts!: BulkAvailabilitySlotStartDto[];

  @ApiProperty({ description: 'Number of weeks to generate concrete slots for', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  repeatWeeks!: number;
}
