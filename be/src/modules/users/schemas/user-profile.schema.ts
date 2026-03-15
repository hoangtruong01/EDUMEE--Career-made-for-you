import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

// Enums
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum EducationLevel {
  // Học sinh
  ELEMENTARY = 'elementary',     // Tiểu học
  MIDDLE_SCHOOL = 'middle_school', // THCS
  HIGH_SCHOOL = 'high_school',    // THPT

  // Sinh viên
  COLLEGE = 'college',           // Cao đẳng
  BACHELOR = 'bachelor',         // Đại học
  MASTER = 'master',            // Thạc sĩ
  PHD = 'phd',                  // Tiến sĩ

  // Khác
  VOCATIONAL = 'vocational',     // Trung cấp nghề
  CERTIFICATE = 'certificate',   // Chứng chỉ
  OTHER = 'other',
}

export enum BudgetLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PREMIUM = 'premium',
}

@Schema({
  timestamps: true,
  collection: 'user_profiles',
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ret.id = ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.__v;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return ret;
    },
  },
})
export class UserProfile {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: Gender })
  gender?: Gender;

  @Prop()
  birthYear?: number;

  @Prop({ type: String, enum: EducationLevel })
  educationLevel?: EducationLevel;

  @Prop()
  currentJob?: string;

  @Prop({ type: Number })
  yearsOfExperience?: number;

  @Prop({ type: [String] })
  skills?: string[];

  @Prop({ type: String, enum: BudgetLevel })
  budgetLevel?: BudgetLevel;

  @Prop({ type: String })
  careerGoal?: string;

  @Prop({ type: String })
  bio?: string;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// Indexes
UserProfileSchema.index({ educationLevel: 1 });
UserProfileSchema.index({ careerGoal: 1 });
UserProfileSchema.index({ budgetLevel: 1 });