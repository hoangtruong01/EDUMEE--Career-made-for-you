import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsNumber, IsUrl } from 'class-validator';
import { CareerCategory, ExperienceLevel } from '../schemas/career.schema';

export class CreateCareerDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsEnum(CareerCategory)
  category!: CareerCategory;

  @IsNotEmpty()
  @IsString()
  industry!: string;

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