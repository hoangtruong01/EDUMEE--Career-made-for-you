import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NotificationService } from '../../notifications/services';
import { BookingSession, BookingStatus } from '../schemas/booking-session.schema';
import { SessionReview, ReviewStatus, ReviewerType } from '../schemas/session-review.schema';
import { TutorProfile } from '../schemas/tutor-profile.schema';
import { SessionStatus, TutoringSession } from '../schemas/tutoring-session.schema';
import { SessionReviewService } from './session-review.service';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

const createSortedExecMock = <T>(value: T) => ({
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

const createPublicReviewQueryMock = <T>(value: T) => ({
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

const expectRevieweeIdFilter = (query: Record<string, unknown>, revieweeId: Types.ObjectId) => {
  const idFilter = query.$or as Array<{ reviewedUserId?: Types.ObjectId; $expr?: unknown }>;
  expect(idFilter).toHaveLength(2);
  expect(idFilter[0].reviewedUserId).toBeInstanceOf(Types.ObjectId);
  expect(idFilter[0].reviewedUserId?.toString()).toBe(revieweeId.toString());
  expect(idFilter[1]).toEqual({ $expr: { $eq: ['$reviewedUserId', revieweeId.toString()] } });
};

describe('SessionReviewService', () => {
  let service: SessionReviewService;

  const sessionReviewModel = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    _id: new Types.ObjectId(),
    ...data,
    save: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      ...data,
    }),
  })) as jest.Mock & Record<string, jest.Mock>;

  sessionReviewModel.findOne = jest.fn();
  sessionReviewModel.find = jest.fn();
  sessionReviewModel.findById = jest.fn();
  sessionReviewModel.findByIdAndUpdate = jest.fn();
  sessionReviewModel.findByIdAndDelete = jest.fn();
  sessionReviewModel.countDocuments = jest.fn();
  sessionReviewModel.distinct = jest.fn();
  sessionReviewModel.aggregate = jest.fn();

  const tutoringSessionModel = {
    findById: jest.fn(),
  };
  const tutorProfileModel = {
    findOneAndUpdate: jest.fn(),
  };
  const bookingSessionModel = {
    findById: jest.fn(),
  };
  const notificationService = {
    create: jest.fn(),
  };

  const mentorId = new Types.ObjectId();
  const menteeId = new Types.ObjectId();
  const sessionId = new Types.ObjectId();
  const bookingId = new Types.ObjectId();

  const buildSession = (status: SessionStatus) => ({
    _id: sessionId,
    bookingSessionId: bookingId,
    mentorId,
    menteeId,
    status,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    sessionReviewModel.mockClear();
    sessionReviewModel.findOne.mockReturnValue(createExecMock(null));
    sessionReviewModel.find.mockReturnValue(createExecMock([]));
    sessionReviewModel.countDocuments.mockReturnValue(createExecMock(0));
    sessionReviewModel.aggregate.mockResolvedValue([]);
    sessionReviewModel.distinct.mockResolvedValue([]);
    tutoringSessionModel.findById.mockReturnValue(createExecMock(buildSession(SessionStatus.COMPLETED)));
    tutorProfileModel.findOneAndUpdate.mockReturnValue(createExecMock(null));
    bookingSessionModel.findById.mockReturnValue(createExecMock({
      _id: bookingId,
      menteeId,
      mentorId,
      tutoringSessionId: sessionId,
      status: BookingStatus.COMPLETED,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionReviewService,
        { provide: getModelToken(SessionReview.name), useValue: sessionReviewModel },
        { provide: getModelToken(TutoringSession.name), useValue: tutoringSessionModel },
        { provide: getModelToken(TutorProfile.name), useValue: tutorProfileModel },
        { provide: getModelToken(BookingSession.name), useValue: bookingSessionModel },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(SessionReviewService);
  });

  it('rejects reviews before the tutoring session is completed', async () => {
    tutoringSessionModel.findById.mockReturnValue(createExecMock(buildSession(SessionStatus.SCHEDULED)));

    await expect(
      service.createForReviewer(menteeId.toString(), { tutoringSessionId: sessionId.toString(), rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow the mentor to review their own mentor rating', async () => {
    await expect(
      service.createForReviewer(mentorId.toString(), { tutoringSessionId: sessionId.toString(), rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate reviews for the same session and mentee', async () => {
    sessionReviewModel.findOne.mockReturnValue(createExecMock({ _id: new Types.ObjectId() }));

    await expect(
      service.createForReviewer(menteeId.toString(), { tutoringSessionId: sessionId.toString(), rating: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a mentee review and updates mentor rating metrics', async () => {
    const savedReview = {
      _id: new Types.ObjectId(),
      tutoringSessionId: sessionId,
      reviewerId: menteeId,
      reviewerType: ReviewerType.MENTEE,
      reviewedUserId: mentorId,
      status: ReviewStatus.SUBMITTED,
      overallRatings: { overallSatisfaction: 5 },
    };
    sessionReviewModel.mockImplementationOnce((data: Record<string, unknown>) => ({
      _id: savedReview._id,
      ...data,
      save: jest.fn().mockResolvedValue(savedReview),
    }));
    sessionReviewModel.find.mockReturnValue(createExecMock([savedReview]));

    await expect(
      service.createForReviewer(menteeId.toString(), {
        tutoringSessionId: sessionId.toString(),
        rating: 5,
        comment: 'Great mentor',
        isAnonymous: false,
      }),
    ).resolves.toBe(savedReview);

    type CreatedReviewPayload = {
      reviewerType?: ReviewerType;
      reviewedUserId?: Types.ObjectId;
      isAnonymous?: boolean;
      overallRatings?: {
        overallSatisfaction?: number;
        communication?: number;
      };
    };
    const createdReviewPayload = (sessionReviewModel as jest.Mock<unknown, [CreatedReviewPayload]>).mock.calls[0]?.[0];
    expect(createdReviewPayload?.reviewerType).toBe(ReviewerType.MENTEE);
    expect(createdReviewPayload?.reviewedUserId).toBeInstanceOf(Types.ObjectId);
    expect(createdReviewPayload?.reviewedUserId?.toString()).toBe(mentorId.toString());
    expect(createdReviewPayload?.isAnonymous).toBe(false);
    expect(createdReviewPayload?.overallRatings).toMatchObject({
      overallSatisfaction: 5,
      communication: 5,
    });
    expect(tutorProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        $or: [
          { userId: mentorId },
          { userId: mentorId.toString() },
        ],
      },
      expect.any(Object),
      { new: true },
    );
    type RatingUpdate = {
      $set?: Record<string, number>;
    };
    const ratingUpdate = (tutorProfileModel.findOneAndUpdate as jest.Mock<unknown, [unknown, RatingUpdate, unknown]>)
      .mock.calls[0]?.[1];
    expect(ratingUpdate?.$set).toMatchObject({
      'performanceMetrics.ratings.averageRating': 5,
      'performanceMetrics.ratings.totalReviews': 1,
    });
    expect(notificationService.create).toHaveBeenCalled();
  });

  it('returns mentee reviews received by the current mentor', async () => {
    const receivedReviews = [
      {
        _id: new Types.ObjectId(),
        reviewerId: menteeId,
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorId,
        status: ReviewStatus.SUBMITTED,
      },
    ];
    const receivedQuery = createSortedExecMock(receivedReviews);
    sessionReviewModel.find.mockReturnValue(receivedQuery);

    await expect(service.findReceivedForReviewee(mentorId.toString())).resolves.toBe(receivedReviews);

    const query = sessionReviewModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
    expectRevieweeIdFilter(query, mentorId);
    expect(query).toMatchObject({
      reviewerType: ReviewerType.MENTEE,
      status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
    });
    expect(receivedQuery.populate).toHaveBeenCalledWith('reviewerId', 'name avatar');
  });

  it('keeps public review serialization defensive for anonymous or legacy data', async () => {
    const reviewId = new Types.ObjectId();
    const createdAt = new Date('2026-05-17T08:00:00.000Z');
    const publicReviews = [
      {
        _id: reviewId,
        reviewerId: { name: 'Hidden Student', avatar: '/avatar.png' },
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorId,
        status: ReviewStatus.SUBMITTED,
        overallRatings: {
          overallSatisfaction: 5,
          wouldRecommend: true,
          communication: 5,
          expertise: 5,
          helpfulness: 5,
          professionalism: 5,
          punctuality: 5,
        },
        writtenFeedback: { comment: 'Helpful session' },
        createdAt,
      },
    ];
    sessionReviewModel.find.mockReturnValue(createPublicReviewQueryMock(publicReviews));

    await expect(service.findPublicByMentor(mentorId.toString())).resolves.toEqual([
      {
        id: reviewId.toString(),
        rating: 5,
        comment: 'Helpful session',
        createdAt,
        updatedAt: undefined,
        reviewer: {
          name: 'Học viên ẩn danh',
          isAnonymous: true,
        },
        overallRatings: {
          overallSatisfaction: 5,
          wouldRecommend: true,
          likelyToBookAgain: undefined,
          communication: 5,
          expertise: 5,
          helpfulness: 5,
          professionalism: 5,
          punctuality: 5,
        },
      },
    ]);
    const query = sessionReviewModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
    expectRevieweeIdFilter(query, mentorId);
    expect(query).toMatchObject({
      reviewerType: ReviewerType.MENTEE,
      status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
      isAnonymous: false,
    });
  });

  it('exposes only reviewer name and avatar for public non-anonymous mentor reviews', async () => {
    const reviewId = new Types.ObjectId();
    const publicReviews = [
      {
        _id: reviewId,
        reviewerId: { _id: menteeId, name: 'Lan Anh', email: 'lan@example.com', avatar: '/lan.png' },
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorId,
        status: ReviewStatus.PUBLISHED,
        isAnonymous: false,
        overallRatings: {
          overallSatisfaction: 4,
          wouldRecommend: true,
          communication: 4,
          expertise: 5,
          helpfulness: 4,
          professionalism: 4,
          punctuality: 5,
        },
        writtenFeedback: { comment: 'Good mentor' },
      },
    ];
    sessionReviewModel.find.mockReturnValue(createPublicReviewQueryMock(publicReviews));

    const [review] = await service.findPublicByMentor(mentorId.toString());

    expect(review).toMatchObject({
      id: reviewId.toString(),
      rating: 4,
      comment: 'Good mentor',
      reviewer: {
        name: 'Lan Anh',
        avatar: '/lan.png',
        isAnonymous: false,
      },
    });
    expect(review.reviewer).not.toHaveProperty('email');
    const query = sessionReviewModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(query).toMatchObject({ isAnonymous: false });
  });

  it('recalculates mentor ratings using ObjectId and legacy string reviewee ids', async () => {
    const reviews = [
      {
        _id: new Types.ObjectId(),
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorId,
        status: ReviewStatus.SUBMITTED,
        overallRatings: { overallSatisfaction: 5 },
      },
      {
        _id: new Types.ObjectId(),
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorId.toString(),
        status: ReviewStatus.SUBMITTED,
        overallRatings: { overallSatisfaction: 4 },
      },
      {
        _id: new Types.ObjectId(),
        reviewerType: ReviewerType.MENTEE,
        reviewedUserId: mentorId,
        status: ReviewStatus.PUBLISHED,
        overallRatings: { overallSatisfaction: 3 },
      },
    ];
    sessionReviewModel.find.mockReturnValue(createExecMock(reviews));

    await service.recalculateMentorRating(mentorId.toString());

    const query = sessionReviewModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
    expectRevieweeIdFilter(query, mentorId);
    expect(query).toMatchObject({
      reviewerType: ReviewerType.MENTEE,
      status: { $in: [ReviewStatus.SUBMITTED, ReviewStatus.PUBLISHED] },
    });
    const profileQuery = (tutorProfileModel.findOneAndUpdate as jest.Mock).mock.calls[0]?.[0];
    expect(profileQuery).toEqual({
      $or: [
        { userId: mentorId },
        { userId: mentorId.toString() },
      ],
    });
    const ratingUpdate = (tutorProfileModel.findOneAndUpdate as jest.Mock).mock.calls[0]?.[1];
    expect(ratingUpdate.$set).toMatchObject({
      'performanceMetrics.ratings.averageRating': 4,
      'performanceMetrics.ratings.totalReviews': 3,
      'performanceMetrics.ratings.ratingBreakdown': [
        { stars: 1, count: 0 },
        { stars: 2, count: 0 },
        { stars: 3, count: 1 },
        { stars: 4, count: 1 },
        { stars: 5, count: 1 },
      ],
    });
  });

  it('normalizes mixed distinct mentor ids when recalculating all ratings', async () => {
    sessionReviewModel.distinct.mockResolvedValue([mentorId, mentorId.toString(), 'not-an-object-id']);
    sessionReviewModel.find.mockReturnValue(createExecMock([]));

    await expect(service.recalculateAllMentorRatings()).resolves.toEqual({ mentorsUpdated: 1 });

    expect(sessionReviewModel.find).toHaveBeenCalledTimes(1);
    const query = sessionReviewModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
    expectRevieweeIdFilter(query, mentorId);
  });
});
