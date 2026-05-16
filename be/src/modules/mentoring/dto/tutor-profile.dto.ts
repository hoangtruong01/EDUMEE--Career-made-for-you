import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TutorStatus, TutorLevel } from '../schemas/tutor-profile.schema';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const SESSION_TYPES = [
  'career_guidance',
  'skill_coaching',
  'interview_preparation',
  'project_review',
  'general_mentoring',
] as const;
const COMMUNICATION_METHODS = ['video', 'voice', 'chat', 'screen_sharing'] as const;
const SKILL_CATEGORIES = ['technical', 'soft', 'leadership', 'industry_specific'] as const;

class PreviousRoleDto {
  @ApiProperty()
  @IsString()
  position!: string;

  @ApiProperty()
  @IsString()
  company!: string;

  @ApiProperty()
  @IsString()
  duration!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

class EducationDto {
  @ApiProperty()
  @IsString()
  degree!: string;

  @ApiProperty()
  @IsString()
  institution!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1900)
  graduationYear!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  major?: string;
}

class CertificationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  issuer!: string;

  @ApiProperty()
  @IsDateString()
  issueDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credentialUrl?: string;
}

class ProfessionalBackgroundDto {
  @ApiProperty()
  @IsString()
  currentPosition!: string;

  @ApiProperty()
  @IsString()
  company!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  yearsOfExperience!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  industries!: string[];

  @ApiProperty({ enum: ExperienceLevel })
  @IsEnum(ExperienceLevel)
  seniority!: ExperienceLevel;

  @ApiPropertyOptional({ type: [PreviousRoleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviousRoleDto)
  previousRoles?: PreviousRoleDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];
}

class CareerExpertiseDto {
  @ApiProperty()
  @IsString()
  careerId!: string;

  @ApiProperty()
  @IsString()
  careerTitle!: string;

  @ApiProperty({ enum: ExperienceLevel })
  @IsEnum(ExperienceLevel)
  experienceLevel!: ExperienceLevel;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  yearsInField!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  confidenceLevel!: number;
}

class SkillExpertiseDto {
  @ApiProperty()
  @IsString()
  skillName!: string;

  @ApiProperty({ enum: SKILL_CATEGORIES })
  @IsIn(SKILL_CATEGORIES)
  skillCategory!: (typeof SKILL_CATEGORIES)[number];

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  proficiencyLevel!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  teachingExperience!: number;

  @ApiPropertyOptional({ enum: ['self_reported', 'peer_verified', 'admin_verified'] })
  @IsOptional()
  @IsIn(['self_reported', 'peer_verified', 'admin_verified'])
  verificationStatus?: 'self_reported' | 'peer_verified' | 'admin_verified';
}

class MentoringExpertiseDto {
  @ApiProperty({ type: [CareerExpertiseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerExpertiseDto)
  careerExpertise!: CareerExpertiseDto[];

  @ApiProperty({ type: [SkillExpertiseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillExpertiseDto)
  skillExpertise!: SkillExpertiseDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  specializations!: string[];

  @ApiProperty({ enum: ExperienceLevel, isArray: true })
  @IsArray()
  @IsEnum(ExperienceLevel, { each: true })
  targetMenteeLevels!: ExperienceLevel[];
}

class AvailabilityTimeSlotDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;
}

class WeeklyAvailabilityDto {
  @ApiProperty({ enum: WEEK_DAYS })
  @IsIn(WEEK_DAYS)
  day!: (typeof WEEK_DAYS)[number];

  @ApiProperty({ type: [AvailabilityTimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityTimeSlotDto)
  timeSlots!: AvailabilityTimeSlotDto[];
}

class SessionPreferencesDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  preferredDuration!: number[];

  @ApiProperty({ enum: SESSION_TYPES, isArray: true })
  @IsArray()
  @IsIn(SESSION_TYPES, { each: true })
  sessionTypes!: (typeof SESSION_TYPES)[number][];

  @ApiProperty({ enum: COMMUNICATION_METHODS, isArray: true })
  @IsArray()
  @IsIn(COMMUNICATION_METHODS, { each: true })
  communicationMethods!: (typeof COMMUNICATION_METHODS)[number][];
}

class UnavailablePeriodDto {
  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @IsString()
  reason!: string;
}

class AvailabilityDto {
  @ApiProperty()
  @IsString()
  timeZone!: string;

  @ApiProperty({ type: [WeeklyAvailabilityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyAvailabilityDto)
  weeklyAvailability!: WeeklyAvailabilityDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSessionsPerWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMenteesActive?: number;

  @ApiProperty({ type: SessionPreferencesDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => SessionPreferencesDto)
  sessionPreferences!: SessionPreferencesDto;

  @ApiPropertyOptional({ type: [UnavailablePeriodDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailablePeriodDto)
  unavailablePeriods?: UnavailablePeriodDto[];
}

class PackageDealDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  sessionsCount!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalPrice!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  validityDays!: number;
}

class SessionRateDto {
  @ApiProperty({ enum: SESSION_TYPES })
  @IsIn(SESSION_TYPES)
  sessionType!: (typeof SESSION_TYPES)[number];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  duration!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  pricePerSession!: number;

  @ApiPropertyOptional({ type: [PackageDealDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDealDto)
  packageDeals?: PackageDealDto[];
}

class PricingDto {
  @ApiProperty()
  @IsString()
  currency!: string;

  @ApiProperty({ type: [SessionRateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionRateDto)
  sessionRates!: SessionRateDto[];

  @ApiProperty()
  @IsBoolean()
  freeSessionOffered!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  freeSessionDuration?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reschedulePolicy?: string;
}

export class CreateTutorProfileDto {
  @ApiProperty({ description: 'Professional background information', type: ProfessionalBackgroundDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProfessionalBackgroundDto)
  professionalBackground!: ProfessionalBackgroundDto;

  @ApiProperty({ description: 'Mentoring expertise areas', type: MentoringExpertiseDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => MentoringExpertiseDto)
  mentoringExpertise!: MentoringExpertiseDto;

  @ApiProperty({ description: 'Availability and scheduling preferences', type: AvailabilityDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability!: AvailabilityDto;

  @ApiPropertyOptional({ description: 'Pricing and package information', type: PricingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto;

  @ApiPropertyOptional({ enum: TutorStatus, description: 'Tutor status' })
  @IsOptional()
  @IsEnum(TutorStatus)
  status?: TutorStatus;

  @ApiPropertyOptional({ enum: TutorLevel, description: 'Tutor level' })
  @IsOptional()
  @IsEnum(TutorLevel)
  tutorLevel?: TutorLevel;
}

export class UpdateTutorProfileDto extends PartialType(CreateTutorProfileDto) { }

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
