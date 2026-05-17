import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, PipelineStage, Types } from 'mongoose';
import { getAuthUserId, type AuthUserLike } from '../../common/auth';
import {
  AuditLog,
  AuditLogCategory,
  AuditLogDocument,
  AuditLogStatus,
} from './schema/audit-log.schema';

export interface AuditListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface ActivityLogListParams extends AuditListParams {
  source?: 'all' | 'audit' | 'tracking';
}

export interface AuditRecordParams {
  actor?: (AuthUserLike & { email?: string; name?: string }) | null;
  action: string;
  resource: string;
  resourceId?: string;
  category?: AuditLogCategory;
  status?: AuditLogStatus;
  metadata?: Record<string, unknown>;
  request?: Request;
}

type ActivityLogFacetResult = {
  logs: Record<string, unknown>[];
  total: { value: number }[];
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async record(params: AuditRecordParams): Promise<AuditLogDocument | null> {
    try {
      const actorId = getAuthUserId(params.actor);
      return await this.auditLogModel.create({
        actorId: Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : undefined,
        actorName: params.actor?.name,
        actorEmail: params.actor?.email,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        category: params.category || AuditLogCategory.USER_ACTION,
        status: params.status || AuditLogStatus.SUCCESS,
        metadata: params.metadata || {},
        ip: params.request?.ip,
        userAgent: params.request?.get('user-agent') || undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write audit log: ${message}`);
      return null;
    }
  }

  async list(params: AuditListParams = {}) {
    const page = this.toPositiveInteger(params.page, 1);
    const limit = Math.min(this.toPositiveInteger(params.limit, 20), 100);
    const filter: Record<string, unknown> = {};

    if (params.category && params.category !== 'all') {
      filter.category = params.category;
    }

    if (params.from || params.to) {
      const createdAt: Record<string, Date> = {};
      if (params.from) createdAt.$gte = new Date(params.from);
      if (params.to) createdAt.$lte = new Date(params.to);
      filter.createdAt = createdAt;
    }

    if (params.search?.trim()) {
      const regex = new RegExp(this.escapeRegex(params.search.trim()), 'i');
      filter.$or = [
        { action: regex },
        { resource: regex },
        { resourceId: regex },
        { actorName: regex },
        { actorEmail: regex },
      ];
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listActivityLogs(params: ActivityLogListParams = {}) {
    const page = this.toPositiveInteger(params.page, 1);
    const limit = Math.min(this.toPositiveInteger(params.limit, 20), 100);
    const skip = (page - 1) * limit;
    const source = params.source || (params.category === 'tracking' ? 'tracking' : 'all');
    const includeAudit = source !== 'tracking' && params.category !== 'tracking';
    const includeTracking =
      source !== 'audit' &&
      (!params.category || params.category === 'all' || params.category === 'tracking');

    const auditMatch = includeAudit
      ? this.buildAuditFilter(params)
      : { _id: { $exists: false } };
    const pipeline: PipelineStage[] = [
      { $match: auditMatch },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          source: { $literal: 'audit' },
          actorName: 1,
          actorEmail: 1,
          action: 1,
          resource: 1,
          resourceId: 1,
          category: 1,
          status: 1,
          metadata: 1,
          ip: 1,
          userAgent: 1,
          createdAt: 1,
        },
      },
    ];

    if (includeTracking) {
      pipeline.push({
        $unionWith: {
          coll: 'analytics_events',
          pipeline: [
            { $match: this.buildTrackingFilter(params) },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                source: { $literal: 'tracking' },
                action: { $concat: [{ $literal: 'tracking.' }, '$eventType'] },
                resource: '$path',
                resourceId: '$anonymousId',
                category: { $literal: 'tracking' },
                status: { $literal: 'success' },
                metadata: {
                  eventType: '$eventType',
                  path: '$path',
                  anonymousId: '$anonymousId',
                  details: '$metadata',
                },
                userAgent: '$userAgent',
                createdAt: '$createdAt',
              },
            },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          logs: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'value' }],
        },
      },
    );

    const [result] = await this.auditLogModel.aggregate<ActivityLogFacetResult>(pipeline).exec();
    const total = result?.total?.[0]?.value || 0;

    return {
      logs: result?.logs || [],
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private buildAuditFilter(params: AuditListParams): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (params.category && params.category !== 'all') {
      filter.category = params.category;
    }

    const createdAt = this.buildDateFilter(params.from, params.to);
    if (createdAt) filter.createdAt = createdAt;

    if (params.search?.trim()) {
      const regex = new RegExp(this.escapeRegex(params.search.trim()), 'i');
      filter.$or = [
        { action: regex },
        { resource: regex },
        { resourceId: regex },
        { actorName: regex },
        { actorEmail: regex },
      ];
    }

    return filter;
  }

  private buildTrackingFilter(params: AuditListParams): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    const createdAt = this.buildDateFilter(params.from, params.to);
    if (createdAt) filter.createdAt = createdAt;

    if (params.search?.trim()) {
      const regex = new RegExp(this.escapeRegex(params.search.trim()), 'i');
      filter.$or = [
        { eventType: regex },
        { path: regex },
        { anonymousId: regex },
        { userAgent: regex },
      ];
    }

    return filter;
  }

  private buildDateFilter(from?: string, to?: string): Record<string, Date> | null {
    if (!from && !to) return null;
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.$gte = new Date(from);
    if (to) createdAt.$lte = new Date(to);
    return createdAt;
  }

  private toPositiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
