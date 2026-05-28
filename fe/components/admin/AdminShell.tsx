'use client';

import { useAuth } from '@/context/auth-context';
import { userService, type UserMe } from '@/lib/user.service';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Briefcase,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import ThemeToggle from './ThemeToggle';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/mentors', label: 'Mentor & Booking', icon: GraduationCap },
  { href: '/admin/community', label: 'Cộng đồng', icon: MessageSquare },
  { href: '/admin/careers', label: 'Nghề nghiệp', icon: Briefcase },
  { href: '/admin/content', label: 'Ngân hàng đề', icon: FileText },
  { href: '/admin/plans', label: 'Gói dịch vụ', icon: CreditCard },
  { href: '/admin/finance', label: 'Tài chính', icon: DollarSign },
  { href: '/admin/analytics', label: 'Phân tích', icon: BarChart3 },
  { href: '/admin/audit-logs', label: 'Nhật ký', icon: History },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-screen bg-[#f4f3fb] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex min-h-screen">
        <aside className="fixed top-0 left-0 flex h-screen w-55 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <div className="flex h-18.5 items-center border-b border-slate-100 dark:border-slate-800 px-4">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
              A
            </div>
            <div>
              <p className="text-base leading-tight font-bold">CareerAI</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-100 dark:border-slate-800 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="group flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        <div className="ml-55 w-[calc(100%-220px)]">
          <header className="sticky top-0 z-10 flex h-18.5 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 transition-colors">
            <div className="flex items-center gap-2">
              {/* Optional: Add search or breadcrumbs here */}
            </div>
            
            <div className="flex items-center gap-6">
              <ThemeToggle />
              
              <Link href="/profile" className="flex items-center gap-3 rounded-xl transition hover:opacity-80">
                <div className="text-right">
                  <p className="text-sm leading-tight font-semibold">{userMe?.name || 'Admin Edumee'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userMe?.email || 'admin@edumee.vn'}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-violet-500 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                  {userMe?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userMe.avatar} alt="Ảnh đại diện admin" className="h-full w-full object-cover" />
                  ) : userMe?.name ? (
                    userMe.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
              </Link>
            </div>
          </header>

          <main className="px-7 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
