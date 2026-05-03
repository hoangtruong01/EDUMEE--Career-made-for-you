import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateCommunityCommentDto, CreateCommunityPostDto } from '../dto/community-post.dto';
import { CommunityPost, CommunityPostDocument } from '../schemas/community-post.schema';

const normalizeHashtag = (value: string): string => {
  const trimmed = value.trim().replace(/^#+/, '');
  if (!trimmed) return '';
  return `#${trimmed.toLowerCase()}`;
};

@Injectable()
export class CommunityPostService {
  constructor(
    @InjectModel(CommunityPost.name)
    private communityPostModel: Model<CommunityPostDocument>,
  ) {}

  async create(userId: string, dto: CreateCommunityPostDto): Promise<CommunityPostDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const hashtags = Array.from(
      new Set((dto.hashtags || []).map(normalizeHashtag).filter(Boolean)),
    );

    const post = new this.communityPostModel({
      authorId: new Types.ObjectId(userId),
      authorName: dto.authorName.trim(),
      authorTitle: dto.authorTitle?.trim() || undefined,
      title: dto.title.trim(),
      content: dto.content.trim(),
      category: dto.category.trim(),
      hashtags,
      likeCount: 0,
      commentCount: 0,
      comments: [],
    });

    return post.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: { category?: string; search?: string; hashtag?: string } = {},
  ): Promise<{ data: CommunityPostDocument[]; total: number; page: number; totalPages: number }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const query: FilterQuery<CommunityPostDocument> = {};

    if (filters.category && filters.category !== 'Tất cả') {
      query.category = filters.category;
    }

    if (filters.hashtag) {
      query.hashtags = normalizeHashtag(filters.hashtag);
    }

    if (filters.search) {
      const term = filters.search.trim();
      if (term) {
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ title: regex }, { content: regex }, { authorName: regex }];
      }
    }

    const [data, total] = await Promise.all([
      this.communityPostModel
        .find(query)
        .select('-comments')
        .skip(skip)
        .limit(safeLimit)
        .sort({ createdAt: -1 })
        .exec(),
      this.communityPostModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findOne(id: string): Promise<CommunityPostDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid postId');
    }

    const post = await this.communityPostModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async listComments(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid postId');
    }

    const post = await this.communityPostModel.findById(id).select('comments').exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post.comments || [];
  }

  async addComment(
    postId: string,
    userId: string,
    dto: CreateCommunityCommentDto,
  ): Promise<CommunityPostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid postId');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const comment = {
      _id: new Types.ObjectId(),
      authorId: new Types.ObjectId(userId),
      authorName: dto.authorName.trim(),
      authorTitle: dto.authorTitle?.trim() || undefined,
      content: dto.content.trim(),
      createdAt: new Date(),
    };

    const updated = await this.communityPostModel
      .findByIdAndUpdate(
        postId,
        { $push: { comments: comment }, $inc: { commentCount: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Post not found');
    }

    return updated;
  }

  async remove(postId: string, userId: string, isAdmin: boolean): Promise<CommunityPostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid postId');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const post = await this.communityPostModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!isAdmin && post.authorId.toString() !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    const deleted = await this.communityPostModel.findByIdAndDelete(postId).exec();
    if (!deleted) {
      throw new NotFoundException('Post not found');
    }
    return deleted;
  }

  async toggleLike(postId: string, userId: string): Promise<CommunityPostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid postId');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const post = await this.communityPostModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const uId = new Types.ObjectId(userId);
    const hasLiked = post.likedUserIds?.some((id) => id.toString() === userId);

    if (hasLiked) {
      // Unlike
      return (await this.communityPostModel
        .findByIdAndUpdate(
          postId,
          { $pull: { likedUserIds: uId }, $inc: { likeCount: -1 } },
          { new: true },
        )
        .exec())!;
    } else {
      // Like
      return (await this.communityPostModel
        .findByIdAndUpdate(
          postId,
          { $addToSet: { likedUserIds: uId }, $inc: { likeCount: 1 } },
          { new: true },
        )
        .exec())!;
    }
  }

  async removeComment(
    postId: string,
    commentId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<CommunityPostDocument> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid postId');
    }
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid commentId');
    }

    const post = await this.communityPostModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const comment = post.comments.find((c: any) => c._id.toString() === commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isPostAuthor = post.authorId.toString() === userId;
    const isCommentAuthor = comment.authorId.toString() === userId;

    if (!isAdmin && !isPostAuthor && !isCommentAuthor) {
      throw new ForbiddenException('Forbidden');
    }

    return (await this.communityPostModel
      .findByIdAndUpdate(
        postId,
        { $pull: { comments: { _id: new Types.ObjectId(commentId) } }, $inc: { commentCount: -1 } },
        { new: true },
      )
      .exec())!;
  }

  async getTrendingHashtags(limit = 10): Promise<{ tag: string; count: number }[]> {
    const result = await this.communityPostModel.aggregate([
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result as any;
  }
}
