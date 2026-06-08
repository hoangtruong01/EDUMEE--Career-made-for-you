// fe/src/lib/dashboard.service.ts
import { apiClient } from './api-client';

export interface DashboardStats {
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  exploredCareersCount: number;
  uncompletedTasksCount: number;
}

export interface CurrentLearningState {
  phaseTitle: string;
  taskTitle: string;
}

export interface ActiveRoadmapSummary {
  roadmapId: string;
  careerTitle: string;
  overallProgressPercentage: number;
  completedCount: number;
  remainingCount: number;
  currentState: CurrentLearningState;
}

export interface AiCourseRecommendation {
  courseName: string;
  provider: string;
  url: string;
  reason: string;
  type: 'Course' | 'Video series' | 'Book';
  matchScore: number;
  authorityScore: number;
  dotColor: string;
}

export interface PendingTaskReminder {
  taskId: string;
  title: string;
  formatType: string;
  phaseTitle: string;
}

export interface DashboardResponse {
  hasActiveRoadmap: boolean;
  stats: DashboardStats;
  activeRoadmap?: ActiveRoadmapSummary;
  aiRecommendations: AiCourseRecommendation[];
  pendingTasks: PendingTaskReminder[];
}

export const dashboardService = {
  getDashboardData: async (accessToken: string): Promise<DashboardResponse> => {
    return apiClient.get<DashboardResponse>('/dashboard/metrics', accessToken);
  },

  // 🎯 LUỒNG CHÂN CHÍNH: Gọi API khuyến nghị qua apiClient bọc sẵn của hệ thống để đồng bộ Port 3000
  getAiRecommendations: async (
    accessToken: string,
    careerTitle: string,
  ): Promise<AiCourseRecommendation[]> => {
    // encodeURIComponent giúp bảo toàn chuỗi tiếng Việt có dấu khi truyền qua Header/Query
    return apiClient.get<AiCourseRecommendation[]>(
      `/dashboard/recommendations?career=${encodeURIComponent(careerTitle)}`,
      accessToken,
    );
  },

  cancelActiveRoadmap: async (
    accessToken: string,
    roadmapId: string,
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.put<{ success: boolean; message: string }>(
      `/dashboard/roadmap/${roadmapId}/cancel`,
      {},
      accessToken,
    );
  },

  trackExploration: async (
    accessToken: string,
    careerId: string,
  ): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(
      '/dashboard/explore-career',
      { careerId },
      accessToken,
    );
  },
};
