import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditLogCategory {
  USER_ACTION = 'user_action',
  SECURITY = 'security',
  SYSTEM = 'system',
}

export enum AuditLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class AuditLog {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ type: String, trim: true })
  actorName?: string;

  @Prop({ type: String, trim: true, lowercase: true })
  actorEmail?: string;

  @Prop({ type: String, required: true, trim: true })
  action!: string;

  @Prop({ type: String, required: true, trim: true })
  resource!: string;

  @Prop({ type: String, trim: true })
  resourceId?: string;

  @Prop({ type: String, enum: AuditLogCategory, default: AuditLogCategory.USER_ACTION })
  category!: AuditLogCategory;

  @Prop({ type: String, enum: AuditLogStatus, default: AuditLogStatus.SUCCESS })
  status!: AuditLogStatus;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: String, trim: true })
  ip?: string;

  @Prop({ type: String, trim: true })
  userAgent?: string;

  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
