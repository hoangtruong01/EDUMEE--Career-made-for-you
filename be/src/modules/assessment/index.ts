// Assessment Module Exports
export { AssessmentSession, AssessmentSessionSchema } from './schemas/assessment-session.schema';
export type { AssessmentSessionDocument, AssessmentStatus, AssessmentType } from './schemas/assessment-session.schema';
export { AssessmentQuestion, AssessmentQuestionSchema } from './schemas/assessment-question.schema';
export type { AssessmentQuestionDocument, QuestionType, AssessmentDimension } from './schemas/assessment-question.schema';
export { AssessmentAnswer, AssessmentAnswerSchema } from './schemas/assessment-answer.schema';
export type { AssessmentAnswerDocument } from './schemas/assessment-answer.schema';
export { CareerFitResult, CareerFitResultSchema } from './schemas/career-fit-result.schema';
export type { CareerFitResultDocument } from './schemas/career-fit-result.schema';

// Services
export * from './services';

// Controllers
export * from './controllers';

// DTOs
export * from './dto';

// Module
export { AssessmentModule } from './assessment.module';