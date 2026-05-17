import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

import type { SkillTagCategory } from '../schemas/skill-tag.schema';

const SKILL_TAG_CATEGORIES = ['technical', 'soft', 'leadership', 'industry_specific'] as const;

export class CreateSkillTagDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsIn(SKILL_TAG_CATEGORIES)
  category?: SkillTagCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  careerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  careerTitles?: string[];
}

export class UpdateSkillTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(SKILL_TAG_CATEGORIES)
  category?: SkillTagCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CareerSkillTagInputDto {
  @IsString()
  name!: string;

  @IsIn(SKILL_TAG_CATEGORIES)
  category!: SkillTagCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  importance?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minimumLevel?: number;
}
