import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { WeeklyPlanStatus } from '../schemas/weekly-plan.schema2';

// NÂNG CẤP: Tạo sub-DTO để quản lý từng task trong tuần
export class PlannedTaskDto {
  @ApiProperty({ description: 'ID của SimulationTask' })
  @IsMongoId()
  taskId!: string;

  @ApiProperty()
  @IsBoolean()
  isCompleted!: boolean;

  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority!: 'HIGH' | 'MEDIUM' | 'LOW';
}

// DTO CỐT LÕI KHI TẠO MỚI (AI hoặc Backend tự gọi)
export class CreateWeeklyPlanDto {
  @ApiProperty()
  @IsMongoId()
  roadmapId!: string;

  @ApiProperty({ description: 'Tuần thứ mấy trong lộ trình?' })
  @IsNumber()
  @Min(1)
  weekNumber!: number;

  @ApiProperty({ description: 'Ngày bắt đầu tuần học' })
  @IsDateString() // NÂNG CẤP: Ép chuẩn format ISO Date
  startDate!: string;

  @ApiProperty({ description: 'Ngày kết thúc tuần học' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ description: 'Số giờ user cam kết học tuần này' })
  @IsNumber()
  @Min(1)
  committedHours!: number;

  @ApiProperty({ type: [PlannedTaskDto] })
  @IsArray()
  @ValidateNested({ each: true }) // Kiểm tra sâu vào từng task
  @Type(() => PlannedTaskDto)
  plannedTasks!: PlannedTaskDto[];
}

// NÂNG CẤP BẢO MẬT: DTO khi cập nhật
// Dùng OmitType để CẤM User/Frontend sửa những trường cố định như roadmapId, weekNumber
export class UpdateWeeklyPlanDto extends PartialType(
  OmitType(CreateWeeklyPlanDto, ['roadmapId', 'weekNumber', 'startDate', 'endDate'] as const),
) {
  @ApiProperty({ enum: WeeklyPlanStatus, required: false })
  @IsOptional()
  @IsEnum(WeeklyPlanStatus)
  status?: WeeklyPlanStatus;

  @ApiProperty({ description: 'Số giờ thực tế đã học', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHoursSpent?: number;
}
