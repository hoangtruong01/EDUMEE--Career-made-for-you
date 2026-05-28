import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FinancialJournalEntry,
  FinancialJournalEntrySchema,
} from './schemas';
import { FinancialLedgerService } from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialJournalEntry.name, schema: FinancialJournalEntrySchema },
    ]),
  ],
  providers: [FinancialLedgerService],
  exports: [FinancialLedgerService],
})
export class FinancialLedgerModule {}
