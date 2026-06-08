// src/lib/roadmap.service.ts
import { apiClient } from '@/lib/api-client';

export interface CareerDetailedAnalysis {
  _id?: string;
  // 🚀 NÂNG CẤP: Thêm careerId định danh chuẩn để kết nối trực tiếp sang danh mục ngành nghề
  careerId?: string;
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

export interface CareerInsight {
  _id: string;
  careerTitle: string;
  category?: string;
  analysis: CareerDetailedAnalysis;
  lastAIUpdate: string;
  updatedAt?: string;
}

export enum TaskProgressStatus {
  LOCKED = 'LOCKED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export interface ITaskProgress {
  taskId: string;
  status: TaskProgressStatus;
  startedAt?: string;
  completedAt?: string;
  score?: number;
}

export interface IMilestone {
  milestoneId: string;
  title: string;
  order: number;
  taskIds: string[];
}

export interface IPhase {
  phaseId: string;
  title: string;
  order: number;
  milestones: IMilestone[];
}

export interface GeneratedRoadmap {
  _id: string;
  userId: string;
  careerId: string;
  title: string;
  status: string;
  overallProgress: number;
  phases: IPhase[];
  taskProgress: ITaskProgress[];
  createdAt: string;
}

export interface SubmitTaskPayload {
  roadmapId: string;
  taskId: string;
  status: TaskProgressStatus;
  timeSpentSeconds?: number;
}

export const roadmapService = {
  // Lấy phân tích chi tiết nghề nghiệp từ kết quả bài test chuẩn xác
  async getDetailedAnalysis(
    accessToken: string,
    careerTitle: string,
  ): Promise<CareerDetailedAnalysis> {
    return apiClient.get<CareerDetailedAnalysis>(
      `/career-fit-results/detailed-analysis?careerTitle=${encodeURIComponent(careerTitle)}`,
      accessToken,
    );
  },

  // Lấy danh sách nghề gợi ý phục vụ trang Khám phá ngành
  async getDiscoveryInsights(accessToken: string): Promise<CareerInsight[]> {
    return apiClient.get<CareerInsight[]>('/career-fit-results/insights', accessToken);
  },

  async generateAIRoadmap(
    accessToken: string,
    careerTitle: string,
    careerId: string,
  ): Promise<GeneratedRoadmap> {
    return apiClient.post<GeneratedRoadmap>(
      '/learning-roadmaps/generate-ai',
      { careerTitle, careerId },
      accessToken,
    );
  },

  // Lấy chi tiết lộ trình học tập cụ thể theo ID
  async getRoadmapById(accessToken: string, id: string): Promise<GeneratedRoadmap> {
    return apiClient.get<GeneratedRoadmap>(`/learning-roadmaps/${id}`, accessToken);
  },

  // Lấy lộ trình học tập đang kích hoạt gần nhất để đẩy lên Dashboard
  async getLatestRoadmap(accessToken: string): Promise<GeneratedRoadmap | null> {
    return apiClient.get<GeneratedRoadmap | null>('/learning-roadmaps/latest', accessToken);
  },

  // Nộp bài tập thực chiến hoặc bấm Skip bài đã biết
  async submitTask(accessToken: string, payload: SubmitTaskPayload): Promise<void> {
    return apiClient.post<void>('/task-submissions', payload, accessToken);
  },

  // Lấy danh sách tất cả lộ trình của học viên
  async getMyRoadmaps(accessToken: string): Promise<GeneratedRoadmap[]> {
    const res = await apiClient.get<{ data: GeneratedRoadmap[] }>(
      '/learning-roadmaps?limit=10',
      accessToken,
    );
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
};
