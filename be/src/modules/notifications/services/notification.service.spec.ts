import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import { Notification, NotificationType } from '../schemas';
import { NotificationService } from './notification.service';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('NotificationService', () => {
  let service: NotificationService;

  const notificationModel = jest.fn().mockImplementation((data: Record<string, unknown>) => {
    const doc: Record<string, unknown> & { _id: Types.ObjectId; save: jest.Mock; toJSON: jest.Mock } = {
      _id: new Types.ObjectId(),
      ...data,
      toJSON: jest.fn().mockImplementation(() => ({
        id: doc._id.toString(),
        ...data,
      })),
      save: jest.fn(),
    };
    doc.save.mockResolvedValue(doc);
    return doc;
  }) as jest.Mock & Record<string, jest.Mock>;

  notificationModel.find = jest.fn();
  notificationModel.findOneAndUpdate = jest.fn();
  notificationModel.updateMany = jest.fn();

  const jwtService = {
    verify: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('secret'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue(createExecMock([])),
      }),
    });
    notificationModel.findOneAndUpdate.mockReturnValue(createExecMock(null));
    notificationModel.updateMany.mockReturnValue(createExecMock({ modifiedCount: 0 }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getModelToken(Notification.name), useValue: notificationModel },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('persists and publishes realtime notification events', async () => {
    const recipientId = new Types.ObjectId();
    jwtService.verify.mockReturnValue({ user_id: recipientId.toString() });

    const eventPromise = firstValueFrom(service.stream('token').pipe(skip(1), take(1)));
    await service.create({
      recipientId,
      type: NotificationType.MENTOR_BOOKING_PENDING,
      title: 'Booking mới',
      body: 'Có booking mới',
      payload: { bookingId: 'booking-1' },
    });

    await expect(eventPromise).resolves.toEqual(
      expect.objectContaining({
        type: 'notification',
        data: expect.objectContaining({
          title: 'Booking mới',
        }),
      }),
    );
  });

  it('rejects invalid stream tokens', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    expect(() => service.stream('bad-token')).toThrow(UnauthorizedException);
  });
});
