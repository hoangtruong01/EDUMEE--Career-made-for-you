import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CareerComparisonDocument = CareerComparison & Document;

export enum ComparisonCriteriaType {
  SALARY = 'salary',
  JOB_GROWTH = 'job_growth',
  WORK_LIFE_BALANCE = 'work_life_balance',
  EDUCATION_REQUIREMENTS = 'education_requirements',
  SKILL_DIFFICULTY = 'skill_difficulty',
  MARKET_DEMAND = 'market_demand',
  AUTOMATION_RISK = 'automation_risk',
  CAREER_PROGRESSION = 'career_progression',
  WORK_ENVIRONMENT = 'work_environment',
  CREATIVITY_LEVEL = 'creativity_level',
  LEADERSHIP_OPPORTUNITIES = 'leadership_opportunities',
  TRAVEL_REQUIREMENTS = 'travel_requirements',
  STRESS_LEVEL = 'stress_level',
  SOCIAL_IMPACT = 'social_impact',
  LEARNING_CURVE = 'learning_curve',
}

@Schema({
  timestamps: true,
  collection: 'career_comparisons',
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
export class CareerComparison {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  careersToCompare!: {
    careerId: Types.ObjectId;
    careerTitle: string; // Cached for performance
  }[];

  // User-selected criteria and their weights  
  @Prop({ required: true })
  comparisonCriteria!: {
    criteriaType: ComparisonCriteriaType;
    weight: number; // 1-5 scale, how important this is to the user
    userPreference?: 'higher_better' | 'lower_better' | 'specific_value';
  }[];

  // Comparison results
  @Prop({ required: true })
  comparisonResults!: {
    careerId: Types.ObjectId;
    
    // Score for each criteria (normalized 1-5)
    criteriaScores: {
      criteriaType: ComparisonCriteriaType;
      score: number;
      rawValue?: string | number;
      explanation?: string;
    }[];
    
    // Overall weighted score
    overallScore: number;
    
    // Pros and cons
    pros: string[];
    cons: string[];
    
    // Best fit scenarios
    bestFor: string[]; // e.g., "People who value work-life balance"
    notIdealFor: string[]; // e.g., "Those seeking high salary quickly"
  }[];

  // Final recommendation
  @Prop({ type: Object })
  recommendation?: {
    recommendedCareerId: Types.ObjectId;
    reason: string;
    confidence: number; // 0-100
    alternativeOptions?: {
      careerId: Types.ObjectId;
      reason: string;
    }[];
  };

  // User decision tracking
  @Prop({ type: Object })
  userDecision?: {
    selectedCareerId?: Types.ObjectId;
    decisionDate?: Date;
    decisionReason?: string;
    confidence?: number; // User's confidence in their choice
    keepMultipleOptions?: boolean;
    alternativeCareer?: Types.ObjectId;
  };

  // Comparison metadata
  @Prop({ type: Object })
  metadata?: {
    comparisonMethod: string; // "weighted_scoring", "pairwise", etc.
    dataVersion: string; // Version of career data used
    generatedBy: 'user' | 'ai_suggestion';
    sharedWithOthers?: boolean;
    tags?: string[];
  };

  @Prop({ default: false })
  isFavorite?: boolean;

  @Prop({ trim: true })
  notes?: string; // User's personal notes about the comparison

  createdAt!: Date;
  updatedAt!: Date;
}

export const CareerComparisonSchema = SchemaFactory.createForClass(CareerComparison);

// Indexes
CareerComparisonSchema.index({ userId: 1 });
CareerComparisonSchema.index({ 'careersToCompare.careerId': 1 });
CareerComparisonSchema.index({ createdAt: -1 });
CareerComparisonSchema.index({ 'userDecision.selectedCareerId': 1 });