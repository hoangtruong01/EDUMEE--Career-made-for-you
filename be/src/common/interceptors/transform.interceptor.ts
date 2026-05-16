import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { REDIRECT_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const isRedirectHandler = Reflect.getMetadata(REDIRECT_METADATA, context.getHandler()) as boolean | undefined;
    const isSseHandler = Reflect.getMetadata(SSE_METADATA, context.getHandler()) as boolean | undefined;

    if (isSseHandler) {
      return next.handle() as Observable<Response<T>>;
    }

    return next.handle().pipe(
      map((data: T) => {
        if (isRedirectHandler) {
          return data as unknown as Response<T>;
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
