import { apiClient } from '@/lib/api-client';

export interface CareerSkillRequirement {
  skillName: string;
  importance?: number;
  minimumLevel?: number;
}

export interface CareerTag {
  id: string;
  _id?: string;
  title: string;
  category: string;
  industries?: string[];
  skillRequirements?: {
    technical?: CareerSkillRequirement[];
    soft?: CareerSkillRequirement[];
  };
}

export interface SkillTag {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  category: 'technical' | 'soft' | 'leadership' | 'industry_specific';
  careerIds: string[];
  careerTitles: string[];
  usageCount?: number;
}

export type SkillTagCategory = SkillTag['category'];

export interface CareerSkillTagInput {
  name: string;
  category: SkillTagCategory;
  importance?: number;
  minimumLevel?: number;
}

export interface CreateSkillTagPayload {
  name: string;
  category?: SkillTagCategory;
  careerIds?: string[];
  careerTitles?: string[];
}

export interface UpdateSkillTagPayload {
  name?: string;
  category?: SkillTagCategory;
  isActive?: boolean;
}

export const careerTagsService = {
  getCareers(token: string) {
    return apiClient.get<{ data: CareerTag[]; total: number; page: number; limit: number }>(
      '/careers?page=1&limit=300',
      token,
    );
  },

  getSkillTags(token: string, params: { careerId?: string; category?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.careerId) search.set('careerId', params.careerId);
    if (params.category) search.set('category', params.category);
    if (params.q) search.set('q', params.q);
    const query = search.toString();
    return apiClient.get<SkillTag[]>(`/skill-tags${query ? `?${query}` : ''}`, token);
  },

  createSkillTag(token: string, data: CreateSkillTagPayload) {
    return apiClient.post<SkillTag>('/skill-tags', data, token);
  },

  updateSkillTag(token: string, id: string, data: UpdateSkillTagPayload) {
    return apiClient.patch<SkillTag>(`/skill-tags/${id}`, data, token);
  },

  deleteSkillTag(token: string, id: string) {
    return apiClient.delete<SkillTag>(`/skill-tags/${id}`, token);
  },
};
