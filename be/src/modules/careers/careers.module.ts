import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Career, CareerSchema } from './schemas/career.schema';
import { CareerComparison, CareerComparisonSchema } from './schemas/career-comparison.schema';
import { CareerSimulation, CareerSimulationSchema } from './schemas/career-simulation.schema';
import { CareerService } from './services/career.service';
import { CareerComparisonService } from './services/career-comparison.service';
import { CareerSimulationService } from './services/career-simulation.service';
import { CareerController } from './careers.controller';
import { CareerComparisonController } from './career-comparison.controller';
import { CareerSimulationController } from './career-simulation.controller';
import { AiModule } from '../ai/ai.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { AIService } from '../../common/services/ai.service';

@Module({
  imports: [
    AiModule,
    forwardRef(() => AssessmentModule),
    MongooseModule.forFeature([
      { name: Career.name, schema: CareerSchema },
      { name: CareerComparison.name, schema: CareerComparisonSchema },
      { name: CareerSimulation.name, schema: CareerSimulationSchema },
    ]),
  ],
  controllers: [
    CareerSimulationController,
    CareerController, 
    CareerComparisonController,
  ],
  providers: [
    CareerService, 
    CareerComparisonService,
    CareerSimulationService,
    AIService
  ],
  exports: [
    CareerService, 
    CareerComparisonService,
    CareerSimulationService
  ],
})
export class CareersModule {}
