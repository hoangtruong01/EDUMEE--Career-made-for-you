// src/modules/learning/index.ts

// Learning Module Exports - Đồng bộ tuyệt đối sang bản 2 nâng cấp, loại bỏ any ngầm định
export { SimulationTask, SimulationTaskSchema } from './schemas/simulation-task.schema2';
export type { SimulationTaskDocument } from './schemas/simulation-task.schema2';

export { TaskSubmission, TaskSubmissionSchema } from './schemas/task-submission.schema2';
export type { TaskSubmissionDocument } from './schemas/task-submission.schema2';

export { LearningRoadmap, LearningRoadmapSchema } from './schemas/learning-roadmap.schema2';
export type { LearningRoadmapDocument } from './schemas/learning-roadmap.schema2';

export { WeeklyPlan, WeeklyPlanSchema } from './schemas/weekly-plan.schema2';
export type { WeeklyPlanDocument } from './schemas/weekly-plan.schema2';

export { Checkpoint, CheckpointSchema } from './schemas/checkpoint.schema2';
export type { CheckpointDocument } from './schemas/checkpoint.schema2';

export {
  UserLearningProfile,
  UserLearningProfileSchema,
} from './schemas/user-learning-profile.schema';
export type { UserLearningProfileDocument } from './schemas/user-learning-profile.schema';
