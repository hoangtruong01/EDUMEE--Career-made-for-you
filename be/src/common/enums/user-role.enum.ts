export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MENTOR = 'mentor',
  EMPLOYER = 'employer',
  HR = 'hr',
  RECRUITER = 'recruiter',
}
export enum UserVerifyStatus {
  Unverified, // chưa xác thực email, mặc định = 0
  Verified, // đã xác thực email
  Banned, // bị khóa
}

export enum TokenTypes {
  AccessToken,
  RefreshToken,
  EmailVerificationToken,
  ForgotPasswordToken,
}
export interface GoogleProfile {
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}
export enum LoginType {
  PASSWORD = 'password',
  GOOGLE = 'google',
}
