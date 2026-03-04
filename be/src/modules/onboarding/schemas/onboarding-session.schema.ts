import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OnboardingSessionDocument = OnboardingSession & Document;

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  SKIPPED = 'skipped',
}

export enum OnboardingStep {
  WELCOME = 'welcome',
  PROFILE_SETUP = 'profile_setup',
  INTERESTS_SURVEY = 'interests_survey',
  GOALS_SETTING = 'goals_setting',
  ASSESSMENT_INTRO = 'assessment_intro',
  BASELINE_ASSESSMENT = 'baseline_assessment',
  CAREER_PREFERENCES = 'career_preferences',
  LEARNING_PREFERENCES = 'learning_preferences',
  PLATFORM_FEATURES = 'platform_features',
  FIRST_RECOMMENDATIONS = 'first_recommendations',
  COMPLETION = 'completion',
}

export enum UserIntent {
  CAREER_EXPLORATION = 'career_exploration', // Khám phá nghề nghiệp
  CAREER_CHANGE = 'career_change', // Chuyển đổi nghề nghiệp
  SKILL_DEVELOPMENT = 'skill_development', // Phát triển kỹ năng
  JOB_PREPARATION = 'job_preparation', // Chuẩn bị tìm việc
  INTERVIEW_PREP = 'interview_prep', // Chuẩn bị phỏng vấn
  EDUCATION_PLANNING = 'education_planning', // Lập kế hoạch học tập
  GENERAL_GUIDANCE = 'general_guidance', // Hướng dẫn tổng quát
}

@Schema({
  timestamps: true,
  collection: 'onboarding_sessions',
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
export class OnboardingSession {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: OnboardingStatus, default: OnboardingStatus.NOT_STARTED })
  status!: OnboardingStatus;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  progressPercentage!: number;

  // User's primary intent and goals
  @Prop({ type: Object })
  userIntent?: {
    primaryIntent: UserIntent;
    secondaryIntents?: UserIntent[];
    
    specificGoals: string[]; // What they want to achieve
    timeframe?: string; // When they want to achieve it
    urgencyLevel: 'low' | 'medium' | 'high';
    
    currentSituation: {
      currentStatus: 'student' | 'employed' | 'unemployed' | 'career_break' | 'entrepreneur';
      currentRole?: string;
      currentField?: string;
      satisfactionLevel?: number; // 1-5 scale with current situation
      challengesFaced?: string[];
    };
    
    futureAspiration: {
      dreamJob?: string;
      desiredIndustry?: string[];
      desiredWorkEnvironment?: string[];
      locationPreferences?: string[];
      salaryExpectations?: {
        currency: string;
        minExpected?: number;
        maxExpected?: number;
        timeline?: string;
      };
    };
  };

  // Onboarding step progress
  @Prop({ required: true })
  stepProgress!: {
    stepId: OnboardingStep;
    status: 'not_reached' | 'current' | 'completed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    
    stepData?: any; // Step-specific data collected
    timeSpent?: number; // seconds
    
    // Step completion quality
    completionQuality?: 'minimal' | 'partial' | 'complete' | 'comprehensive';
    userSatisfaction?: number; // 1-5 scale
    
    // Skip reasons if applicable
    skipReason?: string;
    willReturnLater?: boolean;
  }[];

  // Collected baseline information
  @Prop({ type: Object })
  baselineData?: {
    // Personal information
    personalInfo?: {
      ageRange?: string;
      educationLevel?: string;
      currentLocation?: {
        city?: string;
        country: string;
      };
      languagesSpoken?: string[];
      availability?: {
        hoursPerWeek: number;
        flexibleSchedule: boolean;
        preferredTimes?: string[];
      };
    };
    
    // Career background
    careerBackground?: {
      workExperience?: {
        position: string;
        industry: string;
        duration: string;
        satisfaction: number; // 1-5
        keySkills: string[];
      }[];
      
      volunteerExperience?: string[];
      personalProjects?: string[];
      achievements?: string[];
      
      careerHighlights?: string[];
      careerLowPoints?: string[];
    };
    
    // Skills and interests baseline
    skillsAndInterests?: {
      currentSkills?: {
        skill: string;
        level: number; // 1-5 self-assessed
        yearsOfExperience?: number;
        formalTraining: boolean;
      }[];
      
      interestAreas?: {
        interest: string;
        enthusiasmLevel: number; // 1-5
        experienceLevel: number; // 1-5
        willToPursue: number; // 1-5
      }[];
      
      learningStyle?: string[];
      preferredLearningMethods?: string[];
      
      personalityTraits?: string[];
      workStylePreferences?: string[];
    };
    
    // Constraints and preferences
    constraints?: {
      budgetConstraints?: {
        maxMonthlyBudget: number;
        currency: string;
        budgetFlexibility: 'strict' | 'somewhat_flexible' | 'flexible';
      };
      
      timeConstraints?: {
        maxHoursPerWeek: number;
        preferredSchedule: string[];
        hasDeadlines: boolean;
        urgentGoals?: string[];
      };
      
      locationConstraints?: {
        willingToRelocate: boolean;
        preferredLocations?: string[];
        remoteWorkPreference: 'required' | 'preferred' | 'acceptable' | 'not_preferred';
      };
      
      personalConstraints?: string[];
    };
  };

  // Initial assessment results (if taken during onboarding)
  @Prop({ type: Types.ObjectId, ref: 'AssessmentSession' })
  initialAssessmentId?: Types.ObjectId;

  // Platform feature education progress
  @Prop({ type: Object })
  featureEducation?: {
    featuresIntroduced?: {
      featureName: string;
      introduced: boolean;
      understood: boolean;
      interestedInUsing: boolean;
      notes?: string;
    }[];
    
    tutorialProgress?: {
      tutorialName: string;
      completed: boolean;
      completionPercentage?: number;
      timeSpent?: number;
    }[];
    
    demoSessionsCompleted?: string[];
    helpResourcesViewed?: string[];
  };

  // Generated recommendations from onboarding
  @Prop({ type: Object })
  initialRecommendations?: {
    suggestedCareers?: {
      careerId: Types.ObjectId;
      careerTitle: string;
      matchScore: number; // 0-100
      matchReasons: string[];
    }[];
    
    recommendedAssessments?: {
      assessmentType: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
      estimatedTime: string;
    }[];
    
    suggestedLearningPaths?: {
      skill: string;
      currentLevel: number;
      targetLevel: number;
      estimatedTime: string;
      resources: string[];
    }[];
    
    mentorshipRecommendation?: {
      recommended: boolean;
      mentorTypes: string[];
      specificNeeds: string[];
    };
  };

  // Personalization settings established
  @Prop({ type: Object })
  personalizationSettings?: {
    communicationPreferences?: {
      emailFrequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
      notificationTypes: string[];
      preferredLanguage: string;
      communicationStyle: 'formal' | 'casual' | 'encouraging' | 'direct';
    };
    
    contentPreferences?: {
      contentTypes: string[]; // video, text, interactive, etc.
      contentLength: 'short' | 'medium' | 'long' | 'varied';
      difficultyProgression: 'gradual' | 'moderate' | 'challenging';
    };
    
    goalTrackingPreferences?: {
      checkInFrequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
      progressVisualization: string[];
      reminderStyle: 'gentle' | 'firm' | 'motivational';
    };
  };

  // Onboarding experience feedback
  @Prop({ type: Object })
  experienceFeedback?: {
    overallSatisfaction: number; // 1-5 scale
    
    stepFeedback?: {
      stepId: OnboardingStep;
      rating: number; // 1-5
      feedback: string;
      suggestions?: string;
    }[];
    
    // What worked well
    positiveAspects?: string[];
    
    // What could be improved
    improvementAreas?: string[];
    confusingParts?: string[];
    
    // Completion sentiment
    confidenceLevel: number; // 1-5, how confident they feel about using platform
    excitementLevel: number; // 1-5, how excited they are to continue
    
    // Likelihood metrics
    likelyToContinue: number; // 1-5 scale
    wouldRecommendToOthers: number; // 1-5 scale
    
    additionalComments?: string;
  };

  // Technical and UX metrics
  @Prop({ type: Object })
  technicalMetrics?: {
    totalTimeSpent: number; // seconds
    sessionsCount: number; // How many separate sessions
    
    deviceInfo?: {
      deviceType: 'desktop' | 'tablet' | 'mobile';
      operatingSystem: string;
      browser?: string;
      screenSize?: string;
    };
    
    interactionPatterns?: {
      clicksCount: number;
      scrollBehavior: string;
      backtrackingCount: number; // How often they went back
      helpRequestsCount: number;
    };
    
    dropOffPoints?: {
      stepId: OnboardingStep;
      dropOffTime: Date;
      timeSpentBeforeDropOff: number;
      returnedLater: boolean;
    }[];
  };

  // Follow-up and next steps
  @Prop({ type: Object })
  nextSteps?: {
    immediateActions?: {
      action: string;
      priority: 'high' | 'medium' | 'low';
      estimatedTime: string;
      dueDate?: Date;
    }[];
    
    scheduledFollowUps?: {
      type: 'email' | 'notification' | 'call';
      scheduledDate: Date;
      purpose: string;
      completed?: boolean;
    }[];
    
    recommendedFirstActivities?: string[];
    
    onboardingCompletionCertificate?: {
      issued: boolean;
      issueDate?: Date;
      certificateUrl?: string;
    };
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const OnboardingSessionSchema = SchemaFactory.createForClass(OnboardingSession);

// Indexes
OnboardingSessionSchema.index({ userId: 1 }, { unique: true });
OnboardingSessionSchema.index({ status: 1, progressPercentage: 1 });
OnboardingSessionSchema.index({ 'userIntent.primaryIntent': 1 });
OnboardingSessionSchema.index({ createdAt: -1 });
OnboardingSessionSchema.index({ completedAt: -1 });