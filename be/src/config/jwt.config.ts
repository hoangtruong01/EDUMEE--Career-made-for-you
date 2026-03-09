import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // 1. Access Token (Dùng biến JWT_SECRET của nhóm trưởng)
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',

  accessTokenSecret:
    process.env.JWT_SECRET_ACCESS_TOKEN ||
    'your-access-token-secret-change-in-production',
  accessTokenExpireIn: process.env.ACCESS_TOKEN_EXPIRE_IN || '15m',
  emailVerifySecret:
    process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN || 'email-verify-secret',
  emailVerifyExpiresIn: process.env.EMAIL_VERIFYING_TOKEN_EXPIRE_IN || '24h',
  forgotPasswordSecret:
    process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN || 'forgot-password-secret',
  forgotPasswordExpiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN || '1h',
}));
