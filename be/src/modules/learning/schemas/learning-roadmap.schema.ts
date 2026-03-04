import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

export type LearningRoadmapDocument = LearningRoadmap & Document;

export enum RoadmapStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum LearningPhase {
  FOUNDATION = 'foundation',
  SKILL_BUILDING = 'skill_building',
  PRACTICE = 'practice',
  ADVANCED = 'advanced',
  SPECIALIZATION = 'specialization',
}

@Schema({
  timestamps: true,
  collection: 'learning_roadmaps',
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
export class LearningRoadmap {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Career' })
  targetCareer!: Types.ObjectId;

  @Prop({ type: String, enum: ExperienceLevel, required: true })
  targetLevel!: ExperienceLevel;

  @Prop({ required: true, trim: true })
  title!: string; // e.g., "Software Engineer Roadmap - Intern to Junior"

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: RoadmapStatus, default: RoadmapStatus.DRAFT })
  status!: RoadmapStatus;

  // Roadmap structure with phases and milestones
  @Prop({ required: true })
  phases!: {
    phaseId: string;
    phase: LearningPhase;
    title: string;
    description: string;
    estimatedDuration: string; // e.g., "4-6 weeks"
    
    objectives: string[]; // What learner should achieve
    
    milestones: {
      milestoneId: string;
      title: string;
      description: string;
      
      tasks: {
        taskId: Types.ObjectId; // Reference to SimulationTask
        taskTitle: string; // Cached for performance
        isRequired: boolean;
        estimatedHours: number;
        order: number;
      }[];
      
      skills: {
        skillName: string;
        targetLevel: number; // 1-5 scale
        currentLevel?: number; // Updated as user progresses
      }[];
      
      completionCriteria: {
        minimumScore?: number;
        requiredTasks: string[]; // Task IDs that must be completed
        optionalTasks?: string[]; // Nice-to-have tasks
      };
    }[];
    
    order: number;
    prerequisites?: string[]; // Previous phase IDs
  }[];

  // Personalization based on assessment
  @Prop({ type: Object })
  personalization?: {
    basedOnAssessment: Types.ObjectId; // Reference to CareerFitResult
    
    skillGaps: {
      skillName: string;
      currentLevel: number;
      targetLevel: number;
      priority: 'high' | 'medium' | 'low';
    }[];
    
    learningStyle: string;
    timeAvailability: number; // hours per week
    preferredPace: 'slow' | 'normal' | 'fast';
    
    adaptations: string[]; // How roadmap was adapted for this user
  };

  // Progress tracking
  @Prop({ type: Object })
  progress?: {
    currentPhase: string;
    currentMilestone: string;
    
    overallProgress: number; // 0-100 percentage
    phaseProgress: {
      phaseId: string;
      progress: number; // 0-100
      completedTasks: number;
      totalTasks: number;
      startedAt?: Date;
      completedAt?: Date;
    }[];
    
    skillProgress: {
      skillName: string;
      startingLevel: number;
      currentLevel: number;
      targetLevel: number;
      lastUpdated: Date;
    }[];
    
    // Time tracking
    timeSpent: {
      totalHours: number;
      weeklyHours?: number;
      lastActiveDate: Date;
    };
  };

  // Adaptive learning - roadmap adjustments
  @Prop({ type: [Object] })
  adaptations?: {
    adaptationDate: Date;
    reason: string; // Why adaptation was made
    changes: {
      type: 'added_task' | 'removed_task' | 'modified_task' | 'reordered_phases' | 'adjusted_timeline';
      description: string;
      oldValue?: any;
      newValue?: any;
    }[];
    triggeredBy: 'user_request' | 'ai_recommendation' | 'mentor_suggestion' | 'performance_analysis';
  }[];

  // Weekly planning integration
  @Prop({ type: [Types.ObjectId] })
  weeklyPlans?: Types.ObjectId[]; // References to WeeklyPlan

  // Mentoring integration
  @Prop({ type: Object })
  mentoringInfo?: {
    mentorAssigned?: Types.ObjectId;
    mentoringSessions?: Types.ObjectId[];
    lastMentorReview?: Date;
    mentorRecommendations?: string[];
  };

  // Templates and sharing
  @Prop({ default: false })
  isTemplate?: boolean; // Can this be used as template for others

  @Prop({ default: false })
  isPublic?: boolean; // Can others see this roadmap

  @Prop({ type: [String] })
  tags?: string[];

  // Success metrics
  @Prop({ type: Object })
  successMetrics?: {
    targetCompletionDate: Date;
    actualCompletionDate?: Date;
    targetJobReadiness: number; // 0-100 scale
    currentJobReadiness?: number;
    
    milestoneDeadlines: {
      milestoneId: string;
      targetDate: Date;
      actualDate?: Date;
    }[];
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const LearningRoadmapSchema = SchemaFactory.createForClass(LearningRoadmap);

// Indexes
LearningRoadmapSchema.index({ userId: 1, status: 1 });
LearningRoadmapSchema.index({ targetCareer: 1, targetLevel: 1 });
LearningRoadmapSchema.index({ 'progress.overallProgress': -1 });
LearningRoadmapSchema.index({ isTemplate: 1, isPublic: 1 });
LearningRoadmapSchema.index({ createdAt: -1 });