import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { SkillTag, SkillTagDocument, SkillTagCategory } from '../schemas/skill-tag.schema';

export interface SkillTagFilters {
  careerId?: string;
  category?: SkillTagCategory;
  q?: string;
}

export interface SkillTagPayload {
  name?: string;
  category?: SkillTagCategory;
  careerIds?: string[];
  careerTitles?: string[];
  isActive?: boolean;
}

export interface CareerSkillTagInput {
  name: string;
  category: SkillTagCategory;
  importance?: number;
  minimumLevel?: number;
}

interface CareerSkillSource {
  _id?: Types.ObjectId | string;
  id?: Types.ObjectId | string;
  title?: string;
  skillRequirements?: {
    technical?: { skillName?: string; importance?: number; minimumLevel?: number }[];
    soft?: { skillName?: string; importance?: number; minimumLevel?: number }[];
  };
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

  async create(payload: SkillTagPayload): Promise<SkillTagDocument> {
    const input = this.normalizeInput(payload);
    if (!input) {
      throw new BadRequestException('Skill tag name is required');
    }

    const careerIds = this.toObjectIds(payload.careerIds);
    const careerTitles = this.uniqueStrings(payload.careerTitles || []);

    const tag = await this.skillTagModel
      .findOneAndUpdate(
        { slug: input.slug },
        {
          $set: {
            name: input.name,
            slug: input.slug,
            category: input.category,
            isActive: true,
          },
          $addToSet: {
            careerIds: { $each: careerIds },
            careerTitles: { $each: careerTitles },
          },
          $setOnInsert: {
            usageCount: careerIds.length,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    if (!tag) {
      throw new BadRequestException('Unable to create skill tag');
    }

    return this.refreshUsageCount(tag);
  }

  async update(id: string, payload: SkillTagPayload): Promise<SkillTagDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid skill tag id');
    }

    const tag = await this.skillTagModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException('Skill tag not found');
    }

    const nextName = this.normalizeName(payload.name || tag.name);
    if (!nextName) {
      throw new BadRequestException('Skill tag name is required');
    }

    const nextCategory = this.normalizeCategory(payload.category || tag.category);
    const nextSlug = this.slugify(nextName);
    const duplicate = await this.skillTagModel
      .findOne({ slug: nextSlug, _id: { $ne: tag._id } })
      .select('_id')
      .exec();

    if (duplicate) {
      throw new BadRequestException('Skill tag already exists');
    }

    tag.name = nextName;
    tag.slug = nextSlug;
    tag.category = nextCategory;
    if (typeof payload.isActive === 'boolean') {
      tag.isActive = payload.isActive;
    }

    return tag.save();
  }

  async softDelete(id: string): Promise<SkillTagDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid skill tag id');
    }

    const tag = await this.skillTagModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();

    if (!tag) {
      throw new NotFoundException('Skill tag not found');
    }

    return tag;
  }

  async syncForCareer(
    career: CareerSkillSource,
    skillTags?: CareerSkillTagInput[],
    previousCareerTitle?: string,
  ): Promise<SkillTagDocument[]> {
    const careerId = this.resolveCareerId(career);
    if (!careerId) return [];

    const careerTitle = this.normalizeName(career.title || '');
    const explicitInputs = Array.isArray(skillTags) ? skillTags : undefined;
    const normalizedInputs = this.normalizeSkillInputs(
      explicitInputs !== undefined ? explicitInputs : this.deriveSkillTagsFromCareer(career),
    );

    if (previousCareerTitle && careerTitle && previousCareerTitle !== careerTitle) {
      await this.skillTagModel
        .updateMany({ careerIds: careerId }, { $pull: { careerTitles: previousCareerTitle } })
        .exec();
    }

    const nextSlugs = new Set(normalizedInputs.map((input) => input.slug));
    const staleTags = await this.skillTagModel
      .find({
        careerIds: careerId,
        ...(nextSlugs.size > 0 ? { slug: { $nin: Array.from(nextSlugs) } } : {}),
      })
      .select('_id')
      .exec();

    if (staleTags.length > 0) {
      const titlesToPull = this.uniqueStrings([careerTitle, previousCareerTitle || '']);
      await this.skillTagModel
        .updateMany(
          { _id: { $in: staleTags.map((tag) => tag._id) } },
          {
            $pull: {
              careerIds: careerId,
              ...(titlesToPull.length ? { careerTitles: { $in: titlesToPull } } : {}),
            },
          },
        )
        .exec();
      await Promise.all(staleTags.map((tag) => this.refreshUsageCountById(tag._id)));
    }

    if (normalizedInputs.length === 0) {
      return [];
    }

    const updatedTags = await Promise.all(
      normalizedInputs.map(async (input) => {
        const tag = await this.skillTagModel
          .findOneAndUpdate(
            { slug: input.slug },
            {
              $set: {
                name: input.name,
                slug: input.slug,
                category: input.category,
                isActive: true,
              },
              $addToSet: {
                careerIds: careerId,
                ...(careerTitle ? { careerTitles: careerTitle } : {}),
              },
              $setOnInsert: {
                usageCount: 0,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          )
          .exec();

        if (!tag) {
          throw new BadRequestException('Unable to sync skill tag');
        }

        return this.refreshUsageCount(tag);
      }),
    );

    return updatedTags;
  }

  async unlinkCareer(careerIdValue: string | Types.ObjectId, careerTitle?: string): Promise<void> {
    const careerId = this.resolveObjectId(careerIdValue);
    if (!careerId) return;

    const linkedTags = await this.skillTagModel.find({ careerIds: careerId }).select('_id').exec();
    if (linkedTags.length === 0) return;

    await this.skillTagModel
      .updateMany(
        { _id: { $in: linkedTags.map((tag) => tag._id) } },
        {
          $pull: {
            careerIds: careerId,
            ...(careerTitle ? { careerTitles: careerTitle } : {}),
          },
        },
      )
      .exec();

    await Promise.all(linkedTags.map((tag) => this.refreshUsageCountById(tag._id)));
  }

  private async refreshUsageCount(tag: SkillTagDocument): Promise<SkillTagDocument> {
    tag.usageCount = tag.careerIds?.length || 0;
    return tag.save();
  }

  private async refreshUsageCountById(id: Types.ObjectId): Promise<void> {
    const tag = await this.skillTagModel.findById(id).exec();
    if (!tag) return;
    tag.usageCount = tag.careerIds?.length || 0;
    await tag.save();
  }

  private deriveSkillTagsFromCareer(career: CareerSkillSource): CareerSkillTagInput[] {
    const technical = career.skillRequirements?.technical || [];
    const soft = career.skillRequirements?.soft || [];

    return [
      ...technical.map((skill) => ({
        name: skill.skillName || '',
        category: 'technical' as SkillTagCategory,
        importance: skill.importance,
        minimumLevel: skill.minimumLevel,
      })),
      ...soft.map((skill) => ({
        name: skill.skillName || '',
        category: 'soft' as SkillTagCategory,
        importance: skill.importance,
        minimumLevel: skill.minimumLevel,
      })),
    ];
  }

  private normalizeSkillInputs(inputs: CareerSkillTagInput[]): Array<CareerSkillTagInput & { slug: string }> {
    const bySlug = new Map<string, CareerSkillTagInput & { slug: string }>();

    for (const rawInput of inputs) {
      const input = this.normalizeInput(rawInput);
      if (!input) continue;

      const existing = bySlug.get(input.slug);
      if (!existing) {
        bySlug.set(input.slug, {
          name: input.name,
          slug: input.slug,
          category: input.category,
          importance: rawInput.importance,
          minimumLevel: rawInput.minimumLevel,
        });
        continue;
      }

      if (existing.category !== 'technical' && input.category === 'technical') {
        existing.category = 'technical';
      }
      existing.importance = existing.importance || rawInput.importance;
      existing.minimumLevel = existing.minimumLevel || rawInput.minimumLevel;
    }

    return Array.from(bySlug.values());
  }

  private normalizeInput(payload: SkillTagPayload | CareerSkillTagInput): { name: string; slug: string; category: SkillTagCategory } | null {
    const name = this.normalizeName(payload.name || '');
    if (!name) return null;
    const slug = this.slugify(name);
    if (!slug) return null;

    return {
      name,
      slug,
      category: this.normalizeCategory(payload.category),
    };
  }

  private normalizeCategory(category?: string): SkillTagCategory {
    if (
      category === 'technical' ||
      category === 'soft' ||
      category === 'leadership' ||
      category === 'industry_specific'
    ) {
      return category;
    }
    return 'technical';
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private slugify(value: string): string {
    return this.normalizeName(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/\u0110/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toObjectIds(values?: string[]): Types.ObjectId[] {
    return (values || [])
      .filter((value) => Types.ObjectId.isValid(value))
      .map((value) => new Types.ObjectId(value));
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => this.normalizeName(value)).filter(Boolean)));
  }

  private resolveCareerId(career: CareerSkillSource): Types.ObjectId | null {
    return this.resolveObjectId(career._id || career.id);
  }

  private resolveObjectId(value?: string | Types.ObjectId): Types.ObjectId | null {
    if (!value) return null;
    if (value instanceof Types.ObjectId) return value;
    return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
  }
}
