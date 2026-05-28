import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import {
  PaymentController,
  PaymentPublicController,
  SepayBankWebhookController,
} from './controllers';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schema/payment-transaction.schema';
import { PaymentSetting, PaymentSettingSchema } from './schema/payment-setting.schema';
import { Payment, PaymentSchema } from './schema/payment.schema';
import { PaymentService } from './services';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingSession, BookingSessionSchema } from '../mentoring/schemas/booking-session.schema';
import {
  MentorAvailabilitySlot,
  MentorAvailabilitySlotSchema,
} from '../mentoring/schemas/mentor-availability-slot.schema';
import { AuditModule } from '../audit/audit.module';
import { WalletModule } from '../wallet/wallet.module';
import { FinancialLedgerModule } from '../financial-ledger';

@Module({
  imports: [
    AiModule,
    NotificationsModule,
    AuditModule,
    WalletModule,
    FinancialLedgerModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: PaymentSetting.name, schema: PaymentSettingSchema },
      { name: BookingSession.name, schema: BookingSessionSchema },
      { name: MentorAvailabilitySlot.name, schema: MentorAvailabilitySlotSchema },
    ]),
  ],
  controllers: [PaymentController, PaymentPublicController, SepayBankWebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
