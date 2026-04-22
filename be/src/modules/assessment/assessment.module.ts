import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import {
  AssessmentQuestion,
  AssessmentQuestionSchema,
  AssessmentAnswer,
  AssessmentAnswerSchema,
  CareerFitResult,
  CareerFitResultSchema,
} from './schemas';
import { AssessmentSession, AssessmentSessionSchema } from './schemas/assessment-sesions.schema';
import { UserSubscription, UserSubscriptionSchema } from '../users/schemas/user-subscriptions';
import { AiPlan, AiPlanSchema } from '../ai/schema/ai-plan.schema';

// Services
import {
  AssessmentQuestionService,
  AssessmentAnswerService,
  CareerFitResultService,
} from './services';
import { AssessmentSessionService } from './services/assessment-session.service';
import { AIService } from '../../common/services/ai.service';
import { AiModule } from '../ai/ai.module';

// Controllers
import {
  AssessmentQuestionController,
  AssessmentAnswerController,
  CareerFitResultController,
  // session controller added below
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
export class AssessmentModule { }
