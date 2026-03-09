import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { SignOptions } from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
// Import DTO
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
// Import Schema & Service
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refreshToken.schemas';
// Import Utils & Enums
import { UserRole, UserVerifyStatus } from '../../common/enums';
import { MailService } from '../../common/mail/mail.service';
import { hashPassword } from '../../common/ultils/crypto';

// =======================================================================
// INTERFACES CHO GOOGLE OAUTH
// =======================================================================
interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleProfile {
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

interface JwtPayload {
  user_id: string;
  email: string;
  role: string;
  verify: number;
}

interface DecodedToken {
  iat: number;
  exp: number;
  user_id: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private mailService: MailService,
  ) {}

  // =========================================================================
  // 1. LOGIN LOGIC
  // =========================================================================
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const hashedPassword = hashPassword(password);

    const collections = [this.userModel];
    let foundUser = null;

    for (const collection of collections) {
      const user = await collection
        .findOne({ email, password: hashedPassword })
        .exec();
      if (user) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      user_id: foundUser._id.toString(),
      email: foundUser.email,
      role: foundUser.role,
      verify: foundUser.verify,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessTokenSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.accessTokenExpireIn',
        ) as SignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>(
          'jwt.expiresIn',
        ) as SignOptions['expiresIn'],
      }),
    ]);

    const rawDecoded: unknown = this.jwtService.decode(refresh_token);
    const decodedRefreshToken = rawDecoded as { iat: number; exp: number };

    await this.refreshTokenModel.create({
      token: refresh_token,
      user_id: foundUser._id,
      iat: new Date(decodedRefreshToken.iat * 1000),
      exp: new Date(decodedRefreshToken.exp * 1000),
      user_role: foundUser.role,
    });

    return {
      message: 'Đăng nhập thành công',
      result: { access_token, refresh_token, role: foundUser.role },
      redirectTo: this.getRedirectPathByRole(foundUser.role),
    };
  }

  // =========================================================================
  // 2. REGISTER LOGIC
  // =========================================================================
  async register(registerDto: RegisterDto) {
    return this.usersService.register(registerDto);
  }

  // =========================================================================
  // 3. LOGOUT LOGIC
  // =========================================================================
  async logout(refreshToken: string) {
    await this.refreshTokenModel.deleteOne({ token: refreshToken }).exec();
    return { message: 'Đăng xuất thành công' };
  }

  // =========================================================================
  // 4. XÁC THỰC EMAIL
  // =========================================================================
  async verifyEmail(token: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ user_id: string }>(
        token,
        {
          secret: this.configService.get<string>('jwt.emailVerifySecret'),
        },
      );

      const user = await this.userModel.findById(decoded.user_id);
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');

      if (user.email_verify_token === '') {
        return { message: 'Email đã được xác thực trước đó' };
      }

      user.email_verify_token = '';
      user.verify = UserVerifyStatus.Verified;
      await user.save();

      return { message: 'Xác thực email thành công' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new UnauthorizedException(
        'Token xác thực không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  // =========================================================================
  // 5. GỬI LẠI EMAIL XÁC THỰC
  // =========================================================================
  async resendEmailVerify(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (user.verify === UserVerifyStatus.Verified) {
      throw new BadRequestException('Email này đã được xác thực rồi');
    }

    const email_verify_token = await this.jwtService.signAsync(
      { user_id: user._id.toString(), verify: UserVerifyStatus.Unverified },
      {
        secret: this.configService.get<string>('jwt.emailVerifySecret'),
        expiresIn: this.configService.get<string>(
          'jwt.emailVerifyExpiresIn',
        ) as SignOptions['expiresIn'],
      },
    );

    user.email_verify_token = email_verify_token;
    await user.save();

    await this.mailService.sendVerificationEmail(
      email,
      user.name,
      email_verify_token,
    );

    return {
      message: 'Đã gửi lại email xác thực',
      email_verify_token,
    };
  }

  // =========================================================================
  // 6. QUÊN MẬT KHẨU
  // =========================================================================
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const forgot_password_token = await this.jwtService.signAsync(
      { user_id: user._id.toString(), verify: user.verify },
      {
        secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.forgotPasswordExpiresIn',
        ) as SignOptions['expiresIn'],
      },
    );

    user.forgot_password_token = forgot_password_token;
    await user.save();

    await this.mailService.sendForgotPasswordEmail(
      email,
      user.name,
      forgot_password_token,
    );

    return {
      message: 'Vui lòng kiểm tra email để đặt lại mật khẩu',
      forgot_password_token,
    };
  }

  // =========================================================================
  // 7. KIỂM TRA TOKEN QUÊN MẬT KHẨU
  // =========================================================================
  async verifyForgotPasswordToken(token: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ user_id: string }>(
        token,
        {
          secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
        },
      );

      const user = await this.userModel.findById(decoded.user_id);
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');

      if (user.forgot_password_token !== token) {
        throw new UnauthorizedException(
          'Token đã được sử dụng hoặc không hợp lệ',
        );
      }

      return { message: 'Token hợp lệ' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      )
        throw error;
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // =========================================================================
  // 8. ĐẶT LẠI MẬT KHẨU
  // =========================================================================
  async resetPassword(token: string, password: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ user_id: string }>(
        token,
        {
          secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
        },
      );

      const user = await this.userModel.findById(decoded.user_id);
      if (!user || user.forgot_password_token !== token) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      user.password = hashPassword(password);
      user.forgot_password_token = '';
      await user.save();

      return { message: 'Đặt lại mật khẩu thành công' };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // =======================================================================
  // 9. GIAO TIẾP VỚI GOOGLE OAUTH
  // =======================================================================
  private async getOAuthGoogleToken(
    code: string,
  ): Promise<GoogleTokenResponse> {
    const body = {
      code,
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') || '',
      client_secret:
        this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      grant_type: 'authorization_code',
    };

    const response = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return response.data;
  }

  private async getGoogleUserInfo(
    access_token: string,
    id_token: string,
  ): Promise<GoogleProfile> {
    const response = await axios.get<GoogleProfile>(
      'https://www.googleapis.com/oauth2/v3/tokeninfo',
      {
        params: { access_token, alt: 'json' },
        headers: { Authorization: `Bearer ${id_token}` },
      },
    );
    return response.data;
  }

  // =======================================================================
  // 10. XỬ LÝ LOGIC ĐĂNG NHẬP CHÍNH CỦA GOOGLE
  // =======================================================================
  async googleLogin(code: string) {
    const { access_token: gg_token, id_token } =
      await this.getOAuthGoogleToken(code);
    const userInfo = await this.getGoogleUserInfo(gg_token, id_token);

    if (!userInfo.email_verified) {
      throw new BadRequestException('Email Google này chưa được xác minh!');
    }

    let user = await this.userModel.findOne({ email: userInfo.email });
    let isNewUser = 0;
    //check nếu user đã tồn tại nhưng chưa verify email thì khi
    //! thay vì phải vào mail để xác thực thì giờ xác thực luôn khi đăng nhập bằng Google
    if (user && user.verify !== UserVerifyStatus.Verified) {
      user.verify = UserVerifyStatus.Verified;
      await user.save();
    }
    if (!user) {
      const userId = new Types.ObjectId();
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1@';

      user = await this.userModel.create({
        _id: userId,
        // 1. Lấy tên từ Google, nếu không có thì dùng tên mặc định
        name: userInfo.name || 'Người dùng Google',

        // 2. Lấy Email từ Google
        email: userInfo.email,

        // 3. Random mật khẩu để vượt qua Schema
        password: hashPassword(randomPassword),

        // 4. Giá trị mặc định cho giới tính
        gender: 'Other',

        // 5. Giá trị mặc định cho ngày sinh (lấy ngày hiện tại)
        date_of_birth: new Date(),

        verify: UserVerifyStatus.Verified,
        username: `user${userId.toString()}`,
        role: UserRole.USER,
      });
      isNewUser = 1;
    }

    const payload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email,
      role: user.role,
      verify: user.verify,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.accessTokenSecret') ||
          'default_secret',

        expiresIn: (this.configService.get<string>('jwt.accessTokenExpireIn') ||
          '15m') as SignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.secret') || 'default_secret',

        expiresIn: (this.configService.get<string>('jwt.expiresIn') ||
          '7d') as SignOptions['expiresIn'],
      }),
    ]);

    const rawDecoded: unknown = this.jwtService.decode(refresh_token);

    const decoded = rawDecoded as DecodedToken;

    if (!decoded || !decoded.iat || !decoded.exp) {
      throw new UnauthorizedException('Có lỗi xảy ra khi tạo Token');
    }

    await this.refreshTokenModel.create({
      token: refresh_token,
      user_id: user._id,
      iat: new Date(decoded.iat * 1000),
      exp: new Date(decoded.exp * 1000),
      user_role: user.role,
    });

    return { access_token, refresh_token, new_user: isNewUser };
  }

  // =======================================================================
  // 11. HÀM TIỆN ÍCH
  // =======================================================================
  private getRedirectPathByRole(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return '/dashboard/admin';
      case UserRole.MENTOR:
        return '/dashboard/mentor';
      case UserRole.EMPLOYER:
        return '/dashboard/employer';
      default:
        return '/home';
    }
  }
}
