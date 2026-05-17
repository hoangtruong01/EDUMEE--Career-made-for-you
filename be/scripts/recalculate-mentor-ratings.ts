import mongoose, { Types } from 'mongoose';

const SESSION_REVIEWS_COLLECTION = 'session_reviews';
const TUTOR_PROFILES_COLLECTION = 'tutor_profiles';
const PUBLISHED_REVIEW_STATUSES = ['submitted', 'published'];

function toValidObjectIdString(value: unknown): string | null {
  const id = value?.toString();
  return id && Types.ObjectId.isValid(id) ? id : null;
}

function buildRevieweeMatch(mentorId: string) {
  return {
    $or: [
      { reviewedUserId: new Types.ObjectId(mentorId) },
      { reviewedUserId: mentorId },
    ],
  };
}

function buildTutorProfileMatch(mentorId: string) {
  return {
    $or: [
      { userId: new Types.ObjectId(mentorId) },
      { userId: mentorId },
    ],
  };
}

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }
  return uri;
}

async function recalculateMentorRatings(): Promise<void> {
  await mongoose.connect(getDatabaseUri());
  const reviews = mongoose.connection.collection(SESSION_REVIEWS_COLLECTION);
  const tutorProfiles = mongoose.connection.collection(TUTOR_PROFILES_COLLECTION);

  const rawMentorIds = await reviews.distinct('reviewedUserId', {
    reviewerType: 'mentee',
    status: { $in: PUBLISHED_REVIEW_STATUSES },
  });
  const mentorIds = [
    ...new Set(rawMentorIds.map(toValidObjectIdString).filter((id): id is string => Boolean(id))),
  ];

  let updated = 0;
  for (const mentorId of mentorIds) {
    const mentorReviews = await reviews
      .find({
        ...buildRevieweeMatch(mentorId),
        reviewerType: 'mentee',
        status: { $in: PUBLISHED_REVIEW_STATUSES },
      })
      .toArray();

    const ratingBreakdown = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 }));
    let ratingTotal = 0;
    for (const review of mentorReviews) {
      const rating = Number(review.overallRatings?.overallSatisfaction || 0);
      if (!Number.isFinite(rating) || rating <= 0) continue;
      ratingTotal += rating;
      const rounded = Math.min(5, Math.max(1, Math.round(rating)));
      const bucket = ratingBreakdown.find((item) => item.stars === rounded);
      if (bucket) bucket.count += 1;
    }

    const totalReviews = mentorReviews.length;
    const averageRating = totalReviews > 0 ? Number((ratingTotal / totalReviews).toFixed(2)) : 0;
    await tutorProfiles.updateOne(
      buildTutorProfileMatch(mentorId),
      {
        $set: {
          'performanceMetrics.ratings.averageRating': averageRating,
          'performanceMetrics.ratings.totalReviews': totalReviews,
          'performanceMetrics.ratings.ratingBreakdown': ratingBreakdown,
          'performanceMetrics.lastUpdated': new Date(),
        },
      },
    );
    updated += 1;
  }

  console.log(`Recalculated mentor ratings for ${updated} mentor profile(s).`);
}

recalculateMentorRatings()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
