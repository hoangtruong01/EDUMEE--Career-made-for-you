import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { SignOptions } from 'jsonwebtoken';
import { merge } from 'lodash';
import { Model, Types } from 'mongoose';
import { TokenTypes, UserRole, UserVerifyStatus } from '../../common/enums';
import { USERS_MESSAGES } from '../../common/message/message';
import { hashPassword } from '../../common/ultils/crypto';
import { RegisterDto } from '../auth/dto/register.dto';
import { MailService } from './../../common/mail/mail.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { User, UserDocument } from './schemas/user.schema';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private MailService: MailService,
  ) {}

  // =======================================================================
  // 1. KIỂM TRA TỒN TẠI
  // =======================================================================
  async checkEmailExist(email: string) {
    const result = await this.userModel.findOne({ email }).exec();
    return Boolean(result);
  }

  // =======================================================================
  // 2. KÝ TOKEN CHO XÁC THỰC EMAIL VÀ QUÊN MẬT KHẨU
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
  // 3. ĐĂNG KÝ (REGISTER)
  // =======================================================================
  async register(payload: RegisterDto) {
    const {
      email,
      password,
      confirmPassword,
      Address,
      date_of_birth,
      ...rest
    } = payload;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and Confirm Password do not match',
      );
    }

    const isExist = await this.checkEmailExist(email);
    if (isExist) {
      throw new BadRequestException(USERS_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    // Logic kiểm tra y hệt code Express cũ

    const user_id = new Types.ObjectId();
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified,
    });

    await this.userModel.create({
      ...rest,
      _id: user_id,
      email,
      password: hashPassword(password),
      Address: Address || {},
      email_verify_token,
      role: UserRole.USER, // Hoặc UserRole.Member tùy enum của bạn
      verify: UserVerifyStatus.Unverified,
      username: `user${user_id.toString()}`,
      date_of_birth: new Date(date_of_birth),
    });

    await this.MailService.sendVerificationEmail(
      email,
      payload.name, // Lấy tên từ DTO gửi lên
      email_verify_token,
    );

    return { message: 'Register Successfully' };
  }

  // =======================================================================
  // 4. CÁC HÀM XỬ LÝ XÁC THỰC EMAIL & QUÊN MẬT KHẨU
  // =======================================================================
  async verifyEmail(user_id: string) {
    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(user_id) },
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified,
            updated_at: new Date(), // Thay cho $$NOW
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

  async forgotPassword({
    user_id,
    verify,
  }: {
    user_id: string;
    verify: UserVerifyStatus;
  }) {
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

    //  TODO: Gửi email reset password ở đây
    return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD };
  }
  async findById(id: string) {
    // Ép kiểu về Types.ObjectId để tìm kiếm  MongoDB
    return this.userModel.findById(new Types.ObjectId(id)).exec();
  }
  async resetPassword({
    user_id,
    password,
  }: {
    user_id: string;
    password: string;
  }) {
    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(user_id) },
        {
          $set: {
            password: hashPassword(password),
            forgot_password_token: '',
            updated_at: new Date(),
          },
        },
      )
      .exec();

    return { message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS };
  }

  // =======================================================================
  // 5. CÁC HÀM THAO TÁC PROFILE
  // =======================================================================
  async getMe(user_id: string) {
    const [users /*, staffs, admins */] = await Promise.all([
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

    const flatFields = ['name', 'gender', 'avatar'] as const;
    flatFields.forEach((field) => {
      if (payload[field] !== undefined) {
        updatePayload[field] = payload[field];
      }
    });

    const nestedFields = ['address'] as const;
    nestedFields.forEach((field) => {
      if (payload[field]) {
        const userObj = user.toObject() as unknown as Record<string, unknown>;

        // Hàm merge sâu của lodash
        updatePayload[field] = merge({}, userObj[field], payload[field]);
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
  // 6. CÁC HÀM TIỆN ÍCH KHÁC
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
