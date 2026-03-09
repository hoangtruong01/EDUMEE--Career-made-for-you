import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as nodemailer from 'nodemailer';
import { generateEmailHTML } from '../ultils/generate-email-html.util';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const mailUser = this.configService.get<string>('MAIL_USER') || '';
    const mailPassword = this.configService.get<string>('MAIL_PASSWORD') || '';

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: mailUser,
        pass: mailPassword,
      },
    }) as unknown as nodemailer.Transporter;
  }

  // 1. Hàm gửi mail Xác thực tài khoản (Register)
  async sendVerificationEmail(toEmail: string, name: string, token: string) {
    const MAIL_USER = this.configService.get<string>('MAIL_USER');

    // Lấy link Frontend từ file .env (Nếu không có thì mặc định dùng localhost)
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') ||
      'http://localhost:3000/api/v1';
    const verificationLink = `${clientUrl}/auth/verify-email?email_verify_token=${token}`;

    await this.transporter.sendMail({
      from: `"EDUMEE Team" <${MAIL_USER}>`,
      to: toEmail,
      subject: '🚀 Kích hoạt hành trình sự nghiệp của bạn cùng EDUMEE',
      html: generateEmailHTML({
        name,
        buttonText: '⚡ Kích hoạt tài khoản ngay',
        message: `
          Chúc mừng bạn đã gia nhập <b>EDUMEE</b>! Chúng tôi rất hào hứng được đồng hành cùng bạn trên con đường khám phá bản thân.<br><br>
          Chỉ còn một bước cuối cùng để mở khóa <b>Lộ trình sự nghiệp cá nhân hóa</b> và các phân tích chuyên sâu từ AI. Hãy xác nhận rằng đây là email của bạn để chúng ta bắt đầu nhé!
        `,
        link: verificationLink,
      }),
    });
  }

  // 2. Hàm gửi mail Quên mật khẩu (Forgot Password)
  async sendForgotPasswordEmail(toEmail: string, name: string, token: string) {
    const MAIL_USER = this.configService.get<string>('MAIL_USER');

    const clientUrl =
      this.configService.get<string>('CLIENT_URL') ||
      'http://localhost:3000/api/v1';
    const resetLink = `${clientUrl}/auth/reset-password?forgot_password_token=${token}`;

    await this.transporter.sendMail({
      from: `"EDUMEE Security" <${MAIL_USER}>`, // Sử dụng "Security" để tăng độ tin cậy
      to: toEmail,
      subject: '🔐 [EDUMEE] Yêu cầu khôi phục mật khẩu tài khoản',
      html: generateEmailHTML({
        name,
        buttonText: '🛠️ Thiết lập mật khẩu mới',
        message: `
          Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản <b>EDUMEE</b> của bạn. Hãy nhấn vào nút bên dưới để tạo mật khẩu mới và sớm quay lại với lộ trình sự nghiệp của mình nhé!<br><br>
          <i>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không bị thay đổi.</i>
        `,
        link: resetLink,
      }),
    });
  }
}
