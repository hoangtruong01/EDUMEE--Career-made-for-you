import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './controllers';
import {
  WalletAccount,
  WalletAccountSchema,
  WalletLedgerEntry,
  WalletLedgerEntrySchema,
} from './schemas';
import { Payment, PaymentSchema } from '../payment/schema/payment.schema';
import { WalletService } from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletAccount.name, schema: WalletAccountSchema },
      { name: WalletLedgerEntry.name, schema: WalletLedgerEntrySchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
