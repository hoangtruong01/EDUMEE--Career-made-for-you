import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

export type SimulationTaskDocument = SimulationTask & Document;

export enum TaskType {
  CODING_CHALLENGE = 'coding_challenge',
  CASE_STUDY = 'case_study',
  DESIGN_TASK = 'design_task',
  PRESENTATION = 'presentation',
  ANALYSIS_TASK = 'analysis_task',
  COLLABORATION = 'collaboration',
  PROBLEM_SOLVING = 'problem_solving',
  PROJECT_SIMULATION = 'project_simulation',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Schema({
  timestamps: true,
  collection: 'simulation_tasks',
  toJSON: {
    virtuals: true,
    transform: (doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class SimulationTask {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: String, enum: TaskType, required: true })
  taskType!: TaskType;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Career' })
  careerId!: Types.ObjectId;

  @Prop({ type: String, enum: ExperienceLevel, required: true })
  targetLevel!: ExperienceLevel;

  @Prop({ type: String, enum: DifficultyLevel, required: true })
  difficulty!: DifficultyLevel;

  // Task content and materials
  @Prop({ type: Object, required: true })
  taskContent!: {
    instructions: string[];
    materials?: {
      type: 'document' | 'video' | 'dataset' | 'code_template' | 'image';
      title: string;
      url?: string;
      content?: string;
      description?: string;
    }[];
    
    scenario?: string; // Background scenario for the task
    constraints?: string[]; // Time limits, resource limits, etc.
    hints?: string[]; // Optional hints for learners
  };

  // Skills this task evaluates/develops
  @Prop({ required: true })
  skillsEvaluated!: {
    skillName: string;
    skillCategory: 'technical' | 'soft' | 'leadership';
    weight: number; // Importance in this task (1-5)
  }[];

  // Evaluation rubric
  @Prop({ required: true })
  evaluationRubric!: {
    criteria: string;
    description: string;
    levels: {
      score: number; // 1-5
      label: string; // e.g., "Excellent", "Good", "Needs Improvement"
      description: string;
      indicators: string[]; // What to look for at this level
    }[];
    weight: number; // Weight in overall score
  }[];

  // Estimated time and effort
  @Prop({ type: Object })
  timeEstimation?: {
    minHours: number;
    maxHours: number;
    averageHours: number;
    breakdown?: {
      phase: string;
      estimatedHours: number;
    }[];
  };

  // Prerequisites and recommendations
  @Prop({ type: [String] })
  prerequisites?: string[]; // Skills/knowledge needed before attempting

  @Prop({ type: [Types.ObjectId] })
  recommendedBeforeTasks?: Types.ObjectId[]; // Other tasks to complete first

  @Prop({ type: [Types.ObjectId] })
  followUpTasks?: Types.ObjectId[]; // Suggested next tasks

  // Real-world context
  @Prop({ type: Object })
  realWorldContext?: {
    industryExamples: string[];
    companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | 'any';
    toolsUsed: string[];
    commonChallenges: string[];
  };

  // Submission guidelines
  @Prop({ type: Object })
  submissionGuidelines?: {
    expectedDeliverables: string[];
    fileTypes?: string[];
    maxFileSize?: number;
    additionalInstructions?: string;
    examples?: {
      title: string;
      description: string;
      url?: string;
    }[];
  };

  // AI evaluation settings
  @Prop({ type: Object })
  aiEvaluationConfig?: {
    enabled: boolean;
    evaluationModel: string;
    evaluationCriteria: string[];
    humanReviewRequired: boolean;
    autoFeedbackEnabled: boolean;
  };

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ type: [String] })
  tags?: string[];

  // Usage statistics
  @Prop({ type: Object })
  stats?: {
    totalAttempts?: number;
    averageScore?: number;
    completionRate?: number;
    averageTimeSpent?: number;
    lastUpdated?: Date;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const SimulationTaskSchema = SchemaFactory.createForClass(SimulationTask);

// Indexes
SimulationTaskSchema.index({ careerId: 1, targetLevel: 1 });
SimulationTaskSchema.index({ taskType: 1, difficulty: 1 });
SimulationTaskSchema.index({ 'skillsEvaluated.skillName': 1 });
SimulationTaskSchema.index({ isActive: 1 });
SimulationTaskSchema.index({ tags: 1 });