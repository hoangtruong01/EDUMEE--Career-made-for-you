import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DifficultyLevel, TaskType } from '../../../common/enums/learning.enum';

// NÂNG CẤP: Ép kiểu chặt chẽ cho từng object con trong mảng
export class TaskMaterialDto {
  @ApiProperty({ enum: ['DOCUMENT', 'VIDEO', 'DATASET', 'CODE_TEMPLATE'] })
  @IsEnum(['DOCUMENT', 'VIDEO', 'DATASET', 'CODE_TEMPLATE'])
  type!: 'DOCUMENT' | 'VIDEO' | 'DATASET' | 'CODE_TEMPLATE';

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class RubricLevelDto {
  @ApiProperty({ description: 'Điểm số đạt được (vd: 1, 2, 3...)' })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}

export class EvaluationRubricDto {
  @ApiProperty()
  @IsString()
  criteria!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ type: [RubricLevelDto] })
  @IsArray()
  @ValidateNested({ each: true }) // NÂNG CẤP: Bắt buộc check từng phần tử trong mảng
  @Type(() => RubricLevelDto) // NÂNG CẤP: Transform chuỗi JSON thành Object để validate
  levels!: RubricLevelDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  weight!: number;
}

export class CreateSimulationTaskDto {
  @ApiProperty({ description: 'ID của Ngành nghề (Career)' })
  @IsMongoId() // NÂNG CẤP: Chặn ngay nếu ID gửi lên không phải chuẩn MongoDB
  careerId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ enum: TaskType })
  @IsEnum(TaskType)
  taskType!: TaskType;

  @ApiProperty({ enum: DifficultyLevel })
  @IsEnum(DifficultyLevel)
  difficulty!: DifficultyLevel;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  estimatedMinutes!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  instructions!: string[];

  @ApiProperty({ type: [TaskMaterialDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskMaterialDto)
  materials?: TaskMaterialDto[];

  @ApiProperty({ type: [EvaluationRubricDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationRubricDto)
  evaluationRubric!: EvaluationRubricDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsEvaluated?: string[];
}

// PartialType tự động biến mọi field của Create thành Optional cho Update
export class UpdateSimulationTaskDto extends PartialType(CreateSimulationTaskDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
