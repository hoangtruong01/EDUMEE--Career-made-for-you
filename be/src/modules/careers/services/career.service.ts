import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Career, CareerDocument, CareerCategory } from '../schemas/career.schema';
import { CreateCareerDto, UpdateCareerDto } from '../dto';

@Injectable()
export class CareerService {
  constructor(
    @InjectModel(Career.name)
    private readonly careerModel: Model<CareerDocument>,
  ) {}

  async create(createDto: CreateCareerDto): Promise<Career> {
    const career = new this.careerModel(createDto);
    return career.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: Partial<Career> = {},
  ): Promise<{ data: Career[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      this.careerModel
        .find(query)
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.careerModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Career> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career ID');
    }

    const career = await this.careerModel.findById(id).exec();

    if (!career) {
      throw new NotFoundException('Career not found');
    }

    return career;
  }

  async getCategories(): Promise<string[]> {
    return Object.values(CareerCategory);
  }

  async findByCategory(category: CareerCategory): Promise<Career[]> {
    return this.careerModel
      .find({ category })
      .sort({ title: 1 })
      .exec();
  }

  async findByIndustry(industry: string): Promise<Career[]> {
    return this.careerModel
      .find({ industry: { $regex: industry, $options: 'i' } })
      .sort({ title: 1 })
      .exec();
  }

  async searchCareers(searchTerm: string): Promise<Career[]> {
    const searchRegex = { $regex: searchTerm, $options: 'i' };
    
    return this.careerModel
      .find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { industry: searchRegex },
          { requiredSkills: { $in: [searchRegex] } },
          { preferredSkills: { $in: [searchRegex] } },
        ],
      })
      .sort({ title: 1 })
      .exec();
  }

  async findBySkills(skills: string[]): Promise<Career[]> {
    return this.careerModel
      .find({
        $or: [
          { requiredSkills: { $in: skills } },
          { preferredSkills: { $in: skills } },
        ],
      })
      .sort({ title: 1 })
      .exec();
  }

  async getRelatedCareers(careerId: string, limit = 5): Promise<Career[]> {
    const career = await this.findOne(careerId);
    
    return this.careerModel
      .find({
        _id: { $ne: career._id },
        $or: [
          { category: career.category },
          { industries: career.industries?.[0] },
          { 'skillRequirements.technical': { $elemMatch: { skillName: { $in: career.requiredSkills || [] } } } },
        ],
      })
      .limit(limit)
      .exec();
  }

  async update(id: string, updateDto: UpdateCareerDto): Promise<Career> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career ID');
    }

    const career = await this.careerModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .exec();

    if (!career) {
      throw new NotFoundException('Career not found');
    }

    return career;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid career ID');
    }

    const result = await this.careerModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Career not found');
    }
  }

  async getCareerStatistics(): Promise<any> {
    const stats = await this.careerModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgSkillsRequired: { $avg: { $size: '$requiredSkills' } },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalCareers = await this.careerModel.countDocuments();
    const industries = await this.careerModel.distinct('industry');

    return {
      totalCareers,
      totalIndustries: industries.length,
      categoriesBreakdown: stats,
      topIndustries: industries.slice(0, 10),
    };
  }

  async bulkCreate(careers: CreateCareerDto[]): Promise<Career[]> {
    return this.careerModel.insertMany(careers) as any as Promise<Career[]>;
  }

  async findFeaturedCareers(limit = 10): Promise<Career[]> {
    // This could be based on some criteria like popularity, demand, etc.
    // For now, just return recent careers
    return this.careerModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getCareersByDemand(): Promise<Career[]> {
    // This would integrate with job market data in real implementation
    return this.careerModel
      .find()
      .sort({ title: 1 })
      .exec();
  }

  private buildQuery(filters: Partial<Career>): any {
    const query: any = {};

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.industries && filters.industries.length > 0) {
      query.industries = { $in: filters.industries };
    }

    if (filters.title) {
      query.title = { $regex: filters.title, $options: 'i' };
    }

    return query;
  }
}