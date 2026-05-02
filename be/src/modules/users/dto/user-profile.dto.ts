import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsDate,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
  Max,
  IsObject
} from 'class-validator';
import { Transform} from 'class-transformer';
import { Gender, EducationLevel, BudgetLevel } from '../schemas/user-profile.schema';

// Custom date transformation function
const transformDate = ({ value }: { value: any }): Date | undefined => {
  if (!value) return undefined;
  
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    // Handle different date formats
    const dateStr = value.trim();
    
    // DD/MM/YYYY or DD-MM-YYYY format
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[/-]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    // YYYY-MM-DD format
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    
    // ISO 8601 format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }
  
  return undefined;
};

export class CreateUserProfileDto {
  @ApiPropertyOptional({ 
    example: '15/05/2002', 
    description: 'Date of birth. Accepts formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD' 
  })
  @IsOptional()
  @Transform(transformDate)
  @IsDate({ message: 'dob must be a valid date. Accepted formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD' })
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

  @ApiPropertyOptional({ example: 'I am a passionate developer...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

export class UpdateUserProfileDto extends PartialType(CreateUserProfileDto) {}

export class UserProfileResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  userId!: string;

  @ApiPropertyOptional({ 
    example: '15/05/2002', 
    description: 'Date of birth in DD/MM/YYYY format' 
  })
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

  @ApiPropertyOptional({ example: 'I am a passionate developer...' })
  bio?: string;

  @ApiProperty({ example: new Date().toISOString() })
  createdAt!: Date;

  @ApiProperty({ example: new Date().toISOString() })
  updatedAt!: Date;
}