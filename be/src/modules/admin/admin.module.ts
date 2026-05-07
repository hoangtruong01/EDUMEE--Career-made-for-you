import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Career, CareerSchema } from '../careers/schemas/career.schema';
import { CareerInsight, CareerInsightSchema } from '../careers/schemas/career-insight.schema';
import { CareerFitResult, CareerFitResultSchema } from '../assessment/schemas/career-fit-result.schema';
import { BookingSession, BookingSessionSchema } from '../mentoring/schemas/booking-session.schema';
import { AIService } from '../../common/services/ai.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Career.name, schema: CareerSchema },
      { name: CareerInsight.name, schema: CareerInsightSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AIService],
  exports: [AdminService],
})
export class AdminModule {}
