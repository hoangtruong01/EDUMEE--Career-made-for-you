import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ExperienceLevel } from '../../careers/schemas/career.schema';

export type TutorProfileDocument = TutorProfile & Document;

export enum TutorStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum TutorLevel {
  JUNIOR_MENTOR = 'junior_mentor',
  SENIOR_MENTOR = 'senior_mentor',
  EXPERT_MENTOR = 'expert_mentor',
  MASTER_MENTOR = 'master_mentor',
}

@Schema({
  timestamps: true,
  collection: 'tutor_profiles',
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
export class TutorProfile {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: TutorStatus, default: TutorStatus.PENDING_APPROVAL })
  status!: TutorStatus;

  @Prop({ type: String, enum: TutorLevel, default: TutorLevel.JUNIOR_MENTOR })
  tutorLevel!: TutorLevel;

  // Professional background
  @Prop({ required: true })
  professionalBackground!: {
    currentPosition: string;
    company: string;
    yearsOfExperience: number;
    
    industries: string[];
    seniority: ExperienceLevel;
    
    previousRoles: {
      position: string;
      company: string;
      duration: string;
      achievements?: string[];
    }[];
    
    education: {
      degree: string;
      institution: string;
      graduationYear: number;
      major?: string;
    }[];
    
    certifications?: {
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
      credentialUrl?: string;
    }[];
  };

  // Mentoring expertise
  @Prop({ required: true })
  mentoringExpertise!: {
    // Careers they can mentor for
    careerExpertise: {
      careerId: Types.ObjectId;
      careerTitle: string; // Cached
      experienceLevel: ExperienceLevel;
      yearsInField: number;
      confidenceLevel: number; // 1-5 scale
    }[];
    
    // Skills they can teach/guide
    skillExpertise: {
      skillName: string;
      skillCategory: 'technical' | 'soft' | 'leadership' | 'industry_specific';
      proficiencyLevel: number; // 1-5 scale
      teachingExperience: number; // years
      verificationStatus?: 'self_reported' | 'peer_verified' | 'admin_verified';
    }[];
    
    // Mentoring specializations
    specializations: string[]; // e.g., ["Career transition", "Interview prep", "Skill development"]
    
    // Target mentee levels
    targetMenteeLevels: ExperienceLevel[];
  };

  // Availability and preferences
  @Prop({ required: true })
  availability!: {
    timeZone: string;
    
    weeklyAvailability: {
      day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      timeSlots: {
        startTime: string; // "09:00"
        endTime: string; // "17:00"
        available: boolean;
      }[];
    }[];
    
    maxSessionsPerWeek?: number;
    maxMenteesActive?: number;
    
    sessionPreferences: {
      preferredDuration: number[]; // [60, 90] minutes
      sessionTypes: ('career_guidance' | 'skill_coaching' | 'interview_prep' | 'project_review' | 'general_mentoring')[];
      communicationMethods: ('video' | 'voice' | 'chat' | 'screen_sharing')[];
    };
    
    unavailablePeriods?: {
      startDate: Date;
      endDate: Date;
      reason: string;
    }[];
  };

  // Pricing and package information
  @Prop({ type: Object })
  pricing?: {
    currency: string;
    
    sessionRates: {
      sessionType: string;
      duration: number; // minutes
      pricePerSession: number;
      packageDeals?: {
        sessionsCount: number;
        totalPrice: number;
        validityDays: number;
      }[];
    }[];
    
    freeSessionOffered: boolean;
    freeSessionDuration?: number;
    
    paymentMethods: string[];
    cancellationPolicy: string;
    reschedulePolicy: string;
  };

  // Verification and credentials
  @Prop({ type: Object })
  verification?: {
    identityVerified: boolean;
    backgroundCheckPassed?: boolean;
    linkedinVerified?: boolean;
    employmentVerified?: boolean;
    
    verificationDocuments: {
      documentType: 'resume' | 'linkedin' | 'portfolio' | 'certification' | 'employment_letter';
      documentUrl?: string;
      verificationStatus: 'pending' | 'approved' | 'rejected';
      verifiedDate?: Date;
      verifierNotes?: string;
    }[];
  };

  // Performance metrics
  @Prop({ type: Object })
  performanceMetrics?: {
    totalSessions: number;
    totalMentees: number;
    activeMentees: number;
    
    ratings: {
      averageRating: number; // 1-5 scale
      totalReviews: number;
      ratingBreakdown: {
        stars: number;
        count: number;
      }[];
    };
    
    successMetrics: {
      menteeJobPlacementRate?: number; // % of mentees who got jobs
      menteeSkillImprovementRate?: number;
      sessionCompletionRate: number;
      responseRate: number; // % of messages responded to
      averageResponseTime: number; // hours
    };
    
    badges?: {
      badgeName: string;
      earnedDate: Date;
      description: string;
    }[];
    
    lastUpdated: Date;
  };

  // Communication and interaction style
  @Prop({ type: Object })
  mentoringStyle?: {
    approachDescription: string;
    
    strengths: string[]; // What they're particularly good at
    mentoringPhilosophy: string;
    
    typicalSessionStructure?: string;
    feedbackStyle: 'direct' | 'supportive' | 'collaborative' | 'challenging';
    
    languagesSpoken: {
      language: string;
      proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
    }[];
    
    personalityTraits: string[]; // e.g., ["patient", "detail-oriented", "encouraging"]
  };

  // Platform integration
  @Prop({ type: Object })
  platformIntegration?: {
    joinedDate: Date;
    lastActiveDate: Date;
    
    profileViews: number;
    profileBookmarks: number;
    
    featuredMentor: boolean;
    verifiedExpert: boolean;
    
    socialProfiles?: {
      platform: 'linkedin' | 'github' | 'twitter' | 'personal_website';
      url: string;
      verified: boolean;
    }[];
  };

  // Admin and moderation
  @Prop({ type: Object })
  adminInfo?: {
    approvedBy?: Types.ObjectId;
    approvalDate?: Date;
    rejectionReason?: string;
    
    internalNotes?: string;
    flaggedReports?: {
      reportDate: Date;
      reportReason: string;
      reporterId: Types.ObjectId;
      status: 'pending' | 'resolved' | 'dismissed';
    }[];
    
    performanceAlerts?: {
      alertType: string;
      alertDate: Date;
      resolved: boolean;
    }[];
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const TutorProfileSchema = SchemaFactory.createForClass(TutorProfile);

// Indexes
TutorProfileSchema.index({ userId: 1 }, { unique: true });
TutorProfileSchema.index({ status: 1, tutorLevel: 1 });
TutorProfileSchema.index({ 'mentoringExpertise.careerExpertise.careerId': 1 });
TutorProfileSchema.index({ 'mentoringExpertise.skillExpertise.skillName': 1 });
TutorProfileSchema.index({ 'performanceMetrics.ratings.averageRating': -1 });
TutorProfileSchema.index({ 'platformIntegration.lastActiveDate': -1 });