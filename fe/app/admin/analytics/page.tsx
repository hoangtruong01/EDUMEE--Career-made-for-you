'use client';

import { AdminPanel, AdminSectionHeader, AdminStatCard } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import { CalendarClock, Download, Gauge, Target, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

const stats = [
  {
    title: 'Tổng lượt truy cập',
    value: '148,253',
    delta: '+18.2%',
    icon: Gauge,
    iconClassName: 'bg-violet-500',
  },
  {
    title: 'Người dùng hoạt động',
    value: '9,842',
    delta: '+12.5%',
    icon: Users,
    iconClassName: 'bg-emerald-500',
  },
  {
    title: 'Tỷ lệ hoàn thành test',
    value: '78.3%',
    delta: '+5.4%',
    icon: Target,
    iconClassName: 'bg-sky-500',
  },
  {
    title: 'Đặt lịch mentor',
    value: '1,632',
    delta: '-3.1%',
    deltaType: 'down' as const,
    icon: CalendarClock,
    iconClassName: 'bg-orange-500',
  },
];

const monthlyPointsByRange = {
  '6m': [26, 34, 42, 50, 58, 66],
  '12m': [20, 26, 34, 42, 50, 58, 66, 74, 73, 71, 73, 76],
};
const weeklyBars = [420, 560, 490, 620, 710, 680];
const sectors = [
  { name: 'Công nghệ', value: 35, color: 'bg-violet-500' },
  { name: 'Thiết kế', value: 22, color: 'bg-indigo-400' },
  { name: 'Marketing', value: 18, color: 'bg-sky-500' },
  { name: 'Tài chính', value: 15, color: 'bg-emerald-500' },
  { name: 'Khác', value: 10, color: 'bg-amber-500' },
];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<'6m' | '12m'>('12m');
  const [chartMode, setChartMode] = useState<'line' | 'column'>('line');

  const monthlyPoints = monthlyPointsByRange[range];
  const maxWeekly = Math.max(...weeklyBars);

  const donutStyle = useMemo(() => {
    const colorMap: Record<string, string> = {
      'bg-violet-500': '#8b5cf6',
      'bg-indigo-400': '#818cf8',
      'bg-sky-500': '#0ea5e9',
      'bg-emerald-500': '#10b981',
      'bg-amber-500': '#f59e0b',
    };

    const gradients = sectors.reduce<{ stops: string[]; offset: number }>(
      (acc, sector) => {
        const from = acc.offset;
        const to = from + sector.value;
        acc.stops.push(`${colorMap[sector.color]} ${from}% ${to}%`);
        return { stops: acc.stops, offset: to };
      },
      { stops: [], offset: 0 },
    ).stops;

    return { background: `conic-gradient(${gradients.join(',')})` };
  }, []);

  return (
    <div className="max-w-6xl">
      <AdminSectionHeader
        title="Phân tích và Thống kê"
        subtitle="Theo dõi hiệu suất và xu hướng người dùng"
        right={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setRange('6m')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  range === '6m' ? 'bg-violet-500 text-white' : 'text-slate-600',
                )}
              >
                6 tháng
              </button>
              <button
                type="button"
                onClick={() => setRange('12m')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  range === '12m' ? 'bg-violet-500 text-white' : 'text-slate-600',
                )}
              >
                12 tháng
              </button>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <Download className="h-4 w-4" />
              Xuất báo cáo
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <AdminStatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <AdminPanel title="Tăng trưởng người dùng" className="px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">Theo tháng trong năm 2026</p>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setChartMode('line')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold',
                  chartMode === 'line' ? 'bg-slate-900 text-white' : 'text-slate-500',
                )}
              >
                Line
              </button>
              <button
                type="button"
                onClick={() => setChartMode('column')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold',
                  chartMode === 'column' ? 'bg-slate-900 text-white' : 'text-slate-500',
                )}
              >
                Column
              </button>
            </div>
          </div>
          <div className="h-64 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="relative h-full w-full">
              {chartMode === 'line' ? (
                <svg viewBox="0 0 600 220" className="h-full w-full">
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    points={monthlyPoints
                      .map(
                        (point, index) =>
                          `${index * (560 / (monthlyPoints.length - 1)) + 20},${200 - point * 2.2}`,
                      )
                      .join(' ')}
                  />
                  {monthlyPoints.map((point, index) => (
                    <circle
                      key={`line-point-${index}-${point}`}
                      cx={index * (560 / (monthlyPoints.length - 1)) + 20}
                      cy={200 - point * 2.2}
                      r="4"
                      fill="#6366f1"
                    />
                  ))}
                </svg>
              ) : (
                <div className="flex h-full items-end justify-between gap-2 px-3 pb-4">
                  {monthlyPoints.map((point, index) => (
                    <div
                      key={`column-point-${index}-${point}`}
                      className="flex h-full w-full items-end justify-center"
                    >
                      <div
                        className="w-full max-w-9 rounded-t-md bg-linear-to-b from-indigo-500 to-violet-500"
                        style={{ height: `${Math.max(18, point)}%` }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Phân bố nghề nghiệp" className="px-5 py-4">
          <p className="mb-4 text-sm text-slate-500">Top 5 lĩnh vực phổ biến</p>
          <div className="relative mx-auto mb-6 h-40 w-40 rounded-full" style={donutStyle}>
            <div className="absolute inset-5 rounded-full bg-white" />
          </div>
          <div className="space-y-2">
            {sectors.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sector.color}`} />
                  <span className="text-slate-600">{sector.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{sector.value}%</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Hoàn thành bài test" className="mt-4 px-5 py-4">
        <p className="mb-4 text-sm text-slate-500">6 tuần gần nhất</p>
        <div className="flex h-64 items-end justify-between gap-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-6">
          {weeklyBars.map((item, index) => (
            <div
              key={`weekly-bar-${index}-${item}`}
              className="flex w-full flex-col items-center gap-2"
            >
              <div
                className="w-14 rounded-t-xl bg-linear-to-b from-indigo-500 to-violet-500"
                style={{ height: `${Math.max(56, Math.round((item / maxWeekly) * 190))}px` }}
              />
              <span className="text-xs text-slate-500">Tuần {index + 1}</span>
            </div>
          ))}
        </div>
      </AdminPanel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-linear-to-r from-indigo-500 to-violet-500 px-5 py-5 text-white shadow-sm">
          <p className="mb-1 text-sm/none font-semibold tracking-wide uppercase">
            Tăng trưởng cao nhất
          </p>
          <p className="mb-3 text-5xl/none font-bold">+18.2%</p>
          <p className="text-sm text-white/90">
            Lượt truy cập tăng mạnh trong tháng 3, chủ yếu từ sinh viên IT và công nghệ.
          </p>
        </section>
        <section className="rounded-2xl bg-linear-to-r from-emerald-500 to-cyan-500 px-5 py-5 text-white shadow-sm">
          <p className="mb-1 text-sm/none font-semibold tracking-wide uppercase">
            Tỷ lệ hoàn thành
          </p>
          <p className="mb-3 text-5xl/none font-bold">78.3%</p>
          <p className="text-sm text-white/90">
            Tỷ lệ người dùng hoàn thành bài test cao, cho thấy nội dung phù hợp và dễ tiếp cận.
          </p>
        </section>
      </div>
    </div>
  );
}
