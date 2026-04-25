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
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium">
              Email thông báo hệ thống
              <input
                type="checkbox"
                checked={form.emailNotice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, emailNotice: event.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium">
              Push notification quản trị
              <input
                type="checkbox"
                checked={form.pushNotice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, pushNotice: event.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium">
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
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium">
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
              <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Lock className="h-4 w-4" />
                Thời gian hết hạn phiên đăng nhập
              </label>
              <select
                value={form.sessionTimeout}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sessionTimeout: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
              >
                <option>15 phút</option>
                <option>30 phút</option>
                <option>60 phút</option>
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
              <label className="mb-1 text-sm font-semibold text-slate-700">Nhà cung cấp AI</label>
              <select
                value={form.apiProvider}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, apiProvider: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
              >
                <option>OpenAI</option>
                <option>Azure OpenAI</option>
                <option>Gemini</option>
              </select>
            </div>

            <div>
              <label className="mb-1 text-sm font-semibold text-slate-700">Webhook URL</label>
              <input
                value={form.webhookUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, webhookUrl: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
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
            <label className="text-sm font-semibold text-slate-700">Tên hệ thống</label>
            <input
              value={form.systemName}
              onChange={(event) => setForm((prev) => ({ ...prev, systemName: event.target.value }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
            />

            <label className="text-sm font-semibold text-slate-700">Mô tả</label>
            <textarea
              value={form.systemDesc}
              onChange={(event) => setForm((prev) => ({ ...prev, systemDesc: event.target.value }))}
              className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <SlidersHorizontal className="h-4 w-4" />
                  Ngôn ngữ mặc định
                </label>
                <select
                  value={form.language}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, language: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                >
                  <option>Tiếng Việt</option>
                  <option>English</option>
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Lock className="h-4 w-4" />
                  Theme màu
                </label>
                <select
                  value={form.theme}
                  onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                >
                  <option>Indigo và Purple (Mặc định)</option>
                  <option>Emerald va Cyan</option>
                  <option>Neutral Gray</option>
                </select>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Liên hệ và Hỗ trợ" className="px-5 py-4">
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700">Email hỗ trợ</label>
            <input
              value={form.supportEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, supportEmail: event.target.value }))
              }
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
            />

            <label className="text-sm font-semibold text-slate-700">Hotline</label>
            <input
              value={form.hotline}
              onChange={(event) => setForm((prev) => ({ ...prev, hotline: event.target.value }))}
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
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
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
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
                'mb-1 flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold',
                activeTab === tab.label
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </AdminPanel>

        <div className="space-y-4">{renderMainPanel()}</div>
      </div>

      <p className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
        {message}
      </p>
    </div>
  );
}
