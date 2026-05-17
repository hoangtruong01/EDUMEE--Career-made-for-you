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
import { TutorProfile, TutorProfileDocument } from '../schemas/tutor-profile.schema';
import { BookingSession, BookingSessionDocument, BookingStatus } from '../schemas/booking-session.schema';
import { NotificationService } from '../../notifications/services';
import { NotificationType } from '../../notifications/schemas';

interface CreateSessionReviewInput {
  tutoringSessionId: string;
  rating?: number;
  comment?: string;
  isAnonymous?: boolean;
  wouldRecommend?: boolean;
  likelyToBookAgain?: boolean;
  communication?: number;
  expertise?: number;
  helpfulness?: number;
  professionalism?: number;
  punctuality?: number;
  [key: string]: unknown;
}

export interface BookingReviewStatus {
  eligible: boolean;
  reviewed: boolean;
  reason?: string;
  tutoringSessionId?: string;
  review?: SessionReviewDocument | null;
}

export interface PublicMentorReview {
  id: string;
  rating: number;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
  reviewer: {
    name: string;
    avatar?: string;
    isAnonymous: boolean;
  };
  overallRatings: {
    overallSatisfaction?: number;
    wouldRecommend?: boolean;
    likelyToBookAgain?: boolean;
    communication?: number;
    expertise?: number;
    helpfulness?: number;
    professionalism?: number;
    punctuality?: number;
  };
}

@Injectable()
export class SessionReviewService {
  constructor(
    @InjectModel(SessionReview.name)
    private sessionReviewModel: Model<SessionReviewDocument>,
    @InjectModel(TutoringSession.name)
    private tutoringSessionModel: Model<TutoringSessionDocument>,
    @InjectModel(TutorProfile.name)
    private tutorProfileModel: Model<TutorProfileDocument>,
    @InjectModel(BookingSession.name)
    private bookingSessionModel: Model<BookingSessionDocument>,
    private readonly notificationService: NotificationService,
  ) { }

  async createForReviewer(reviewerId: string, createDto: CreateSessionReviewInput): Promise<SessionReviewDocument> {
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
    if (!isMentee) throw new ForbiddenException('Only the mentee can review the mentor for this session');

    const existing = await this.sessionReviewModel
      .findOne({ tutoringSessionId: session._id, reviewerId: reviewerObjId })
      .exec();
    if (existing) throw new ConflictException('Review already exists for this session');

    const mentorObjectId = this.toObjectId(session.mentorId.toString(), 'mentorId');
    const reviewPayload = this.buildMenteeReviewPayload(createDto);
    try {
      const review = new this.sessionReviewModel({
        ...reviewPayload,
        tutoringSessionId: session._id,
        reviewerId: reviewerObjId,
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorObjectId,
        status: ReviewStatus.SUBMITTED,
      });
      const saved = await review.save();
      await this.recalculateMentorRating(mentorObjectId.toString());
      await this.notifyMentorReviewSubmitted(session, saved);
      return saved;
    } catch (error) {
      if (this.isDuplicateReviewError(error)) {
        throw new ConflictException('Review already exists for this session');
      }
      throw error;
    }
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
    return this.sessionReviewModel.find(this.buildRevieweeIdFilter(revieweeId, 'revieweeId')).sort({ createdAt: -1 }).exec();
  }

  async findReceivedForReviewee(revieweeId: string): Promise<SessionReviewDocument[]> {
    return this.sessionReviewModel
      .find({
        ...this.buildRevieweeIdFilter(revieweeId, 'revieweeId'),
        reviewerType: ReviewerType.MENTEE,
        status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
      })
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'name avatar')
      .exec();
  }

  async findPublicByMentor(mentorUserId: string): Promise<PublicMentorReview[]> {
    const reviews = await this.sessionReviewModel
      .find({
        ...this.buildRevieweeIdFilter(mentorUserId, 'mentorUserId'),
        reviewerType: ReviewerType.MENTEE,
        status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
        isAnonymous: false,
      })
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'name avatar')
      .exec();

    return reviews.map((review) => this.serializePublicMentorReview(review));
  }

  async getAverageRating(revieweeId: string): Promise<number> {
    const result = await this.sessionReviewModel.aggregate<{ averageRating: number }>([
      { $match: this.buildRevieweeIdFilter(revieweeId, 'revieweeId') },
      { $group: { _id: null, averageRating: { $avg: '$overallRatings.overallSatisfaction' } } },
    ]);

    return result[0]?.averageRating ?? 0;
  }

  async getBookingReviewStatus(bookingId: string, reviewerId: string): Promise<BookingReviewStatus> {
    if (!Types.ObjectId.isValid(bookingId)) throw new BadRequestException('Invalid booking id');
    if (!Types.ObjectId.isValid(reviewerId)) throw new ForbiddenException('Missing user context');

    const booking = await this.bookingSessionModel.findById(new Types.ObjectId(bookingId)).exec();
    if (!booking) throw new NotFoundException('Booking session not found');

    const isMentee = booking.menteeId.toString() === reviewerId;
    const isMentor = booking.mentorId.toString() === reviewerId;
    if (!isMentee && !isMentor) throw new ForbiddenException('Forbidden');

    if (!isMentee) {
      return {
        eligible: false,
        reviewed: false,
        tutoringSessionId: booking.tutoringSessionId?.toString(),
        reason: 'Only the mentee can review this mentor',
      };
    }

    if (booking.status !== BookingStatus.COMPLETED || !booking.tutoringSessionId) {
      return {
        eligible: false,
        reviewed: false,
        tutoringSessionId: booking.tutoringSessionId?.toString(),
        reason: 'Review is available after the booking is completed',
      };
    }

    const review = await this.sessionReviewModel
      .findOne({
        tutoringSessionId: booking.tutoringSessionId,
        reviewerId: new Types.ObjectId(reviewerId),
      })
      .exec();

    return {
      eligible: !review,
      reviewed: Boolean(review),
      tutoringSessionId: booking.tutoringSessionId.toString(),
      review,
    };
  }

  async recalculateMentorRating(mentorId: string): Promise<void> {
    const mentorObjectId = this.toObjectId(mentorId, 'mentorId');
    const reviews = await this.sessionReviewModel
      .find({
        ...this.buildRevieweeIdFilter(mentorId, 'mentorId'),
        reviewerType: ReviewerType.MENTEE,
        status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
      })
      .exec();

    const totalReviews = reviews.length;
    const ratingBreakdown = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 }));
    let ratingTotal = 0;

    for (const review of reviews) {
      const rawRating = Number(review.overallRatings?.overallSatisfaction || 0);
      if (!Number.isFinite(rawRating) || rawRating <= 0) continue;
      const rounded = Math.min(5, Math.max(1, Math.round(rawRating)));
      ratingTotal += rawRating;
      const bucket = ratingBreakdown.find((item) => item.stars === rounded);
      if (bucket) bucket.count += 1;
    }

    const averageRating = totalReviews > 0 ? Number((ratingTotal / totalReviews).toFixed(2)) : 0;
    await this.tutorProfileModel
      .findOneAndUpdate(
        this.buildTutorProfileUserIdFilter(mentorId),
        {
          $set: {
            'performanceMetrics.ratings.averageRating': averageRating,
            'performanceMetrics.ratings.totalReviews': totalReviews,
            'performanceMetrics.ratings.ratingBreakdown': ratingBreakdown,
            'performanceMetrics.lastUpdated': new Date(),
          },
          $setOnInsert: {
            userId: mentorObjectId,
          },
        },
        { new: true },
      )
      .exec();
  }

  async recalculateAllMentorRatings(): Promise<{ mentorsUpdated: number }> {
    const rawMentorIds = await this.sessionReviewModel.distinct('reviewedUserId', {
      reviewerType: ReviewerType.MENTEE,
      status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
    });
    const mentorIds = [
      ...new Set(
        rawMentorIds
          .map((mentorId) => mentorId?.toString())
          .filter((mentorId): mentorId is string => Boolean(mentorId) && Types.ObjectId.isValid(mentorId)),
      ),
    ];

    for (const mentorId of mentorIds) {
      await this.recalculateMentorRating(mentorId);
    }

    return { mentorsUpdated: mentorIds.length };
  }

  async update(id: string, updateDto: Partial<SessionReview>): Promise<SessionReviewDocument> {
    const normalizedUpdate = this.normalizeReviewUpdate(updateDto);
    const review = await this.sessionReviewModel.findByIdAndUpdate(id, normalizedUpdate, { new: true }).exec();
    if (!review) {
      throw new NotFoundException(`Session review with ID ${id} not found`);
    }
    if (review.reviewerType === ReviewerType.MENTEE) {
      await this.recalculateMentorRating(review.reviewedUserId.toString());
    }
    return review;
  }

  async remove(id: string): Promise<SessionReviewDocument> {
    const review = await this.sessionReviewModel.findByIdAndDelete(id).exec();
    if (!review) {
      throw new NotFoundException(`Session review with ID ${id} not found`);
    }
    if (review.reviewerType === ReviewerType.MENTEE) {
      await this.recalculateMentorRating(review.reviewedUserId.toString());
    }
    return review;
  }

  private buildMenteeReviewPayload(input: CreateSessionReviewInput): Partial<SessionReview> {
    const rating = this.parseRating(input.rating, 'rating');
    const communication = this.parseRating(input.communication ?? rating, 'communication');
    const expertise = this.parseRating(input.expertise ?? rating, 'expertise');
    const helpfulness = this.parseRating(input.helpfulness ?? rating, 'helpfulness');
    const professionalism = this.parseRating(input.professionalism ?? rating, 'professionalism');
    const punctuality = this.parseRating(input.punctuality ?? rating, 'punctuality');
    const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
    const wouldRecommend =
      typeof input.wouldRecommend === 'boolean' ? input.wouldRecommend : rating >= 4;
    const likelyToBookAgain =
      typeof input.likelyToBookAgain === 'boolean' ? input.likelyToBookAgain : rating >= 4;

    return {
      isAnonymous: input.isAnonymous !== false,
      overallRatings: {
        overallSatisfaction: rating,
        wouldRecommend,
        likelyToBookAgain,
        communication,
        expertise,
        helpfulness,
        professionalism,
        punctuality,
      },
      writtenFeedback: {
        comment,
      },
      menteeReviewDetails: {
        sessionValue: {
          goalsMet: Math.min(100, rating * 20),
          learningValue: rating,
          clarityOfExplanations: rating,
          practicalRelevance: rating,
        },
        mentorQualities: {
          knowledgeDepth: expertise,
          teachingAbility: helpfulness,
          patience: communication,
          encouragement: helpfulness,
          adaptability: professionalism,
        },
        sessionStructure: {
          preparedness: professionalism,
          timeManagement: punctuality,
          engagement: communication,
          followUpQuality: helpfulness,
        },
        mostValuable: comment || 'Mentee submitted a mentor rating.',
        improvementSuggestions: [],
        wouldContinueWithMentor: likelyToBookAgain,
      },
    };
  }

  private normalizeReviewUpdate(updateDto: Partial<SessionReview>): Partial<SessionReview> {
    const rawUpdate = updateDto as Partial<SessionReview> & CreateSessionReviewInput;
    if (rawUpdate.rating === undefined) return updateDto;
    return {
      ...updateDto,
      ...this.buildMenteeReviewPayload(rawUpdate),
    };
  }

  private parseRating(value: unknown, fieldName: string): number {
    const rating = Number(value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(`${fieldName} must be an integer from 1 to 5`);
    }
    return rating;
  }

  private toObjectId(value: string, fieldName: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException(`Invalid ${fieldName}`);
    return new Types.ObjectId(value);
  }

  private buildRevieweeIdFilter(revieweeId: string, fieldName: string): FilterQuery<SessionReviewDocument> {
    const revieweeObjectId = this.toObjectId(revieweeId, fieldName);
    return {
      $or: [
        { reviewedUserId: revieweeObjectId },
        { $expr: { $eq: ['$reviewedUserId', revieweeId] } },
      ],
    };
  }

  private buildTutorProfileUserIdFilter(userId: string): FilterQuery<TutorProfileDocument> {
    const userObjectId = this.toObjectId(userId, 'userId');
    return {
      $or: [
        { userId: userObjectId },
        { userId },
      ],
    };
  }

  private async notifyMentorReviewSubmitted(
    session: TutoringSessionDocument,
    review: SessionReviewDocument,
  ): Promise<void> {
    const rating = Number(review.overallRatings?.overallSatisfaction || 0);
    await this.notificationService.create({
      recipientId: session.mentorId,
      type: NotificationType.MENTOR_REVIEW_SUBMITTED,
      title: 'Học viên đã đánh giá mentor',
      body: `Bạn vừa nhận được đánh giá ${rating}/5 sao sau buổi mentor.`,
      payload: {
        tutoringSessionId: session._id.toString(),
        bookingId: session.bookingSessionId.toString(),
        reviewId: review._id.toString(),
        rating,
        reviewUrl: '/mentor-dashboard/reviews',
      },
    });
  }

  private isDuplicateReviewError(error: unknown): boolean {
    const mongoError = error as { code?: number; message?: string };
    return mongoError.code === 11000 || Boolean(mongoError.message?.includes('E11000'));
  }

  private serializePublicMentorReview(review: SessionReviewDocument): PublicMentorReview {
    const reviewRecord = review as SessionReviewDocument & {
      reviewerId?: unknown;
      isAnonymous?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    };
    const overallRatings = review.overallRatings || {};
    const writtenFeedback = review.writtenFeedback as { comment?: unknown } | undefined;
    const isAnonymous = reviewRecord.isAnonymous !== false;

    return {
      id: String(review._id),
      rating: Number(overallRatings.overallSatisfaction || 0),
      comment: typeof writtenFeedback?.comment === 'string' ? writtenFeedback.comment : '',
      createdAt: reviewRecord.createdAt,
      updatedAt: reviewRecord.updatedAt,
      reviewer: this.serializePublicReviewer(reviewRecord.reviewerId, isAnonymous),
      overallRatings: {
        overallSatisfaction: overallRatings.overallSatisfaction,
        wouldRecommend: overallRatings.wouldRecommend,
        likelyToBookAgain: overallRatings.likelyToBookAgain,
        communication: overallRatings.communication,
        expertise: overallRatings.expertise,
        helpfulness: overallRatings.helpfulness,
        professionalism: overallRatings.professionalism,
        punctuality: overallRatings.punctuality,
      },
    };
  }

  private serializePublicReviewer(reviewer: unknown, isAnonymous: boolean): PublicMentorReview['reviewer'] {
    if (isAnonymous) {
      return {
        name: 'Học viên ẩn danh',
        isAnonymous: true,
      };
    }

    const reviewerRecord = reviewer && typeof reviewer === 'object' ? reviewer as Record<string, unknown> : {};
    const name = typeof reviewerRecord.name === 'string' && reviewerRecord.name.trim()
      ? reviewerRecord.name.trim()
      : 'Học viên';
    const avatar = typeof reviewerRecord.avatar === 'string' ? reviewerRecord.avatar : '';

    return {
      name,
      avatar,
      isAnonymous: false,
    };
  }
}
