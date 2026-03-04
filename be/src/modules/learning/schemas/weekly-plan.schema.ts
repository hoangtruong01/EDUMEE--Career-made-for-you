import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WeeklyPlanDocument = WeeklyPlan & Document;

export enum PlanStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partially_completed',
  MISSED = 'missed',
  RESCHEDULED = 'rescheduled',
}

@Schema({
  timestamps: true,
  collection: 'weekly_plans',
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
export class WeeklyPlan {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LearningRoadmap' })
  roadmapId!: Types.ObjectId;

  @Prop({ required: true, type: Number })
  weekNumber!: number; // Week number in the roadmap (1, 2, 3...)

  @Prop({ required: true })
  weekPeriod!: {
    startDate: Date;
    endDate: Date;
  };

  @Prop({ type: String, enum: PlanStatus, default: PlanStatus.PLANNED })
  status!: PlanStatus;

  // Weekly objectives and goals
  @Prop({ required: true })
  weeklyGoals!: {
    primary: string[]; // Must-accomplish goals
    secondary?: string[]; // Nice-to-have goals
    skillFocus: string[]; // Skills to focus on this week
  };

  // Planned tasks and activities
  @Prop({ required: true })
  plannedActivities!: {
    activityId: string;
    type: 'simulation_task' | 'study_material' | 'practice' | 'mentoring' | 'checkpoint';
    
    // Task details
    taskId?: Types.ObjectId; // If simulation task
    title: string;
    description: string;
    
    // Scheduling
    estimatedHours: number;
    priority: 'high' | 'medium' | 'low';
    deadline?: Date;
    
    // Assignment to specific days
    scheduledDays?: {
      day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      timeSlot?: string; // e.g., "9:00-11:00"
      duration: number; // hours
    }[];
    
    // Prerequisites and dependencies
    dependsOn?: string[]; // Other activity IDs
    
    // Resources needed
    resources?: {
      type: 'material' | 'tool' | 'environment';
      name: string;
      url?: string;
    }[];
    
    // Completion tracking
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'deferred';
    actualHours?: number;
    completedAt?: Date;
    notes?: string;
  }[];

  // Adaptive elements - changes during the week
  @Prop({ type: [Object] })
  adaptations?: {
    adaptationDate: Date;
    reason: string;
    changes: {
      activityId: string;
      changeType: 'added' | 'removed' | 'modified' | 'rescheduled';
      oldValue?: any;
      newValue?: any;
    }[];
    triggeredBy: 'user' | 'ai_system' | 'mentor' | 'checkpoint_analysis';
  }[];

  // Weekly checkpoint
  @Prop({ type: Types.ObjectId, ref: 'Checkpoint' })
  weeklyCheckpoint?: Types.ObjectId;

  // Progress summary
  @Prop({ type: Object })
  weeklyProgress?: {
    overallCompletion: number; // 0-100 percentage
    completedActivities: number;
    totalActivities: number;
    
    timeSpent: {
      planned: number;
      actual: number;
      breakdown: {
        day: string;
        hours: number;
      }[];
    };
    
    skillProgress: {
      skillName: string;
      practiceHours: number;
      improvement?: number; // Change in skill level
    }[];
    
    achievements: string[]; // What was accomplished
    challenges: string[]; // What was difficult
  };

  // Next week preparation
  @Prop({ type: Object })
  nextWeekPreparation?: {
    carryOverTasks: string[]; // Activities to move to next week
    newFocusAreas: string[];
    adjustmentRecommendations: string[];
    mentorInputNeeded?: boolean;
  };

  // User feedback on the week
  @Prop({ type: Object })
  userFeedback?: {
    difficultyRating: number; // 1-5 scale
    satisfactionRating: number; // 1-5 scale
    workloadRating: number; // 1-5 scale (too light, just right, too heavy)
    
    mostValuable: string; // What was most valuable this week
    leastValuable?: string; // What was least valuable
    suggestions: string[]; // Suggestions for improvement
    
    timeManagement: {
      plannedHoursRealistic: boolean;
      actualTimeSpent: number;
      timeManagementChallenges: string[];
    };
    
    feedbackDate: Date;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const WeeklyPlanSchema = SchemaFactory.createForClass(WeeklyPlan);

// Indexes
WeeklyPlanSchema.index({ userId: 1, roadmapId: 1 });
WeeklyPlanSchema.index({ weekNumber: 1, 'weekPeriod.startDate': 1 });
WeeklyPlanSchema.index({ status: 1 });
WeeklyPlanSchema.index({ 'weekPeriod.endDate': -1 });