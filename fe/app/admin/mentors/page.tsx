'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Check,
  ChevronRight,
  GraduationCap,
  MoreVertical,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useState } from 'react';

type MentorTab = 'pending' | 'approved' | 'bookings';

export default function AdminMentorsPage() {
  const [activeTab, setActiveTab] = useState<MentorTab>('pending');

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Mentor & Lịch hẹn"
        subtitle="Duyệt hồ sơ chuyên gia và theo dõi tiến độ các buổi tư vấn 1-1."
      />

      <div className="mb-6 flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <TabItem
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          label="Chờ duyệt hồ sơ"
          badge="3"
        />
        <TabItem
          active={activeTab === 'approved'}
          onClick={() => setActiveTab('approved')}
          label="Danh sách Mentor"
        />
        <TabItem
          active={activeTab === 'bookings'}
          onClick={() => setActiveTab('bookings')}
          label="Quản lý Lịch hẹn"
        />
      </div>

      {activeTab === 'pending' && <PendingMentors />}
      {activeTab === 'approved' && <MentorList />}
      {activeTab === 'bookings' && <BookingList />}
    </div>
  );
}

function TabItem({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative pb-4 text-sm font-semibold transition-colors',
        active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
      )}
    >
      {label}
      {badge && (
        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">
          {badge}
        </span>
      )}
      {active && <div className="absolute bottom-0 left-0 h-0.5 w-full bg-violet-600 dark:bg-violet-400" />}
    </button>
  );
}

function PendingMentors() {
  const mentors = [
    {
      id: '1',
      name: 'Lê Thế Hoàng',
      email: 'hoang.le@example.com',
      expertise: 'Software Architecture, AI',
      exp: '10 năm',
      company: 'Tech Giant Corp',
      submittedAt: '1 ngày trước',
    },
    {
      id: '2',
      name: 'Phạm Minh Trang',
      email: 'trang.pham@example.com',
      expertise: 'UI/UX Design, Product Management',
      exp: '6 năm',
      company: 'Creative Studio',
      submittedAt: '3 ngày trước',
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {mentors.map((m) => (
        <AdminPanel key={m.id} className="p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{m.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{m.email}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">{m.submittedAt}</span>
            </div>

            <div className="mb-6 space-y-3">
              <InfoField label="Lĩnh vực chuyên môn" value={m.expertise} />
              <InfoField label="Kinh nghiệm" value={m.exp} />
              <InfoField label="Công ty hiện tại" value={m.company} />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-slate-900 dark:bg-slate-800 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition shadow-sm">
              Xem Hồ sơ (CV)
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition shadow-sm">
              <Check className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition shadow-sm">
              <X className="h-5 w-5" />
            </button>
          </div>
        </AdminPanel>
      ))}
    </div>
  );
}

function MentorList() {
  return (
    <AdminPanel className="p-0 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 text-sm outline-none focus:border-violet-400 dark:text-slate-200 transition-all" placeholder="Tìm mentor..." />
        </div>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
          <tr>
            <th className="px-6 py-4 text-left">Mentor</th>
            <th className="px-6 py-4 text-left">Chuyên môn</th>
            <th className="px-6 py-4 text-center">Đánh giá</th>
            <th className="px-6 py-4 text-center">Buổi tư vấn</th>
            <th className="px-6 py-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3].map((i) => (
            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">M</div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">Mentor Name {i}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">mentor{i}@edumee.com</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Product Manager, Business Analyst</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-1 text-amber-500 font-bold">
                  <Star className="h-4 w-4 fill-current" /> 4.9
                </div>
              </td>
              <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">128</td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 hover:bg-slate-100 rounded-lg"><MoreVertical className="h-4 w-4 text-slate-400" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminPanel>
  );
}

function BookingList() {
  return (
    <AdminPanel className="p-0 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
          <tr>
            <th className="px-6 py-4 text-left">Học viên</th>
            <th className="px-6 py-4 text-left">Mentor</th>
            <th className="px-6 py-4 text-left">Thời gian</th>
            <th className="px-6 py-4 text-left">Trạng thái</th>
            <th className="px-6 py-4 text-right">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <td className="px-6 py-4 font-medium">Trần Văn C</td>
            <td className="px-6 py-4 font-medium">Lê Thế Hoàng</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4" /> 15/05/2024 • 20:00
              </div>
            </td>
            <td className="px-6 py-4">
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">Đã xác nhận</span>
            </td>
            <td className="px-6 py-4 text-right">
              <button className="text-violet-600 hover:underline"><ChevronRight className="h-5 w-5 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </AdminPanel>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}
