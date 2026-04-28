import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CareerInsightDocument = CareerInsight & Document;

@Schema({
  timestamps: true,
  collection: 'career_insights',
})
export class CareerInsight {
  @Prop({ required: true, unique: true, index: true, trim: true })
  careerTitle!: string;

  @Prop({ type: Object, required: true })
  analysis!: {
    overview: string;
    pros: string[];
    cons: string[];
    trends: { year: string; description: string }[];
    salaryRange: string;
    demandLevel: string;
    keySkills: string[];
    topCompanies: string[];
  };

  @Prop({ required: true, default: Date.now })
  lastAIUpdate!: Date;
}

export const CareerInsightSchema = SchemaFactory.createForClass(CareerInsight);

// Index to automatically expire documents if we wanted to use TTL index, 
// but we want a 1-month custom logic so we keep lastAIUpdate.
