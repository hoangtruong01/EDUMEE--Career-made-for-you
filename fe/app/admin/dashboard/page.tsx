'use client';

import { AdminPanel, AdminSectionHeader, AdminStatCard } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CircleUserRound,
  Clock3,
  FileText,
  MessageSquareText,
  Plus,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminService, DashboardStats } from '@/lib/admin.service';
import { authStorage } from '@/lib/auth-storage';

const iconMap = {
  users: UsersIcon,
  test: CircleUserRound,
  careers: FileText,
  mentor: MessageSquareText,
};

const quickActions = [
  {
    label: 'Duyệt tài khoản',
    icon: UsersIcon,
    color: 'bg-violet-500',
    hint: 'Đã mở danh sách tài khoản chờ duyệt',
  },
  {
    label: 'Tạo nội dung',
    icon: FileText,
    color: 'bg-emerald-500',
    hint: 'Đã mở trình tạo nội dung',
  },
  {
    label: 'Xem phân tích',
    icon: TrendingUp,
    color: 'bg-sky-500',
    hint: 'Đã chuyển sang trang phân tích chi tiết',
  },
  {
    label: 'Quản lý gói dịch vụ',
    icon: Calendar,
    color: 'bg-orange-500',
    hint: 'Đã mở trang quản lý gói Free / Plus / Pro',
  },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<'all' | 'users' | 'test' | 'mentor'>('all');
  const [actionMessage, setActionMessage] = useState<string>('Sẵn sàng cho thao tác quản trị');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = authStorage.getAccessToken();
        const res = await adminService.getDashboardStats(token);
        setData(res);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const filteredActivities = useMemo(() => {
    if (!data) return [];
    if (activityFilter === 'all') {
      return data.recentActivities;
    }

    return data.recentActivities.filter((item) => item.type === activityFilter);
  }, [activityFilter, data]);

  const activityFilters = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'users' as const, label: 'Người dùng' },
    { value: 'test' as const, label: 'Bài test' },
    { value: 'mentor' as const, label: 'Mentor' },
  ];

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="w-full">

      <AdminSectionHeader
        title="Dashboard"
        subtitle="Tổng quan hoạt động hệ thống Career AI"
        right={
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" />
            Cập nhật: Vừa xong
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data?.stats.map((item) => (
          <AdminStatCard 
            key={item.title} 
            {...item} 
            icon={iconMap[item.iconType as keyof typeof iconMap] || UsersIcon}
            iconClassName={
              item.iconType === 'users' ? 'bg-violet-500' :
              item.iconType === 'test' ? 'bg-emerald-500' :
              item.iconType === 'careers' ? 'bg-sky-500' : 'bg-orange-500'
            }
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <AdminPanel title="Hoạt động gần đây" className="px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {activityFilters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                onClick={() => setActivityFilter(filter.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  activityFilter === filter.value
                    ? 'border-violet-200 bg-violet-100 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredActivities.map((item, idx) => (
              <div key={`${item.title}-${item.user}-${idx}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    {item.type === 'test' ? <CircleUserRound className="h-4 w-4" /> : <UsersIcon className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.user}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Nghề phổ biến" className="px-5 py-4">
          <div className="space-y-3">
            {data?.popularCareers.map((item, index) => (
              <div key={item.name} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {index + 1}. {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.views} lượt xem • {item.matches}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold ${item.delta.startsWith('-') ? 'text-rose-500' : 'text-emerald-600'}`}
                >
                  {item.delta}
                </span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => setActionMessage(item.hint)}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${item.color}`}
            >
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
            <Plus className="ml-auto h-4 w-4 text-slate-400" />
          </button>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
        {actionMessage}
      </p>
    </div>
  );
}
