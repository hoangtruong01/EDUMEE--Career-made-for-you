import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CheckpointDocument = Checkpoint & Document;

export enum CheckpointType {
  WEEKLY = 'weekly',
  MILESTONE = 'milestone',
  PHASE_COMPLETION = 'phase_completion',
  SKILL_ASSESSMENT = 'skill_assessment',
  ROADMAP_REVIEW = 'roadmap_review',
  MENTOR_REVIEW = 'mentor_review',
}

export enum CheckpointStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  MISSED = 'missed',
  RESCHEDULED = 'rescheduled',
}

@Schema({
  timestamps: true,
  collection: 'checkpoints',
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
export class Checkpoint {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LearningRoadmap' })
  roadmapId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WeeklyPlan' })
  weeklyPlanId?: Types.ObjectId;

  @Prop({ type: String, enum: CheckpointType, required: true })
  checkpointType!: CheckpointType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  scheduledDate!: Date;

  @Prop({ type: Date })
  completedDate?: Date;

  @Prop({ type: String, enum: CheckpointStatus, default: CheckpointStatus.SCHEDULED })
  status!: CheckpointStatus;

  // What to assess/review at this checkpoint
  @Prop({ required: true })
  assessmentAreas!: {
    area: 'progress' | 'skills' | 'goals' | 'timeline' | 'satisfaction' | 'challenges';
    weight: number; // Importance of this area (1-5)
    questions: string[]; // Specific questions to address
  }[];

  // Progress evaluation
  @Prop({ type: Object })
  progressEvaluation?: {
    // Quantitative metrics
    overallProgress: number; // 0-100 percentage
    tasksCompleted: number;
    totalTasks: number;
    hoursSpent: number;
    
    // Goals achievement
    goalsAchieved: {
      goal: string;
      achieved: boolean;
      partiallyAchieved?: boolean;
      explanation?: string;
    }[];
    
    // Timeline adherence
    onSchedule: boolean;
    daysAheadBehind?: number; // negative = behind, positive = ahead
    
    // Skills assessment
    skillsAssessment: {
      skillName: string;
      previousLevel: number;
      currentLevel: number;
      improvement: number;
      evidence: string[];
      nextLevelRequirements: string[];
    }[];
  };

  // Challenges and obstacles identified
  @Prop({ type: [Object] })
  challengesIdentified?: {
    challenge: string;
    impact: 'low' | 'medium' | 'high';
    category: 'time_management' | 'skill_difficulty' | 'motivation' | 'resources' | 'external' | 'other';
    description: string;
    
    proposedSolutions: {
      solution: string;
      feasibility: number; // 1-5 scale
      estimatedTimeline: string;
      resourcesRequired: string[];
    }[];
  }[];

  // Roadmap adjustments recommended
  @Prop({ type: Object })
  roadmapAdjustments?: {
    adjustmentsRecommended: boolean;
    
    recommendations: {
      type: 'pace_adjustment' | 'task_modification' | 'skill_focus_change' | 'timeline_adjustment' | 'resource_addition';
      description: string;
      reasoning: string;
      priority: 'low' | 'medium' | 'high';
      implementationTimeline: string;
    }[];
    
    // Specific changes to make
    proposedChanges: {
      phaseId?: string;
      milestoneId?: string;
      changeType: 'add' | 'remove' | 'modify' | 'reorder';
      oldValue?: any;
      newValue?: any;
      rationale: string;
    }[];
  };

  // User reflection and feedback
  @Prop({ type: Object })
  userReflection?: {
    // Self-assessment
    selfRating: {
      progress: number; // 1-5 scale
      effort: number;
      satisfaction: number;
      confidence: number;
    };
    
    // Reflective questions
    achievements: string; // What are you most proud of?
    learnings: string; // What did you learn about yourself?
    challenges: string; // What was most challenging?
    surprises?: string; // What surprised you?
    
    // Forward-looking
    nextPeriodGoals: string[];
    areasForImprovement: string[];
    supportNeeded?: string[];
    
    // Motivation and engagement
    motivationLevel: number; // 1-5 scale
    engagementLevel: number;
    burnoutRisk?: number; // 1-5 scale
    
    completedAt: Date;
  };

  // AI analysis of checkpoint data
  @Prop({ type: Object })
  aiAnalysis?: {
    analysisVersion: string;
    
    // Performance trends
    performanceTrends: {
      metric: string;
      trend: 'improving' | 'stable' | 'declining';
      confidence: number;
      explanation: string;
    }[];
    
    // Risk assessment
    riskFactors: {
      risk: string;
      likelihood: number; // 0-1
      impact: number; // 0-1  
      mitigation: string[];
    }[];
    
    // Personalized recommendations
    recommendations: {
      category: 'pacing' | 'focus' | 'resources' | 'support' | 'motivation';
      recommendation: string;
      confidence: number;
      expectedImpact: string;
    }[];
    
    analysisDate: Date;
  };

  // Mentor input (if available)
  @Prop({ type: Object })
  mentorInput?: {
    mentorId: Types.ObjectId;
    
    mentorAssessment: {
      progressRating: number; // 1-5
      effortRating: number;
      potentialRating: number;
      readinessForNextLevel?: number;
    };
    
    mentorObservations: string[];
    mentorRecommendations: string[];
    areasOfConcern?: string[];
    
    nextSessionPlan?: {
      focus: string[];
      activities: string[];
      goals: string[];
    };
    
    inputDate: Date;
  };

  // Action items generated from checkpoint
  @Prop({ type: [Object] })
  actionItems?: {
    actionId: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: Date;
    assignedTo: 'user' | 'mentor' | 'system';
    category: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    completedDate?: Date;
  }[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const CheckpointSchema = SchemaFactory.createForClass(Checkpoint);

// Indexes
CheckpointSchema.index({ userId: 1, roadmapId: 1 });
CheckpointSchema.index({ checkpointType: 1, status: 1 });
CheckpointSchema.index({ scheduledDate: 1 });
CheckpointSchema.index({ completedDate: -1 });