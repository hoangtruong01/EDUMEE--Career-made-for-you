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

@Module({
  imports: [
    AiModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
    ]),
  ],
  controllers: [PaymentController, PaymentPublicController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
