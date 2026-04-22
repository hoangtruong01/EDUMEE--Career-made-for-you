'use client';

import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/plans', label: 'Gói dịch vụ', icon: CreditCard },
  { href: '/admin/content', label: 'Nội dung', icon: FileText },
  { href: '/admin/analytics', label: 'Phân tích', icon: BarChart3 },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

const footerItems = [{ href: '/', label: 'Về trang chủ', icon: Home }];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f3fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed top-0 left-0 flex h-screen w-55 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-18.5 items-center border-b border-slate-100 px-4">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
              A
            </div>
            <div>
              <p className="text-base leading-tight font-bold">CareerAI</p>
              <p className="text-xs text-slate-500">Admin Panel</p>
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
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-100 p-3">
            {footerItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group mb-1 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="group flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        <div className="ml-55 w-[calc(100%-220px)]">
          <header className="sticky top-0 z-10 flex h-18.5 items-center justify-end border-b border-slate-200 bg-white px-6">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm leading-tight font-semibold">Admin User</p>
                <p className="text-xs text-slate-500">admin@careerai.com</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-sm font-bold text-white">
                A
              </div>
            </div>
          </header>

          <main className="px-7 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
