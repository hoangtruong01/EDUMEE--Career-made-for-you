import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TaskFormatType } from '../../../common/enums/learning.enum';

export type SimulationTaskDocument = HydratedDocument<SimulationTask>;

export interface IQuizOption {
  value: number;
  label: string;
}

export interface IQuizQuestion {
  questionText: string;
  options: IQuizOption[];
  correctValue: number;
}

export interface IEvaluationRubric {
  criteria: string;
  description: string;
  weight: number;
}

@Schema({ timestamps: true, collection: 'simulation_tasks' })
export class SimulationTask {
  _id!: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Career' })
  careerId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true, type: String })
  title!: string;

  @Prop({ trim: true, type: String })
  description?: string;

  @Prop({ type: String, enum: Object.values(TaskFormatType), default: TaskFormatType.READ })
  formatType!: TaskFormatType;

  @Prop({ type: String, default: 'PRACTICE' })
  taskType!: string;

  @Prop({ type: String, default: 'BEGINNER' })
  difficulty!: string;

  @Prop({ type: Number, default: 30 })
  estimatedMinutes!: number;

  @Prop({ type: Array, default: [] })
  quizQuestions?: IQuizQuestion[];

  @Prop({ type: Array, default: [] })
  evaluationRubric?: IEvaluationRubric[];
}

export const SimulationTaskSchema = SchemaFactory.createForClass(SimulationTask);
