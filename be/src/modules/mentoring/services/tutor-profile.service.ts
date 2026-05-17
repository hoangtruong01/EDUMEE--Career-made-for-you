import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { TutorProfile, TutorProfileDocument, TutorStatus } from '../schemas/tutor-profile.schema';
import { CreateTutorProfileDto, UpdateTutorProfileDto } from '../dto';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserRole } from '../../../common/enums/user-role.enum';

type CreateTutorProfileInput = CreateTutorProfileDto & { userId?: string };
type PublicMentorUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

type TutorProfilePublicResponse = Record<string, unknown> & {
  id: string;
  userId: string;
  mentorUser?: PublicMentorUser;
};

function isTutorStatus(value: string): value is TutorStatus {
  return Object.values(TutorStatus).includes(value as TutorStatus);
}

function isPopulatedUser(value: unknown): value is Record<string, unknown> {
  return Boolean(value) &&
    typeof value === 'object' &&
    ('name' in (value as Record<string, unknown>) ||
      'email' in (value as Record<string, unknown>) ||
      'avatar' in (value as Record<string, unknown>));
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalIdString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  return '';
}

@Injectable()
export class TutorProfileService {
  constructor(
    @InjectModel(TutorProfile.name)
    private tutorProfileModel: Model<TutorProfileDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) { }

  async create(createDto: CreateTutorProfileInput): Promise<TutorProfileDocument> {
    const profile = new this.tutorProfileModel({
      ...createDto,
      status: TutorStatus.PENDING_APPROVAL,
    });
    return profile.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: FilterQuery<TutorProfileDocument> = {},
  ): Promise<{ data: TutorProfilePublicResponse[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.tutorProfileModel
        .find(filters)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('userId', 'name email avatar')
        .exec(),
      this.tutorProfileModel.countDocuments(filters).exec(),
    ]);

    return {
      data: data.map((profile) => this.serializeProfile(profile)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TutorProfilePublicResponse> {
    const profile = await this.tutorProfileModel.findById(id).populate('userId', 'name email avatar').exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return this.serializeProfile(profile);
  }

  async findByUser(userId: string): Promise<TutorProfilePublicResponse | null> {
    const profile = await this.tutorProfileModel
      .findOne({ userId })
      .populate('userId', 'name email avatar')
      .exec();
    return profile ? this.serializeProfile(profile) : null;
  }

  async findActive(): Promise<TutorProfilePublicResponse[]> {
    const profiles = await this.tutorProfileModel
      .find({ status: 'active' })
      .populate('userId', 'name email avatar')
      .exec();
    return profiles.map((profile) => this.serializeProfile(profile));
  }

  async update(id: string, updateDto: Partial<UpdateTutorProfileDto>): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async updateStatus(id: string, status: string, actorId?: string, reason?: string): Promise<TutorProfileDocument> {
    if (!isTutorStatus(status)) {
      throw new BadRequestException('Invalid tutor status');
    }

    const update: Record<string, unknown> = {
      status,
    };

    if (status === TutorStatus.ACTIVE) {
      update['adminInfo.approvedBy'] = actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : undefined;
      update['adminInfo.approvalDate'] = new Date();
      update['adminInfo.rejectionReason'] = undefined;
    }
    if (status === TutorStatus.REJECTED) {
      update['adminInfo.rejectionReason'] = reason || 'Rejected by admin';
    }

    const profile = await this.update(id, update as Partial<UpdateTutorProfileDto>);
    if (status === TutorStatus.ACTIVE) {
      await this.userModel.findByIdAndUpdate(profile.userId, { role: UserRole.MENTOR }).exec();
    }

    return profile;
  }

  async remove(id: string): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findByIdAndDelete(id).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async searchTutors(criteria: { expertise?: string; industries?: string[] }): Promise<TutorProfilePublicResponse[]> {
    const query: FilterQuery<TutorProfileDocument> = { status: 'active' };
    if (criteria.expertise) {
      query.$or = [
        { 'mentoringExpertise.careerExpertise.careerTitle': { $regex: criteria.expertise, $options: 'i' } },
        { 'mentoringExpertise.skillExpertise.skillName': { $regex: criteria.expertise, $options: 'i' } },
        { 'mentoringExpertise.specializations': { $regex: criteria.expertise, $options: 'i' } },
      ];
    }
    if (criteria.industries) {
      query['professionalBackground.industries'] = { $in: criteria.industries };
    }
    const profiles = await this.tutorProfileModel.find(query).populate('userId', 'name email avatar').exec();
    return profiles.map((profile) => this.serializeProfile(profile));
  }

  private serializeProfile(profile: TutorProfileDocument): TutorProfilePublicResponse {
    const raw: Record<string, unknown> = typeof profile.toJSON === 'function'
      ? (profile.toJSON() as Record<string, unknown>)
      : ({ ...profile } as Record<string, unknown>);
    const rawUser = raw.userId;
    const populatedUser = isPopulatedUser(rawUser) ? rawUser : null;
    const rawUserId = populatedUser ? populatedUser._id || populatedUser.id : rawUser;
    const profileId = raw.id || raw._id;
    const response = {
      ...raw,
      id: optionalIdString(profileId),
      userId: optionalIdString(rawUserId),
    } as TutorProfilePublicResponse;

    delete response._id;
    delete response.__v;

    if (populatedUser && response.userId) {
      response.mentorUser = {
        id: response.userId,
        name: optionalString(populatedUser.name),
        email: optionalString(populatedUser.email),
        avatar: optionalString(populatedUser.avatar),
      };
    }

    return response;
  }
}
