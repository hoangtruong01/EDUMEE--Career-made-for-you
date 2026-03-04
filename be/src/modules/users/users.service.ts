import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Use provided role or default to USER
    const role = createUserDto.role || UserRole.USER;
    
    // Validate role is valid
    if (!Object.values(UserRole).includes(role)) {
      throw new NotFoundException(`Invalid role: ${role}`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    const user = new this.userModel({
      ...createUserDto,
      role,
      password: hashedPassword,
    });

    return user.save();
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    try {
      const [users, total] = await Promise.all([
        this.userModel.find().skip(skip).limit(limit).exec(),
        this.userModel.countDocuments(),
      ]) as [UserDocument[], number];

      return { users, total };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { lastLoginAt: new Date() })
      .exec();
  }

  async validatePassword(
    user: UserDocument,
    password: string,
  ): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
  }

  async changePassword(
    id: string,
    newPassword: string,
  ): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const user = await this.userModel
      .findByIdAndUpdate(
        id, 
        { password: hashedPassword }, 
        { new: true }
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async resetPassword(
    email: string,
    newPassword: string,
    resetToken?: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If resetToken is provided, validate it
    if (resetToken && user.resetPasswordToken !== resetToken) {
      throw new UnauthorizedException('Invalid reset token');
    }

    // Check if reset token has expired
    if (resetToken && user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user._id,
        { 
          password: hashedPassword,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        },
        { new: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('Failed to update password');
    }

    return updatedUser;
  }
}
