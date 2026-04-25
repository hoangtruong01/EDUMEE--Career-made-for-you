import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole, UserVerifyStatus } from '../../../common/enums';

export type UserDocument = HydratedDocument<User>;

// (Nested Schema)
@Schema({ _id: false }) // Không tạo _id cho object con
@Schema({ _id: false })
class Address {
  @Prop({ default: '' })
  street!: string;

  @Prop({ default: '' })
  ward!: string;

  @Prop({ default: '' })
  district!: string;

  @Prop({ default: '' })
  city!: string;

  @Prop({ default: '' })
  country!: string;

  @Prop({ default: '' })
  zipcode?: string;
}

// 2. Định nghĩa Schema User
@Schema({
  collection: 'users', // Tên collection
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class User {
  // tự động tạo _id (ObjectId)

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  gender!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  date_of_birth!: Date;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: '' })
  phone_number!: string;

  @Prop({ type: Address, default: () => ({}) })
  Address!: Address;

  @Prop({ default: '' })
  email_verify_token!: string;

  @Prop({ default: '' })
  forgot_password_token!: string;

  @Prop({ enum: UserVerifyStatus, default: UserVerifyStatus.Unverified })
  verify!: UserVerifyStatus;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Prop({ default: '' })
  location!: string;

  @Prop({ default: '' })
  username!: string;

  @Prop({ default: '' })
  avatar!: string;

  created_at!: Date;
  updated_at!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
