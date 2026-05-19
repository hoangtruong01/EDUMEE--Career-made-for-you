import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id?: string;
  url?: string;
  format?: string;
  resource_type?: string;
  [key: string]: unknown;
}

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary credentials are not fully configured. Image uploads will fail.',
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.logger.log(
      `Cloudinary configured for cloud: ${cloudName} (key: ${apiKey.slice(0, 6)}...)`,
    );
  }

  async uploadImage(
    file: UploadedImageFile,
    folder = 'edumee/avatars',
  ): Promise<CloudinaryUploadResponse> {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials are not configured');
    }

    this.logger.log(
      `Uploading image: ${file.originalname} (${file.size} bytes) to folder: ${folder}`,
    );

    try {
      const result = await this.uploadViaStream(file, folder);

      this.logger.log(
        `Upload successful: ${result.public_id} → ${result.secure_url}`,
      );

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        url: result.url,
        format: result.format,
        resource_type: result.resource_type,
      };
    } catch (error: unknown) {
      const errorObject = error as Error;
      this.logger.error('Cloudinary upload error detail:', errorObject);
      const message = errorObject?.message || 'Cloudinary upload error';
      this.logger.error(`Cloudinary upload failed: ${message}`);
      throw new Error(message);
    }
  }

  private uploadViaStream(
    file: UploadedImageFile,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { width: 512, height: 512, crop: 'limit', quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(new Error(error.message));
          }
          if (!result) {
            return reject(new Error('Cloudinary returned empty result'));
          }
          return resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}
