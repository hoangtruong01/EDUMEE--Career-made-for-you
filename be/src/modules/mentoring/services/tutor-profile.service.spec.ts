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
  tutorProfileModel.find = jest.fn();

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

  it('resubmits a rejected tutor profile as pending approval', async () => {
    const profileId = new Types.ObjectId();
    tutorProfileModel.findByIdAndUpdate.mockReturnValue(
      createExecMock({
        _id: profileId,
        status: TutorStatus.PENDING_APPROVAL,
      }),
    );

    await service.resubmitRejectedProfile(profileId.toString(), {
      professionalBackground: {
        currentPosition: 'Product Mentor',
        company: 'EDUMEE',
        yearsOfExperience: 4,
        industries: ['Product'],
        seniority: ExperienceLevel.MID_LEVEL,
      },
    });

    expect(tutorProfileModel.findByIdAndUpdate).toHaveBeenCalledWith(
      profileId.toString(),
      {
        $set: expect.objectContaining({
          professionalBackground: {
            currentPosition: 'Product Mentor',
            company: 'EDUMEE',
            yearsOfExperience: 4,
            industries: ['Product'],
            seniority: ExperienceLevel.MID_LEVEL,
          },
          status: TutorStatus.PENDING_APPROVAL,
        }),
        $unset: {
          'adminInfo.rejectionReason': 1,
          'adminInfo.approvedBy': 1,
          'adminInfo.approvalDate': 1,
        },
      },
      { new: true },
    );
  });

  it('rejects unsupported tutor statuses', async () => {
    await expect(service.updateStatus(new Types.ObjectId().toString(), 'approved')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('adds public mentor user data to active profiles and keeps userId as string', async () => {
    const userId = new Types.ObjectId();
    const profileId = new Types.ObjectId();
    tutorProfileModel.find.mockReturnValue(
      createPopulateMock([
        createProfileDocument(profileId, {
          _id: userId,
          name: 'Mentor User',
          email: 'mentor@example.com',
          avatar: 'https://cdn.example.com/avatar.png',
        }),
      ]),
    );

    const result = await service.findActive();

    expect(tutorProfileModel.find).toHaveBeenCalledWith({ status: 'active' });
    expect(result[0].id).toBe(profileId.toString());
    expect(result[0].userId).toBe(userId.toString());
    expect(result[0].mentorUser).toEqual({
      id: userId.toString(),
      name: 'Mentor User',
      email: 'mentor@example.com',
      avatar: 'https://cdn.example.com/avatar.png',
    });
  });

  it('adds public mentor user data to profile detail', async () => {
    const userId = new Types.ObjectId();
    const profileId = new Types.ObjectId();
    tutorProfileModel.findById.mockReturnValue(
      createPopulateMock(
        createProfileDocument(profileId, {
          _id: userId,
          name: 'Detail Mentor',
          email: 'detail@example.com',
          avatar: '',
        }),
      ),
    );

    const result = await service.findOne(profileId.toString());

    expect(tutorProfileModel.findById).toHaveBeenCalledWith(profileId.toString());
    expect(result.userId).toBe(userId.toString());
    expect(result.mentorUser?.name).toBe('Detail Mentor');
  });

  it('adds public mentor user data to search results', async () => {
    const userId = new Types.ObjectId();
    const profileId = new Types.ObjectId();
    tutorProfileModel.find.mockReturnValue(
      createPopulateMock([
        createProfileDocument(profileId, {
          _id: userId,
          name: 'Search Mentor',
          email: 'search@example.com',
          avatar: 'avatar.webp',
        }),
      ]),
    );

    const result = await service.searchTutors({ expertise: 'AI' });

    expect(tutorProfileModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        $or: expect.any(Array),
      }),
    );
    expect(result[0].mentorUser?.avatar).toBe('avatar.webp');
    expect(result[0].userId).toBe(userId.toString());
  });
});

function createPopulateMock<T>(value: T) {
  return {
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function createProfileDocument(profileId: Types.ObjectId, user: Record<string, unknown>) {
  return {
    toJSON: () => ({
      _id: profileId,
      userId: user,
      status: TutorStatus.ACTIVE,
      professionalBackground: {
        currentPosition: 'Prompt Engineer',
      },
    }),
  };
}
