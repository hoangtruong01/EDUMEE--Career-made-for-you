import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Career, CareerSchema } from '../careers/schemas/career.schema';
import { CareerInsight, CareerInsightSchema } from '../careers/schemas/career-insight.schema';
import { CareerFitResult, CareerFitResultSchema } from '../assessment/schemas/career-fit-result.schema';
import { AssessmentSession, AssessmentSessionSchema } from '../assessment/schemas/assessment-sesions.schema';
import { BookingSession, BookingSessionSchema } from '../mentoring/schemas/booking-session.schema';
import { AIService } from '../../common/services/ai.service';
import { Payment, PaymentSchema } from '../payment/schema/payment.schema';
import { PaymentSetting, PaymentSettingSchema } from '../payment/schema/payment-setting.schema';
import { AiPlan, AiPlanSchema } from '../ai/schema/ai-plan.schema';
import { UserSubscription, UserSubscriptionSchema } from '../users/schemas/user-subscriptions';
import { AuditModule } from '../audit/audit.module';
import { TrackingModule } from '../tracking/tracking.module';
import { CareersModule } from '../careers/careers.module';

@Module({
  imports: [
    AuditModule,
    TrackingModule,
    CareersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Career.name, schema: CareerSchema },
      { name: CareerInsight.name, schema: CareerInsightSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
      { name: AssessmentSession.name, schema: AssessmentSessionSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentSetting.name, schema: PaymentSettingSchema },
      { name: AiPlan.name, schema: AiPlanSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AIService],
  exports: [AdminService],
})
export class AdminModule {}
