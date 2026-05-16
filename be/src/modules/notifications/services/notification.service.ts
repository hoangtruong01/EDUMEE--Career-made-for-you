import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Observable, Subject } from 'rxjs';
import { finalize, startWith } from 'rxjs/operators';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';
import { Notification, NotificationDocument, NotificationType } from '../schemas';

interface JwtPayloadLike {
  user_id?: string;
  sub?: string;
  id?: string;
}

export interface CreateNotificationInput {
  recipientId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly streams = new Map<string, Set<Subject<MessageEvent>>>();

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    const recipientId = this.toObjectId(input.recipientId, 'recipientId');
    const notification = await new this.notificationModel({
      recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload || {},
    }).save();

    this.publish(recipientId.toString(), notification);
    return notification;
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<NotificationDocument[]> {
    const created: NotificationDocument[] = [];
    for (const input of inputs) {
      created.push(await this.create(input));
    }
    return created;
  }

  async findMine(user: AuthUserLike): Promise<NotificationDocument[]> {
    const userId = this.requireUserId(user);
    return this.notificationModel
      .find({ recipientId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async markRead(id: string, user: AuthUserLike): Promise<NotificationDocument> {
    const userId = this.requireUserId(user);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid notification id');

    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(userId) },
        { readAt: new Date() },
        { new: true },
      )
      .exec();

    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(user: AuthUserLike): Promise<{ modifiedCount: number }> {
    const userId = this.requireUserId(user);
    const result = await this.notificationModel
      .updateMany(
        { recipientId: new Types.ObjectId(userId), readAt: { $exists: false } },
        { readAt: new Date() },
      )
      .exec();
    return { modifiedCount: result.modifiedCount };
  }

  stream(token: string): Observable<MessageEvent> {
    const userId = this.verifyStreamToken(token);
    const subject = new Subject<MessageEvent>();
    const userStreams = this.streams.get(userId) || new Set<Subject<MessageEvent>>();
    userStreams.add(subject);
    this.streams.set(userId, userStreams);

    return subject.asObservable().pipe(
      startWith({
        type: 'connected',
        data: { connected: true },
      }),
      finalize(() => {
        userStreams.delete(subject);
        if (userStreams.size === 0) this.streams.delete(userId);
      }),
    );
  }

  private publish(userId: string, notification: NotificationDocument): void {
    const userStreams = this.streams.get(userId);
    if (!userStreams?.size) return;

    const event: MessageEvent = {
      id: notification._id.toString(),
      type: 'notification',
      data: notification.toJSON ? notification.toJSON() : notification,
    };

    userStreams.forEach((stream) => stream.next(event));
  }

  private verifyStreamToken(token: string): string {
    if (!token) throw new UnauthorizedException('Missing stream token');

    try {
      const payload = this.jwtService.verify<JwtPayloadLike>(token, {
        secret: this.configService.get<string>('jwt.accessTokenSecret'),
      });
      const userId = payload.user_id || payload.sub || payload.id;
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new UnauthorizedException('Invalid stream token');
      }
      return userId;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid stream token');
    }
  }

  private requireUserId(user: AuthUserLike): string {
    const userId = getAuthUserId(user);
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Missing user context');
    }
    return userId;
  }

  private toObjectId(value: string | Types.ObjectId, fieldName: string): Types.ObjectId {
    const stringValue = value.toString();
    if (!Types.ObjectId.isValid(stringValue)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return new Types.ObjectId(stringValue);
  }
}
