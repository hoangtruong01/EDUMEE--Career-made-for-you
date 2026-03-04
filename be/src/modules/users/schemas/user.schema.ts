import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';

export type UserDocument = User & Document;

export interface IUser extends Document {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  fullName?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Schema({
  timestamps: true,
  collection: 'users',
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email?: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop()
  avatar?: string;

  @Prop()
  phone?: string;

  // User role enum
  @Prop({ 
    required: true, 
    enum: UserRole, 
    default: UserRole.USER 
  })
  role?: UserRole;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop()
  lastLoginAt?: Date;

  // OAuth providers
  @Prop()
  googleId?: string;

  @Prop()
  facebookId?: string;

  // Security
  @Prop()
  verificationToken?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ facebookId: 1 }, { sparse: true });

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});
