import { apiClient } from '@/lib/api-client';

export interface CommunityComment {
  id?: string;
  authorName: string;
  authorTitle?: string;
  content: string;
  createdAt?: string;
}

export interface CommunityPost {
  id?: string;
  _id?: string;
  authorName: string;
  authorTitle?: string;
  title: string;
  content: string;
  category: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  comments?: CommunityComment[];
  createdAt?: string;
  updatedAt?: string;
}

interface CommunityPostListResponse {
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
}

export interface CreateCommunityCommentPayload {
  content: string;
  authorName: string;
  authorTitle?: string;
}

export const communityService = {
  async listPosts(
    accessToken: string,
    params: { page?: number; limit?: number; category?: string; q?: string; hashtag?: string } = {},
  ): Promise<CommunityPostListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.category) query.set('category', params.category);
    if (params.q) query.set('q', params.q);
    if (params.hashtag) query.set('hashtag', params.hashtag);
    const qs = query.toString();
    return apiClient.get<CommunityPostListResponse>(
      `/community-posts${qs ? `?${qs}` : ''}`,
      accessToken,
    );
  },

  async createPost(
    accessToken: string,
    payload: CreateCommunityPostPayload,
  ): Promise<CommunityPost> {
    return apiClient.post<CommunityPost>('/community-posts', payload, accessToken);
  },

  async getPost(accessToken: string, id: string): Promise<CommunityPost> {
    return apiClient.get<CommunityPost>(`/community-posts/${id}`, accessToken);
  },

  async listComments(accessToken: string, postId: string): Promise<CommunityComment[]> {
    return apiClient.get<CommunityComment[]>(`/community-posts/${postId}/comments`, accessToken);
  },

  async addComment(
    accessToken: string,
    postId: string,
    payload: CreateCommunityCommentPayload,
  ): Promise<CommunityPost> {
    return apiClient.post<CommunityPost>(
      `/community-posts/${postId}/comments`,
      payload,
      accessToken,
    );
  },

  async deletePost(accessToken: string, postId: string): Promise<CommunityPost> {
    return apiClient.delete<CommunityPost>(`/community-posts/${postId}`, accessToken);
  },
};
