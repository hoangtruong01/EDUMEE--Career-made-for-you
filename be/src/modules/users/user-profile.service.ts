import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserProfileDto, UpdateUserProfileDto } from './dto/user-profile.dto';
import {
  BudgetLevel,
  EducationLevel,
  Gender,
  UserProfile,
  UserProfileDocument,
} from './schemas/user-profile.schema';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserProfile.name) private userProfileModel: Model<UserProfileDocument>,
  ) {}

  async create(
    userId: string,
    createUserProfileDto: CreateUserProfileDto,
  ): Promise<UserProfileDocument> {
    // Convert userId string to ObjectId
    const userObjectId = new Types.ObjectId(userId);

    // Check if profile already exists for this user
    const existingProfile = await this.userProfileModel.findOne({ userId: userObjectId });
    if (existingProfile) {
      throw new ConflictException('User profile already exists');
    }

    const userProfile = new this.userProfileModel({
      ...createUserProfileDto,
      userId: userObjectId,
    });

    return userProfile.save();
  }

  async findAll(
    filters: {
      educationLevel?: EducationLevel;
      city?: string;
      budgetLevel?: BudgetLevel;
      gender?: Gender;
      weeklyHours?: { min?: number; max?: number };
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ profiles: UserProfileDocument[]; total: number }> {
    const { page = 1, limit = 10, ...filterCriteria } = filters;
    const skip = (page - 1) * limit;

    // Build query

    const query: any = {};

    if (filterCriteria.educationLevel) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      query.educationLevel = filterCriteria.educationLevel;
    }

    if (filterCriteria.city) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      query.city = new RegExp(filterCriteria.city, 'i');
    }

    if (filterCriteria.budgetLevel) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      query.budgetLevel = filterCriteria.budgetLevel;
    }

    if (filterCriteria.gender) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      query.gender = filterCriteria.gender;
    }

    if (filterCriteria.weeklyHours) {
      const hoursQuery: any = {};
      if (filterCriteria.weeklyHours.min !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        hoursQuery.$gte = filterCriteria.weeklyHours.min;
      }
      if (filterCriteria.weeklyHours.max !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        hoursQuery.$lte = filterCriteria.weeklyHours.max;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (Object.keys(hoursQuery).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        query.weeklyHours = hoursQuery;
      }
    }

    try {
      const [profiles, total] = (await Promise.all([
        this.userProfileModel
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          .find(query)
          .populate('userId', 'name email')
          .skip(skip)
          .limit(limit)
          .sort({ updatedAt: -1 })
          .exec(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.userProfileModel.countDocuments(query),
      ])) as [UserProfileDocument[], number];

      return { profiles, total };
    } catch (error) {
      throw new Error(`Failed to fetch profiles: ${error}`);
    }
  }

  async findByUserId(userId: string): Promise<UserProfileDocument | null> {
    const userObjectId = new Types.ObjectId(userId);
    return this.userProfileModel
      .findOne({ userId: userObjectId })
      .populate('userId', 'name email')
      .exec();
  }

  async findById(id: string): Promise<UserProfileDocument> {
    const profile = await this.userProfileModel
      .findById(id)
      .populate('userId', 'name email')
      .exec();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async update(
    userId: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfileDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const profile = await this.userProfileModel
      .findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: updateUserProfileDto,
          $setOnInsert: { userId: userObjectId },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .populate('userId', 'name email')
      .exec();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async delete(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const result = await this.userProfileModel.findOneAndDelete({ userId: userObjectId }).exec();
    if (!result) {
      throw new NotFoundException('Profile not found');
    }
  }

  async searchByCity(city: string): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({
        city: new RegExp(city, 'i'),
      })
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getProfilesByEducationLevel(
    educationLevel: EducationLevel,
  ): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({
        educationLevel: educationLevel,
      })
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getProfilesByBudgetLevel(budgetLevel: BudgetLevel): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({
        budgetLevel: budgetLevel,
      })
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getProfilesByGender(gender: Gender): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({
        gender: gender,
      })
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async updateConstraints(
    userId: string,
    constraints: Record<string, any>,
  ): Promise<UserProfileDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const profile = await this.userProfileModel
      .findOneAndUpdate({ userId: userObjectId }, { constraintsJson: constraints }, { new: true })
      .populate('userId', 'name email')
      .exec();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async getProfileStats(): Promise<{
    totalProfiles: number;
    educationDistribution: Record<string, number>;
    cityDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    budgetDistribution: Record<string, number>;
  }> {
    try {
      const [
        totalProfiles,
        educationDistribution,
        cityDistribution,
        genderDistribution,
        budgetDistribution,
      ] = await Promise.all([
        this.userProfileModel.countDocuments(),
        this.userProfileModel.aggregate([
          { $group: { _id: '$educationLevel', count: { $sum: 1 } } },
        ]) as Promise<Array<{ _id: string; count: number }>>,
        this.userProfileModel.aggregate([
          { $group: { _id: '$city', count: { $sum: 1 } } },
        ]) as Promise<Array<{ _id: string; count: number }>>,
        this.userProfileModel.aggregate([
          { $group: { _id: '$gender', count: { $sum: 1 } } },
        ]) as Promise<Array<{ _id: string; count: number }>>,
        this.userProfileModel.aggregate([
          { $group: { _id: '$budgetLevel', count: { $sum: 1 } } },
        ]) as Promise<Array<{ _id: string; count: number }>>,
      ]);

      const educationStats = educationDistribution.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id || 'Unknown'] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const cityStats = cityDistribution.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id || 'Unknown'] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const genderStats = genderDistribution.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id || 'Unknown'] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const budgetStats = budgetDistribution.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id || 'Unknown'] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        totalProfiles,
        educationDistribution: educationStats,
        cityDistribution: cityStats,
        genderDistribution: genderStats,
        budgetDistribution: budgetStats,
      };
    } catch (error) {
      throw new Error(`Failed to get profile stats: ${error}`);
    }
  }
}
