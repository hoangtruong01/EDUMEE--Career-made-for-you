import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Career, CareerSchema } from './schemas/career.schema';
import { CareerComparison, CareerComparisonSchema } from './schemas/career-comparison.schema';
import { CareerService } from './services/career.service';
import { CareerComparisonService } from './services/career-comparison.service';
import { CareerController } from './careers.controller';
import { CareerComparisonController } from './career-comparison.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AiModule,
    MongooseModule.forFeature([
      { name: Career.name, schema: CareerSchema },
      { name: CareerComparison.name, schema: CareerComparisonSchema },
    ]),
  ],
  controllers: [CareerController, CareerComparisonController],
  providers: [CareerService, CareerComparisonService],
  exports: [CareerService, CareerComparisonService],
})
export class CareersModule {}
