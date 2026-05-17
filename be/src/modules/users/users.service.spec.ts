import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import type { UploadedImageFile } from '../media/services/media.service';

const createExecMock = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('UsersService avatar upload', () => {
  const userModel = {
    findByIdAndUpdate: jest.fn(),
  };
  const communityPostModel = {
    updateMany: jest.fn(),
  };
  const mediaService = {
    uploadImage: jest.fn(),
  };

  let service: UsersService;

  const validFile: UploadedImageFile = {
    originalname: 'avatar.webp',
    mimetype: 'image/webp',
    size: 512 * 1024,
    buffer: Buffer.from('avatar'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      userModel as never,
      communityPostModel as never,
      {} as never,
      {} as never,
      {} as never,
      mediaService as never,
    );
    userModel.findByIdAndUpdate.mockReturnValue(createExecMock({}));
    communityPostModel.updateMany.mockReturnValue(createExecMock({}));
    mediaService.uploadImage.mockResolvedValue({
      secure_url: 'https://cdn.example.com/avatar.webp',
    });
  });

  it('rejects non-image avatar files before upload', async () => {
    await expect(
      service.updateAvatar(new Types.ObjectId().toString(), {
        ...validFile,
        originalname: 'avatar.txt',
        mimetype: 'text/plain',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mediaService.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects avatar files larger than 5MB before upload', async () => {
    await expect(
      service.updateAvatar(new Types.ObjectId().toString(), {
        ...validFile,
        size: 6 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mediaService.uploadImage).not.toHaveBeenCalled();
  });

  it('accepts valid png, jpeg, and webp avatars', async () => {
    for (const mimetype of ['image/png', 'image/jpeg', 'image/webp']) {
      await expect(
        service.updateAvatar(new Types.ObjectId().toString(), {
          ...validFile,
          mimetype,
        }),
      ).resolves.toEqual({ avatar: 'https://cdn.example.com/avatar.webp' });
    }

    expect(mediaService.uploadImage).toHaveBeenCalledTimes(3);
  });
});
