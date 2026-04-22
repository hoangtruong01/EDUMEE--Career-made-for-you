import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CareerReview, CareerReviewSchema } from './schemas/career-review.schema';
import { ReviewReport, ReviewReportSchema, ReviewVote, ReviewVoteSchema } from './schemas/review-interactions.schema';
import { CareerReviewService, ReviewInteractionsService, ReviewReportService } from './services';
import { CareerReviewController, ReviewInteractionsController, ReviewReportController } from './controllers';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CareerReview.name, schema: CareerReviewSchema },
      { name: ReviewVote.name, schema: ReviewVoteSchema },
      { name: ReviewReport.name, schema: ReviewReportSchema },
    ]),
  ],
  controllers: [CareerReviewController, ReviewInteractionsController, ReviewReportController],
  providers: [CareerReviewService, ReviewInteractionsService, ReviewReportService],
  exports: [CareerReviewService, ReviewInteractionsService, ReviewReportService],
})
export class CommunityModule {}
