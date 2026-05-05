'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  LucideIcon,
  Search,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'plus' | 'pro'>('all');

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Tài chính"
        subtitle="Theo dõi doanh thu từ các gói đăng ký và lịch sử giao dịch thanh toán."
        right={
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
            <Download className="h-4 w-4" /> Xuất báo cáo tài chính
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <FinanceStatCard
          label="Tổng doanh thu tháng này"
          value="496,989,000"
          delta="+12.5%"
          trend="up"
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <FinanceStatCard
          label="Số lượng giao dịch"
          value="1,284"
          delta="+5.2%"
          trend="up"
          icon={CreditCard}
          color="bg-violet-500"
        />
        <FinanceStatCard
          label="Số dư hệ thống"
          value="2,145,000,000"
          icon={Wallet}
          color="bg-sky-500"
        />
      </div>

      <AdminPanel className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {['all', 'plus', 'pro'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as 'all' | 'plus' | 'pro')}
                className={cn(
                  'px-4 py-1.5 text-xs font-bold rounded-lg transition',
                  activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {t === 'all' ? 'Tất cả' : t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
             <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="h-10 w-64 rounded-xl border border-slate-200 pl-10 text-sm outline-none focus:border-violet-400" placeholder="Tìm mã giao dịch, email..." />
             </div>
             <button className="h-10 w-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50"><Filter className="h-4 w-4 text-slate-500" /></button>
          </div>
        </div>

        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-4 text-left">Mã giao dịch</th>
              <th className="px-6 py-4 text-left">Người dùng</th>
              <th className="px-6 py-4 text-left">Gói</th>
              <th className="px-6 py-4 text-left">Số tiền</th>
              <th className="px-6 py-4 text-left">Ngày</th>
              <th className="px-6 py-4 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { id: 'TXN847294', user: 'hoang.le@example.com', plan: 'Plus', amount: '99,000', date: 'Vừa xong', status: 'success' },
              { id: 'TXN847293', user: 'an.nguyen@example.com', plan: 'Pro', amount: '249,000', date: '10 phút trước', status: 'success' },
              { id: 'TXN847292', user: 'minh.tran@example.com', plan: 'Plus', amount: '99,000', date: '2 giờ trước', status: 'pending' },
              { id: 'TXN847291', user: 'thanh.vu@example.com', plan: 'Plus', amount: '99,000', date: 'Hôm qua', status: 'failed' },
            ].map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{tx.id}</td>
                <td className="px-6 py-4 font-medium">{tx.user}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    tx.plan === 'Pro' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  )}>
                    {tx.plan}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900">{tx.amount} đ</td>
                <td className="px-6 py-4 text-slate-500">{tx.date}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={tx.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminPanel>
    </div>
  );
}

function FinanceStatCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
  icon: LucideIcon;
  color: string;
}) {
  return (
    <AdminPanel className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('h-10 w-10 rounded-xl text-white flex items-center justify-center', color)}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg',
            trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
          )}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value} <span className="text-sm font-medium text-slate-400">VNĐ</span></h3>
    </AdminPanel>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; class: string }> = {
    success: { label: 'Thành công', class: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Chờ xử lý', class: 'bg-amber-100 text-amber-700' },
    failed: { label: 'Thất bại', class: 'bg-rose-100 text-rose-700' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={cn('px-3 py-1 rounded-full text-xs font-bold', config.class)}>
      {config.label}
    </span>
  );
}
