import { Types } from 'mongoose';
import { UserRole, UserVerifyStatus, LoginType } from '../../common/enums';
import { AuthService } from './auth.service';

describe('AuthService Google avatar sync', () => {
  const usersService = {};
  const jwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const userModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const refreshTokenModel = {
    create: jest.fn(),
  };
  const mailService = {};

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
      userModel as never,
      refreshTokenModel as never,
      mailService as never,
    );
    jwtService.signAsync.mockResolvedValue('signed-token');
    jwtService.decode.mockReturnValue({ iat: 1, exp: 2 });
    configService.get.mockReturnValue('test-secret');
    refreshTokenModel.create.mockResolvedValue({});
    const googleMocks = service as unknown as {
      getOAuthGoogleToken: jest.Mock;
      getGoogleUserInfo: jest.Mock;
    };
    googleMocks.getOAuthGoogleToken = jest.fn().mockResolvedValue({
      access_token: 'google-access-token',
      id_token: 'google-id-token',
    });
    googleMocks.getGoogleUserInfo = jest.fn().mockResolvedValue({
      email: 'Google.User@Example.com',
      email_verified: true,
      name: 'Google User',
      picture: 'https://lh3.googleusercontent.com/avatar.png',
    });
  });

  it('stores the Google picture as avatar for new Google users', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockImplementation((payload: Record<string, unknown>) =>
      Promise.resolve(payload),
    );

    await service.googleLogin('oauth-code');

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'google.user@example.com',
        name: 'Google User',
        avatar: 'https://lh3.googleusercontent.com/avatar.png',
        login_type: LoginType.GOOGLE,
      }),
    );
  });

  it('syncs the Google picture when an existing user has no avatar', async () => {
    const existingUser = {
      _id: new Types.ObjectId(),
      email: 'google.user@example.com',
      role: UserRole.USER,
      verify: UserVerifyStatus.Verified,
      onboarding_completed: false,
      avatar: '',
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findOne.mockResolvedValue(existingUser);

    await service.googleLogin('oauth-code');

    expect(existingUser.avatar).toBe('https://lh3.googleusercontent.com/avatar.png');
    expect(existingUser.save).toHaveBeenCalledTimes(1);
  });

  it('refreshes a stale Google-hosted avatar on Google login', async () => {
    const existingUser = {
      _id: new Types.ObjectId(),
      email: 'google.user@example.com',
      role: UserRole.USER,
      verify: UserVerifyStatus.Verified,
      onboarding_completed: false,
      avatar: 'https://lh3.googleusercontent.com/old-avatar.png',
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findOne.mockResolvedValue(existingUser);

    await service.googleLogin('oauth-code');

    expect(existingUser.avatar).toBe('https://lh3.googleusercontent.com/avatar.png');
    expect(existingUser.save).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite an existing uploaded avatar on Google login', async () => {
    const existingUser = {
      _id: new Types.ObjectId(),
      email: 'google.user@example.com',
      role: UserRole.USER,
      verify: UserVerifyStatus.Verified,
      onboarding_completed: false,
      avatar: 'https://cdn.example.com/manual-avatar.webp',
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findOne.mockResolvedValue(existingUser);

    await service.googleLogin('oauth-code');

    expect(existingUser.avatar).toBe('https://cdn.example.com/manual-avatar.webp');
    expect(existingUser.save).not.toHaveBeenCalled();
  });
});
