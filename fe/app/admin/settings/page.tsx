'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import { Bell, Lock, Puzzle, Save, Settings, Shield, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

const tabs = [
  { label: 'Chung', icon: Settings },
  { label: 'Thông báo', icon: Bell },
  { label: 'Bảo mật', icon: Shield },
  { label: 'Tích hợp', icon: Puzzle },
];

const defaults = {
  systemName: 'Career AI',
  systemDesc: 'Nền tảng AI tư vấn nghề nghiệp hàng đầu Việt Nam',
  language: 'Tiếng Việt',
  theme: 'Indigo và Purple (Mặc định)',
  supportEmail: 'support@careerai.com',
  hotline: '1900 1234',
  emailNotice: true,
  pushNotice: false,
  digestNotice: true,
  require2FA: true,
  sessionTimeout: '30 phút',
  apiProvider: 'OpenAI',
  webhookUrl: 'https://api.careerai.com/webhook',
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'Chung' | 'Thông báo' | 'Bảo mật' | 'Tích hợp'>(
    'Chung',
  );
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState('Sẵn sàng cập nhật cấu hình hệ thống');

  const saveDisabled = useMemo(() => JSON.stringify(form) === JSON.stringify(defaults), [form]);

  const saveChanges = () => {
    localStorage.setItem('admin-settings-demo', JSON.stringify(form));
    setMessage(`Đã lưu thay đổi cho mục ${activeTab}`);
  };

  const resetDefaults = () => {
    setForm(defaults);
    setMessage('Đã khôi phục cấu hình mặc định');
  };

  const renderMainPanel = () => {
    if (activeTab === 'Thông báo') {
      return (
        <AdminPanel title="Cấu hình thông báo" className="px-5 py-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm font-medium dark:text-slate-300">
              Email thông báo hệ thống
              <input
                type="checkbox"
                checked={form.emailNotice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, emailNotice: event.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm font-medium dark:text-slate-300">
              Push notification quản trị
              <input
                type="checkbox"
                checked={form.pushNotice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, pushNotice: event.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm font-medium dark:text-slate-300">
              Tổng hợp hằng ngày
              <input
                type="checkbox"
                checked={form.digestNotice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, digestNotice: event.target.checked }))
                }
              />
            </label>
          </div>
        </AdminPanel>
      );
    }

    if (activeTab === 'Bảo mật') {
      return (
        <AdminPanel title="Bảo mật hệ thống" className="px-5 py-4">
          <div className="grid gap-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3 text-sm font-medium dark:text-slate-300">
              Bật xác thực 2 lớp cho admin
              <input
                type="checkbox"
                checked={form.require2FA}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, require2FA: event.target.checked }))
                }
              />
            </label>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-350">
                <Lock className="h-4 w-4" />
                Thời gian hết hạn phiên đăng nhập
              </label>
              <select
                value={form.sessionTimeout}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sessionTimeout: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
              >
                <option className="dark:bg-slate-900">15 phút</option>
                <option className="dark:bg-slate-900">30 phút</option>
                <option className="dark:bg-slate-900">60 phút</option>
              </select>
            </div>
          </div>
        </AdminPanel>
      );
    }

    if (activeTab === 'Tích hợp') {
      return (
        <AdminPanel title="Tích hợp dịch vụ" className="px-5 py-4">
          <div className="grid gap-3">
            <div>
              <label className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-350">Nhà cung cấp AI</label>
              <select
                value={form.apiProvider}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, apiProvider: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
              >
                <option className="dark:bg-slate-900">OpenAI</option>
                <option className="dark:bg-slate-900">Azure OpenAI</option>
                <option className="dark:bg-slate-900">Gemini</option>
              </select>
            </div>

            <div>
              <label className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-350">Webhook URL</label>
              <input
                value={form.webhookUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, webhookUrl: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
              />
            </div>
          </div>
        </AdminPanel>
      );
    }

    return (
      <>
        <AdminPanel title="Thông tin hệ thống" className="px-5 py-4">
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Tên hệ thống</label>
            <input
              value={form.systemName}
              onChange={(event) => setForm((prev) => ({ ...prev, systemName: event.target.value }))}
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
            />

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Mô tả</label>
            <textarea
              value={form.systemDesc}
              onChange={(event) => setForm((prev) => ({ ...prev, systemDesc: event.target.value }))}
              className="min-h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-400 dark:text-white"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-350">
                  <SlidersHorizontal className="h-4 w-4" />
                  Ngôn ngữ mặc định
                </label>
                <select
                  value={form.language}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, language: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
                >
                  <option className="dark:bg-slate-900">Tiếng Việt</option>
                  <option className="dark:bg-slate-900">English</option>
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-350">
                  <Lock className="h-4 w-4" />
                  Theme màu
                </label>
                <select
                  value={form.theme}
                  onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
                >
                  <option className="dark:bg-slate-900">Indigo và Purple (Mặc định)</option>
                  <option className="dark:bg-slate-900">Emerald va Cyan</option>
                  <option className="dark:bg-slate-900">Neutral Gray</option>
                </select>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Liên hệ và Hỗ trợ" className="px-5 py-4">
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Email hỗ trợ</label>
            <input
              value={form.supportEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, supportEmail: event.target.value }))
              }
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
            />

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">Hotline</label>
            <input
              value={form.hotline}
              onChange={(event) => setForm((prev) => ({ ...prev, hotline: event.target.value }))}
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm outline-none focus:border-violet-400 dark:text-white"
            />
          </div>
        </AdminPanel>
      </>
    );
  };

  return (
    <div className="w-full">

      <AdminSectionHeader
        title="Cài đặt hệ thống"
        subtitle="Quản lý cấu hình và tùy chỉnh hệ thống"
        right={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Khôi phục
            </button>
            <button
              type="button"
              disabled={saveDisabled}
              onClick={saveChanges}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Lưu thay đổi
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <AdminPanel className="h-fit p-2">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.label}
              onClick={() =>
                setActiveTab(tab.label as 'Chung' | 'Thông báo' | 'Bảo mật' | 'Tích hợp')
              }
              className={cn(
                'mb-1 flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold transition-colors',
                activeTab === tab.label
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </AdminPanel>

        <div className="space-y-4">{renderMainPanel()}</div>
      </div>

      <p className="mt-4 rounded-xl border border-violet-100 dark:border-violet-900/30 bg-violet-50 dark:bg-violet-900/10 px-4 py-3 text-sm font-medium text-violet-700 dark:text-violet-400">
        {message}
      </p>
    </div>
  );
}
