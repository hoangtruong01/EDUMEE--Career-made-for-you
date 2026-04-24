import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
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
    const isRedirectHandler = Reflect.getMetadata(REDIRECT_METADATA, context.getHandler());

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
