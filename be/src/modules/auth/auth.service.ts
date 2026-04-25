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
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
// Import Schema & Service
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { RefreshToken, RefreshTokenDocument } from './schemas/refreshToken.schemas';

// Import Utils & Enums
import { UserRole, UserVerifyStatus, LoginType } from '../../common/enums';
import { MailService } from '../../common/mail/mail.service';

// =======================================================================
// INTERFACES
// =======================================================================
interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

export interface AuthResponse {
  user: Partial<User & { role: UserRole; _id: Types.ObjectId }>;
  accessToken: string;
  refreshToken: string;
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
  verify?: number;
  onboarding_completed?: boolean;
}

interface DecodedToken {
  iat: number;
  exp: number;
  user_id?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private mailService: MailService,
  ) {}

  // =========================================================================
  // 1. REGISTER LOGIC (Giữ bản của bạn)
  // =========================================================================
  async register(registerDto: RegisterDto) {
    return this.usersService.register(registerDto);
  }

  // =========================================================================
  // 2. LOGIN LOGIC
  // =========================================================================
  async login(loginDto: LoginDto) {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const password = loginDto.password;

    // 1. Chỉ tìm user bằng email
    const user = await this.userModel.findOne({ email: normalizedEmail }).exec();

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 2. Chặn admin đăng nhập qua trang login thường
    if (user.role === UserRole.ADMIN) {
      throw new UnauthorizedException('Tài khoản không hợp lệ cho đăng nhập thường');
    }

    // 3. So sánh mật khẩu bằng Bcrypt của đồng đội
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email,
      role: user.role,
      verify: user.verify,
      onboarding_completed: user.onboarding_completed,
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
        expiresIn: this.configService.get<string>('jwt.expiresIn') as SignOptions['expiresIn'],
      }),
    ]);

    const rawDecoded: unknown = this.jwtService.decode(refresh_token);
    const decodedRefreshToken = rawDecoded as DecodedToken;

    await this.refreshTokenModel.create({
      token: refresh_token,
      user_id: user._id,
      iat: new Date(decodedRefreshToken.iat * 1000),
      exp: new Date(decodedRefreshToken.exp * 1000),
      user_role: user.role,
    });

    return {
      message: 'Đăng nhập thành công',
      result: { access_token, refresh_token, role: user.role },
      redirectTo: this.getRedirectPathByRole(user.role),
    };
  }

  // =========================================================================
  // 2b. ADMIN LOGIN LOGIC - Chỉ cho admin đăng nhập
  // =========================================================================
  async adminLogin(loginDto: LoginDto) {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const password = loginDto.password;

    const user = await this.userModel.findOne({ email: normalizedEmail }).exec();

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Chỉ cho phép admin đăng nhập
    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Tài khoản không có quyền truy cập quản trị');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email,
      role: user.role,
      verify: user.verify,
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
        expiresIn: this.configService.get<string>('jwt.expiresIn') as SignOptions['expiresIn'],
      }),
    ]);

    const rawDecoded: unknown = this.jwtService.decode(refresh_token);
    const decodedRefreshToken = rawDecoded as DecodedToken;

    await this.refreshTokenModel.create({
      token: refresh_token,
      user_id: user._id,
      iat: new Date(decodedRefreshToken.iat * 1000),
      exp: new Date(decodedRefreshToken.exp * 1000),
      user_role: user.role,
    });

    return {
      message: 'Đăng nhập quản trị thành công',
      result: { access_token, refresh_token, role: user.role },
      redirectTo: '/admin/dashboard',
    };
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
      const decoded = await this.jwtService.verifyAsync<{ user_id: string }>(token, {
        secret: this.configService.get<string>('jwt.emailVerifySecret'),
      });

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
      throw new UnauthorizedException('Token xác thực không hợp lệ hoặc đã hết hạn');
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

    await this.mailService.sendVerificationEmail(email, user.name, email_verify_token);

    return { message: 'Đã gửi lại email xác thực', email_verify_token };
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

    await this.mailService.sendForgotPasswordEmail(email, user.name, forgot_password_token);

    return { message: 'Vui lòng kiểm tra email để đặt lại mật khẩu', forgot_password_token };
  }

  // =========================================================================
  // 7. KIỂM TRA TOKEN QUÊN MẬT KHẨU
  // =========================================================================
  async verifyForgotPasswordToken(token: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ user_id: string }>(token, {
        secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
      });

      const user = await this.userModel.findById(decoded.user_id);
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');

      if (user.forgot_password_token !== token) {
        throw new UnauthorizedException('Token đã được sử dụng hoặc không hợp lệ');
      }

      return { message: 'Token hợp lệ' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // =========================================================================
  // 8. ĐẶT LẠI MẬT KHẨU
  // =========================================================================
  async resetPassword(token: string, password: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<{ user_id: string }>(token, {
        secret: this.configService.get<string>('jwt.forgotPasswordSecret'),
      });

      const user = await this.userModel.findById(decoded.user_id);
      if (!user || user.forgot_password_token !== token) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      user.password = await bcrypt.hash(password, 12);
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
  getGoogleAuthorizationUrl(): string {
    const query = new URLSearchParams({
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') || '',
      redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
  }

  private async getOAuthGoogleToken(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') || '',
      client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      grant_type: 'authorization_code',
    });

    const response = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      body.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    return response.data;
  }

  private async getGoogleUserInfo(access_token: string, id_token: string): Promise<GoogleProfile> {
    const response = await axios.get<GoogleProfile>(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        params: { alt: 'json' },
        headers: {
          Authorization: `Bearer ${access_token}`,
          ...(id_token ? { 'X-ID-Token': id_token } : {}),
        },
      },
    );
    return response.data;
  }

  // =======================================================================
  // 10. XỬ LÝ LOGIC ĐĂNG NHẬP CHÍNH CỦA GOOGLE
  // =======================================================================
  async googleLogin(code: string) {
    const { access_token: gg_token, id_token } = await this.getOAuthGoogleToken(code);
    const userInfo = await this.getGoogleUserInfo(gg_token, id_token);
    const normalizedEmail = userInfo.email.trim().toLowerCase();

    if (!userInfo.email_verified) {
      throw new BadRequestException('Email Google này chưa được xác minh!');
    }

    let user = await this.userModel.findOne({ email: normalizedEmail });
    let isNewUser = 0;

    if (user && user.verify !== UserVerifyStatus.Verified) {
      user.verify = UserVerifyStatus.Verified;
      await user.save();
    }

    if (!user) {
      const userId = new Types.ObjectId();
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1@';
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      user = await this.userModel.create({
        _id: userId,
        name: userInfo.name || 'Người dùng Google',
        email: normalizedEmail,
        password: hashedPassword, // Đã thay đổi
        gender: 'Other',
        date_of_birth: new Date(),
        verify: UserVerifyStatus.Verified,
        username: `user${userId.toString()}`,
        role: UserRole.USER,
        login_type: LoginType.GOOGLE,
      });
      isNewUser = 1;
    }
    const payload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email,
      role: user.role,
      verify: user.verify,
      onboarding_completed: user.onboarding_completed,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessTokenSecret') || 'default_secret',
        expiresIn: (this.configService.get<string>('jwt.accessTokenExpireIn') ||
          '15m') as SignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret') || 'default_secret',
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

    return { access_token, refresh_token, role: user.role, new_user: isNewUser };
  }

  // =======================================================================
  // 11. Thi (REFRESH TOKEN & HELPERS)
  // =======================================================================
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('jwt.secret'),
      });

      const user = await this.userModel.findById(payload.user_id).exec();

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateAuthResponse(user: UserDocument): AuthResponse {
    const accessToken = this.generateAccessToken(user);
    const refreshTokenStr = this.generateRefreshToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email || '',
        name: user.name,
        role: user.role || UserRole.USER,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken: refreshTokenStr,
    };
  }

  private generateAccessToken(user: UserDocument): string {
    const payload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email || '',
      role: user.role || UserRole.USER,
      verify: user.verify,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.accessTokenExpireIn',
      ) as SignOptions['expiresIn'],
    });
  }

  private generateRefreshToken(user: UserDocument): string {
    const payload: JwtPayload = {
      user_id: user._id.toString(),
      email: user.email || '',
      role: user.role || UserRole.USER,
      verify: user.verify,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') as SignOptions['expiresIn'],
    });
  }

  // =======================================================================
  // 12. HÀM ĐIỀU HƯỚNG THEO ROLE (Thuận)
  // =======================================================================
  private getRedirectPathByRole(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  }
}
