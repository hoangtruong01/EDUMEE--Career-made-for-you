import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssessmentQuestionDocument = AssessmentQuestion & Document;

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  LIKERT_SCALE = 'likert_scale', // 1-5, 1-7 scale
  RANKING = 'ranking',
  TEXT_INPUT = 'text_input',
  SCENARIO_BASED = 'scenario_based',
  IMAGE_SELECT = 'image_select',
}

export enum AssessmentDimension {
  // Personality dimensions
  OPENNESS = 'openness',
  CONSCIENTIOUSNESS = 'conscientiousness', 
  EXTRAVERSION = 'extraversion',
  AGREEABLENESS = 'agreeableness',
  NEUROTICISM = 'neuroticism',
  
  // Interest dimensions (Holland codes)
  REALISTIC = 'realistic',
  INVESTIGATIVE = 'investigative',
  ARTISTIC = 'artistic',
  SOCIAL = 'social',
  ENTERPRISING = 'enterprising',
  CONVENTIONAL = 'conventional',

  // Skill dimensions
  TECHNICAL_SKILLS = 'technical_skills',
  SOFT_SKILLS = 'soft_skills',
  LEADERSHIP = 'leadership',
  CREATIVITY = 'creativity',

  // Aptitude dimensions
  NUMERICAL = 'numerical',
  VERBAL = 'verbal',
  LOGICAL = 'logical',
  SPATIAL = 'spatial',
}

@Schema({
  timestamps: true,
  collection: 'assessment_questions',
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
export class AssessmentQuestion {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AssessmentSession' })
  sessionId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  questionText!: string;

  @Prop({ trim: true })
  questionCode?: string; // e.g., "BIG5_O_01"

  @Prop({ type: String, enum: QuestionType, required: true })
  questionType!: QuestionType;

  // Alias for filtering compatibility
  get type(): QuestionType {
    return this.questionType;
  }

  @Prop({ type: String, enum: AssessmentDimension, required: true })
  dimension!: AssessmentDimension;

  // Alias for filtering compatibility
  get category(): AssessmentDimension {
    return this.dimension;
  }

  @Prop({ type: Number, default: 1 })
  weight?: number; // Weight for scoring

  @Prop({ required: true })
  options!: {
    value: string | number;
    label: string;
    score?: number; // Score for this option
  }[];

  // For scenario-based questions
  @Prop({ trim: true })
  scenarioContext?: string;

  @Prop({ trim: true })
  imageUrl?: string;

  // Validation rules
  @Prop({ type: Object })
  validation?: {
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    timeLimit?: number; // seconds
  };

  @Prop({ type: Number, default: 0 })
  orderIndex?: number; // Question order in assessment

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ type: [String] })
  tags?: string[]; // For categorization

  // Localization support
  @Prop({ type: Object })
  translations?: Record<string, {
    questionText: string;
    options: { value: string | number; label: string }[];
    scenarioContext?: string;
  }>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AssessmentQuestionSchema = SchemaFactory.createForClass(AssessmentQuestion);

// Indexes
AssessmentQuestionSchema.index({ dimension: 1, isActive: 1 });
AssessmentQuestionSchema.index({ questionType: 1 });
AssessmentQuestionSchema.index({ orderIndex: 1 });
AssessmentQuestionSchema.index({ questionCode: 1 }, { unique: true, sparse: true });