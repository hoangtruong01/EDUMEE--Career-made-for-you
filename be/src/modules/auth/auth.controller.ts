import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
// IMPORT THÊM CÁC DECORATOR CỦA SWAGGER
import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@ApiTags('Auth') // Gom tất cả API trong file này vào chung mục "Auth" trên giao diện Swagger
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  // 1. Đăng ký
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 2. Đăng nhập
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 2b. Đăng nhập Admin (riêng biệt)
  @ApiOperation({ summary: 'Đăng nhập dành riêng cho Admin' })
  @HttpCode(HttpStatus.OK)
  @Post('admin-login')
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  // 3. Đăng xuất
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống (Yêu cầu Access Token)' })
  @ApiBearerAuth('JWT-auth') // Báo cho Swagger hiện ổ khóa gắn Token
  @ApiBody({
    schema: {
      properties: {
        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1...' },
      },
    },
  }) // Vẽ ô điền Body trên Swagger
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string) {
    return await this.authService.logout(refreshToken);
  }

  // 4. Xác thực Email
  @ApiOperation({ summary: 'Xác thực Email của người dùng' })
  @ApiQuery({
    name: 'email_verify_token',
    type: 'string',
    description: 'Token lấy từ URL trong Email',
    example: 'eyJhbGciOiJIUzI1...',
  }) // Vẽ ô điền Query trên thanh URL
  @Get('verify-email')
  async verifyEmail(@Query('email_verify_token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  // 5. Gửi lại Email xác thực
  @ApiOperation({ summary: 'Yêu cầu gửi lại Email xác thực' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'nhoxmymap74@gmail.com' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('resend-email-verify-token')
  async resendEmailVerify(@Body('email') email: string) {
    return await this.authService.resendEmailVerify(email);
  }

  // 6. Quên mật khẩu
  @ApiOperation({
    summary: 'Quên mật khẩu (Hệ thống sẽ gửi email chứa link đổi pass)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'nhoxmymap74@gmail.com' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return await this.authService.forgotPassword(email);
  }

  // 7. Check token quên mật khẩu
  @ApiOperation({ summary: 'Kiểm tra Token quên mật khẩu có hợp lệ không' })
  @ApiBody({
    schema: {
      properties: {
        forgot_password_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1...',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('verify-forgot-password-token')
  async verifyForgotPasswordToken(@Body('forgot_password_token') token: string) {
    return await this.authService.verifyForgotPasswordToken(token);
  }

  // 8. Đặt lại mật khẩu
  @ApiOperation({ summary: 'Tiến hành đặt lại mật khẩu mới' })
  @ApiBody({
    schema: {
      properties: {
        forgot_password_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1...',
        },
        password: { type: 'string', example: 'MatKhauMoi123@' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(
    @Body('forgot_password_token') token: string,
    @Body('password') password: string,
  ) {
    return await this.authService.resetPassword(token, password);
  }

  // =======================================================================
  // ENDPOINT NHẬN CALLBACK TỪ GOOGLE
  // =======================================================================
  @ApiOperation({
    summary: 'Google OAuth Callback (Được tự động gọi bởi Google)',
  })
  @Get('google/callback')
  @Redirect()
  async googleAuthCallback(@Query('code') code: string) {
    const result = await this.authService.googleLogin(code);

    const frontendUrl =
      this.configService.get<string>('CLIENT_REDIRECT_CALLBACK') ||
      'http://localhost:3000/oauth-success';

    const redirectUrl = `${frontendUrl}?access_token=${result.access_token}&refresh_token=${result.refresh_token}&new_user=${result.new_user}`;

    return { url: redirectUrl };
  }
}
