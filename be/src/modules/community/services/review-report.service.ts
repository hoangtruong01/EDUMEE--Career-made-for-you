import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  ReviewReport,
  ReviewReportDocument,
  ReportStatus,
} from '../schemas/review-interactions.schema';

interface CreateReviewReportInput {
  reviewId: string;
  [key: string]: unknown;
}

@Injectable()
export class ReviewReportService {
  constructor(
    @InjectModel(ReviewReport.name)
    private readonly reviewReportModel: Model<ReviewReportDocument>,
  ) { }

  async createForUser(userId: string, dto: CreateReviewReportInput): Promise<ReviewReportDocument> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(dto.reviewId)) throw new BadRequestException('Invalid reviewId');

    const report = new this.reviewReportModel({
      ...dto,
      reviewId: new Types.ObjectId(dto.reviewId),
      reporterId: new Types.ObjectId(userId),
      status: ReportStatus.SUBMITTED,
    });
    return report.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<ReviewReportDocument> = {},
  ): Promise<{ data: ReviewReportDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewReportModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.reviewReportModel.countDocuments(filters).exec(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<ReviewReportDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid report id');
    const report = await this.reviewReportModel.findById(id).exec();
    if (!report) throw new NotFoundException(`Review report with ID ${id} not found`);
    return report;
  }

  async findByReview(reviewId: string): Promise<ReviewReportDocument[]> {
    if (!Types.ObjectId.isValid(reviewId)) throw new BadRequestException('Invalid reviewId');
    return this.reviewReportModel
      .find({ reviewId: new Types.ObjectId(reviewId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: ReportStatus, resolution?: Record<string, unknown>): Promise<ReviewReportDocument> {
    const report = await this.reviewReportModel
      .findByIdAndUpdate(
        id,
        {
          status,
          ...(resolution ? { resolution } : {}),
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!report) throw new NotFoundException(`Review report with ID ${id} not found`);
    return report;
  }
}

