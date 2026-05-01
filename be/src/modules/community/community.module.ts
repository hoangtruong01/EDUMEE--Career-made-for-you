import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CareerReviewController,
  CommunityPostController,
  ReviewInteractionsController,
  ReviewReportController,
} from './controllers';
import { CareerReview, CareerReviewSchema } from './schemas/career-review.schema';
import { CommunityPost, CommunityPostSchema } from './schemas/community-post.schema';
import {
  ReviewReport,
  ReviewReportSchema,
  ReviewVote,
  ReviewVoteSchema,
} from './schemas/review-interactions.schema';
import {
  CareerReviewService,
  CommunityPostService,
  ReviewInteractionsService,
  ReviewReportService,
} from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CareerReview.name, schema: CareerReviewSchema },
      { name: CommunityPost.name, schema: CommunityPostSchema },
      { name: ReviewVote.name, schema: ReviewVoteSchema },
      { name: ReviewReport.name, schema: ReviewReportSchema },
    ]),
  ],
  controllers: [
    CareerReviewController,
    CommunityPostController,
    ReviewInteractionsController,
    ReviewReportController,
  ],
  providers: [
    CareerReviewService,
    CommunityPostService,
    ReviewInteractionsService,
    ReviewReportService,
  ],
  exports: [
    CareerReviewService,
    CommunityPostService,
    ReviewInteractionsService,
    ReviewReportService,
  ],
})
export class CommunityModule {}
