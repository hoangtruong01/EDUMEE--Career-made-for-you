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
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} - ${duration}ms - ${ip} - ${userAgent} - Error: ${this.formatError(error)}`,
          );
        },
      }),
    );
  }
}
