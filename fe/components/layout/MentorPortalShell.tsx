'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import ThemeToggle from '@/components/admin/ThemeToggle';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { userService, type UserMe } from '@/lib/user.service';
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Store,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const portalItems = [
  { href: '/mentor-dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/mentor-dashboard/profile', label: 'Hồ sơ mentor', icon: UserRoundCheck },
  { href: '/mentor-dashboard/availability', label: 'Lịch trống', icon: CalendarDays },
  { href: '/mentor-dashboard/bookings', label: 'Booking', icon: UsersRound },
  { href: '/mentor-matching', label: 'Xem marketplace', icon: Store },
];

function UserAvatar({ user }: { user: UserMe | null }) {
  if (user?.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatar} alt="Ảnh đại diện" className="h-full w-full rounded-xl object-cover" />
    );
  }

  return <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase() || 'M'}</span>;
}

function PortalShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [userMe, setUserMe] = useState<UserMe | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    userService.getMe(accessToken).then(setUserMe).catch(() => setUserMe(null));
  }, [accessToken]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex h-18 items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-500/10">
            <Image src="/edumee-logo-icon.svg" alt="Edumee" width={28} height={28} />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Edumee Mentor</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Portal làm việc</p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {portalItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== '/mentor-dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-100 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex h-18 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 lg:hidden">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Cổng mentor</p>
                <h1 className="text-lg font-bold text-slate-950 dark:text-slate-50">Không gian làm việc của mentor</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                  {userMe?.name || 'Mentor'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{userMe?.email || 'Đang hoạt động'}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 shadow-lg shadow-sky-600/15">
                <UserAvatar user={userMe} />
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function MentorPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <PortalShellInner>{children}</PortalShellInner>
    </RouteGuard>
  );
}
