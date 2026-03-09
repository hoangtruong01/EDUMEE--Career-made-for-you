import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// Định nghĩa Document type để dùng trong Service
export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({
  collection: 'refresh_tokens', // Tên collection trong MongoDB
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class RefreshToken {
  // Mongoose tự động tạo _id

  @Prop({ required: true })
  token!: string;

  // Lưu user_id dưới dạng ObjectId và tham chiếutới users
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id!: Types.ObjectId;

  @Prop({ required: true })
  iat!: Date;

  @Prop({ required: true })
  exp!: Date;

  @Prop({ required: true })
  user_role!: string;
}

// Tạo Schema từ Class
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
