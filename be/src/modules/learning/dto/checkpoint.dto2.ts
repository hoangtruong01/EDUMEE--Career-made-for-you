import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// Enum nội bộ cho Checkpoint (Bạn có thể chuyển file này sang thư mục enums dùng chung)
export enum CheckpointType {
  PHASE_REVIEW = 'PHASE_REVIEW', // Đánh giá khi hết 1 Phase
  MONTHLY_REVIEW = 'MONTHLY_REVIEW', // Đánh giá hàng tháng
}

// 1. DTO Cấu trúc Form Khảo Sát của User
export class UserReflectionDto {
  @ApiProperty({ description: 'Độ tự tin hiện tại (1-5 sao)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  confidenceLevel!: number;

  @ApiProperty({ description: 'Khó khăn lớn nhất đang gặp phải' })
  @IsString()
  challenges!: string;

  @ApiProperty({ description: 'Có ý định bỏ cuộc không?' })
  @IsBoolean()
  isThinkingAboutQuitting!: boolean;
}

// 2. DTO TẠO MỚI (Dành cho User khi tới kỳ đánh giá)
export class CreateCheckpointDto {
  @ApiProperty()
  @IsMongoId() // NÂNG CẤP: Chặn ID ảo, bắt buộc đúng chuẩn 24 hex char của MongoDB
  roadmapId!: string;

  @ApiProperty({ enum: CheckpointType })
  @IsEnum(CheckpointType)
  type!: CheckpointType;

  @ApiProperty({ type: UserReflectionDto })
  @ValidateNested() // NÂNG CẤP: Bắt buộc class-validator phải chui vào trong Object để check từng trường
  @Type(() => UserReflectionDto)
  userReflection!: UserReflectionDto;
}

// 3. DTO DÀNH RIÊNG CHO AI/HỆ THỐNG CẬP NHẬT
// Bảo mật: User không thể tự truyền data vào API này để tự khen mình.
export class UpdateCheckpointAiFeedbackDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  aiFeedback!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendedActions!: string[];
}

// 4. DTO CẬP NHẬT CHUNG (Cho Admin / CRUD thông thường)
// Sử dụng OmitType để CẤM tuyệt đối việc sửa roadmapId và type sau khi đã tạo
export class UpdateCheckpointDto extends PartialType(
  OmitType(CreateCheckpointDto, ['roadmapId', 'type'] as const),
) {
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aiFeedback?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedActions?: string[];
}

// 5. DTO TRẢ VỀ CHO FRONTEND (Response / Swagger Documentation)
export class CheckpointResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  roadmapId!: string;

  @ApiProperty({ enum: CheckpointType })
  type!: CheckpointType;

  @ApiProperty({ type: UserReflectionDto })
  userReflection!: UserReflectionDto;

  @ApiProperty({ type: [String] })
  aiFeedback!: string[];

  @ApiProperty({ type: [String] })
  recommendedActions!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
