import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Request } from 'express';
import { Model } from 'mongoose';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
} from './schema/analytics-event.schema';
import {
  ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH,
  ANALYTICS_EVENT_PATH_MAX_LENGTH,
  ANALYTICS_EVENT_TYPE_MAX_LENGTH,
} from './tracking.constants';

export interface TrackingEventListParams {
  page?: number;
  limit?: number;
  eventType?: string;
  path?: string;
}

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsEventModel: Model<AnalyticsEventDocument>,
  ) {}

  async recordEvent(dto: CreateAnalyticsEventDto, request?: Request) {
    const path = this.sanitizePath(dto.path);
    const eventType =
      dto.eventType.trim().slice(0, ANALYTICS_EVENT_TYPE_MAX_LENGTH) || 'unknown';
    const anonymousId = dto.anonymousId
      .trim()
      .slice(0, ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH);

    return this.analyticsEventModel.create({
      eventType,
      path,
      anonymousId,
      metadata: dto.metadata || {},
      userAgent: request?.get('user-agent')?.slice(0, 500),
      ipHash: request?.ip ? this.hashIp(request.ip) : undefined,
    });
  }

  async listEvents(params: TrackingEventListParams = {}) {
    const page = this.toPositiveInteger(params.page, 1);
    const limit = Math.min(this.toPositiveInteger(params.limit, 20), 100);
    const filter: Record<string, unknown> = {};

    if (params.eventType && params.eventType !== 'all') {
      filter.eventType = params.eventType;
    }

    if (params.path?.trim()) {
      filter.path = new RegExp(this.escapeRegex(params.path.trim()), 'i');
    }

    const [events, total] = await Promise.all([
      this.analyticsEventModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.analyticsEventModel.countDocuments(filter).exec(),
    ]);

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  countPageViews(from: Date, to: Date): Promise<number> {
    return this.analyticsEventModel
      .countDocuments({ eventType: 'page_view', createdAt: { $gte: from, $lt: to } })
      .exec();
  }

  async countActiveVisitors(from: Date, to: Date): Promise<number> {
    const visitors = await this.analyticsEventModel
      .distinct('anonymousId', { createdAt: { $gte: from, $lt: to } })
      .exec();
    return visitors.length;
  }

  countEventsInRange(from: Date, to: Date, eventType?: string): Promise<number> {
    return this.analyticsEventModel
      .countDocuments({
        ...(eventType ? { eventType } : {}),
        createdAt: { $gte: from, $lt: to },
      })
      .exec();
  }

  private sanitizePath(path: string): string {
    const trimmed = path.trim() || '/';
    if (!trimmed.startsWith('/')) {
      return `/${trimmed}`.slice(0, ANALYTICS_EVENT_PATH_MAX_LENGTH);
    }
    return trimmed.slice(0, ANALYTICS_EVENT_PATH_MAX_LENGTH);
  }

  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').slice(0, 32);
  }

  private toPositiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
