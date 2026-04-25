import OAuthSuccessView from '@/views/OAuthSuccess';
import { Suspense } from 'react';

export default function OAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground text-sm">Đang hoàn tất đăng nhập Google...</p>
        </div>
      }
    >
      <OAuthSuccessView />
    </Suspense>
  );
}
