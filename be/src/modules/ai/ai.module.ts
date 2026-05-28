import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiPlan, AiPlanSchema } from './schema/ai-plan.schema';
import { AiUsageLog, AiUsageLogSchema } from './schema/ai-usage-logs.schema';
import { UserSubscription, UserSubscriptionSchema } from '../users/schemas/user-subscriptions';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CareerFitResult, CareerFitResultSchema } from '../assessment/schemas/career-fit-result.schema';
import { AiQuotaService } from './services/ai-quota.service';
import { AiPlanService } from './services/ai-plan.service';
import { AiSubscriptionService } from './services/ai-subscription.service';
import { AiPlanController } from './controllers/ai-plan.controller';
import { AiSubscriptionController } from './controllers/ai-subscription.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: AiPlan.name, schema: AiPlanSchema },
      { name: AiUsageLog.name, schema: AiUsageLogSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
    ]),
  ],
  controllers: [AiPlanController, AiSubscriptionController],
  providers: [AiQuotaService, AiPlanService, AiSubscriptionService],
  exports: [AiQuotaService, AiPlanService, AiSubscriptionService],
})
export class AiModule {}
