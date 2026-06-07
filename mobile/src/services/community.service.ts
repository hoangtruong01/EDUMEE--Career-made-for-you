import { api, unwrapResponseData } from './api';

export interface CommunityComment {
  id?: string;
  _id?: string;
  authorId?: string;
  authorName: string;
  authorTitle?: string;
  authorAvatar?: string;
  content: string;
  createdAt?: string;
}

export interface CommunityPost {
  id?: string;
  _id?: string;
  authorId?: string;
  authorName: string;
  authorTitle?: string;
  authorAvatar?: string;
  title: string;
  content: string;
  category: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  likedUserIds?: string[];
  comments?: CommunityComment[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunityPostListResponse {
  data: CommunityPost[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateCommunityPostPayload {
  title: string;
  content: string;
  category: string;
  hashtags?: string[];
  authorName: string;
  authorTitle?: string;
  authorAvatar?: string;
}

export interface CreateCommunityCommentPayload {
  content: string;
  authorName: string;
  authorTitle?: string;
  authorAvatar?: string;
}

export const communityService = {
  async listPosts(params: { page?: number; limit?: number; category?: string; q?: string; hashtag?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.category) query.set('category', params.category);
    if (params.q) query.set('q', params.q);
    if (params.hashtag) query.set('hashtag', params.hashtag);
    const qs = query.toString();
    const response = await api.get(`/community-posts${qs ? `?${qs}` : ''}`);
    return unwrapResponseData<CommunityPostListResponse>(response);
  },

  async createPost(payload: CreateCommunityPostPayload) {
    const response = await api.post('/community-posts', payload);
    return unwrapResponseData<CommunityPost>(response);
  },

  async listComments(postId: string) {
    const response = await api.get(`/community-posts/${postId}/comments`);
    return unwrapResponseData<CommunityComment[]>(response);
  },

  async addComment(postId: string, payload: CreateCommunityCommentPayload) {
    const response = await api.post(`/community-posts/${postId}/comments`, payload);
    return unwrapResponseData<CommunityPost>(response);
  },

  async deletePost(postId: string) {
    const response = await api.delete(`/community-posts/${postId}`);
    return unwrapResponseData<CommunityPost>(response);
  },

  async likePost(postId: string) {
    const response = await api.post(`/community-posts/${postId}/like`, {});
    return unwrapResponseData<CommunityPost>(response);
  },

  async report(payload: {
    targetId: string;
    targetType: 'post' | 'comment';
    reason: string;
    postId?: string;
    details?: string;
  }) {
    const response = await api.post('/community/reports', payload);
    return unwrapResponseData<void>(response);
  },
};
