'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function decodeRoleFromToken(token: string): string {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return 'user';
    }

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    const payload = JSON.parse(decoded) as { role?: string };

    return payload.role || 'user';
  } catch {
    return 'user';
  }
}

export default function OAuthSuccessView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeOAuthLogin } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const accessToken = useMemo(() => searchParams.get('access_token') || '', [searchParams]);
  const refreshToken = useMemo(() => searchParams.get('refresh_token') || '', [searchParams]);
  const roleFromQuery = useMemo(() => searchParams.get('role') || '', [searchParams]);
  const error = useMemo(() => searchParams.get('error') || '', [searchParams]);

  useEffect(() => {
    if (error) {
      setErrorMessage('Đăng nhập Google thất bại. Vui lòng thử lại.');
      return;
    }

    if (!accessToken || !refreshToken) {
      setErrorMessage('Thiếu dữ liệu đăng nhập từ Google. Vui lòng thử lại.');
      return;
    }

    const role = roleFromQuery || decodeRoleFromToken(accessToken);

    completeOAuthLogin({
      accessToken,
      refreshToken,
      role,
    });

    router.replace(role === 'admin' ? '/admin/dashboard' : '/dashboard');
  }, [accessToken, completeOAuthLogin, error, refreshToken, roleFromQuery, router]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Không thể hoàn tất đăng nhập</h1>
          <p className="text-muted-foreground mb-4 text-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Đang hoàn tất đăng nhập Google...</p>
    </div>
  );
}
