import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import {
  ReviewerType,
  ReviewStatus,
  SessionReview,
  SessionReviewDocument,
} from '../schemas/session-review.schema';
import {
  SessionStatus,
  TutoringSession,
  TutoringSessionDocument,
} from '../schemas/tutoring-session.schema';

@Injectable()
export class SessionReviewService {
  constructor(
    @InjectModel(SessionReview.name)
    private sessionReviewModel: Model<SessionReviewDocument>,
    @InjectModel(TutoringSession.name)
    private tutoringSessionModel: Model<TutoringSessionDocument>,
  ) {}

  async createForReviewer(reviewerId: string, createDto: any): Promise<SessionReviewDocument> {
    if (!Types.ObjectId.isValid(reviewerId)) throw new ForbiddenException('Missing user context');
    if (!Types.ObjectId.isValid(createDto.tutoringSessionId)) throw new BadRequestException('Invalid tutoringSessionId');

    const session = await this.tutoringSessionModel
      .findById(new Types.ObjectId(createDto.tutoringSessionId))
      .exec();
    if (!session) throw new NotFoundException('Tutoring session not found');
    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('Review can only be created after session is completed');
    }

    const reviewerObjId = new Types.ObjectId(reviewerId);
    const isMentee = session.menteeId.toString() === reviewerId;
    const isMentor = session.mentorId.toString() === reviewerId;
    if (!isMentee && !isMentor) throw new ForbiddenException('Not part of this tutoring session');

    const existing = await this.sessionReviewModel
      .findOne({ tutoringSessionId: session._id, reviewerId: reviewerObjId })
      .exec();
    if (existing) throw new ConflictException('Review already exists for this session');

    const review = new this.sessionReviewModel({
      ...createDto,
      tutoringSessionId: session._id,
      reviewerId: reviewerObjId,
      reviewerType: isMentee ? ReviewerType.MENTEE : ReviewerType.MENTOR,
      reviewedUserId: isMentee ? session.mentorId : session.menteeId,
      status: ReviewStatus.SUBMITTED,
    });
    return review.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<SessionReviewDocument> = {},
  ): Promise<{ data: SessionReviewDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.sessionReviewModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.sessionReviewModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<SessionReviewDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid review id');
    const review = await this.sessionReviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException(`Session review with ID ${id} not found`);
    }
    return review;
  }

  async findBySession(sessionId: string): Promise<SessionReviewDocument[]> {
    if (!Types.ObjectId.isValid(sessionId)) throw new BadRequestException('Invalid sessionId');
    return this.sessionReviewModel.find({ tutoringSessionId: new Types.ObjectId(sessionId) }).exec();
  }

  async findByReviewer(reviewerId: string): Promise<SessionReviewDocument[]> {
    if (!Types.ObjectId.isValid(reviewerId)) throw new BadRequestException('Invalid reviewerId');
    return this.sessionReviewModel.find({ reviewerId: new Types.ObjectId(reviewerId) }).sort({ createdAt: -1 }).exec();
  }

  async findByReviewee(revieweeId: string): Promise<SessionReviewDocument[]> {
    if (!Types.ObjectId.isValid(revieweeId)) throw new BadRequestException('Invalid revieweeId');
    return this.sessionReviewModel.find({ reviewedUserId: new Types.ObjectId(revieweeId) }).sort({ createdAt: -1 }).exec();
  }

  async getAverageRating(revieweeId: string): Promise<number> {
    if (!Types.ObjectId.isValid(revieweeId)) throw new BadRequestException('Invalid revieweeId');
    const result = await this.sessionReviewModel.aggregate<{ averageRating: number }>([
      { $match: { reviewedUserId: new Types.ObjectId(revieweeId) } },
      { $group: { _id: null, averageRating: { $avg: '$overallRatings.overallSatisfaction' } } },
    ]);

    return result[0]?.averageRating ?? 0;
  }

  async update(id: string, updateDto: Partial<SessionReview>): Promise<SessionReviewDocument> {
    const review = await this.sessionReviewModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!review) {
      throw new NotFoundException(`Session review with ID ${id} not found`);
    }
    return review;
  }

  async remove(id: string): Promise<SessionReviewDocument> {
    const review = await this.sessionReviewModel.findByIdAndDelete(id).exec();
    if (!review) {
      throw new NotFoundException(`Session review with ID ${id} not found`);
    }
    return review;
  }
}
