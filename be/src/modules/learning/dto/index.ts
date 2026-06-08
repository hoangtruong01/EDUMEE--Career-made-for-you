// src/modules/learning/dto/index.ts

// 1. Checkpoint DTOs bản nâng cấp
export {
  CheckpointResponseDto,
  CheckpointType,
  CreateCheckpointDto,
  UpdateCheckpointAiFeedbackDto,
  UpdateCheckpointDto,
  UserReflectionDto,
} from './checkpoint.dto2';

// 2. Learning Roadmap DTOs bản nâng cấp
export {
  CreateLearningRoadmapDto,
  MilestoneDto,
  PhaseDto,
  UpdateLearningRoadmapDto,
} from './learning-roadmap.dto2';

// 3. Simulation Task DTOs bản nâng cấp
export {
  CreateSimulationTaskDto,
  EvaluationRubricDto,
  RubricLevelDto,
  TaskMaterialDto,
  UpdateSimulationTaskDto,
} from './simulation-task.dto2';

// 4. Task Submission DTOs bản nâng cấp
export {
  CreateTaskSubmissionDto,
  CriteriaScoreDto,
  EvaluateSubmissionDto,
  SubmissionContentDto,
  SubmissionFileDto,
  UpdateTaskSubmissionDto,
} from './task-submission.dto2';

// 5. Weekly Plan DTOs bản nâng cấp
export { CreateWeeklyPlanDto, PlannedTaskDto, UpdateWeeklyPlanDto } from './weekly-plan.dto2';
