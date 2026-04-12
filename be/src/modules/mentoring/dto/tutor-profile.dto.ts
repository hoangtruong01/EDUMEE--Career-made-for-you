import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { TutorStatus, TutorLevel } from '../schemas/tutor-profile.schema';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

export class CreateTutorProfileDto {
  @ApiProperty({ description: 'Professional background information' })
  @IsObject()
  professionalBackground!: {
    currentPosition: string;
    company: string;
    yearsOfExperience: number;
    industries: string[];
    seniority: ExperienceLevel;
  };

  @ApiProperty({ description: 'Mentoring expertise areas' })
  @IsObject()
  mentoringExpertise!: {
    careerExpertise: {
      careerId: string;
      careerTitle: string;
      experienceLevel: ExperienceLevel;
      yearsInField: number;
      confidenceLevel: number;
    }[];
    skillExpertise: {
      skillName: string;
      skillCategory: 'technical' | 'soft' | 'leadership' | 'industry_specific';
      proficiencyLevel: number;
      teachingExperience: number;
    }[];
    specializations: string[];
    targetMenteeLevels: ExperienceLevel[];
  };

  @ApiProperty({ description: 'Availability and scheduling preferences' })
  @IsObject()
  availability!: {
    timeZone: string;
    maxSessionsPerWeek?: number;
    sessionPreferences: {
      preferredDuration: number[];
      sessionTypes: string[];
      communicationMethods: string[];
    };
  };

  @ApiPropertyOptional({ enum: TutorStatus, description: 'Tutor status' })
  @IsOptional()
  @IsEnum(TutorStatus)
  status?: TutorStatus;

  @ApiPropertyOptional({ enum: TutorLevel, description: 'Tutor level' })
  @IsOptional()
  @IsEnum(TutorLevel)
  tutorLevel?: TutorLevel;
}

export class UpdateTutorProfileDto extends PartialType(CreateTutorProfileDto) {}

export class TutorProfileResponseDto {
  @ApiProperty({ description: 'Profile ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ enum: TutorStatus, description: 'Profile status' })
  status!: TutorStatus;

  @ApiProperty({ enum: TutorLevel, description: 'Tutor level' })
  tutorLevel!: TutorLevel;

  @ApiProperty({ description: 'Professional background' })
  professionalBackground!: any;

  @ApiProperty({ description: 'Mentoring expertise' })
  mentoringExpertise!: any;

  @ApiProperty({ description: 'Availability' })
  availability!: any;

  @ApiPropertyOptional({ description: 'Performance metrics' })
  performanceMetrics?: any;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;
}
