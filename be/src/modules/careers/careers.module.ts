import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Career, CareerSchema } from './schemas/career.schema';
import { CareerComparison, CareerComparisonSchema } from './schemas/career-comparison.schema';
import { CareerSimulation, CareerSimulationSchema } from './schemas/career-simulation.schema';
import { CareerInsight, CareerInsightSchema } from './schemas/career-insight.schema';
import { SkillTag, SkillTagSchema } from './schemas/skill-tag.schema';
import { CareerService } from './services/career.service';
import { CareerComparisonService } from './services/career-comparison.service';
import { CareerSimulationService } from './services/career-simulation.service';
import { SkillTagService } from './services/skill-tag.service';
import { CareerController } from './careers.controller';
import { CareerComparisonController } from './career-comparison.controller';
import { CareerSimulationController } from './career-simulation.controller';
import { SkillTagController } from './skill-tags.controller';
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
      { name: CareerInsight.name, schema: CareerInsightSchema },
      { name: SkillTag.name, schema: SkillTagSchema },
    ]),
  ],
  controllers: [
    CareerSimulationController,
    CareerController, 
    CareerComparisonController,
    SkillTagController,
  ],
  providers: [
    CareerService, 
    CareerComparisonService,
    CareerSimulationService,
    SkillTagService,
    AIService
  ],
  exports: [
    CareerService, 
    CareerComparisonService,
    CareerSimulationService,
    SkillTagService
  ],
})
export class CareersModule {}
