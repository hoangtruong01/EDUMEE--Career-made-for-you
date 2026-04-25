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
  const { isAuthenticated, isHydrated, role, onboardingCompleted } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const surveyPages = ['/onboarding', '/personality-test', '/assessment-result'];
  const isSurveyPage = surveyPages.some(page => pathname?.startsWith(page));


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
      return;
    }

    // Force orientation survey for non-admin users
    if (isAuthenticated && role !== 'admin' && !onboardingCompleted && !isSurveyPage) {
      router.replace('/onboarding');
    }
  }, [canAccessUserDemo, hasRoleAccess, isAuthenticated, isHydrated, pathname, router, onboardingCompleted, role, isSurveyPage]);


  if (!mounted || !isHydrated || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <>{children}</>;
}
