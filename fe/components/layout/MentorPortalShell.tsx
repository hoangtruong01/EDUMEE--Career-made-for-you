'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import ThemeToggle from '@/components/admin/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/auth-context';
import { useMentorPortalData } from '@/hooks/useMentorPortalData';
import { userService, type UserMe } from '@/lib/user.service';
import { walletService, type WalletSummary } from '@/lib/wallet.service';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareText,
  Star,
  User,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const portalItems = [
  { href: '/mentor-dashboard', activePath: '/mentor-dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/mentor-dashboard/availability', activePath: '/mentor-dashboard/availability', label: 'Lịch trống', icon: CalendarDays },
  { href: '/mentor-dashboard/bookings', activePath: '/mentor-dashboard/bookings', label: 'Booking', icon: UsersRound },
  { href: '/mentor-dashboard/community', activePath: '/mentor-dashboard/community', label: 'Cộng đồng', icon: MessageSquareText },
  { href: '/mentor-dashboard/income', activePath: '/mentor-dashboard/income', label: 'Thu nhập', icon: HandCoins },
  { href: '/mentor-dashboard/reviews', activePath: '/mentor-dashboard/reviews', label: 'Đánh giá', icon: Star },
];

function formatCurrency(amount?: number, currency = 'VND'): string {
  const numericAmount = Number(amount || 0);
  if (currency.toUpperCase() === 'VND') {
    return `${new Intl.NumberFormat('vi-VN').format(numericAmount)} đ`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function UserAvatar({ user }: { user: UserMe | null }) {
  if (user?.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatar} alt="Ảnh đại diện" className="h-full w-full rounded-xl object-cover" />
    );
  }

  return <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase() || 'M'}</span>;
}

function HeaderAccountMenu({
  user,
  wallet,
  profileActive,
  onLogout,
}: {
  user: UserMe | null;
  wallet: WalletSummary | null;
  profileActive: boolean;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Mở menu tài khoản"
          className={cn(
            'flex items-center gap-3 rounded-xl p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:pl-3',
            profileActive
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <div className="hidden text-right sm:block">
            <p
              className={cn(
                'text-sm font-semibold',
                profileActive ? 'text-sky-700 dark:text-sky-300' : 'text-slate-950 dark:text-slate-50',
              )}
            >
              {user?.name || 'Mentor'}
            </p>
            <p
              className={cn(
                'text-xs',
                profileActive ? 'text-sky-600 dark:text-sky-300/80' : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {user?.email || 'Đang hoạt động'}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600">
            <UserAvatar user={user} />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-xl p-2">
        <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{user?.name || 'Mentor'}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || 'Đang hoạt động'}</p>
        </div>
        <div className="mt-2 space-y-1">
          <Link
            href="/mentor-dashboard/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <User className="h-4 w-4 text-slate-500" />
            Hồ sơ của tôi
          </Link>
          <Link
            href="/wallet"
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className="flex items-center gap-3">
              <WalletCards className="h-4 w-4 text-slate-500" />
              Ví của tôi
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {wallet ? formatCurrency(wallet.availableBalance, wallet.currency) : '--'}
            </span>
          </Link>
        </div>
        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PortalShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const mentorPortalQuery = useMentorPortalData();
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const profileActive = pathname === '/mentor-dashboard/profile' || pathname.startsWith('/mentor-dashboard/profile/');
  const mentorProfile = mentorPortalQuery.data?.profile ?? null;
  const canUsePortalChrome = mentorProfile?.status === 'active';

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;
    userService
      .getMe(accessToken)
      .then((data) => {
        if (active) setUserMe(data);
      })
      .catch(() => {
        if (active) setUserMe(null);
      });
    walletService
      .getMine(accessToken)
      .then((data) => {
        if (active) setWallet(data);
      })
      .catch(() => {
        if (active) setWallet(null);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };
  const displayedUser = accessToken ? userMe : null;
  const displayedWallet = accessToken ? wallet : null;
  const activePortalItem = portalItems.find((item) => {
    const activePath = item.activePath || item.href;
    return pathname === activePath || (activePath !== '/mentor-dashboard' && pathname.startsWith(activePath));
  });

  if (mentorPortalQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          Đang kiểm tra hồ sơ mentor...
        </div>
      </div>
    );
  }

  if (!canUsePortalChrome) {
    return (
      <div className="min-h-screen bg-[#f6f8fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:ring-sky-500/20">
            <Image src="/edumee-logo-icon.svg" alt="Edumee" width={28} height={28} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Edumee Mentor</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Không gian làm việc</p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {portalItems.map((item) => {
            const activePath = item.activePath || item.href;
            const active = pathname === activePath || (activePath !== '/mentor-dashboard' && pathname.startsWith(activePath));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                  active
                    ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
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
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 lg:hidden">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cổng mentor</p>
                <h1 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                  {activePortalItem?.label || 'Không gian làm việc'}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <NotificationBell className="rounded-xl" />
              <ThemeToggle />
              <HeaderAccountMenu
                user={displayedUser}
                wallet={displayedWallet}
                profileActive={profileActive}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        <main className="px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          {children}
        </main>
      </div>

      <nav
        aria-label="Điều hướng mentor"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {portalItems.map((item) => {
            const activePath = item.activePath || item.href;
            const active = pathname === activePath || (activePath !== '/mentor-dashboard' && pathname.startsWith(activePath));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-[10px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                  active
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function MentorPortalShell({ children }: { children: ReactNode }) {
  return (
    <RouteGuard>
      <PortalShellInner>{children}</PortalShellInner>
    </RouteGuard>
  );
}
