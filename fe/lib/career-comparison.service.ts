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
  comparisonId: string;
}

export const careerComparisonService = {
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
