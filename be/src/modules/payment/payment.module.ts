import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import {
  PaymentController,
  PaymentPublicController,
} from './controllers';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schema/payment-transaction.schema';
import { Payment, PaymentSchema } from './schema/payment.schema';
import { PaymentService } from './services';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingSession, BookingSessionSchema } from '../mentoring/schemas/booking-session.schema';
import {
  MentorAvailabilitySlot,
  MentorAvailabilitySlotSchema,
} from '../mentoring/schemas/mentor-availability-slot.schema';

@Module({
  imports: [
    AiModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
      { name: MentorAvailabilitySlot.name, schema: MentorAvailabilitySlotSchema },
    ]),
  ],
  controllers: [PaymentController, PaymentPublicController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
