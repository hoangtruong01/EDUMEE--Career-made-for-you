import type { AnyBulkWriteOperation, Document } from 'mongodb';
import mongoose, { Types } from 'mongoose';

const SESSION_REVIEWS_COLLECTION = 'session_reviews';
const TUTOR_PROFILES_COLLECTION = 'tutor_profiles';
const PUBLISHED_REVIEW_STATUSES = ['submitted', 'published'];
const BATCH_SIZE = 500;

type SessionReviewRecord = Document & {
  _id: unknown;
  reviewedUserId?: unknown;
  overallRatings?: {
    overallSatisfaction?: unknown;
  };
};

function getDatabaseUri(): string {
  const uri = process.env.DATABASE_URI?.trim() || process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set DATABASE_URI or MONGODB_URI.');
  }
  return uri;
}

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

async function recalculateMentorRating(mentorId: string): Promise<void> {
  const reviews = mongoose.connection.collection<SessionReviewRecord>(SESSION_REVIEWS_COLLECTION);
  const tutorProfiles = mongoose.connection.collection(TUTOR_PROFILES_COLLECTION);
  const mentorObjectId = new Types.ObjectId(mentorId);
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
    { userId: mentorObjectId },
    {
      $set: {
        'performanceMetrics.ratings.averageRating': averageRating,
        'performanceMetrics.ratings.totalReviews': totalReviews,
        'performanceMetrics.ratings.ratingBreakdown': ratingBreakdown,
        'performanceMetrics.lastUpdated': new Date(),
      },
    },
  );
}

async function migrateSessionReviewRevieweeIds(): Promise<void> {
  await mongoose.connect(getDatabaseUri());
  const reviews = mongoose.connection.collection<SessionReviewRecord>(SESSION_REVIEWS_COLLECTION);
  const affectedMentorIds = new Set<string>();
  const pendingWrites: AnyBulkWriteOperation<SessionReviewRecord>[] = [];
  let scanned = 0;
  let skipped = 0;
  let converted = 0;

  const flushWrites = async () => {
    if (pendingWrites.length === 0) return;
    const result = await reviews.bulkWrite(pendingWrites, { ordered: false });
    converted += result.modifiedCount;
    pendingWrites.length = 0;
  };

  const cursor = reviews.find(
    { reviewedUserId: { $type: 'string' } },
    { projection: { reviewedUserId: 1 } },
  );

  for await (const review of cursor) {
    scanned += 1;
    const mentorId = toValidObjectIdString(review.reviewedUserId);
    if (!mentorId || typeof review.reviewedUserId !== 'string') {
      skipped += 1;
      continue;
    }

    pendingWrites.push({
      updateOne: {
        filter: { _id: review._id, reviewedUserId: review.reviewedUserId },
        update: { $set: { reviewedUserId: new Types.ObjectId(mentorId) } },
      },
    });
    affectedMentorIds.add(mentorId);

    if (pendingWrites.length >= BATCH_SIZE) {
      await flushWrites();
    }
  }

  await flushWrites();

  for (const mentorId of affectedMentorIds) {
    await recalculateMentorRating(mentorId);
  }

  console.log(
    [
      `Scanned ${scanned} legacy string reviewee id(s).`,
      `Converted ${converted} session review(s).`,
      `Skipped ${skipped} invalid value(s).`,
      `Recalculated ${affectedMentorIds.size} mentor rating profile(s).`,
    ].join(' '),
  );
}

migrateSessionReviewRevieweeIds()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
