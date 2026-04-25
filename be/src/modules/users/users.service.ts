import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { SignOptions } from 'jsonwebtoken';
import { merge } from 'lodash';
import { Model, Types } from 'mongoose';
import { TokenTypes, UserRole, UserVerifyStatus } from '../../common/enums';
import { USERS_MESSAGES } from '../../common/message/message';
import { RegisterDto } from '../auth/dto/register.dto';
import { MailService } from './../../common/mail/mail.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    //Thuận
    private configService: ConfigService,
    private jwtService: JwtService,
    private MailService: MailService,
  ) {}

  // =======================================================================
  //! 1. KIỂM TRA TỒN TẠI
  // =======================================================================
  async checkEmailExist(email: string) {
    const result = await this.userModel.findOne({ email }).exec();
    return Boolean(result);
  }

  // =======================================================================
  //! 2. KÝ TOKEN CHO XÁC THỰC EMAIL VÀ QUÊN MẬT KHẨU
  // =======================================================================
  private async signEmailVerifyToken({
    user_id,
    verify,
  }: {
    user_id: string;
    verify: UserVerifyStatus;
  }) {
    return this.jwtService.signAsync(
      { user_id, token_type: TokenTypes.EmailVerificationToken, verify },
      {
        secret: this.configService.get<string>('jwt.emailVerifySecret'),
        expiresIn: this.configService.get<string>(
          'jwt.emailVerifyExpiresIn',
        ) as SignOptions['expiresIn'],
      },
    );
  }

  private async signforgotPasswordToken({
    user_id,
    verify,
  }: {
    user_id: string;
    verify: UserVerifyStatus;
  }) {
    return this.jwtService.signAsync(
      { user_id, token_type: TokenTypes.ForgotPasswordToken, verify },
      {
        secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.forgotPasswordExpiresIn',
        ) as SignOptions['expiresIn'],
      },
    );
  }

  // =======================================================================
  //! 3. ĐĂNG KÝ (REGISTER)
  // =======================================================================
  async register(payload: RegisterDto) {
    const { password, confirmPassword, Address, date_of_birth, ...rest } = payload;
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (password !== confirmPassword) {
      throw new BadRequestException('Password and Confirm Password do not match');
    }

    const isExist = await this.checkEmailExist(normalizedEmail);
    if (isExist) {
      throw new BadRequestException(USERS_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const user_id = new Types.ObjectId();
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified,
    });
    const hashedPassword = await bcrypt.hash(password, 12);
    await this.userModel.create({
      ...rest,
      _id: user_id,
      email: normalizedEmail,
      password: hashedPassword,
      Address: Address || {},
      email_verify_token,
      role: UserRole.USER,
      verify: UserVerifyStatus.Unverified,
      username: `user${user_id.toString()}`,
      date_of_birth: new Date(date_of_birth),
    });

    try {
      await this.MailService.sendVerificationEmail(
        normalizedEmail,
        payload.name,
        email_verify_token,
      );
    } catch (error) {
      this.logger.warn(
        `Register succeeded but verification email failed for ${normalizedEmail}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return {
        message: 'Register Successfully (email verification is temporarily unavailable)',
      };
    }

    return { message: 'Register Successfully' };
  }

  // =======================================================================
  //! Hàm xử lí chức năng profile
  // =======================================================================
  async findAll(page = 1, limit = 10): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    try {
      const [users, total] = (await Promise.all([
        this.userModel.find().skip(skip).limit(limit).exec(),
        this.userModel.countDocuments(),
      ])) as [UserDocument[], number];

      return { users, total };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();

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
    await this.userModel.findByIdAndUpdate(id, { lastLoginAt: new Date() }).exec();
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    // Gán vào biến và khai báo rõ kiểu boolean
    const isMatch: boolean = await bcrypt.compare(password, user.password);
    return isMatch;
  }

  async changePassword(id: string, newPassword: string): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const user = await this.userModel
      .findByIdAndUpdate(id, { password: hashedPassword }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // =======================================================================
  //! 5. CÁC HÀM XỬ LÝ XÁC THỰC EMAIL & QUÊN MẬT KHẨU (Thuận)
  // =======================================================================
  async verifyEmail(user_id: string) {
    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(user_id) },
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified,
            updated_at: new Date(),
          },
        },
      )
      .exec();
  }

  async resendEmailVerify(user_id: string): Promise<string> {
    const email_verify_token = await this.signEmailVerifyToken({
      user_id,
      verify: UserVerifyStatus.Unverified,
    });

    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(user_id) },
        {
          $set: {
            email_verify_token,
            updated_at: new Date(),
          },
        },
      )
      .exec();

    return email_verify_token;
  }

  async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const user = await this.userModel.findById(user_id).exec();
    if (!user) throw new NotFoundException('User not found');

    const forgot_password_token = await this.signforgotPasswordToken({
      user_id,
      verify,
    });

    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(user_id) },
        {
          $set: {
            forgot_password_token,
            updated_at: new Date(),
          },
        },
      )
      .exec();

    return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD };
  }

  async findById(id: string) {
    return this.userModel.findById(new Types.ObjectId(id)).exec();
  }

  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(user_id) },
        {
          $set: {
            password: hashedPassword,
            forgot_password_token: '',
            updated_at: new Date(),
          },
        },
      )
      .exec();

    return { message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS };
  }

  // =======================================================================
  //! 6. CÁC HÀM THAO TÁC PROFILE (Thuận)
  // =======================================================================
  async getMe(user_id: string) {
    const [users] = await Promise.all([
      this.userModel
        .findOne(
          { _id: new Types.ObjectId(user_id) },
          { password: 0, email_verify_token: 0, forgot_password_token: 0 },
        )
        .exec(),
    ]);
    return users || null;
  }

  async updateMe(user_id: string, payload: UpdateMeDto) {
    const userObjectId = new Types.ObjectId(user_id);
    const user = await this.userModel.findById(userObjectId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date() };

    if (payload.date_of_birth) {
      updatePayload.date_of_birth = new Date(payload.date_of_birth);
    }

    const flatFields = ['name', 'gender', 'avatar', 'phone_number', 'onboarding_completed'] as const;
    flatFields.forEach((field) => {
      if (payload[field as keyof UpdateMeDto] !== undefined) {
        updatePayload[field] = payload[field as keyof UpdateMeDto];
      }
    });


    const nestedFields = ['Address'] as const;

    nestedFields.forEach((field) => {
      const dtoField = field.toLowerCase() as keyof UpdateMeDto;

      if (payload[dtoField]) {
        const userObj = user.toObject() as unknown as Record<string, unknown>;

        updatePayload[field] = merge({}, userObj[field], payload[dtoField]);
      }
    });

    const result = await this.userModel
      .findOneAndUpdate(
        { _id: userObjectId },
        { $set: updatePayload },
        {
          new: true,
          projection: {
            password: 0,
            email_verify_token: 0,
            forgot_password_token: 0,
          },
        },
      )
      .exec();

    return result;
  }

  // =======================================================================
  //! 7. CÁC HÀM TIỆN ÍCH KHÁC (Thuận)
  // =======================================================================
  async createAccessTokenFromRefresh(user_id: string) {
    const access_token = await this.jwtService.signAsync(
      { user_id },
      {
        secret: this.configService.get<string>('jwt.accessTokenSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.accessTokenExpireIn',
        ) as SignOptions['expiresIn'],
      },
    );
    return { access_token };
  }
}
