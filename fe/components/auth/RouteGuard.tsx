'use client';

import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isHydrated, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDemoUserUnlocked =
    typeof window !== 'undefined' && window.localStorage.getItem('demo_user_unlocked') === '1';

  const canAccessUserDemo = !requiredRole && isDemoUserUnlocked;

  const hasRoleAccess = !requiredRole || role === requiredRole;
  const isAuthorized = (isAuthenticated && hasRoleAccess) || canAccessUserDemo;

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated && !canAccessUserDemo) {
      const redirectTo = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?redirect=${redirectTo}`);
      return;
    }

    if (!hasRoleAccess && !canAccessUserDemo) {
      router.replace('/unauthorized');
    }
  }, [canAccessUserDemo, hasRoleAccess, isAuthenticated, isHydrated, pathname, router]);

  if (!mounted || !isHydrated || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <>{children}</>;
}
