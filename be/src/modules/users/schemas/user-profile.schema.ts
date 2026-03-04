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
    transform: (doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class UserProfile {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  @Prop()
  dob?: Date;

  @Prop({ trim: true })
  locale?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: String, enum: Gender })
  gender?: Gender;

  @Prop({ type: String, enum: EducationLevel })
  educationLevel?: EducationLevel;

  @Prop()
  weeklyHours?: number;

  @Prop({ type: String, enum: BudgetLevel })
  budgetLevel?: BudgetLevel;

  @Prop({ type: Object })
  constraintsJson?: Record<string, any>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// Indexes
UserProfileSchema.index({ educationLevel: 1 });
UserProfileSchema.index({ city: 1 });
UserProfileSchema.index({ budgetLevel: 1 });