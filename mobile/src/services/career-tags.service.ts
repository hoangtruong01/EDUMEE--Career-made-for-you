import { api, unwrapResponseData } from './api';

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

export const careerTagsService = {
  async getCareers() {
    const response = await api.get('/careers?page=1&limit=300');
    return unwrapResponseData<{ data: CareerTag[]; total: number; page: number; limit: number }>(response);
  },

  async getSkillTags(params: { careerId?: string; category?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.careerId) search.set('careerId', params.careerId);
    if (params.category) search.set('category', params.category);
    if (params.q) search.set('q', params.q);
    const query = search.toString();
    const response = await api.get(`/skill-tags${query ? `?${query}` : ''}`);
    return unwrapResponseData<SkillTag[]>(response);
  },
};
