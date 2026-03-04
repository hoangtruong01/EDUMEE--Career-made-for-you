import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CareerReviewDocument = CareerReview & Document;

export enum ReviewCategory {
  OVERALL_CAREER = 'overall_career',
  EDUCATION_PATH = 'education_path',
  WORK_ENVIRONMENT = 'work_environment',
  SALARY_BENEFITS = 'salary_benefits',
  CAREER_GROWTH = 'career_growth',
  SKILL_REQUIREMENTS = 'skill_requirements',
  INDUSTRY_INSIGHTS = 'industry_insights',
  COMPANY_SPECIFIC = 'company_specific',
}

export enum ReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_MODERATION = 'under_moderation',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
  FLAGGED = 'flagged',
}

export enum ReviewerBackground {
  STUDENT = 'student',
  RECENT_GRADUATE = 'recent_graduate',
  JUNIOR_PROFESSIONAL = 'junior_professional',
  MID_LEVEL = 'mid_level',
  SENIOR_PROFESSIONAL = 'senior_professional',
  CAREER_CHANGER = 'career_changer',
  EDUCATOR = 'educator',
}

@Schema({
  timestamps: true,
  collection: 'career_reviews',
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
export class CareerReview {
  _id!: Types.ObjectId;

  // Anonymous identifier (not direct user ID)
  @Prop({ required: true, trim: true })
  anonymousId!: string; // Generated hash for anonymity but allowing tracking

  @Prop({ required: true, type: Types.ObjectId, ref: 'Career' })
  careerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  careerTitle!: string; // Cached for performance

  @Prop({ type: String, enum: ReviewCategory, required: true })
  reviewCategory!: ReviewCategory;

  @Prop({ type: String, enum: ReviewStatus, default: ReviewStatus.SUBMITTED })
  status!: ReviewStatus;

  // Reviewer's background (anonymous but contextual)
  @Prop({ required: true, type: Object })
  reviewerContext!: {
    background: ReviewerBackground;
    yearsOfExperience?: number;
    currentRole?: string; // Anonymized/generalized
    industry?: string;
    location?: {
      city?: string;
      country: string;
    };
    educationLevel?: string;
    
    // Context for credibility without revealing identity
    verifiedExperience: boolean; // Admin verified this person has relevant experience
    reviewerTier: 'bronze' | 'silver' | 'gold' | 'platinum'; // Based on review quality/helpfulness
  };

  // Core review content
  @Prop({ required: true, type: Object })
  reviewContent!: {
    // Overall rating and recommendation
    overallRating: number; // 1-5 scale
    wouldRecommend: boolean;
    recommendationStrength: 'strongly' | 'somewhat' | 'neutral' | 'not_really' | 'strongly_not';
    
    // Detailed ratings by aspect
    aspectRatings: {
      workLifeBalance?: number; // 1-5 scale
      salaryCompetitiveness?: number;
      careerGrowthOpportunity?: number;
      skillDevelopment?: number;
      jobSecurity?: number;
      workEnvironment?: number;
      learningCurve?: number;
      stressLevel?: number; // 1=low stress, 5=high stress
      jobSatisfaction?: number;
      industryStability?: number;
    };
    
    // Written review sections
    prosAndCons: {
      pros: string[];
      cons: string[];
    };
    
    mainReviewText: string; // Main detailed review
    
    // Specific insights
    expectedVsReality?: string; // What was different from expectations
    biggestChallenges?: string[];
    biggestRewards?: string[];
    
    // Advice for newcomers
    adviceForBeginners?: string;
    skillsToFocusPre?: string[]; // Skills to develop before entering
    commonMisconceptions?: string[];
  };

  // Career journey details (if shared)
  @Prop({ type: Object })
  careerJourney?: {
    // Entry path
    howTheyGotIn: string;
    entryLevelPosition?: string;
    timeToGetFirstJob?: string;
    
    // Career progression
    careerProgression?: {
      position: string;
      timeInPosition: string;
      keyAchievements?: string[];
      transitionChallenges?: string[];
    }[];
    
    // Skills evolution
    skillsLearned: string[];
    mostValuableSkills: string[];
    skillsStillDeveloping?: string[];
    
    // Industry evolution witnessed
    industryChanges?: string[];
    futureOutlook?: string;
  };

  // Practical insights
  @Prop({ type: Object })
  practicalInsights?: {
    // Daily work reality
    typicalWorkDay?: string; 
    workSchedule?: string;
    travelRequirements?: string;
    
    // Financial insights
    salaryProgression?: {
      entryLevel?: { min: number; max: number; currency: string };
      midLevel?: { min: number; max: number; currency: string };
      seniorLevel?: { min: number; max: number; currency: string };
      location: string;
    };
    
    additionalBenefits?: string[];
    hiddenCosts?: string[]; // Costs not obvious to outsiders
    
    // Industry/company insights
    bestCompanyTypes?: string[]; // startup, corporate, etc.
    companiesAvoided?: string[]; // Types to avoid (anonymized)
    industryTrends?: string[];
    
    // Geographic considerations
    bestLocations?: string[];
    remoteWorkViability?: string;
    locationImpactOnSalary?: string;
  };

  // Education and preparation path
  @Prop({ type: Object })
  educationPath?: {
    // Formal education
    formalEducationRequired?: boolean;
    degreeTypes?: string[];
    mostValuableCourses?: string[];
    
    // Alternative paths
    alternativeEducation?: {
      pathType: 'bootcamp' | 'self_taught' | 'online_courses' | 'apprenticeship' | 'certification';
      description: string;
      effectiveness: number; // 1-5 scale
      duration: string;
      cost?: string;
    }[];
    
    // Continuous learning
    ongoingEducationNeeds?: string[];
    recommendedResources?: {
      type: 'book' | 'course' | 'certification' | 'conference' | 'website';
      name: string;
      description?: string;
      usefulness: number; // 1-5 scale
    }[];
    
    // Skills gap reality
    skillsNotTaughtInSchool?: string[];
    learningChallenges?: string[];
  };

  // Community interaction features
  @Prop({ type: Object })
  communityEngagement?: {
    allowsFollowUpQuestions: boolean;
    willingToMentor?: boolean;
    
    // Anonymous engagement tracking
    viewCount: number;
    helpfulVotes: number;
    notHelpfulVotes: number;
    
    // Discussion thread (separate collection)
    hasCommentThread: boolean;
    commentCount: number;
    
    // Value indicators
    featuredReview: boolean; // High quality, featured by mods
    verifiedInsights: boolean; // Insights verified by other professionals
  };

  // Quality and authenticity measures
  @Prop({ type: Object })
  qualityMetrics?: {
    // Content quality
    reviewLength: number; // Character count
    detailLevel: 'basic' | 'moderate' | 'comprehensive' | 'expert';
    
    // Authenticity indicators  
    authenticityScore: number; // 0-1 generated by ML
    languagePatternFlags?: string[];
    duplicateContentCheck: boolean;
    
    // Helpfulness indicators
    helpfulnessRating: number; // Based on community votes
    credibilityScore: number; // Based on reviewer history
    
    // Moderation quality checks
    factCheckStatus?: 'pending' | 'verified' | 'disputed' | 'flagged';
    moderatorNotes?: string;
  };

  // Sensitive content handling
  @Prop({ type: Object })
  sensitiveContent?: {
    containsSensitiveInfo: boolean;
    sensitiveAreas?: ('salary' | 'company_criticism' | 'discrimination' | 'legal_issues' | 'personal_details')[];
    
    moderationRequired: boolean;
    legalReviewRequired?: boolean;
    
    // Anonymization level
    anonymizationLevel: 'basic' | 'moderate' | 'high' | 'ultra';
    redactedFields?: string[];
  };

  // Temporal relevancy
  @Prop({ type: Object })
  temporalRelevancy?: {
    reviewPeriod: {
      startYear: number;
      endYear: number;
    };
    
    stillRelevant: boolean;
    invalidatedBy?: string[]; // Industry changes that made review outdated
    lastRelevancyCheck?: Date;
    
    // Update tracking
    hasUpdates: boolean;
    lastUpdatedContent?: Date;
    updateReason?: string;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const CareerReviewSchema = SchemaFactory.createForClass(CareerReview);

// Indexes
CareerReviewSchema.index({ careerId: 1, status: 1 });
CareerReviewSchema.index({ reviewCategory: 1, status: 1 });
CareerReviewSchema.index({ anonymousId: 1 });
CareerReviewSchema.index({ 'reviewContent.overallRating': -1 });
CareerReviewSchema.index({ 'communityEngagement.helpfulVotes': -1 });
CareerReviewSchema.index({ 'qualityMetrics.helpfulnessRating': -1 });
CareerReviewSchema.index({ 'reviewerContext.background': 1, 'reviewerContext.yearsOfExperience': 1 });
CareerReviewSchema.index({ createdAt: -1 });