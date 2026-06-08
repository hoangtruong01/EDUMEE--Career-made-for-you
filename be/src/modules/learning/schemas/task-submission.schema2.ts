import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TaskProgressStatus } from '../../../common/enums/learning.enum';

export type TaskSubmissionDocument = HydratedDocument<TaskSubmission>;

export interface IQuizAnswerRecord {
  questionIndex: number;
  selectedValue: number;
}

export interface ISubmissionContent {
  textContent?: string;
  quizAnswers?: IQuizAnswerRecord[];
}

export interface IEvaluationResult {
  overallScore: number;
  passed: boolean;
  strengths: string[];
  areasForImprovement: string[];
}

@Schema({ timestamps: true, collection: 'task_submissions' })
export class TaskSubmission {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'SimulationTask' })
  taskId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LearningRoadmap' })
  roadmapId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TaskProgressStatus),
    default: TaskProgressStatus.IN_PROGRESS,
  })
  status!: TaskProgressStatus;

  @Prop({ type: Number, default: 1 })
  attemptNumber!: number;

  @Prop({ type: Object })
  submissionContent?: ISubmissionContent;

  @Prop({ type: Object })
  evaluationResult?: IEvaluationResult;

  @Prop({ type: Date })
  submittedAt?: Date;
}

export const TaskSubmissionSchema = SchemaFactory.createForClass(TaskSubmission);
