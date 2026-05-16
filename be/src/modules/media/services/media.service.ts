import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

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

interface CloudinaryErrorResponse {
  error?: {
    message?: string;
  };
}

function getCloudinaryErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return undefined;
  }

  const { error } = payload as CloudinaryErrorResponse;
  return typeof error?.message === 'string' ? error.message : undefined;
}

@Injectable()
export class MediaService {
  constructor(private readonly configService: ConfigService) {}

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

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');
    const formData = new FormData();
    formData.set('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    formData.set('api_key', apiKey);
    formData.set('timestamp', timestamp);
    formData.set('folder', folder);
    formData.set('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });
    const payload = (await response.json()) as CloudinaryUploadResponse | CloudinaryErrorResponse;

    if (!response.ok) {
      const message = getCloudinaryErrorMessage(payload) ?? 'Cloudinary upload error';
      throw new Error(message);
    }

    if (!('secure_url' in payload) || !payload.secure_url) {
      throw new Error('Cloudinary upload failed');
    }

    return payload;
  }
}
