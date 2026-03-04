import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsDateString,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
  Max,
  IsObject
} from 'class-validator';
import { Gender, EducationLevel, BudgetLevel } from '../schemas/user-profile.schema';

export class CreateUserProfileDto {
  @ApiPropertyOptional({ example: '2002-05-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dob?: Date;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '+84901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: EducationLevel, example: EducationLevel.BACHELOR })
  @IsOptional()
  @IsEnum(EducationLevel)
  educationLevel?: EducationLevel;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  weeklyHours?: number;

  @ApiPropertyOptional({ enum: BudgetLevel, example: BudgetLevel.MEDIUM })
  @IsOptional()
  @IsEnum(BudgetLevel)
  budgetLevel?: BudgetLevel;

  @ApiPropertyOptional({ 
    example: { 
      timePreferences: { availableDays: ['monday', 'wednesday'], preferredHours: 'evening' },
      learningStyle: { visual: true, audio: false }
    } 
  })
  @IsOptional()
  @IsObject()
  constraintsJson?: Record<string, any>;
}

export class UpdateUserProfileDto extends PartialType(CreateUserProfileDto) {}

export class UserProfileResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  userId!: string;

  @ApiPropertyOptional({ example: '2002-05-15T00:00:00.000Z' })
  dob?: Date;

  @ApiPropertyOptional({ example: 'vi-VN' })
  locale?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh' })
  city?: string;

  @ApiPropertyOptional({ example: '+84901234567' })
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  gender?: Gender;

  @ApiPropertyOptional({ enum: EducationLevel, example: EducationLevel.BACHELOR })
  educationLevel?: EducationLevel;

  @ApiPropertyOptional({ example: 20 })
  weeklyHours?: number;

  @ApiPropertyOptional({ enum: BudgetLevel, example: BudgetLevel.MEDIUM })
  budgetLevel?: BudgetLevel;

  @ApiPropertyOptional({ 
    example: { 
      timePreferences: { availableDays: ['monday', 'wednesday'], preferredHours: 'evening' } 
    } 
  })
  constraintsJson?: Record<string, any>;

  @ApiProperty({ example: new Date().toISOString() })
  createdAt!: Date;

  @ApiProperty({ example: new Date().toISOString() })
  updatedAt!: Date;
}