import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument, ReportStatus } from '../schemas/report.schema';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name)
    private reportModel: Model<ReportDocument>,
  ) {}

  async createReport(
    userId: string,
    targetId: string,
    targetType: 'post' | 'comment',
    reason: string,
    postId?: string,
    details?: string,
  ): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Invalid targetId');
    }

    const report = new this.reportModel({
      reporterId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType,
      postId: postId ? new Types.ObjectId(postId) : undefined,
      reason,
      details,
      status: ReportStatus.PENDING,
    });

    return report.save();
  }

  async findAllReports(): Promise<ReportDocument[]> {
    return this.reportModel
      .find()
      .populate('reporterId', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    adminId: string,
  ): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid reportId');
    }

    const report = await this.reportModel.findByIdAndUpdate(
      reportId,
      {
        status,
        resolvedById: new Types.ObjectId(adminId),
        resolvedAt: new Date(),
      },
      { new: true },
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }
}
