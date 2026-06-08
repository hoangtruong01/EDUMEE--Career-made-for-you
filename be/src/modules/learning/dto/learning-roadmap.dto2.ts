import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class MilestoneDto {
  @ApiProperty({ description: 'NÂNG CẤP: Không dùng MongoID vì đây là cấu trúc sinh bởi AI' })
  @IsString()
  milestoneId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  order!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  taskIds!: string[];
}

export class PhaseDto {
  @ApiProperty()
  @IsString()
  phaseId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  order!: number;

  @ApiProperty({ type: [MilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones!: MilestoneDto[];
}

export class CreateLearningRoadmapDto {
  @ApiProperty()
  @IsMongoId()
  careerId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ type: [PhaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDto)
  phases!: PhaseDto[];
}

export class UpdateLearningRoadmapDto extends PartialType(CreateLearningRoadmapDto) {}

// 👇 DTO MỚI BỔ SUNG ĐỂ FIX LỖI ĐỒNG BỘ FE-BE
export class GenerateAIRoadmapDto {
  @ApiProperty({ description: 'ID của ngành nghề (Nếu đã có)' })
  @IsOptional()
  @IsMongoId()
  careerId?: string;

  @ApiProperty({ description: 'Tên ngành nghề (Bắt buộc để AI đọc)' })
  @IsNotEmpty()
  @IsString()
  careerTitle!: string;
}
