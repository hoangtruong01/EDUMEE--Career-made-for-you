'use client';

import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const { isAuthenticated, isHydrated, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const hasRoleAccess = !requiredRole || role === requiredRole;
  const isAuthorized = isAuthenticated && hasRoleAccess;

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated) {
      const redirectTo = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?redirect=${redirectTo}`);
      return;
    }

    if (!hasRoleAccess) {
      router.replace('/unauthorized');
    }
  }, [hasRoleAccess, isAuthenticated, isHydrated, pathname, router]);

  if (!isHydrated || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <>{children}</>;
}
