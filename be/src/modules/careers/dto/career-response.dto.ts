import { CareerCategory, ExperienceLevel } from '../schemas/career.schema';

export class CareerResponseDto {
  id!: string;
  title!: string;
  description!: string;
  category!: CareerCategory;
  industries?: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class CareerListResponseDto {
  data!: CareerResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
}