import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CareerDocument = Career & Document;

export enum CareerCategory {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare', 
  FINANCE = 'finance',
  EDUCATION = 'education',
  CREATIVE = 'creative',
  BUSINESS = 'business',
  ENGINEERING = 'engineering',
  SCIENCE = 'science',
  LEGAL = 'legal',
  SALES_MARKETING = 'sales_marketing',
  SOCIAL_SERVICES = 'social_services',
  OTHER = 'other',
}

export enum ExperienceLevel {
  INTERN = 'intern',
  ENTRY_LEVEL = 'entry_level',
  JUNIOR = 'junior',
  MID_LEVEL = 'mid_level',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EXECUTIVE = 'executive',
}

@Schema({
  timestamps: true,
  collection: 'careers',
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
export class Career {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true, unique: true })
  title!: string; // e.g., "Software Engineer", "Data Scientist"

  @Prop({ trim: true })
  slug?: string; // URL-friendly version

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: String, enum: CareerCategory, required: true })
  category!: CareerCategory;

  @Prop({ type: [String] })
  alternativeNames?: string[]; // Other names for this career

  @Prop({ type: [String] })
  industries?: string[]; // Industries where this career exists

  // Alias for backward compatibility
  get industry(): string | undefined {
    return this.industries?.[0];
  }

  // Alias for backward compatibility  
  get requiredSkills(): string[] {
    return this.skillRequirements?.technical?.map(skill => skill.skillName) || [];
  }

  // Skills required for this career
  @Prop({ type: Object, required: true })
  skillRequirements!: {
    technical: {
      skillName: string;
      importance: number; // 1-5 scale
      minimumLevel: number; // 1-5 scale
    }[];
    soft: {
      skillName: string;
      importance: number;
      minimumLevel: number;
    }[];
  };

  // Personality traits that fit this career
  @Prop({ type: Object })
  personalityFit?: {
    idealTraits: string[];
    challengingTraits: string[];
    hollandCodes: string[]; // RIASEC codes
    workEnvironment: string[];
  };

  // Career progression levels
  @Prop({ required: true })
  careerLevels!: {
    level: ExperienceLevel;
    title: string;
    description: string;
    
    // Requirements for this level
    experience: {
      years: { min: number; max?: number };
      description: string;
    };
    
    skills: {
      technical: string[];
      soft: string[];
      leadership?: string[];
    };
    
    responsibilities: string[];
    
    // Compensation info
    salary: {
      currency: string;
      min: number;
      max: number;
      location: string; // e.g., "Vietnam", "Ho Chi Minh City"
    }[];
    
    // Typical tasks/projects
    typicalTasks: string[];
    
    // Career progression
    nextLevels?: ExperienceLevel[];
    timeToNextLevel?: string; // e.g., "2-3 years"
  }[];

  // Market information
  @Prop({ type: Object })
  marketInfo?: {
    demandLevel: 'low' | 'medium' | 'high' | 'very_high';
    growthProjection: string; // e.g., "15% growth by 2030"
    jobAvailability: number; // 1-5 scale
    competitionLevel: 'low' | 'medium' | 'high';
    automationRisk: 'low' | 'medium' | 'high';
  };

  // Educational pathways
  @Prop({ type: [Object] })
  educationPathways?: {
    pathwayType: 'formal' | 'bootcamp' | 'self_taught' | 'apprenticeship';
    title: string;
    description: string;
    duration: string;
    cost: { min: number; max: number; currency: string };
    institutions?: string[];
    prerequisite?: string;
    successRate?: number; // % of people who get jobs
  }[];

  // Work environment details  
  @Prop({ type: Object })
  workEnvironment?: {
    workSettings: string[]; // office, remote, hybrid, field
    workSchedule: string[]; // flexible, 9-5, shift work
    travelRequirement: 'none' | 'minimal' | 'moderate' | 'frequent';
    physicalDemands: 'low' | 'medium' | 'high';
    stressLevel: 'low' | 'medium' | 'high';
  };

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ type: [String] })
  tags?: string[]; // For search and categorization

  // SEO and content
  @Prop({ trim: true })
  metaDescription?: string;

  @Prop({ type: [String] })
  relatedCareers?: Types.ObjectId[]; // References to other careers

  createdAt!: Date;
  updatedAt!: Date;
}

export const CareerSchema = SchemaFactory.createForClass(Career);

// Indexes
CareerSchema.index({ title: 'text', description: 'text' });
CareerSchema.index({ category: 1, isActive: 1 });
CareerSchema.index({ slug: 1 }, { unique: true, sparse: true });
CareerSchema.index({ 'marketInfo.demandLevel': 1 });
CareerSchema.index({ tags: 1 });