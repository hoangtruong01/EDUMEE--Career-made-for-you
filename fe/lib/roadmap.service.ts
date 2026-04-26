import { apiClient } from '@/lib/api-client';

export interface CareerDetailedAnalysis {
  careerTitle: string;
  overview: string;
  pros: string[];
  cons: string[];
  trends: { year: string; description: string }[];
  salaryRange: string;
  demandLevel: string;
  keySkills: string[];
  topCompanies: string[];
}

export interface RoadmapPhase {
  phaseId: string;
  phase: string;
  title: string;
  description: string;
  estimatedDuration: string;
  objectives: string[];
  order: number;
  milestones: {
    milestoneId: string;
    title: string;
    description: string;
    tasks: {
      taskId: string;
      taskTitle: string;
      isRequired: boolean;
      estimatedHours: number;
      order: number;
    }[];
    skills: { skillName: string; targetLevel: number }[];
    completionCriteria: { requiredTasks: string[] };
  }[];
}

export interface GeneratedRoadmap {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: string;
  phases: RoadmapPhase[];
  tags: string[];
  createdAt: string;
}

export const roadmapService = {
  async getDetailedAnalysis(
    accessToken: string,
    careerTitle: string,
  ): Promise<CareerDetailedAnalysis> {
    return apiClient.get<CareerDetailedAnalysis>(
      `/career-fit-results/detailed-analysis?careerTitle=${encodeURIComponent(careerTitle)}`,
      accessToken,
    );
  },

  async generateAIRoadmap(
    accessToken: string,
    careerTitle: string,
  ): Promise<GeneratedRoadmap> {
    return apiClient.post<GeneratedRoadmap>(
      '/learning-roadmaps/generate-ai',
      { careerTitle },
      accessToken,
    );
  },

  async getRoadmapById(accessToken: string, id: string): Promise<GeneratedRoadmap> {
    return apiClient.get<GeneratedRoadmap>(`/learning-roadmaps/${id}`, accessToken);
  },

  async getLatestRoadmap(accessToken: string): Promise<GeneratedRoadmap | null> {
    return apiClient.get<GeneratedRoadmap | null>('/learning-roadmaps/latest', accessToken);
  },

  async getMyRoadmaps(accessToken: string): Promise<GeneratedRoadmap[]> {
    const res = await apiClient.get<{ data: GeneratedRoadmap[] }>(
      '/learning-roadmaps?limit=10',
      accessToken,
    );
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
};
