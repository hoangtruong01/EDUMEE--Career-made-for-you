import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as XLSX from 'xlsx';
import {
  BillingCycle,
  SubscriptionStatus,
  UserSubscription,
} from '../../users/schemas/user-subscriptions';
import { User } from '../../users/schemas/user.schema';
import { MailService } from '../../../common/mail/mail.service';
import { AiPlan } from '../schema/ai-plan.schema';
import { AiSubscriptionService } from './ai-subscription.service';

describe('AiSubscriptionService', () => {
  let service: AiSubscriptionService;
  let userSubscriptionModel: any;
  let userModel: any;
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const mailService = {
    sendForgotPasswordEmail: jest.fn(),
  };
  const aiPlanModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('password-setup-token');
    configService.get.mockImplementation((key: string) => {
      if (key === 'jwt.forgotPasswordSecret') return 'forgot-secret';
      if (key === 'jwt.forgotPasswordExpiresIn') return '1d';
      return undefined;
    });
    mailService.sendForgotPasswordEmail.mockResolvedValue(undefined);
    userSubscriptionModel = jest.fn().mockImplementation(function createSubscription(
      this: any,
      payload: Record<string, unknown>,
    ) {
      Object.assign(this, payload);
      this._id = new Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    });
    userSubscriptionModel.findOne = jest.fn();
    userSubscriptionModel.updateMany = jest.fn().mockReturnValue(createQuery({ modifiedCount: 0 }));
    userSubscriptionModel.findOneAndUpdate = jest.fn();
    userSubscriptionModel.findByIdAndUpdate = jest.fn();
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSubscriptionService,
        { provide: getModelToken(UserSubscription.name), useValue: userSubscriptionModel },
        { provide: getModelToken(AiPlan.name), useValue: aiPlanModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(AiSubscriptionService);
  });

  it('creates a new active subscription when the user has no active plan', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const planId = '507f1f77bcf86cd799439012';
    const paymentId = '507f1f77bcf86cd799439013';
    const paidAt = new Date('2026-05-16T00:00:00.000Z');
    aiPlanModel.findById.mockReturnValue(createQuery({ id: planId }));
    userSubscriptionModel.findOne
      .mockReturnValueOnce(createQuery(null))
      .mockReturnValueOnce(createSortableQuery(null));

    const result = await service.activateSubscriptionFromPayment({
      userId,
      planId,
      paymentId,
      billingCycle: BillingCycle.MONTHLY,
      startDate: paidAt,
    });

    const payload = userSubscriptionModel.mock.calls[0][0];
    expect(payload.userId.toString()).toBe(userId);
    expect(payload.planId.toString()).toBe(planId);
    expect(payload.paymentId.toString()).toBe(paymentId);
    expect(payload.paymentIds.map((id: Types.ObjectId) => id.toString())).toEqual([paymentId]);
    expect(payload.startDate).toBe(paidAt);
    expect(payload.endDate.toISOString()).toBe('2026-06-16T00:00:00.000Z');
    expect(payload.quotaPeriodStart.toISOString()).toBe('2026-05-16T00:00:00.000Z');
    expect(payload.quotaPeriodEnd.toISOString()).toBe('2026-06-16T00:00:00.000Z');
    expect(payload.nextQuotaResetAt.toISOString()).toBe('2026-06-16T00:00:00.000Z');
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('renews the same active plan from the current end date', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const planId = '507f1f77bcf86cd799439012';
    const previousPaymentId = new Types.ObjectId('507f1f77bcf86cd799439013');
    const nextPaymentId = '507f1f77bcf86cd799439014';
    const activeSubscription = createSubscriptionDocument({
      userId,
      planId,
      paymentId: previousPaymentId,
      paymentIds: [previousPaymentId],
      endDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    aiPlanModel.findById.mockReturnValue(createQuery({ id: planId }));
    userSubscriptionModel.findOne
      .mockReturnValueOnce(createQuery(null))
      .mockReturnValueOnce(createSortableQuery(activeSubscription));

    const result = await service.activateSubscriptionFromPayment({
      userId,
      planId,
      paymentId: nextPaymentId,
      billingCycle: BillingCycle.MONTHLY,
      startDate: new Date('2026-05-16T00:00:00.000Z'),
    });

    expect(result).toBe(activeSubscription);
    expect(activeSubscription.endDate?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(activeSubscription.quotaPeriodStart?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(activeSubscription.quotaPeriodEnd?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(activeSubscription.nextQuotaResetAt?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(activeSubscription.paymentIds.map((id: Types.ObjectId) => id.toString())).toEqual([
      previousPaymentId.toString(),
      nextPaymentId,
    ]);
    expect(activeSubscription.save).toHaveBeenCalledTimes(1);
    expect(userSubscriptionModel).not.toHaveBeenCalled();
  });

  it('upgrades to a different active plan immediately and cancels the old plan', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const oldPlanId = '507f1f77bcf86cd799439012';
    const newPlanId = '507f1f77bcf86cd799439015';
    const paymentId = '507f1f77bcf86cd799439016';
    const paidAt = new Date('2026-05-16T00:00:00.000Z');
    const activeSubscription = createSubscriptionDocument({
      userId,
      planId: oldPlanId,
      paymentId: new Types.ObjectId('507f1f77bcf86cd799439013'),
      paymentIds: [],
      endDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    aiPlanModel.findById.mockReturnValue(createQuery({ id: newPlanId }));
    userSubscriptionModel.findOne
      .mockReturnValueOnce(createQuery(null))
      .mockReturnValueOnce(createSortableQuery(activeSubscription));

    await service.activateSubscriptionFromPayment({
      userId,
      planId: newPlanId,
      paymentId,
      billingCycle: BillingCycle.THREE_MONTHS,
      startDate: paidAt,
    });

    expect(activeSubscription.status).toBe(SubscriptionStatus.CANCELLED);
    expect(activeSubscription.endDate).toBe(paidAt);
    expect(activeSubscription.save).toHaveBeenCalledTimes(1);
    const payload = userSubscriptionModel.mock.calls[0][0];
    expect(payload.planId.toString()).toBe(newPlanId);
    expect(payload.paymentId.toString()).toBe(paymentId);
    expect(payload.endDate.toISOString()).toBe('2026-08-16T00:00:00.000Z');
    expect(payload.quotaPeriodStart.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(payload.quotaPeriodEnd.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(payload.nextQuotaResetAt.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('assigns a plan to a user by case-insensitive email', async () => {
    const userId = '507f1f77bcf86cd799439021';
    const planId = '507f1f77bcf86cd799439022';
    const startDate = new Date('2026-05-17T00:00:00.000Z');
    userModel.findOne.mockReturnValue(createQuery(createUserDocument(userId)));
    aiPlanModel.findById.mockReturnValue(createQuery({ id: planId }));

    const result = await service.assignUserToPlan({
      identifier: '  USER@Example.com ',
      planId,
      billingCycle: BillingCycle.THREE_MONTHS,
      startDate,
    });

    const emailFilter = userModel.findOne.mock.calls[0][0];
    expect(String(emailFilter.email)).toBe('/^USER@Example\\.com$/i');
    expect(userSubscriptionModel.updateMany).toHaveBeenCalledWith(
      { userId: new Types.ObjectId(userId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.CANCELLED, endDate: expect.any(Date) } },
    );
    const payload = userSubscriptionModel.mock.calls[0][0];
    expect(payload.userId.toString()).toBe(userId);
    expect(payload.planId.toString()).toBe(planId);
    expect(payload.billingCycle).toBe(BillingCycle.THREE_MONTHS);
    expect(payload.startDate).toBe(startDate);
    expect(payload.endDate.toISOString()).toBe('2026-08-17T00:00:00.000Z');
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('assigns a plan to a selected user id', async () => {
    const userId = '507f1f77bcf86cd799439061';
    const planId = '507f1f77bcf86cd799439062';
    userModel.findById.mockReturnValue(createQuery(createUserDocument(userId)));
    aiPlanModel.findById.mockReturnValue(createQuery({ id: planId }));

    await service.assignUserToPlan({
      userId,
      identifier: 'ignored@example.com',
      planId,
      billingCycle: BillingCycle.MONTHLY,
    });

    expect(userModel.findById).toHaveBeenCalledWith(userId);
    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(userModel.find).not.toHaveBeenCalled();
    const payload = userSubscriptionModel.mock.calls[0][0];
    expect(payload.userId.toString()).toBe(userId);
    expect(payload.planId.toString()).toBe(planId);
  });

  it('rejects assignment when neither user id nor identifier is provided', async () => {
    await expect(
      service.assignUserToPlan({
        planId: '507f1f77bcf86cd799439071',
      }),
    ).rejects.toThrow('Select a user before assigning a plan');
    expect(userModel.findById).not.toHaveBeenCalled();
    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(userModel.find).not.toHaveBeenCalled();
    expect(aiPlanModel.findById).not.toHaveBeenCalled();
  });

  it('assigns a plan to a user by phone when one user matches', async () => {
    const userId = '507f1f77bcf86cd799439031';
    const planId = '507f1f77bcf86cd799439032';
    userModel.find.mockReturnValue(createLimitedQuery([createUserDocument(userId)]));
    aiPlanModel.findById.mockReturnValue(createQuery({ id: planId }));

    await service.assignUserToPlan({
      identifier: '090 123 4567',
      planId,
      billingCycle: BillingCycle.MONTHLY,
    });

    const phoneFilter = userModel.find.mock.calls[0][0];
    expect(phoneFilter.phone_number.$in).toEqual(['090 123 4567', '0901234567']);
    const payload = userSubscriptionModel.mock.calls[0][0];
    expect(payload.userId.toString()).toBe(userId);
    expect(payload.planId.toString()).toBe(planId);
  });

  it('rejects ambiguous phone assignment and asks admin to use email', async () => {
    userModel.find.mockReturnValue(
      createLimitedQuery([
        createUserDocument('507f1f77bcf86cd799439041'),
        createUserDocument('507f1f77bcf86cd799439042'),
      ]),
    );

    await expect(
      service.assignUserToPlan({
        identifier: '0901234567',
        planId: '507f1f77bcf86cd799439043',
      }),
    ).rejects.toThrow('Multiple users match this phone number. Use email instead');
    expect(aiPlanModel.findById).not.toHaveBeenCalled();
  });

  it('rejects assignment when the identifier does not match any user', async () => {
    userModel.findOne.mockReturnValue(createQuery(null));

    await expect(
      service.assignUserToPlan({
        identifier: 'missing@example.com',
        planId: '507f1f77bcf86cd799439051',
      }),
    ).rejects.toThrow('User not found');
    expect(aiPlanModel.findById).not.toHaveBeenCalled();
  });

  it('imports new users and assigns existing users from Excel', async () => {
    const planId = '507f1f77bcf86cd799439081';
    const newUserId = '507f1f77bcf86cd799439082';
    const existingUserId = '507f1f77bcf86cd799439083';
    aiPlanModel.findById.mockReturnValue(
      createQuery({ id: planId, allowedBillingCycles: [BillingCycle.THREE_MONTHS] }),
    );
    userModel.findOne
      .mockReturnValueOnce(createQuery(null))
      .mockReturnValueOnce(createQuery(createUserDocument(existingUserId)));
    userModel.create.mockResolvedValue(createUserDocument(newUserId));

    const result = await service.importUsersToPlan(
      createExcelFile([
        {
          name: 'New User',
          email: 'NEW@Example.com',
          gender: 'Nam',
          date_of_birth: '2000-01-02',
          phone_number: '0901234567',
          city: 'TP HCM',
        },
        {
          name: 'Existing User',
          email: 'existing@example.com',
          gender: 'Nu',
          date_of_birth: '02/03/2001',
        },
      ]),
      { planId, billingCycle: BillingCycle.THREE_MONTHS },
    );

    expect(result.totalRows).toBe(2);
    expect(result.createdUsers).toBe(1);
    expect(result.assignedExistingUsers).toBe(1);
    expect(result.failedRows).toBe(0);
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New User',
        email: 'new@example.com',
        phone_number: '0901234567',
        role: 'user',
        login_type: 'password',
        forgot_password_token: 'password-setup-token',
      }),
    );
    expect(mailService.sendForgotPasswordEmail).toHaveBeenCalledWith(
      'new@example.com',
      'New User',
      'password-setup-token',
    );
    expect(userSubscriptionModel).toHaveBeenCalledTimes(2);
    expect(userSubscriptionModel.mock.calls[0][0].userId.toString()).toBe(newUserId);
    expect(userSubscriptionModel.mock.calls[1][0].userId.toString()).toBe(existingUserId);
  });

  it('marks duplicate emails in the same import file as row failures', async () => {
    const planId = '507f1f77bcf86cd799439091';
    aiPlanModel.findById.mockReturnValue(
      createQuery({ id: planId, allowedBillingCycles: [BillingCycle.MONTHLY] }),
    );
    userModel.findOne.mockReturnValue(createQuery(null));
    userModel.create.mockResolvedValue(createUserDocument('507f1f77bcf86cd799439092'));

    const result = await service.importUsersToPlan(
      createExcelFile([
        {
          name: 'First User',
          email: 'duplicate@example.com',
          gender: 'Nam',
          date_of_birth: '2000-01-02',
        },
        {
          name: 'Second User',
          email: 'DUPLICATE@example.com',
          gender: 'Nu',
          date_of_birth: '2001-02-03',
        },
      ]),
      { planId, billingCycle: BillingCycle.MONTHLY },
    );

    expect(result.createdUsers).toBe(1);
    expect(result.failedRows).toBe(1);
    expect(result.rows[1].status).toBe('failed');
    expect(result.rows[1].message).toContain('duplicated');
    expect(userModel.findOne).toHaveBeenCalledTimes(1);
  });

  it('reports invalid import rows without creating users', async () => {
    const planId = '507f1f77bcf86cd799439101';
    aiPlanModel.findById.mockReturnValue(
      createQuery({ id: planId, allowedBillingCycles: [BillingCycle.MONTHLY] }),
    );

    const result = await service.importUsersToPlan(
      createExcelFile([
        {
          name: 'Invalid User',
          email: 'not-an-email',
          gender: '',
          date_of_birth: '31/02/2001',
        },
      ]),
      { planId, billingCycle: BillingCycle.MONTHLY },
    );

    expect(result.failedRows).toBe(1);
    expect(result.rows[0].message).toContain('email is invalid');
    expect(result.rows[0].message).toContain('gender is required');
    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('rejects import when billing cycle is not supported by the plan', async () => {
    const planId = '507f1f77bcf86cd799439111';
    aiPlanModel.findById.mockReturnValue(
      createQuery({ id: planId, allowedBillingCycles: [BillingCycle.MONTHLY] }),
    );

    await expect(
      service.importUsersToPlan(
        createExcelFile([
          {
            name: 'Unsupported Cycle',
            email: 'unsupported@example.com',
            gender: 'Nam',
            date_of_birth: '2000-01-02',
          },
        ]),
        { planId, billingCycle: BillingCycle.THREE_MONTHS },
      ),
    ).rejects.toThrow('Billing cycle is not supported by this plan');
    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('keeps imported user success when password setup email fails', async () => {
    const planId = '507f1f77bcf86cd799439121';
    aiPlanModel.findById.mockReturnValue(
      createQuery({ id: planId, allowedBillingCycles: [BillingCycle.MONTHLY] }),
    );
    userModel.findOne.mockReturnValue(createQuery(null));
    userModel.create.mockResolvedValue(createUserDocument('507f1f77bcf86cd799439122'));
    mailService.sendForgotPasswordEmail.mockRejectedValue(new Error('SMTP down'));

    const result = await service.importUsersToPlan(
      createExcelFile([
        {
          name: 'Mail Warning',
          email: 'warning@example.com',
          gender: 'Nam',
          date_of_birth: '2000-01-02',
        },
      ]),
      { planId, billingCycle: BillingCycle.MONTHLY },
    );

    expect(result.createdUsers).toBe(1);
    expect(result.failedRows).toBe(0);
    expect(result.emailWarningRows).toBe(1);
    expect(result.rows[0].warnings?.[0]).toContain('email could not be sent');
  });

  it('returns the active subscription when the payment was already linked', async () => {
    const linkedSubscription = createSubscriptionDocument({
      userId: '507f1f77bcf86cd799439011',
      planId: '507f1f77bcf86cd799439012',
      paymentId: new Types.ObjectId('507f1f77bcf86cd799439013'),
      paymentIds: [],
      endDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    userSubscriptionModel.findOne.mockReturnValueOnce(createQuery(linkedSubscription));

    const result = await service.activateSubscriptionFromPayment({
      userId: '507f1f77bcf86cd799439011',
      planId: '507f1f77bcf86cd799439012',
      paymentId: '507f1f77bcf86cd799439013',
      billingCycle: BillingCycle.MONTHLY,
      startDate: new Date('2026-05-16T00:00:00.000Z'),
    });

    expect(result).toBe(linkedSubscription);
    expect(aiPlanModel.findById).not.toHaveBeenCalled();
  });

  it('revokes subscriptions linked by legacy paymentId or paymentIds', async () => {
    const paymentId = '507f1f77bcf86cd799439013';
    const revokedSubscription = createSubscriptionDocument({
      userId: '507f1f77bcf86cd799439011',
      planId: '507f1f77bcf86cd799439012',
      paymentId: new Types.ObjectId(paymentId),
      paymentIds: [new Types.ObjectId(paymentId)],
      endDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    userSubscriptionModel.findOneAndUpdate.mockReturnValue(createQuery(revokedSubscription));

    const result = await service.revokeSubscriptionForPayment(paymentId);

    expect(result).toBe(revokedSubscription);
    const filter = userSubscriptionModel.findOneAndUpdate.mock.calls[0][0];
    expect(filter.status).toBe(SubscriptionStatus.ACTIVE);
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].paymentId.toString()).toBe(paymentId);
    expect(filter.$or[1].paymentIds.toString()).toBe(paymentId);
  });
});

function createExcelFile(rows: Record<string, unknown>[]): Express.Multer.File {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  return {
    originalname: 'users.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

function createQuery<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function createSortableQuery<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function createLimitedQuery<T>(value: T) {
  return {
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function createUserDocument(userId: string) {
  return {
    _id: new Types.ObjectId(userId),
  };
}

function createSubscriptionDocument(params: {
  userId: string;
  planId: string;
  paymentId?: Types.ObjectId;
  paymentIds: Types.ObjectId[];
  endDate: Date;
  quotaPeriodStart?: Date;
  quotaPeriodEnd?: Date;
  nextQuotaResetAt?: Date;
}) {
  const subscription = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(params.userId),
    planId: new Types.ObjectId(params.planId),
    paymentId: params.paymentId,
    paymentIds: params.paymentIds,
    billingCycle: BillingCycle.MONTHLY,
    startDate: new Date('2026-05-01T00:00:00.000Z'),
    endDate: params.endDate,
    quotaPeriodStart: params.quotaPeriodStart,
    quotaPeriodEnd: params.quotaPeriodEnd,
    nextQuotaResetAt: params.nextQuotaResetAt,
    status: SubscriptionStatus.ACTIVE,
    save: jest.fn(),
  };
  subscription.save.mockResolvedValue(subscription);
  return subscription;
}
