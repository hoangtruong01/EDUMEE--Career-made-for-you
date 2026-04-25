import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Career, CareerSchema } from '../careers/schemas/career.schema';
import { CareerFitResult, CareerFitResultSchema } from '../assessment/schemas/career-fit-result.schema';
import { BookingSession, BookingSessionSchema } from '../mentoring/schemas/booking-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Career.name, schema: CareerSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
