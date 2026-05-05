'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Database,
  Lock,
  Search,
  Settings,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

export default function AdminAuditLogsPage() {
  const [filterType, setFilterType] = useState('all');

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Nhật ký Hoạt động Hệ thống"
        subtitle="Lưu vết toàn bộ thao tác của đội ngũ quản trị và các thay đổi cấu hình quan trọng."
        right={
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold">
              <ShieldAlert className="h-4 w-4" /> Dữ liệu được mã hóa & không thể xóa
           </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {['all', 'user_action', 'security', 'system'].map((type) => (
             <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                   "px-4 py-2 rounded-xl text-xs font-bold transition",
                   filterType === type 
                   ? "bg-violet-600 text-white shadow-lg shadow-violet-200" 
                   : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
             >
                {type === 'all' ? 'Tất cả nhật ký' : 
                 type === 'user_action' ? 'Thao tác Admin' : 
                 type === 'security' ? 'Bảo mật' : 'Hệ thống'}
             </button>
          ))}
        </div>

        <div className="relative min-w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="h-10 w-full rounded-xl border border-slate-200 pl-10 text-sm outline-none focus:border-violet-400" placeholder="Tìm kiếm nhật ký..." />
        </div>
      </div>

      <AdminPanel className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[
            { user: 'Admin Hoàng', action: 'Đã xóa 12 bài viết', type: 'user_action', target: 'Community', time: '5 phút trước', icon: User, color: 'text-violet-600 bg-violet-50' },
            { user: 'System', action: 'Tự động khóa tài khoản user_spam_01', type: 'security', target: 'Security', time: '12 phút trước', icon: Lock, color: 'text-rose-600 bg-rose-50' },
            { user: 'Admin Minh', action: 'Cập nhật giá gói Pro', type: 'system', target: 'Subscription', time: '1 giờ trước', icon: Settings, color: 'text-amber-600 bg-amber-50' },
            { user: 'System', action: 'Sao lưu dữ liệu định kỳ thành công', type: 'system', target: 'Database', time: '3 giờ trước', icon: Database, color: 'text-emerald-600 bg-emerald-50' },
            { user: 'Admin Trang', action: 'Duyệt 5 Mentor mới', type: 'user_action', target: 'Mentoring', time: '5 giờ trước', icon: User, color: 'text-violet-600 bg-violet-50' },
            { user: 'System', action: 'Cảnh báo: Tốc độ phản hồi AI tăng cao', type: 'system', target: 'AI Service', time: '8 giờ trước', icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
          ].map((log, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition cursor-pointer">
              <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center", log.color)}>
                <log.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                   <p className="text-sm font-bold text-slate-900">{log.action}</p>
                   <span className="text-[10px] font-bold text-slate-400">{log.time}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                   <span className="text-xs font-medium text-slate-500">Bởi: <span className="text-slate-700 font-bold">{log.user}</span></span>
                   <span className="h-1 w-1 rounded-full bg-slate-300" />
                   <span className="text-xs font-medium text-slate-500">Khu vực: <span className="text-violet-600 font-bold">{log.target}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
           <button className="text-xs font-bold text-slate-500 hover:text-violet-600 transition">Xem thêm các hoạt động cũ hơn</button>
        </div>
      </AdminPanel>
    </div>
  );
}
