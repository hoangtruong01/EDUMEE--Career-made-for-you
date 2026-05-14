import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { TutorProfile, TutorProfileDocument, TutorStatus } from '../schemas/tutor-profile.schema';
import { CreateTutorProfileDto, UpdateTutorProfileDto } from '../dto';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserRole } from '../../../common/enums/user-role.enum';

type CreateTutorProfileInput = CreateTutorProfileDto & { userId?: string };

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
  ): Promise<{ data: TutorProfileDocument[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.tutorProfileModel.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.tutorProfileModel.countDocuments(filters).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findById(id).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async findByUser(userId: string): Promise<TutorProfileDocument | null> {
    return this.tutorProfileModel.findOne({ userId }).exec();
  }

  async findActive(): Promise<TutorProfileDocument[]> {
    return this.tutorProfileModel.find({ status: 'active' }).exec();
  }

  async update(id: string, updateDto: Partial<UpdateTutorProfileDto>): Promise<TutorProfileDocument> {
    const profile = await this.tutorProfileModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!profile) {
      throw new NotFoundException(`Tutor profile with ID ${id} not found`);
    }
    return profile;
  }

  async updateStatus(id: string, status: string, actorId?: string, reason?: string): Promise<TutorProfileDocument> {
    if (!Object.values(TutorStatus).includes(status as TutorStatus)) {
      throw new BadRequestException('Invalid tutor status');
    }

    const update: Record<string, unknown> = {
      status: status as TutorStatus,
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

  async searchTutors(
    criteria: { expertise?: string; industries?: string[] },
  ): Promise<TutorProfileDocument[]> {
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
    return this.tutorProfileModel.find(query).exec();
  }
}
