import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import { AiPlan, AiPlanSchema } from '../ai/schema/ai-plan.schema';
import { UserSubscription, UserSubscriptionSchema } from '../users/schemas/user-subscriptions';
import {
  AssessmentAnswer,
  AssessmentAnswerSchema,
  AssessmentQuestion,
  AssessmentQuestionSchema,
  CareerFitResult,
  CareerFitResultSchema,
} from './schemas';
import { AssessmentSession, AssessmentSessionSchema } from './schemas/assessment-sesions.schema';

// Services
import { AIService } from '../../common/services/ai.service';
import { AiModule } from '../ai/ai.module';
import {
  AssessmentAnswerService,
  AssessmentQuestionService,
  CareerFitResultService,
} from './services';
import { AssessmentQuestionSeedService } from './services/assessment-question-seed.service';
import { AssessmentSessionService } from './services/assessment-session.service';

// Controllers
import {
  AssessmentAnswerController,
  AssessmentQuestionController,
  CareerFitResultController,
} from './controllers';
import { AssessmentSessionController } from './controllers/assessment-session.controller';

@Module({
  imports: [
    AiModule,
    MongooseModule.forFeature([
      { name: AssessmentQuestion.name, schema: AssessmentQuestionSchema },
      { name: AssessmentAnswer.name, schema: AssessmentAnswerSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
      { name: AssessmentSession.name, schema: AssessmentSessionSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: AiPlan.name, schema: AiPlanSchema },
    ]),
  ],
  controllers: [
    AssessmentQuestionController,
    AssessmentAnswerController,
    CareerFitResultController,
    AssessmentSessionController,
  ],
  providers: [
    AssessmentQuestionService,
    AssessmentQuestionSeedService,
    AssessmentAnswerService,
    CareerFitResultService,
    AssessmentSessionService,
    AIService,
  ],
  exports: [
    AssessmentQuestionService,
    AssessmentAnswerService,
    CareerFitResultService,
    AssessmentSessionService,
  ],
})
export class AssessmentModule {}
