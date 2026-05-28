import { apiClient } from '@/lib/api-client';

export interface CareerFitResult {
  id?: string;
  careerId?: string | null;
  careerTitle?: string | null;
  overallFitScore?: number | null;
  assessmentSessionId?: string;
  generatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  recommendationRank?: number;
  rank?: number;
  strengths?: string[] | null;
  developmentAreas?: string[] | null;
  aiExplanation?: string | null;
  confidence?: number | null;
  isLocked?: boolean;
  lockedReason?: 'plan_limit';
  requiredPlan?: string;
}

export interface CareerFitResultHistoryItem {
  sessionId: string;
  attemptNumber?: number;
  status?: string;
  completedAt?: string;
  generatedAt?: string;
  topCareerTitle?: string;
  topFitScore?: number;
  resultCount: number;
  isLatest: boolean;
}

export interface AssessmentQuestionOption {
  value: 'A' | 'B' | 'C' | 'D';
  label: string;
}

export interface AssessmentQuestion {
  id?: string;
  _id?: string;
  questionText: string;
  options: AssessmentQuestionOption[];
  orderIndex?: number;
  dimension?: string;
}

interface AssessmentQuestionsResponse {
  questions: AssessmentQuestion[];
  total: number;
}

export interface AssessmentSession {
  id?: string;
  _id?: string;
  status?: string;
}

export interface StartSessionOptions {
  forceNew?: boolean;
}

export interface GenerateMyAnalysisOptions {
  sessionId?: string;
}

export interface GetMyResultsOptions {
  limit?: number;
  sessionId?: string;
}

export interface BulkAnswerPayload {
  sessionId: string;
  questionId: string;
  answer: 'A' | 'B' | 'C' | 'D';
  responseTime?: number;
}

const buildMyResultsPath = (options: GetMyResultsOptions = {}) => {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.sessionId) params.set('sessionId', options.sessionId);
  const query = params.toString();
  return `/career-fit-results/my-results${query ? `?${query}` : ''}`;
};

export const assessmentService = {
  async hasAssessmentResult(accessToken: string): Promise<boolean> {
    const results = await apiClient.get<CareerFitResult[]>(
      '/career-fit-results/my-results',
      accessToken,
    );
    return Array.isArray(results) && results.length > 0;
  },

  async getQuestions(accessToken: string): Promise<AssessmentQuestion[]> {
    const res = await apiClient.get<AssessmentQuestionsResponse>(
      '/assessment-questions?page=1&limit=100',
      accessToken,
    );
    const questions = Array.isArray(res?.questions) ? res.questions : [];
    return questions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  },

  async startSession(
    accessToken: string,
    options: StartSessionOptions = {},
  ): Promise<AssessmentSession> {
    return apiClient.post<AssessmentSession>('/assessment-sessions', options, accessToken);
  },

  async listSessions(accessToken: string): Promise<AssessmentSession[]> {
    return apiClient.get<AssessmentSession[]>('/assessment-sessions', accessToken);
  },

  async submitBulkAnswers(accessToken: string, answers: BulkAnswerPayload[]) {
    return apiClient.post('/assessment-answers/bulk', answers, accessToken);
  },

  async finishSession(accessToken: string, sessionId: string) {
    return apiClient.post(`/assessment-sessions/${sessionId}/finish`, undefined, accessToken);
  },

  async generateMyAnalysis(accessToken: string, options: GenerateMyAnalysisOptions = {}) {
    return apiClient.post('/career-fit-results/generate-my-analysis', options, accessToken);
  },

  async getMyResults(
    accessToken: string,
    options: GetMyResultsOptions = {},
  ): Promise<CareerFitResult[]> {
    return apiClient.get<CareerFitResult[]>(buildMyResultsPath(options), accessToken);
  },

  async getMyHistory(accessToken: string): Promise<CareerFitResultHistoryItem[]> {
    return apiClient.get<CareerFitResultHistoryItem[]>(
      '/career-fit-results/my-history',
      accessToken,
    );
  },
};
