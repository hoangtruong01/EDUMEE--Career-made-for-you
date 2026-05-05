'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

const categories = [
  'Tất cả',
  'Công nghệ thông tin',
  'Kinh tế & Tài chính',
  'Nghệ thuật & Thiết kế',
  'Y tế & Chăm sóc sức khỏe',
  'Marketing & Truyền thông',
];

export default function AdminCareersPage() {
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Danh mục Nghề nghiệp"
        subtitle="Cập nhật thông tin chi tiết về các nghề nghiệp để cung cấp dữ liệu chính xác cho AI tư vấn."
        right={
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-600 transition">
            <Plus className="h-4 w-4" /> Thêm nghề nghiệp mới
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-bold transition',
                activeCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="relative min-w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="h-10 w-full rounded-xl border border-slate-200 pl-10 text-sm outline-none focus:border-violet-400" placeholder="Tìm tên nghề nghiệp..." />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'AI Research Scientist', cat: 'Công nghệ thông tin', growth: '+25%', demand: 'Rất cao' },
          { title: 'UX/UI Designer', cat: 'Nghệ thuật & Thiết kế', growth: '+15%', demand: 'Cao' },
          { title: 'Digital Marketer', cat: 'Marketing & Truyền thông', growth: '+12%', demand: 'Trung bình' },
          { title: 'Financial Analyst', cat: 'Kinh tế & Tài chính', growth: '+8%', demand: 'Ổn định' },
          { title: 'Data Engineer', cat: 'Công nghệ thông tin', growth: '+22%', demand: 'Rất cao' },
          { title: 'Graphic Designer', cat: 'Nghệ thuật & Thiết kế', growth: '+5%', demand: 'Trung bình' },
        ].map((job, idx) => (
          <CareerCard key={idx} {...job} />
        ))}
      </div>
    </div>
  );
}

function CareerCard({
  title,
  cat,
  growth,
  demand,
}: {
  title: string;
  cat: string;
  growth: string;
  demand: string;
}) {
  return (
    <AdminPanel className="group relative overflow-hidden p-0">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
            <TrendingUp className="h-3 w-3" /> {growth}
          </div>
        </div>

        <h3 className="mb-1 text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors">{title}</h3>
        <p className="mb-4 text-xs font-medium text-slate-500">{cat}</p>

        <div className="flex items-center justify-between border-t border-slate-50 pt-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhu cầu</p>
            <p className="text-sm font-bold text-slate-700">{demand}</p>
          </div>
          <div className="flex gap-1">
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-violet-600 transition">
              <Edit3 className="h-4 w-4" />
            </button>
            <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </AdminPanel>
  );
}
