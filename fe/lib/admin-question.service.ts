import { apiClient } from '@/lib/api-client';

export type OptionValue = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  value: OptionValue;
  label: string;
}

export interface AssessmentQuestionItem {
  id?: string;
  _id?: string;
  questionText: string;
  questionType?: string;
  dimension: string;
  orderIndex?: number;
  options: QuestionOption[];
  isActive?: boolean;
}

interface QuestionListResponse {
  questions: AssessmentQuestionItem[];
  total: number;
}

export interface QuestionPayload {
  questionText: string;
  questionType?: string;
  dimension: string;
  orderIndex?: number;
  options: QuestionOption[];
}

const normalizeQuestion = (item: AssessmentQuestionItem): AssessmentQuestionItem => ({
  ...item,
  options: Array.isArray(item.options)
    ? item.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
      }))
    : [],
});

export const adminQuestionService = {
  async list(accessToken: string): Promise<AssessmentQuestionItem[]> {
    const response = await apiClient.get<QuestionListResponse>(
      '/assessment-questions?page=1&limit=200',
      accessToken,
    );

    const items = Array.isArray(response?.questions) ? response.questions : [];
    return items.map(normalizeQuestion).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  },

  async create(accessToken: string, payload: QuestionPayload): Promise<AssessmentQuestionItem> {
    return apiClient.post<AssessmentQuestionItem>('/assessment-questions', payload, accessToken);
  },

  async update(
    accessToken: string,
    questionId: string,
    payload: QuestionPayload,
  ): Promise<AssessmentQuestionItem> {
    return apiClient.patch<AssessmentQuestionItem>(
      `/assessment-questions/${questionId}`,
      payload,
      accessToken,
    );
  },

  async remove(accessToken: string, questionId: string): Promise<void> {
    await apiClient.delete<void>(`/assessment-questions/${questionId}`, accessToken);
  },
};
