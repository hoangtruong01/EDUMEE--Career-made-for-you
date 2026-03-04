import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { CareerCategory } from '../schemas/career.schema';

export class UpdateCareerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CareerCategory)
  category?: CareerCategory;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  careerPath?: any;

  @IsOptional()
  salaryInformation?: any;

  @IsOptional()
  workEnvironment?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  educationRequirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  jobOutlook?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedCareers?: string[];

  @IsOptional()
  typicalDay?: any;

  @IsOptional()
  @IsArray()
  resources?: any[];
}