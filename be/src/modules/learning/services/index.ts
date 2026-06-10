// src/modules/learning/services/index.ts

// Xuất khẩu toàn bộ các Services bản nâng cấp (bản 2) theo chuẩn Strict TypeScript
export { CheckpointService } from './checkpoint.service2';
export { LearningRoadmapService } from './learning-roadmap.service2';
export { SimulationTaskService } from './simulation-task.service2';
export { TaskSubmissionService } from './task-submission.service2';
export { WeeklyPlanService } from './weekly-plan.service2';

// Xuất khẩu Động cơ Gamification (Streak/Huy hiệu) mới tinh
export { UserLearningProfileService } from './user-learning-profile.service';
