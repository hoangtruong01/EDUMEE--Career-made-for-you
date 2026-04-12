import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { CareerReview, CareerReviewDocument, ReviewStatus } from '../schemas/career-review.schema';
import { createHash } from 'crypto';
import { Types } from 'mongoose';

@Injectable()
export class CareerReviewService {
  constructor(
    @InjectModel(CareerReview.name)
    private careerReviewModel: Model<CareerReviewDocument>,
  ) {}

  buildAnonymousId(userId: string, salt: string): string {
    return createHash('sha256')
      .update(`${salt}:${userId}`)
      .digest('hex')
      .slice(0, 32);
  }

  async createForUser(userId: string, salt: string, createDto: any): Promise<CareerReviewDocument> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(createDto.careerId)) throw new BadRequestException('Invalid careerId');

    const anonymousId = this.buildAnonymousId(userId, salt);

    const moderationRequired = Boolean(createDto?.moderationRequired);
    const status: ReviewStatus =
      moderationRequired ? ReviewStatus.SUBMITTED : (createDto?.status ?? ReviewStatus.SUBMITTED);

    const review = new this.careerReviewModel({
      ...createDto,
      anonymousId,
      careerId: new Types.ObjectId(createDto.careerId),
      status,
      sensitiveContent: {
        ...(createDto.sensitiveContent || {}),
        moderationRequired,
      },
    });

    try {
      return await review.save();
    } catch (e: any) {
      if (e && e.code === 11000) throw new ConflictException('Duplicate review');
      throw e;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<CareerReviewDocument> = {},
  ): Promise<{ data: CareerReviewDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.careerReviewModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.careerReviewModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CareerReviewDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid review id');
    const review = await this.careerReviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException(`Career review with ID ${id} not found`);
    }
    return review;
  }

  async findByAnonymousId(anonymousId: string): Promise<CareerReviewDocument[]> {
    return this.careerReviewModel.find({ anonymousId }).sort({ createdAt: -1 }).exec();
  }

  async findByCareer(careerId: string, publishedOnly = true): Promise<CareerReviewDocument[]> {
    if (!Types.ObjectId.isValid(careerId)) throw new BadRequestException('Invalid careerId');
    const filter = {
      careerId: new Types.ObjectId(careerId),
      ...(publishedOnly ? { status: ReviewStatus.PUBLISHED } : {}),
    } as FilterQuery<CareerReviewDocument>;
    return this.careerReviewModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findByCategory(category: string, publishedOnly = true): Promise<CareerReviewDocument[]> {
    return this.careerReviewModel
      .find({
        reviewCategory: category,
        ...(publishedOnly ? { status: ReviewStatus.PUBLISHED } : {}),
      } as FilterQuery<CareerReviewDocument>)
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateDto: Partial<CareerReview>): Promise<CareerReviewDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid review id');
    const review = await this.careerReviewModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .exec();
    if (!review) {
      throw new NotFoundException(`Career review with ID ${id} not found`);
    }
    return review;
  }

  async updateStatus(id: string, status: string): Promise<CareerReviewDocument> {
    return this.update(id, { status: status as ReviewStatus });
  }

  async remove(id: string): Promise<CareerReviewDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid review id');
    const review = await this.careerReviewModel.findByIdAndDelete(id).exec();
    if (!review) {
      throw new NotFoundException(`Career review with ID ${id} not found`);
    }
    return review;
  }

  async getStatistics(careerId?: string): Promise<any> {
    const matchStage: Record<string, unknown> = {};
    if (careerId) {
      if (!Types.ObjectId.isValid(careerId)) throw new BadRequestException('Invalid careerId');
      matchStage.careerId = new Types.ObjectId(careerId);
    }

    const stats = await this.careerReviewModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$careerId',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$reviewContent.overallRating' },
          categoryBreakdown: { $push: '$reviewCategory' },
        },
      },
    ]);

    return stats;
  }
}
