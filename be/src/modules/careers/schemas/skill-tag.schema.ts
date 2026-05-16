import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SkillTagDocument = SkillTag & Document;

export type SkillTagCategory = 'technical' | 'soft' | 'leadership' | 'industry_specific';

@Schema({
  timestamps: true,
  collection: 'skill_tags',
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
export class SkillTag {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  slug!: string;

  @Prop({ type: String, default: 'technical' })
  category!: SkillTagCategory;

  @Prop({ type: [Types.ObjectId], ref: 'Career', default: [] })
  careerIds!: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  careerTitles!: string[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  usageCount!: number;
}

export const SkillTagSchema = SchemaFactory.createForClass(SkillTag);

SkillTagSchema.index({ slug: 1 }, { unique: true });
SkillTagSchema.index({ careerIds: 1 });
SkillTagSchema.index({ category: 1, isActive: 1 });
SkillTagSchema.index({ name: 'text' });
