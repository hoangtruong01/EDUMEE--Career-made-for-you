import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { TutorProfile, TutorProfileDocument, TutorStatus } from '../schemas/tutor-profile.schema';
import { CreateTutorProfileDto, UpdateTutorProfileDto } from '../dto';

type CreateTutorProfileInput = CreateTutorProfileDto & { userId?: string };

@Injectable()
export class TutorProfileService {
  constructor(
    @InjectModel(TutorProfile.name)
    private tutorProfileModel: Model<TutorProfileDocument>,
  ) { }

  async create(createDto: CreateTutorProfileInput): Promise<TutorProfileDocument> {
    const profile = new this.tutorProfileModel(createDto);
    return profile.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<TutorProfileDocument> = {},
  ): Promise<{ data: TutorProfileDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.tutorProfileModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.tutorProfileModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findById(id).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async findByUser(userId: string): Promise<TutorProfileDocument | null> {
    return this.tutorProfileModel.findOne({ userId }).exec();
  }

  async findActive(): Promise<TutorProfileDocument[]> {
    return this.tutorProfileModel.find({ status: 'active' }).exec();
  }

  async update(id: string, updateDto: Partial<UpdateTutorProfileDto>): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async updateStatus(id: string, status: string): Promise<TutorProfileDocument> {
    return this.update(id, { status: status as TutorStatus });
  }

  async remove(id: string): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findByIdAndDelete(id).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async searchTutors(
    criteria: { expertise?: string; industries?: string[] },
  ): Promise<TutorProfileDocument[]> {
    const query: FilterQuery<TutorProfileDocument> = { status: 'active' };
    if (criteria.expertise) {
      query['expertiseAreas.primaryCareerPath'] = criteria.expertise;
    }
    if (criteria.industries) {
      query['professionalBackground.industries'] = { $in: criteria.industries };
    }
    return this.tutorProfileModel.find(query).exec();
  }
}
