import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '../../common/mail/mail.module';
import {
  AssessmentSession,
  AssessmentSessionSchema,
} from '../assessment/schemas/assessment-sesions.schema';
import {
  CareerFitResult,
  CareerFitResultSchema,
} from '../assessment/schemas/career-fit-result.schema';
import { AuditModule } from '../audit/audit.module';
import { UserSubscription, UserSubscriptionSchema } from '../users/schemas/user-subscriptions';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AiPlanController } from './controllers/ai-plan.controller';
import { AiSubscriptionController } from './controllers/ai-subscription.controller';
import { AiPlan, AiPlanSchema } from './schema/ai-plan.schema';
import { AiUsageLog, AiUsageLogSchema } from './schema/ai-usage-logs.schema';
import { AiPlanService } from './services/ai-plan.service';
import { AiQuotaService } from './services/ai-quota.service';
import { AiSubscriptionService } from './services/ai-subscription.service';
// 🎯 BƯỚC 1: Import AIService từ thư mục common vào module AI bọc ngoài
import { AIService } from '../../common/services/ai.service';

@Module({
  imports: [
    AuditModule,
    JwtModule.register({}),
    MailModule,
    MongooseModule.forFeature([
      { name: AiPlan.name, schema: AiPlanSchema },
      { name: AiUsageLog.name, schema: AiUsageLogSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
      { name: AssessmentSession.name, schema: AssessmentSessionSchema },
    ]),
  ],
  controllers: [AiPlanController, AiSubscriptionController],
  providers: [
    AiQuotaService,
    AiPlanService,
    AiSubscriptionService,
    AIService, // 🎯 BƯỚC 2: Khai báo cung cấp dịch vụ core AI
  ],
  exports: [
    AiQuotaService,
    AiPlanService,
    AiSubscriptionService,
    AIService, // 🎯 BƯỚC 3: Xuất khẩu ra ngoài để LearningModule có thể nhìn thấy và thừa kế thành công
  ],
})
export class AiModule {}
