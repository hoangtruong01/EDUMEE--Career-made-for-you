import { apiClient } from '@/lib/api-client';

export interface CareerFitResult {
  id?: string;
  careerId?: string | null;
  careerTitle?: string;
  overallFitScore?: number;
  strengths?: string[];
  developmentAreas?: string[];
  aiExplanation?: string;
  confidence?: number;
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

export interface BulkAnswerPayload {
  sessionId: string;
  questionId: string;
  answer: 'A' | 'B' | 'C' | 'D';
  responseTime?: number;
}

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

  async startSession(accessToken: string): Promise<AssessmentSession> {
    return apiClient.post<AssessmentSession>('/assessment-sessions', undefined, accessToken);
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

  async generateMyAnalysis(accessToken: string) {
    return apiClient.post('/career-fit-results/generate-my-analysis', undefined, accessToken);
  },

  async getMyResults(accessToken: string): Promise<CareerFitResult[]> {
    return apiClient.get<CareerFitResult[]>('/career-fit-results/my-results', accessToken);
  },
};
