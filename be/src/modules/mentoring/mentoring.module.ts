import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TutorProfile, TutorProfileSchema } from './schemas/tutor-profile.schema';
import { TutoringSession, TutoringSessionSchema } from './schemas/tutoring-session.schema';
import { BookingSession, BookingSessionSchema } from './schemas/booking-session.schema';
import { SessionReview, SessionReviewSchema } from './schemas/session-review.schema';
import { MentorAvailabilitySlot, MentorAvailabilitySlotSchema } from './schemas/mentor-availability-slot.schema';
import {
  TutorProfileService,
  TutoringSessionService,
  BookingSessionService,
  SessionReviewService,
  MentorAvailabilityService,
  MentorCallService,
} from './services';
import {
  TutorProfileController,
  TutoringSessionController,
  BookingSessionController,
  SessionReviewController,
  MentorAvailabilityController,
  MentorCallController,
} from './controllers';

@Module({
  imports: [
    AiModule,
    NotificationsModule,
    PaymentModule,
    MongooseModule.forFeature([
      { name: TutorProfile.name, schema: TutorProfileSchema },
      { name: TutoringSession.name, schema: TutoringSessionSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
      { name: SessionReview.name, schema: SessionReviewSchema },
      { name: MentorAvailabilitySlot.name, schema: MentorAvailabilitySlotSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    TutorProfileController,
    TutoringSessionController,
    BookingSessionController,
    SessionReviewController,
    MentorAvailabilityController,
    MentorCallController,
  ],
  providers: [
    TutorProfileService,
    TutoringSessionService,
    BookingSessionService,
    SessionReviewService,
    MentorAvailabilityService,
    MentorCallService,
  ],
  exports: [
    TutorProfileService,
    TutoringSessionService,
    BookingSessionService,
    SessionReviewService,
    MentorAvailabilityService,
    MentorCallService,
  ],
})
export class MentoringModule {}
