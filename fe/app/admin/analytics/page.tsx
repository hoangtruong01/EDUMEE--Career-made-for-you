'use client';

import { AdminPanel, AdminSectionHeader, AdminStatCard } from '@/components/admin/AdminPrimitives';
import { adminService, type AdminAnalyticsResponse } from '@/lib/admin.service';
import { authStorage } from '@/lib/auth-storage';
import { cn } from '@/lib/utils';
import { CalendarClock, Download, Gauge, Target, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AnalyticsRange = '6m' | '12m';

const sectorColors = ['bg-violet-500', 'bg-indigo-400', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500'];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('12m');
  const [chartMode, setChartMode] = useState<'line' | 'column'>('line');
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      setData(await adminService.getAnalytics(token, range));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phân tích');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: 'Tổng lượt truy cập',
        value: data.stats.totalVisits.value.toLocaleString('vi-VN'),
        delta: formatDelta(data.stats.totalVisits.delta),
        deltaType: data.stats.totalVisits.delta < 0 ? 'down' as const : undefined,
        icon: Gauge,
        iconClassName: 'bg-violet-500',
      },
      {
        title: 'Người dùng hoạt động',
        value: data.stats.activeUsers.value.toLocaleString('vi-VN'),
        delta: formatDelta(data.stats.activeUsers.delta),
        deltaType: data.stats.activeUsers.delta < 0 ? 'down' as const : undefined,
        icon: Users,
        iconClassName: 'bg-emerald-500',
      },
      {
        title: 'Tỷ lệ hoàn thành test',
        value: `${data.stats.assessmentCompletionRate.value}%`,
        delta: formatDelta(data.stats.assessmentCompletionRate.delta),
        deltaType: data.stats.assessmentCompletionRate.delta < 0 ? 'down' as const : undefined,
        icon: Target,
        iconClassName: 'bg-sky-500',
      },
      {
        title: 'Đặt lịch mentor',
        value: data.stats.mentorBookings.value.toLocaleString('vi-VN'),
        delta: formatDelta(data.stats.mentorBookings.delta),
        deltaType: data.stats.mentorBookings.delta < 0 ? 'down' as const : undefined,
        icon: CalendarClock,
        iconClassName: 'bg-orange-500',
      },
    ];
  }, [data]);

  const userGrowth = useMemo(() => data?.userGrowth || [], [data?.userGrowth]);
  const assessmentCompletions = useMemo(() => data?.assessmentCompletions || [], [data?.assessmentCompletions]);
  const careerDistribution = useMemo(() => data?.careerDistribution || [], [data?.careerDistribution]);
  const maxGrowth = Math.max(...userGrowth.map((point) => point.value), 1);
  const maxWeekly = Math.max(...assessmentCompletions.map((point) => point.value), 1);
  const donutStyle = useMemo(() => buildDonutStyle(careerDistribution), [careerDistribution]);

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Phân tích và Thống kê"
        subtitle="Theo dõi truy cập, tăng trưởng người dùng, bài test và booking mentor từ dữ liệu thật."
        right={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
              {(['6m', '12m'] as AnalyticsRange[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    range === item ? 'bg-violet-500 text-white' : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  {item === '6m' ? '6 tháng' : '12 tháng'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4" />
              Xuất báo cáo
            </button>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading && !data
          ? Array.from({ length: 4 }).map((_, index) => (
              <AdminPanel key={index} className="h-32 animate-pulse bg-slate-100">
                <span className="sr-only">Đang tải</span>
              </AdminPanel>
            ))
          : stats.map((item) => <AdminStatCard key={item.title} {...item} />)}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <AdminPanel title="Tăng trưởng người dùng" className="px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">Người dùng mới theo tháng</p>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
              {(['line', 'column'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setChartMode(item)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                    chartMode === item ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {item === 'line' ? 'Line' : 'Column'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            {userGrowth.length === 0 ? (
              <EmptyChart />
            ) : chartMode === 'line' ? (
              <svg viewBox="0 0 600 220" className="h-full w-full">
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  points={userGrowth
                    .map((point, index) => {
                      const x = userGrowth.length === 1 ? 300 : index * (560 / (userGrowth.length - 1)) + 20;
                      const y = 200 - (point.value / maxGrowth) * 170;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {userGrowth.map((point, index) => {
                  const x = userGrowth.length === 1 ? 300 : index * (560 / (userGrowth.length - 1)) + 20;
                  const y = 200 - (point.value / maxGrowth) * 170;
                  return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="4" fill="#6366f1" />;
                })}
              </svg>
            ) : (
              <div className="flex h-full items-end justify-between gap-2 px-3 pb-4">
                {userGrowth.map((point) => (
                  <div key={point.label} className="flex h-full w-full flex-col items-center justify-end gap-2">
                    <div
                      className="w-full max-w-9 rounded-t-md bg-linear-to-b from-indigo-500 to-violet-500"
                      style={{ height: `${Math.max(8, (point.value / maxGrowth) * 100)}%` }}
                    />
                    <span className="text-xs text-slate-500">{point.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Phân bố nghề nghiệp" className="px-5 py-4">
          <p className="mb-4 text-sm text-slate-500">Top ngành từ kết quả assessment</p>
          <div className="relative mx-auto mb-6 h-40 w-40 rounded-full bg-slate-100 dark:bg-slate-850" style={donutStyle}>
            <div className="absolute inset-5 rounded-full bg-white dark:bg-slate-900" />
          </div>
          <div className="space-y-2">
            {careerDistribution.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Chưa có dữ liệu phân bố.</p>
            ) : (
              careerDistribution.map((sector, index) => (
                <div key={sector.name} className="flex items-center justify-between text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sectorColors[index % sectorColors.length]}`} />
                    <span className="truncate text-slate-600 dark:text-slate-400">{sector.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{sector.value}%</span>
                </div>
              ))
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Hoàn thành bài test" className="mt-4 px-5 py-4">
        <p className="mb-4 text-sm text-slate-500">6 tuần gần nhất</p>
        <div className="flex h-64 items-end justify-between gap-4 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6">
          {assessmentCompletions.length === 0 ? (
            <EmptyChart />
          ) : (
            assessmentCompletions.map((item) => (
              <div key={item.label} className="flex w-full flex-col items-center gap-2">
                <div
                  className="w-14 rounded-t-xl bg-linear-to-b from-indigo-500 to-violet-500"
                  style={{ height: `${Math.max(12, Math.round((item.value / maxWeekly) * 190))}px` }}
                />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))
          )}
        </div>
      </AdminPanel>

    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">Chưa có dữ liệu.</div>;
}

function formatDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value.toFixed(1))}%`;
}

function buildDonutStyle(items: { value: number }[]) {
  if (items.length === 0) return undefined;
  const colorMap: Record<string, string> = {
    'bg-violet-500': '#8b5cf6',
    'bg-indigo-400': '#818cf8',
    'bg-sky-500': '#0ea5e9',
    'bg-emerald-500': '#10b981',
    'bg-amber-500': '#f59e0b',
  };

  let offset = 0;
  const stops = items.map((item, index) => {
    const color = colorMap[sectorColors[index % sectorColors.length]];
    const from = offset;
    const to = offset + item.value;
    offset = to;
    return `${color} ${from}% ${to}%`;
  });
  return { background: `conic-gradient(${stops.join(',')})` };
}
