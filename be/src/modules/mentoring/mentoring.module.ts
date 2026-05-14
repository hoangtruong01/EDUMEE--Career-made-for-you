import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { PaymentModule } from '../payment/payment.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TutorProfile, TutorProfileSchema } from './schemas/tutor-profile.schema';
import { TutoringSession, TutoringSessionSchema } from './schemas/tutoring-session.schema';
import { BookingSession, BookingSessionSchema } from './schemas/booking-session.schema';
import { SessionReview, SessionReviewSchema } from './schemas/session-review.schema';
import {
  TutorProfileService,
  TutoringSessionService,
  BookingSessionService,
  SessionReviewService,
} from './services';
import {
  TutorProfileController,
  TutoringSessionController,
  BookingSessionController,
  SessionReviewController,
} from './controllers';

@Module({
  imports: [
    AiModule,
    PaymentModule,
    MongooseModule.forFeature([
      { name: TutorProfile.name, schema: TutorProfileSchema },
      { name: TutoringSession.name, schema: TutoringSessionSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
      { name: SessionReview.name, schema: SessionReviewSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    TutorProfileController,
    TutoringSessionController,
    BookingSessionController,
    SessionReviewController,
  ],
  providers: [
    TutorProfileService,
    TutoringSessionService,
    BookingSessionService,
    SessionReviewService,
  ],
  exports: [
    TutorProfileService,
    TutoringSessionService,
    BookingSessionService,
    SessionReviewService,
  ],
})
export class MentoringModule {}
