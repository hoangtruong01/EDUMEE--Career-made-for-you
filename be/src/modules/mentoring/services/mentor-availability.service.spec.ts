import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  MentorAvailabilitySlot,
  MentorAvailabilitySlotStatus,
} from '../schemas/mentor-availability-slot.schema';
import { TutorProfile, TutorStatus } from '../schemas/tutor-profile.schema';
import { MentorAvailabilityService } from './mentor-availability.service';
import { NotificationService } from '../../notifications/services';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('MentorAvailabilityService', () => {
  let service: MentorAvailabilityService;

  const slotModel = jest.fn() as jest.Mock & Record<string, jest.Mock>;
  slotModel.findById = jest.fn();
  slotModel.findByIdAndUpdate = jest.fn();
  slotModel.findByIdAndDelete = jest.fn();
  slotModel.findOneAndUpdate = jest.fn();
  slotModel.updateMany = jest.fn();
  slotModel.exists = jest.fn();

  const tutorProfileModel = {
    findById: jest.fn(),
  };
  const notificationService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    slotModel.mockImplementation((data: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...data,
      save: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        ...data,
      }),
    }));
    slotModel.updateMany.mockReturnValue(createExecMock({ modifiedCount: 0 }));
    slotModel.exists.mockReturnValue(createExecMock(null));
    slotModel.findById.mockReturnValue(createExecMock(null));
    slotModel.findByIdAndUpdate.mockReturnValue(createExecMock(null));
    slotModel.findByIdAndDelete.mockReturnValue(createExecMock(null));
    notificationService.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorAvailabilityService,
        { provide: getModelToken(MentorAvailabilitySlot.name), useValue: slotModel },
        { provide: getModelToken(TutorProfile.name), useValue: tutorProfileModel },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(MentorAvailabilityService);
  });

  it('holds only an available future slot for a booking', async () => {
    const slotId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    const menteeId = new Types.ObjectId();
    const heldSlot = {
      _id: slotId,
      tutorProfileId,
      status: MentorAvailabilitySlotStatus.HELD,
    };
    slotModel.findOneAndUpdate.mockReturnValue(createExecMock(heldSlot));

    const result = await service.holdSlotForBooking(
      slotId.toString(),
      tutorProfileId.toString(),
      menteeId.toString(),
    );

    expect(result).toBe(heldSlot);
    expect(slotModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: slotId,
        tutorProfileId,
        status: MentorAvailabilitySlotStatus.AVAILABLE,
      }),
      expect.objectContaining({
        status: MentorAvailabilitySlotStatus.HELD,
        heldBy: menteeId,
      }),
      { new: true },
    );
  });

  it('rejects a slot that is no longer available', async () => {
    slotModel.findOneAndUpdate.mockReturnValue(createExecMock(null));

    await expect(
      service.holdSlotForBooking(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates fixed 90-minute slots across repeated weeks', async () => {
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    tutorProfileModel.findById.mockReturnValue(
      createExecMock({
        _id: tutorProfileId,
        userId: mentorId,
        status: TutorStatus.ACTIVE,
      }),
    );

    const result = await service.createBulkSlots(
      { userId: mentorId.toString(), role: 'mentor' },
      {
        tutorProfileId: tutorProfileId.toString(),
        weekStart: '2099-01-05T00:00:00.000Z',
        slotStarts: [{ dayIndex: 0, startTime: '08:00' }],
        repeatWeeks: 2,
      },
    );

    expect(result.created).toHaveLength(2);
    expect(slotModel).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: expect.any(Date),
        endAt: expect.any(Date),
        status: MentorAvailabilitySlotStatus.AVAILABLE,
      }),
    );
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: mentorId,
      }),
    );
  });

  it('skips overlapping bulk slots without failing the whole request', async () => {
    const mentorId = new Types.ObjectId();
    const tutorProfileId = new Types.ObjectId();
    tutorProfileModel.findById.mockReturnValue(
      createExecMock({
        _id: tutorProfileId,
        userId: mentorId,
        status: TutorStatus.ACTIVE,
      }),
    );
    slotModel.exists.mockReturnValue(createExecMock({ _id: new Types.ObjectId() }));

    const result = await service.createBulkSlots(
      { userId: mentorId.toString(), role: 'mentor' },
      {
        tutorProfileId: tutorProfileId.toString(),
        weekStart: '2099-01-05T00:00:00.000Z',
        slotStarts: [{ dayIndex: 0, startTime: '08:00' }],
        repeatWeeks: 1,
      },
    );

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        reason: 'overlap',
      }),
    ]);
  });

  it('updates an available slot to a new future 90-minute range', async () => {
    const mentorId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 90 * 60_000);
    const updatedSlot = {
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.AVAILABLE,
      startAt,
      endAt,
    };
    slotModel.findById.mockReturnValue(createExecMock({
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.AVAILABLE,
      startAt: new Date(startAt.getTime() - 90 * 60_000),
      endAt: startAt,
    }));
    slotModel.findByIdAndUpdate.mockReturnValue(createExecMock(updatedSlot));

    const result = await service.updateSlot(
      slotId.toString(),
      { userId: mentorId.toString(), role: 'mentor' },
      { startAt, endAt },
    );

    expect(result).toBe(updatedSlot);
    expect(slotModel.findByIdAndUpdate).toHaveBeenCalledWith(
      slotId.toString(),
      expect.objectContaining({ startAt, endAt }),
      { new: true },
    );
  });

  it('rejects updating an available slot into an overlapping range', async () => {
    const mentorId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 90 * 60_000);
    slotModel.findById.mockReturnValue(createExecMock({
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.AVAILABLE,
      startAt,
      endAt,
    }));
    slotModel.exists.mockReturnValue(createExecMock({ _id: new Types.ObjectId() }));

    await expect(
      service.updateSlot(
        slotId.toString(),
        { userId: mentorId.toString(), role: 'mentor' },
        { startAt: new Date(startAt.getTime() + 90 * 60_000), endAt: new Date(endAt.getTime() + 90 * 60_000) },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects updating a booked or held slot', async () => {
    const mentorId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    slotModel.findById.mockReturnValue(createExecMock({
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.BOOKED,
      startAt,
      endAt: new Date(startAt.getTime() + 90 * 60_000),
    }));

    await expect(
      service.updateSlot(
        slotId.toString(),
        { userId: mentorId.toString(), role: 'mentor' },
        { startAt, endAt: new Date(startAt.getTime() + 90 * 60_000) },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    slotModel.findById.mockReturnValue(createExecMock({
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.HELD,
      startAt,
      endAt: new Date(startAt.getTime() + 90 * 60_000),
    }));

    await expect(
      service.updateSlot(
        slotId.toString(),
        { userId: mentorId.toString(), role: 'mentor' },
        { startAt, endAt: new Date(startAt.getTime() + 90 * 60_000) },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes only available slots', async () => {
    const mentorId = new Types.ObjectId();
    const slotId = new Types.ObjectId();
    const slot = {
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.AVAILABLE,
    };
    slotModel.findById.mockReturnValue(createExecMock(slot));
    slotModel.findByIdAndDelete.mockReturnValue(createExecMock(slot));

    await expect(
      service.removeSlot(slotId.toString(), { userId: mentorId.toString(), role: 'mentor' }),
    ).resolves.toBe(slot);

    slotModel.findById.mockReturnValue(createExecMock({
      _id: slotId,
      mentorId,
      status: MentorAvailabilitySlotStatus.HELD,
    }));

    await expect(
      service.removeSlot(slotId.toString(), { userId: mentorId.toString(), role: 'mentor' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
