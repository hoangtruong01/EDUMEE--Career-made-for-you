import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningRoadmap, LearningRoadmapSchema } from './schemas/learning-roadmap.schema';
import { SimulationTask, SimulationTaskSchema } from './schemas/simulation-task.schema';
import { TaskSubmission, TaskSubmissionSchema } from './schemas/task-submission.schema';
import { WeeklyPlan, WeeklyPlanSchema } from './schemas/weekly-plan.schema';
import { Checkpoint, CheckpointSchema } from './schemas/checkpoint.schema';
import { LearningRoadmapService } from './services/learning-roadmap.service';
import { SimulationTaskService } from './services/simulation-task.service';
import { TaskSubmissionService } from './services/task-submission.service';
import { WeeklyPlanService } from './services/weekly-plan.service';
import { CheckpointService } from './services/checkpoint.service';
import {
  LearningRoadmapController,
  SimulationTaskController,
  TaskSubmissionController,
  WeeklyPlanController,
  CheckpointController,
} from './controllers';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AiModule,
    MongooseModule.forFeature([
      { name: LearningRoadmap.name, schema: LearningRoadmapSchema },
      { name: SimulationTask.name, schema: SimulationTaskSchema },
      { name: TaskSubmission.name, schema: TaskSubmissionSchema },
      { name: WeeklyPlan.name, schema: WeeklyPlanSchema },
      { name: Checkpoint.name, schema: CheckpointSchema },
    ]),
  ],
  controllers: [
    LearningRoadmapController,
    SimulationTaskController,
    TaskSubmissionController,
    WeeklyPlanController,
    CheckpointController,
  ],
  providers: [
    LearningRoadmapService,
    SimulationTaskService,
    TaskSubmissionService,
    WeeklyPlanService,
    CheckpointService,
  ],
  exports: [
    LearningRoadmapService,
    SimulationTaskService,
    TaskSubmissionService,
    WeeklyPlanService,
    CheckpointService,
  ],
})
export class LearningModule {}
