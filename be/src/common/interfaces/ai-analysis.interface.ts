export interface PersonalityAnalysis {
  bigFiveScores: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  riasecScores: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
  personalityProfile: {
    dominantTraits: string[];
    strengthAreas: string[];
    developmentAreas: string[];
    workStyle: string;
    communication: string;
    leadership: string;
  };
}

export interface CareerRecommendation {
  careerId: string | null;
  careerTitle: string;
  fitScore: number; // 0-100
  personalityMatch: {
    bigFiveAlignment: number; // 0-100
    riasecAlignment: number; // 0-100
    overallFit: number; // 0-100
  };
  reasons: string[];
  potentialChallenges: string[];
  developmentSuggestions: string[];
}

export interface AIAnalysisResult {
  personalityAnalysis: PersonalityAnalysis;
  careerRecommendations: CareerRecommendation[];
  explanation: string;
  confidence: number; // 0-100
}

export interface AssessmentAnswerData {
  questionId: string;
  questionText?: string;
  dimension?: string; // Big5 or RIASEC dimension
  answer: any;
  options?: { value: string; label: string }[];
  responseTime?: number;
}