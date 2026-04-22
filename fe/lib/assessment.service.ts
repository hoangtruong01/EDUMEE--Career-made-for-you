import { apiClient } from '@/lib/api-client';

export interface CareerFitResult {
  _id?: string;
}

export const assessmentService = {
  async hasAssessmentResult(accessToken: string): Promise<boolean> {
    const results = await apiClient.get<CareerFitResult[]>(
      '/career-fit-results/my-results',
      accessToken,
    );
    return Array.isArray(results) && results.length > 0;
  },
};
