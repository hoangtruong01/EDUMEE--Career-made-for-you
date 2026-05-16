import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { SkillTag, SkillTagDocument, SkillTagCategory } from '../schemas/skill-tag.schema';

export interface SkillTagFilters {
  careerId?: string;
  category?: SkillTagCategory;
  q?: string;
}

@Injectable()
export class SkillTagService {
  constructor(
    @InjectModel(SkillTag.name)
    private readonly skillTagModel: Model<SkillTagDocument>,
  ) {}

  async findAll(filters: SkillTagFilters = {}): Promise<SkillTagDocument[]> {
    const query: FilterQuery<SkillTagDocument> = { isActive: true };

    if (filters.careerId && Types.ObjectId.isValid(filters.careerId)) {
      query.careerIds = new Types.ObjectId(filters.careerId);
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.q?.trim()) {
      query.name = { $regex: filters.q.trim(), $options: 'i' };
    }

    return this.skillTagModel.find(query).sort({ name: 1 }).exec();
  }
}
