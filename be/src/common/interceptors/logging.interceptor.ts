import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly sensitiveQueryKeys = ['token', 'access_token', 'refresh_token'];

  private redactSensitiveUrl(url: string): string {
    try {
      const parsedUrl = new URL(url, 'http://localhost');

      this.sensitiveQueryKeys.forEach((key) => {
        if (parsedUrl.searchParams.has(key)) {
          parsedUrl.searchParams.set(key, '[redacted]');
        }
      });

      return `${parsedUrl.pathname}${parsedUrl.search}`;
    } catch {
      return url.replace(/([?&](?:token|access_token|refresh_token)=)[^&]*/gi, '$1[redacted]');
    }
  }

  private formatError(error: Error): string {
    if (!(error instanceof HttpException)) {
      return error.message;
    }

    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      return Array.isArray(message) ? message.join(', ') : String(message || error.message);
    }

    return error.message;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const safeUrl = this.redactSensitiveUrl(url);
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${safeUrl} ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${safeUrl} - ${duration}ms - ${ip} - ${userAgent} - Error: ${this.formatError(error)}`,
          );
        },
      }),
    );
  }
}
