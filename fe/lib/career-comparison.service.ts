import { apiClient } from './api-client';

export interface Career {
  id: string;
  _id: string;
  title: string;
  description: string;
  category: string;
  icon?: string;
  match?: number;
  salary?: number;
  growth?: string;
  growthPct?: number;
  difficultyStars?: number;
  skills: string[];
  pros: string[];
  cons: string[];
  jobOpportunity?: number;
  wlb?: number;
  yearsStudy?: number;
  color?: string;
}

export interface DetailedAnalysis {
  skillsAlignment: {
    overlapPercentage: number;
    transferableSkills: string[];
    gapAnalysis: { careerId: string; missingSkills: string[] }[];
  };
  careerProgression: {
    careerId: string;
    progressionPath: unknown;
    timeToAdvancement: string;
    seniorityLevels: string[];
  }[];
  marketDemand: {
    careerId: string;
    demandLevel: string;
    jobGrowthRate: string;
    competitionLevel: string;
  }[];
  compatibility: {
    personalityFit: string;
    skillsCompatibility: string;
    lifestyleAlignment: string;
    longTermViability: string;
  };
}

export interface ComparisonInsights {
  criteriaGuide: { key: string; label: string; description: string }[];
  perCareer: {
    careerId: string;
    careerTitle: string;
    personFit: {
      workEnvironment: string;
      workRhythm: string;
      autonomyLevel: string;
      communicationLoad: string;
      stressProfile: string;
    };
    personalityFit: {
      bestTraits: string[];
      potentialFriction: string[];
      teamStyle: string;
      decisionStyle: string;
    };
    compensation: {
      entryRange: string;
      midRange: string;
      seniorRange: string;
      growthCeiling: string;
      stability: string;
    };
    market: {
      demand: string;
      growthTrend: string;
      competition: string;
      remoteAvailability: string;
      aiAutomationRisk: string;
    };
    skillsAndPath: {
      mustHaveSkills: string[];
      skillGaps: string[];
      rampUpTime: string;
      portfolioSignals: string[];
    };
    longTerm: {
      advancementPotential: string;
      workLifeBalance: string;
      burnoutRisk: string;
      transferability: string;
    };
  }[];
  tradeOffSummary: {
    bestPersonalityFit: string;
    bestSalaryUpside: string;
    bestMarketOutlook: string;
    safestLongTermChoice: string;
    notes: string[];
  };
}

export interface CareerComparisonResponse {
  careers: Career[];
  quantitativeComparison: unknown;
  detailedAnalysis: DetailedAnalysis;
  recommendations: {
    bestMatch: string;
    reasonsForRecommendation: string[];
    alternativeOptions: string[];
    developmentSuggestions: string[];
  };
  scoreBreakdown: {
    careerId: string;
    careerTitle: string;
    overallScore: number;
    criteriaScores: {
      skillMatch: number;
      salaryPotential: number;
      workLifeBalance: number;
      growthPotential: number;
    };
  }[];
  comparisonInsights?: ComparisonInsights;
  comparisonId: string;
}

export interface AllowedCareerComparisonItem {
  id: string;
  source: 'career' | 'career_insight' | 'career_fit_result';
  careerFitResultId: string;
  careerId?: string;
  careerInsightId?: string;
  title: string;
  description?: string;
  category?: string;
  match?: number;
  rank?: number;
  skills: string[];
  salaryRange?: string;
  demandLevel?: string;
}

export const careerComparisonService = {
  getAllowedCareers: async (token?: string): Promise<AllowedCareerComparisonItem[]> => {
    return apiClient.get<AllowedCareerComparisonItem[]>('/career-comparisons/allowed-careers', token);
  },

  compareCareers: async (careerIds: string[], token?: string): Promise<CareerComparisonResponse> => {
    return apiClient.post<CareerComparisonResponse>('/career-comparisons/compare-careers', { careerIds }, token);
  },

  generateDetailedAnalysis: async (careerIds: string[], token?: string): Promise<CareerComparisonResponse> => {
    return apiClient.post<CareerComparisonResponse>('/career-comparisons/detailed-analysis', { careerIds }, token);
  },

  getMyComparisons: async (token?: string): Promise<unknown[]> => {
    return apiClient.get<unknown[]>('/career-comparisons/my-comparisons', token);
  },

  getComparisonById: async (id: string, token?: string): Promise<unknown> => {
    return apiClient.get<unknown>(`/career-comparisons/${id}`, token);
  }
};
