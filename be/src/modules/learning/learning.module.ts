import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import {
  CareerFitResult,
  CareerFitResultSchema,
} from '../assessment/schemas/career-fit-result.schema';
import { CareerInsight, CareerInsightSchema } from '../careers/schemas/career-insight.schema';
import {
  CheckpointController,
  LearningRoadmapController,
  SimulationTaskController,
  TaskSubmissionController,
  WeeklyPlanController,
} from './controllers';
import { Checkpoint, CheckpointSchema } from './schemas/checkpoint.schema2';
import { LearningRoadmap, LearningRoadmapSchema } from './schemas/learning-roadmap.schema2';
import { SimulationTask, SimulationTaskSchema } from './schemas/simulation-task.schema2';
import { TaskSubmission, TaskSubmissionSchema } from './schemas/task-submission.schema2';
import {
  UserLearningProfile,
  UserLearningProfileSchema,
} from './schemas/user-learning-profile.schema';
import { WeeklyPlan, WeeklyPlanSchema } from './schemas/weekly-plan.schema2';
import { CheckpointService } from './services/checkpoint.service2';
import { LearningRoadmapService } from './services/learning-roadmap.service2';
import { SimulationTaskService } from './services/simulation-task.service2';
import { TaskSubmissionService } from './services/task-submission.service2';
import { UserLearningProfileService } from './services/user-learning-profile.service';
import { WeeklyPlanService } from './services/weekly-plan.service2';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningRoadmap.name, schema: LearningRoadmapSchema },
      { name: SimulationTask.name, schema: SimulationTaskSchema },
      { name: TaskSubmission.name, schema: TaskSubmissionSchema },
      { name: WeeklyPlan.name, schema: WeeklyPlanSchema },
      { name: Checkpoint.name, schema: CheckpointSchema },
      { name: UserLearningProfile.name, schema: UserLearningProfileSchema },

      // 🎯 ĐĂNG KÝ THÊM MODEL VÀO ĐÂY ĐỂ THÔNG MẠCH CONTEXT:
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
      { name: CareerInsight.name, schema: CareerInsightSchema },
    ]),
    AiModule,
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
    UserLearningProfileService,
  ],
  exports: [
    LearningRoadmapService,
    SimulationTaskService,
    TaskSubmissionService,
    WeeklyPlanService,
    CheckpointService,
    UserLearningProfileService,
  ],
})
export class LearningModule {}
