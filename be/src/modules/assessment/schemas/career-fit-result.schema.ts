import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CareerFitResultDocument = CareerFitResult & Document;

@Schema({
  timestamps: true,
  collection: 'career_fit_results',
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
export class CareerFitResult {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AssessmentSession' })
  sessionId!: Types.ObjectId; // Alias for assessmentSessionId

  @Prop({ required: true, type: Types.ObjectId, ref: 'AssessmentSession' })
  assessmentSessionId!: Types.ObjectId;

  // Individual career result properties (for backward compatibility)
  @Prop({ type: Types.ObjectId, ref: 'Career' })
  careerId?: Types.ObjectId;

  @Prop({ type: Number, min: 0, max: 100 })
  overallFitScore?: number;

  @Prop({ type: [String] })
  strengths?: string[];

  @Prop({ type: [String] })
  developmentAreas?: string[];

  @Prop({ type: Object })
  dimensionScores?: Record<string, number>;

  // Career recommendations with fit scores
  @Prop({ required: true })
  careerRecommendations!: {
    careerId: Types.ObjectId; // Reference to Career
    fitScore: number; // 0-100 match percentage
    confidenceScore: number; // AI confidence in this recommendation
    
    // Detailed breakdown
    personalityMatch: number;
    interestMatch: number;
    skillMatch: number;
    aptitudeMatch: number;
    
    // Matching factors
    strongPoints: string[]; // What makes this career suitable
    challenges: string[]; // Potential challenges/gaps
    
    // Skill gaps analysis
    skillGaps?: {
      technical: string[];
      soft: string[];
      priority: 'high' | 'medium' | 'low';
      estimatedTimeToClose: string; // e.g., "6-12 months"
    };
  }[];

  // Overall assessment summary
  @Prop({ required: true, type: Object })
  personalityProfile!: {
    primaryTraits: string[];
    secondaryTraits: string[];
    workStyle: string;
    idealEnvironment: string;
    motivators: string[];
  };

  @Prop({ required: true, type: Object })
  interestProfile!: {
    hollandCodes: { code: string; score: number }[]; // RIASEC
    topInterests: string[];
    workValues: string[];
  };

  @Prop({ required: true, type: Object })
  skillProfile!: {
    currentStrengths: { skill: string; level: number }[];
    developmentAreas: { skill: string; importance: number }[];
    learningStyle: string;
  };

  @Prop({ type: Object })
  constraints?: {
    budgetLevel: string;
    timeAvailability: string;
    locationPreferences: string[];
    industryPreferences: string[];
    workSchedulePreference: string;
  };

  // AI explanation of the results
  @Prop({ type: Object })
  explanation?: {
    summary: string;
    methodology: string;
    keyFindings: string[];
    nextSteps: string[];
    disclaimer: string;
  };

  @Prop({ type: Number, min: 0, max: 100 })
  overallConfidence?: number; // Overall confidence in the assessment

  @Prop({ type: Date, default: Date.now })
  generatedAt!: Date;

  // Version of the AI model used
  @Prop({ trim: true })
  modelVersion?: string;

  // Feedback from user (if any)
  @Prop({ type: Object })
  userFeedback?: {
    rating?: number; // 1-5 stars
    helpful?: boolean;
    comments?: string;
    selectedCareers?: Types.ObjectId[]; // Careers user chose to pursue
    feedbackDate?: Date;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const CareerFitResultSchema = SchemaFactory.createForClass(CareerFitResult);

// Indexes
CareerFitResultSchema.index({ userId: 1 });
CareerFitResultSchema.index({ assessmentSessionId: 1 });
CareerFitResultSchema.index({ generatedAt: -1 });
CareerFitResultSchema.index({ 'careerRecommendations.careerId': 1 });