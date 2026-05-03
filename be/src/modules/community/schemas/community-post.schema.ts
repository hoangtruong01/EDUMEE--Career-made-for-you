import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityPostDocument = CommunityPost & Document;

@Schema()
class CommunityComment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  authorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  authorName!: string;

  @Prop({ trim: true })
  authorTitle?: string;

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

const CommunityCommentSchema = SchemaFactory.createForClass(CommunityComment);

CommunityCommentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any): any => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    ret.id = ret._id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete ret._id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete ret.__v;
     
    return ret;
  },
});

@Schema({
  timestamps: true,
  collection: 'community_posts',
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>): Record<string, unknown> => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class CommunityPost {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  authorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  authorName!: string;

  @Prop({ trim: true })
  authorTitle?: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ required: true, trim: true })
  category!: string;

  @Prop({ type: [String], default: [] })
  hashtags!: string[];

  @Prop({ type: Number, default: 0 })
  likeCount!: number;

  @Prop({ type: Number, default: 0 })
  commentCount!: number;

  @Prop({ type: [Types.ObjectId], default: [], ref: 'User' })
  likedUserIds!: Types.ObjectId[];

  @Prop({ type: [CommunityCommentSchema], default: [] })
  comments!: CommunityComment[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const CommunityPostSchema = SchemaFactory.createForClass(CommunityPost);

CommunityPostSchema.index({ category: 1, createdAt: -1 });
CommunityPostSchema.index({ hashtags: 1, createdAt: -1 });
CommunityPostSchema.index({ createdAt: -1 });
