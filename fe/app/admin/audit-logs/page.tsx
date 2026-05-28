'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { adminService, type ActivityLogRecord } from '@/lib/admin.service';
import { authStorage } from '@/lib/auth-storage';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Lock,
  MousePointerClick,
  Search,
  Settings,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const categoryLabels: Record<string, string> = {
  all: 'Tất cả nhật ký',
  tracking: 'Tracking events',
  user_action: 'Thao tác Admin',
  security: 'Bảo mật',
  system: 'Hệ thống',
};

export default function AdminAuditLogsPage() {
  const [category, setCategory] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const res = await adminService.getActivityLogs(token, {
        page,
        limit: 20,
        category,
        search,
      });
      setLogs(res.logs);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải nhật ký hoạt động');
    } finally {
      setIsLoading(false);
    }
  }, [category, page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Nhật ký hoạt động hệ thống"
        subtitle="Theo dõi thao tác quản trị và tracking events trong cùng một timeline."
        right={
          <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600">
            <ShieldAlert className="h-4 w-4" /> Audit + tracking
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCategory(key);
                setPage(1);
              }}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-bold transition',
                category === key
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-none'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(searchDraft);
                setPage(1);
              }
            }}
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 text-sm outline-none focus:border-violet-400 dark:text-white"
            placeholder="Tìm kiếm nhật ký, đường dẫn, visitor..."
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      <AdminPanel className="overflow-hidden p-0">
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải nhật ký...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Chưa có nhật ký phù hợp.</div>
          ) : (
            logs.map((log) => {
              const Icon = iconForLog(log);
              return (
                <div key={`${log.source}-${log.id}`} className="flex items-center gap-4 p-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colorForLog(log))}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{actionLabel(log.action)}</p>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatDate(log.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {log.source === 'tracking' ? 'Visitor' : 'Bởi'}:{' '}
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {log.source === 'tracking'
                            ? formatVisitor(log)
                            : log.actorName || log.actorEmail || 'System'}
                        </span>
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {log.source === 'tracking' ? 'Đường dẫn' : 'Khu vực'}:{' '}
                        <span className="font-bold text-violet-600 dark:text-violet-400">{log.resource}</span>
                      </span>
                      {log.status === 'failed' && (
                        <span className="rounded-full bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
                          Thất bại
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Trang {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-350 px-3 py-1.5 font-semibold disabled:opacity-50 transition"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-slate-350 px-3 py-1.5 font-semibold disabled:opacity-50 transition"
            >
              Sau
            </button>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}

function iconForLog(log: ActivityLogRecord) {
  if (log.source === 'tracking') return MousePointerClick;
  if (log.status === 'failed') return AlertCircle;
  if (log.category === 'security') return Lock;
  if (log.category === 'system') return Database;
  if (log.resource.includes('plan') || log.resource.includes('payment')) return Settings;
  if (log.status === 'success') return CheckCircle2;
  return User;
}

function colorForLog(log: ActivityLogRecord) {
  if (log.source === 'tracking') return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400';
  if (log.status === 'failed') return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450';
  if (log.category === 'security') return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450';
  if (log.category === 'system') return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450';
  return 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400';
}

function actionLabel(action: string) {
  if (action.startsWith('tracking.')) {
    const eventType = action.replace('tracking.', '');
    if (eventType === 'page_view') return 'Page view';
    return eventType.replace(/_/g, ' ');
  }

  const labels: Record<string, string> = {
    'users.bulk_delete': 'Xóa nhiều người dùng',
    'users.delete': 'Xóa người dùng',
    'users.update_status': 'Cập nhật trạng thái người dùng',
    'users.update_role': 'Cập nhật vai trò người dùng',
    'careers.create': 'Tạo nghề nghiệp',
    'careers.update': 'Cập nhật nghề nghiệp',
    'careers.delete': 'Xóa nghề nghiệp',
    'ai_plans.create': 'Tạo gói AI',
    'ai_plans.update': 'Cập nhật gói AI',
    'ai_plans.delete': 'Xóa gói AI',
    'payments.refund': 'Hoàn tiền thanh toán',
    'payments.webhook_test': 'Chạy payment webhook test',
  };
  return labels[action] || action;
}

function formatVisitor(log: ActivityLogRecord) {
  const anonymousId = getMetadataString(log.metadata, 'anonymousId') || log.resourceId || '';
  return anonymousId ? anonymousId.slice(0, 12) : 'Ẩn danh';
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}
