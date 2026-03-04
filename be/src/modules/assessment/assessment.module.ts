import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import {
  AssessmentSession,
  AssessmentSessionSchema,
  AssessmentQuestion,
  AssessmentQuestionSchema,
  AssessmentAnswer,
  AssessmentAnswerSchema,
  CareerFitResult,
  CareerFitResultSchema,
} from './schemas';

// Services
import {
  AssessmentSessionService,
  AssessmentQuestionService,
  AssessmentAnswerService,
  CareerFitResultService,
} from './services';

// Controllers
import {
  AssessmentSessionController,
  AssessmentQuestionController,
  AssessmentAnswerController,
  CareerFitResultController,
} from './controllers';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssessmentSession.name, schema: AssessmentSessionSchema },
      { name: AssessmentQuestion.name, schema: AssessmentQuestionSchema },
      { name: AssessmentAnswer.name, schema: AssessmentAnswerSchema },
      { name: CareerFitResult.name, schema: CareerFitResultSchema },
    ]),
  ],
  controllers: [
    AssessmentSessionController,
    AssessmentQuestionController,
    AssessmentAnswerController,
    CareerFitResultController,
  ],
  providers: [
    AssessmentSessionService,
    AssessmentQuestionService,
    AssessmentAnswerService,
    CareerFitResultService,
  ],
  exports: [
    AssessmentSessionService,
    AssessmentQuestionService,
    AssessmentAnswerService,
    CareerFitResultService,
  ],
})
export class AssessmentModule {}