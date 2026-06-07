'use client';

import NotificationBell from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAssessment } from '@/context/assessment-context';
import { useAuth } from '@/context/auth-context';
import { userService, type UserMe } from '@/lib/user.service';
import { walletService, type WalletSummary } from '@/lib/wallet.service';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Compass,
  GitCompare,
  GraduationCap,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  TrendingUp,
  User,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';

const baseNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Compass },
  { href: '/career-simulation', label: 'Mô phỏng nghề', icon: BarChart3 },
  { href: '/career-compare', label: 'So sánh', icon: GitCompare },
  { href: '/learning-roadmap', label: 'Lộ trình', icon: BookOpen },
  { href: '/specialization', label: 'Khám phá', icon: TrendingUp },
  { href: '/community', label: 'Cộng đồng', icon: Users },
];

// Theme helper functions removed, using next-themes

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
      <img src={user.avatar} alt="Ảnh đại diện" className="h-full w-full rounded-full object-cover" />
    );
  }

  return <User className="h-5 w-5" />;
}

function HeaderUserMenu({
  user,
  wallet,
  profileHref,
}: {
  user: UserMe | null;
  wallet: WalletSummary | null;
  profileHref: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mở menu tài khoản" className="overflow-hidden rounded-full">
          <UserAvatar user={user} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl p-2">
        <div className="border-b border-border px-3 py-2">
          <p className="truncate text-sm font-semibold">{user?.name || 'Tài khoản Edumee'}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email || 'Đang đăng nhập'}</p>
        </div>
        <div className="mt-2 space-y-1">
          <Link
            href={profileHref}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <User className="h-4 w-4 text-slate-500" />
            Hồ sơ của tôi
          </Link>
          <Link
            href="/wallet"
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
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
      </PopoverContent>
    </Popover>
  );
}

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const { hasAssessmentResult } = useAssessment();
  const { accessToken, role } = useAuth();
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

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

  useEffect(() => {
    if (logoClicks > 0) {
      const timer = setTimeout(() => setLogoClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoClicks]);

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (logoClicks + 1 >= 5) {
      event.preventDefault();
      setLogoClicks(0);
      router.push('/admin-login');
      return;
    }

    setLogoClicks((prev) => prev + 1);
  };

  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const toggleDarkMode = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  const showMentorDirectory = role !== 'mentor' && role !== 'admin';
  const profileHref = role === 'mentor' ? '/mentor-dashboard/profile' : '/profile';
  const displayedUser = accessToken ? userMe : null;
  const displayedWallet = accessToken ? wallet : null;
  const navItems = [
    ...baseNavItems,
    ...(showMentorDirectory ? [{ href: '/mentor-matching', label: 'Mentor', icon: GraduationCap }] : []),
    ...(role === 'mentor' ? [{ href: '/mentor-dashboard', label: 'Cổng mentor', icon: ShieldCheck }] : []),
    ...(hasAssessmentResult ? [{ href: '/assessment-result', label: 'Kết quả', icon: ClipboardCheck }] : []),
  ];

  return (
    <nav className="glass-card sticky top-0 z-50 border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-display flex items-center gap-2 text-xl font-bold" onClick={handleLogoClick}>
          <Image src="/edumee-logo-icon.svg" alt="Edumee logo" width={32} height={30} className="shrink-0" />
          <span className="text-gradient-hero">Edumee</span>
        </Link>

        <div className="hidden items-center gap-1.5 lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={active ? 'default' : 'ghost'} size="sm" className="gap-1.5 text-sm">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <NotificationBell />
          <Button variant="ghost" size="icon" aria-label="Chế độ sáng/tối" onClick={toggleDarkMode}>
            {mounted ? (
              isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
            ) : (
              <div className="h-5 w-5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            )}
          </Button>
          <HeaderUserMenu user={displayedUser} wallet={displayedWallet} profileHref={profileHref} />
        </div>

        <button
          className="rounded-lg p-2 hover:bg-muted lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Menu điều hướng"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border lg:hidden"
          >
            <div className="container flex flex-col gap-2 py-4">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <Button variant={active ? 'default' : 'ghost'} className="w-full justify-start gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <Link href={profileHref} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <User className="h-4 w-4" />
                  Hồ sơ của tôi
                </Button>
              </Link>
              <Link href="/wallet" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <WalletCards className="h-4 w-4" />
                  Ví của tôi
                  <span className="ml-auto text-xs text-muted-foreground">
                    {displayedWallet ? formatCurrency(displayedWallet.availableBalance, displayedWallet.currency) : '--'}
                  </span>
                </Button>
              </Link>
              <div className="flex items-center justify-between rounded-lg px-2 py-1">
                <span className="text-sm font-medium">Thông báo</span>
                <NotificationBell />
              </div>
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={toggleDarkMode}>
                {mounted ? (
                  <>
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                  </>
                ) : (
                  <>
                    <div className="h-4 w-4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                    Đang tải...
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
