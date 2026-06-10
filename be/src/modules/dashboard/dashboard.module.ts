// be/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DashboardController } from './controller/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { TrackingModule } from '../tracking/tracking.module';

// 🎯 FIX ĐƯỜNG DẪN: Import trực tiếp AIService từ tầng Common thực tế của dự án
import { AIService } from '../../common/services/ai.service';

import {
  LearningRoadmap,
  LearningRoadmapSchema,
} from '../learning/schemas/learning-roadmap.schema2';
import {
  UserLearningProfile,
  UserLearningProfileSchema,
} from '../learning/schemas/user-learning-profile.schema';
import { AnalyticsEvent, AnalyticsEventSchema } from '../tracking/schema/analytics-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningRoadmap.name, schema: LearningRoadmapSchema },
      { name: UserLearningProfile.name, schema: UserLearningProfileSchema },
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
    LearningModule,
    TrackingModule,
    AuthModule,
  ],
  controllers: [DashboardController],
  // 🎯 QUAN TRỌNG: Nạp AIService trực tiếp vào đây để triệt tiêu lỗi UnknownDependenciesException
  providers: [DashboardService, AIService],
})
export class DashboardModule {}
