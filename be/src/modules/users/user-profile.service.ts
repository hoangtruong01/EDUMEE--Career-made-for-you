import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument, EducationLevel, BudgetLevel, Gender } from './schemas/user-profile.schema';
import { CreateUserProfileDto, UpdateUserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserProfile.name) private userProfileModel: Model<UserProfileDocument>,
  ) {}

  async create(userId: string, createUserProfileDto: CreateUserProfileDto): Promise<UserProfileDocument> {
    // Check if profile already exists for this user
    const existingProfile = await this.userProfileModel.findOne({ userId });
    if (existingProfile) {
      throw new ConflictException('User profile already exists');
    }

    const userProfile = new this.userProfileModel({
      ...createUserProfileDto,
      userId,
    });

    return userProfile.save();
  }

  async findAll(filters: {
    educationLevel?: EducationLevel;
    city?: string;
    budgetLevel?: BudgetLevel;
    gender?: Gender;
    weeklyHours?: { min?: number; max?: number };
    page?: number;
    limit?: number;
  } = {}): Promise<{ profiles: UserProfileDocument[]; total: number }> {
    const { page = 1, limit = 10, ...filterCriteria } = filters;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filterCriteria.educationLevel) {
      query.educationLevel = filterCriteria.educationLevel;
    }

    if (filterCriteria.city) {
      query.city = new RegExp(filterCriteria.city, 'i');
    }

    if (filterCriteria.budgetLevel) {
      query.budgetLevel = filterCriteria.budgetLevel;
    }

    if (filterCriteria.gender) {
      query.gender = filterCriteria.gender;
    }

    if (filterCriteria.weeklyHours) {
      const hoursQuery: any = {};
      if (filterCriteria.weeklyHours.min !== undefined) {
        hoursQuery.$gte = filterCriteria.weeklyHours.min;
      }
      if (filterCriteria.weeklyHours.max !== undefined) {
        hoursQuery.$lte = filterCriteria.weeklyHours.max;
      }
      if (Object.keys(hoursQuery).length > 0) {
        query.weeklyHours = hoursQuery;
      }
    }

    try {
      const [profiles, total] = await Promise.all([
        this.userProfileModel
          .find(query)
          .populate('userId', 'firstName lastName email')
          .skip(skip)
          .limit(limit)
          .sort({ updatedAt: -1 })
          .exec(),
        this.userProfileModel.countDocuments(query),
      ]) as [UserProfileDocument[], number];

      return { profiles, total };
    } catch (error) {
      throw new Error(`Failed to fetch profiles: ${error}`);
    }
  }

  async findByUserId(userId: string): Promise<UserProfileDocument | null> {
    return this.userProfileModel
      .findOne({ userId })
      .populate('userId', 'firstName lastName email')
      .exec();
  }

  async findById(id: string): Promise<UserProfileDocument> {
    const profile = await this.userProfileModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .exec();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async update(userId: string, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfileDocument> {
    const profile = await this.userProfileModel
      .findOneAndUpdate(
        { userId },
        updateUserProfileDto,
        { new: true }
      )
      .populate('userId', 'firstName lastName email')
      .exec();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async delete(userId: string): Promise<void> {
    const result = await this.userProfileModel.findOneAndDelete({ userId }).exec();
    if (!result) {
      throw new NotFoundException('Profile not found');
    }
  }

  async searchByCity(city: string): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({ 
        city: new RegExp(city, 'i')
      })
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getProfilesByEducationLevel(educationLevel: EducationLevel): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({ 
        educationLevel: educationLevel
      })
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getProfilesByBudgetLevel(budgetLevel: BudgetLevel): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({ 
        budgetLevel: budgetLevel
      })
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getProfilesByGender(gender: Gender): Promise<UserProfileDocument[]> {
    return this.userProfileModel
      .find({ 
        gender: gender
      })
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async updateConstraints(userId: string, constraints: Record<string, any>): Promise<UserProfileDocument> {
    const profile = await this.userProfileModel
      .findOneAndUpdate(
        { userId },
        { constraintsJson: constraints },
        { new: true }
      )
      .populate('userId', 'firstName lastName email')
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
          { $group: { _id: '$educationLevel', count: { $sum: 1 } } }
        ]),
        this.userProfileModel.aggregate([
          { $group: { _id: '$city', count: { $sum: 1 } } }
        ]),
        this.userProfileModel.aggregate([
          { $group: { _id: '$gender', count: { $sum: 1 } } }
        ]),
        this.userProfileModel.aggregate([
          { $group: { _id: '$budgetLevel', count: { $sum: 1 } } }
        ]),
      ]);

      const educationStats = educationDistribution.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {});

      const cityStats = cityDistribution.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {});

      const genderStats = genderDistribution.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {});

      const budgetStats = budgetDistribution.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {});

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