import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskSubmissionDocument = TaskSubmission & Document;

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  EVALUATED = 'evaluated',
  NEEDS_REVISION = 'needs_revision',
  APPROVED = 'approved',
}

export enum EvaluationType {
  AI_ONLY = 'ai_only',
  HUMAN_ONLY = 'human_only',
  AI_THEN_HUMAN = 'ai_then_human',
  PEER_REVIEW = 'peer_review',
}

@Schema({
  timestamps: true,
  collection: 'task_submissions',
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
export class TaskSubmission {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'SimulationTask' })
  taskId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LearningRoadmap' })
  roadmapId?: Types.ObjectId; // If this is part of a roadmap

  @Prop({ type: String, enum: SubmissionStatus, default: SubmissionStatus.DRAFT })
  status!: SubmissionStatus;

  // Submission content
  @Prop({ required: true })
  submission!: {
    files?: {
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
      uploadedAt: Date;
    }[];
    
    textContent?: string; // For text-based submissions
    
    links?: {
      title: string;
      url: string;
      description?: string;
    }[];
    
    metadata?: Record<string, any>; // Flexible field for task-specific data
  };

  // Time tracking
  @Prop({ type: Object })
  timeTracking?: {
    startedAt: Date;
    submittedAt?: Date;
    totalTimeSpent?: number; // seconds
    sessionBreakdown?: {
      sessionStart: Date;
      sessionEnd: Date;
      timeSpent: number;
    }[];
  };

  // Evaluation results
  @Prop({ type: Object })
  evaluation?: {
    evaluationType: EvaluationType;
    
    // Overall scores
    overallScore: number; // 0-100
    passed: boolean;
    
    // Detailed scores per rubric criteria
    criteriaScores: {
      criteriaName: string;
      score: number; // 1-5 typically
      feedback?: string;
      aiConfidence?: number;
    }[];
    
    // Skills assessment
    skillsAssessment?: {
      skillName: string;
      currentLevel: number; // 1-5
      improvement: number; // Change from previous assessment
      evidence: string[];
    }[];
    
    // Feedback
    strengths: string[];
    areasForImprovement: string[];
    specificFeedback: string;
    
    // AI evaluation details
    aiEvaluation?: {
      modelUsed: string;
      confidence: number;
      evaluationTime: Date;
      rawOutput?: any;
    };
    
    // Human evaluation details
    humanEvaluation?: {
      evaluatorId: Types.ObjectId;
      evaluatorType: 'mentor' | 'peer' | 'admin';
      evaluationTime: Date;
      notes?: string;
    }[];
  };

  // Recommendations for improvement
  @Prop({ type: Object })
  recommendations?: {
    nextSteps: string[];
    resourcesSuggested: {
      type: 'article' | 'video' | 'course' | 'practice' | 'mentoring';
      title: string;
      url?: string;
      description: string;
      estimatedTime?: string;
    }[];
    
    retakeRecommended?: boolean;
    alternativeTasks?: Types.ObjectId[];
  };

  // Attempt tracking
  @Prop({ type: Number, default: 1 })
  attemptNumber?: number;

  @Prop({ type: Types.ObjectId })
  previousAttemptId?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId] })
  subsequentAttempts?: Types.ObjectId[];

  // User's self-assessment
  @Prop({ type: Object })
  selfAssessment?: {
    difficultyRating: number; // 1-5, how hard was it
    confidenceLevel: number; // 1-5, how confident in solution
    enjoymentLevel: number; // 1-5, how much did they enjoy it
    learningValue: number; // 1-5, how much did they learn
    realismRating: number; // 1-5, how realistic was the task
    comments?: string;
  };

  // Collaboration info (for team tasks)
  @Prop({ type: Object })
  collaboration?: {
    teammates?: Types.ObjectId[];
    role: string;
    contribution: string;
    teamDynamics: string;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const TaskSubmissionSchema = SchemaFactory.createForClass(TaskSubmission);

// Indexes
TaskSubmissionSchema.index({ userId: 1, taskId: 1 });
TaskSubmissionSchema.index({ status: 1 });
TaskSubmissionSchema.index({ roadmapId: 1 });
TaskSubmissionSchema.index({ 'timeTracking.submittedAt': -1 });
TaskSubmissionSchema.index({ 'evaluation.overallScore': -1 });