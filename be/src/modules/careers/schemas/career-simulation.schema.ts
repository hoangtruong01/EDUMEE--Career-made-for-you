import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CareerSimulationDocument = CareerSimulation & Document;

export interface CareerSimulationData {
  careerTitle: string;
  levels: {
    label: string;
    salaryRange: string;
    yearRange: string;
    dailyTasks: string[];
    typicalSchedule: { time: string; activity: string }[];
    challenges: string[];
    tips: string[];
  }[];
}

@Schema({
  timestamps: true,
  collection: 'career_simulations',
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
export class CareerSimulation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  careerTitle!: string;

  @Prop({ type: Object, required: true })
  simulationData!: CareerSimulationData;

  @Prop({ default: Date.now })
  lastGeneratedAt!: Date;
}

export const CareerSimulationSchema = SchemaFactory.createForClass(CareerSimulation);

// Ensure a user has only one simulation per career title
CareerSimulationSchema.index({ userId: 1, careerTitle: 1 }, { unique: true });
