import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ExperienceLevel } from '../../careers/schemas/career.schema';
import { User } from '../../users/schemas/user.schema';
import { TutorProfile, TutorStatus } from '../schemas/tutor-profile.schema';
import { TutorProfileService } from './tutor-profile.service';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('TutorProfileService', () => {
  let service: TutorProfileService;

  const tutorProfileModel = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    ...data,
    save: jest.fn().mockResolvedValue(data),
  })) as jest.Mock & Record<string, jest.Mock>;

  tutorProfileModel.findByIdAndUpdate = jest.fn();
  tutorProfileModel.findById = jest.fn();

  const userModel = {
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tutorProfileModel.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorProfileService,
        { provide: getModelToken(TutorProfile.name), useValue: tutorProfileModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get(TutorProfileService);
  });

  it('forces new tutor profiles into pending approval', async () => {
    await service.create({
      status: TutorStatus.ACTIVE,
      professionalBackground: {
        currentPosition: 'Senior Engineer',
        company: 'EDUMEE',
        yearsOfExperience: 5,
        industries: ['Software'],
        seniority: ExperienceLevel.MID_LEVEL,
      },
      mentoringExpertise: {
        careerExpertise: [],
        skillExpertise: [],
        specializations: [],
        targetMenteeLevels: [],
      },
      availability: {
        timeZone: 'Asia/Ho_Chi_Minh',
        weeklyAvailability: [
          {
            day: 'saturday',
            timeSlots: [{ startTime: '09:00', endTime: '17:00', available: true }],
          },
        ],
        sessionPreferences: {
          preferredDuration: [60],
          sessionTypes: ['career_guidance', 'interview_preparation'],
          communicationMethods: ['video'],
        },
      },
      pricing: {
        currency: 'VND',
        freeSessionOffered: false,
        sessionRates: [
          {
            sessionType: 'career_guidance',
            duration: 60,
            pricePerSession: 50000,
          },
          {
            sessionType: 'interview_preparation',
            duration: 90,
            pricePerSession: 75000,
          },
        ],
      },
    });

    expect(tutorProfileModel).toHaveBeenCalledWith(
      expect.objectContaining({
        pricing: expect.objectContaining({
          currency: 'VND',
          sessionRates: expect.arrayContaining([
            expect.objectContaining({
              sessionType: 'interview_preparation',
              duration: 90,
              pricePerSession: 75000,
            }),
          ]),
        }),
        status: TutorStatus.PENDING_APPROVAL,
      }),
    );
  });

  it('sets the user role to mentor when admin approves a profile', async () => {
    const profileId = new Types.ObjectId();
    const adminId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    tutorProfileModel.findByIdAndUpdate.mockReturnValue(
      createExecMock({
        _id: profileId,
        userId,
        status: TutorStatus.ACTIVE,
      }),
    );
    userModel.findByIdAndUpdate.mockReturnValue(createExecMock({ _id: userId, role: UserRole.MENTOR }));

    await service.updateStatus(profileId.toString(), TutorStatus.ACTIVE, adminId.toString());

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { role: UserRole.MENTOR });
  });

  it('rejects unsupported tutor statuses', async () => {
    await expect(service.updateStatus(new Types.ObjectId().toString(), 'approved')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
