'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Trash2,
} from 'lucide-react';

import { useEffect, useMemo, useState, useCallback } from 'react';

import { adminService, AdminUser } from '@/lib/admin.service';
import { authStorage } from '@/lib/auth-storage';

/* ── data ─────────────────────────────────────── */

type Plan = 'Free' | 'Plus' | 'Pro';

const planBadge: Record<Plan, string> = {
  Free: 'bg-slate-100 text-slate-600',
  Plus: 'bg-amber-100 text-amber-700',
  Pro: 'bg-violet-100 text-violet-700',
};

/* ── component ────────────────────────────────── */

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Tất cả' | 'Sinh viên' | 'Mentor' | 'Admin'>(
    'Tất cả',
  );
  const [planFilter, setPlanFilter] = useState<'Tất cả' | Plan>('Tất cả');
  const [statusFilter, setStatusFilter] = useState<'Tất cả' | 'Hoạt động' | 'Bị khóa'>('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [loginTypeFilter, setLoginTypeFilter] = useState<'Tất cả' | 'Google' | 'Password'>(
    'Tất cả',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);

  const pageSize = 10;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = authStorage.getAccessToken();
      const res = await adminService.getAllUsers(token, currentPage, pageSize, loginTypeFilter);
      // Map role from API to Vietnamese label if needed, but assuming API handles it or FE labels match

      const mappedUsers = res.users.map(u => ({
        ...u,
        role: u.role === 'admin' ? 'Admin' : u.role === 'mentor' ? 'Mentor' : 'Sinh viên'
      })) as AdminUser[];
      setUsers(mappedUsers);
      setTotal(res.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, loginTypeFilter]);


  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, loginTypeFilter]);


  const userStats = useMemo(() => [
    { label: 'Tổng người dùng', value: total.toLocaleString(), color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Đang hoạt động', value: users.filter(u => u.status === 'Hoạt động').length.toLocaleString(), color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Mentor', value: users.filter(u => u.role === 'Mentor').length.toLocaleString(), color: 'bg-violet-100 text-violet-600' },
    { label: 'Người dùng mới (trang này)', value: users.length.toLocaleString(), color: 'bg-sky-100 text-sky-600' },
  ], [total, users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const bySearch =
        (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(search.toLowerCase());

      const byRole = roleFilter === 'Tất cả' || u.role === roleFilter;
      const byPlan = planFilter === 'Tất cả' || u.plan === planFilter;
      const byStatus = statusFilter === 'Tất cả' || u.status === statusFilter;
      return bySearch && byRole && byPlan && byStatus;
    });
  }, [users, search, roleFilter, planFilter, statusFilter]);

  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedUsers = filteredUsers; // Backend already paginates, but we can filter locally too

  /* ── admin actions ── */

  const handleToggleStatus = async (id: string) => {
    try {
      const token = authStorage.getAccessToken();
      const user = users.find(u => u.id === id);
      if (!user) return;
      const nextStatus = user.status === 'Hoạt động' ? 'Bị khóa' : 'Hoạt động';
      await adminService.updateUserStatus(token, id, nextStatus);
      flash(`Đã ${nextStatus === 'Bị khóa' ? 'khóa' : 'mở khóa'} tài khoản ${user.name}`);
      fetchUsers();
    } catch {
      flash('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleChangeRole = async (id: string) => {
    try {
      const token = authStorage.getAccessToken();
      const user = users.find(u => u.id === id);
      if (!user) return;

      const cycle = ['Sinh viên', 'Mentor', 'Admin'];
      const roleMap = { 'Sinh viên': 'user', 'Mentor': 'mentor', 'Admin': 'admin' };
      const idx = cycle.indexOf(user.role);
      const nextRoleLabel = cycle[(idx + 1) % cycle.length];
      const nextRoleValue = roleMap[nextRoleLabel as keyof typeof roleMap];

      await adminService.updateUserRole(token, id, nextRoleValue);
      flash(`Đã cập nhật vai trò của ${user.name} thành ${nextRoleLabel}`);
      fetchUsers();
    } catch {
      flash('Lỗi khi cập nhật vai trò');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      const token = authStorage.getAccessToken();
      await adminService.deleteUser(token, id);
      flash('Đã xóa người dùng thành công');
      fetchUsers();
    } catch {
      flash('Lỗi khi xóa người dùng');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} người dùng đã chọn?`)) return;
    try {
      const token = authStorage.getAccessToken();
      await adminService.bulkDeleteUsers(token, selectedIds);
      flash(`Đã xóa ${selectedIds.length} người dùng thành công`);
      setSelectedIds([]);
      fetchUsers();
    } catch {
      flash('Lỗi khi xóa người dùng');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };


  const handleExport = () => {
    const header = 'Name,Email,Role,Plan,Status,Joined,Tests';
    const rows = filteredUsers.map(
      (u) => `${u.name},${u.email},${u.role},${u.plan},${u.status},${u.joined},${u.tests}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'admin-users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    flash('Đã xuất file CSV danh sách người dùng');
  };

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  if (isLoading && users.length === 0) {
    return <div className="flex h-96 items-center justify-center">Đang tải danh sách người dùng...</div>;
  }

  /* ── render ── */

  return (
    <div className="w-full">

      <AdminSectionHeader
        title="Quản lý người dùng"
        subtitle="Người dùng tự đăng ký tài khoản. Admin quản lý vai trò, trạng thái và gói dịch vụ."
      />

      {/* stats row */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {userStats.map((s) => (
          <article
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="mb-2 text-xs text-slate-500">{s.label}</p>
            <div className={`rounded-lg px-3 py-2 text-4xl/none font-bold ${s.color}`}>
              {s.value}
            </div>
          </article>
        ))}
      </div>

      {/* filters */}
      <AdminPanel className="mt-4 p-3">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-65 flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm outline-none focus:border-violet-400"
              placeholder="Tìm kiếm theo tên, email..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as typeof roleFilter);
              setCurrentPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option>Tất cả</option>
            <option>Sinh viên</option>
            <option>Mentor</option>
            <option>Admin</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value as typeof planFilter);
              setCurrentPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option>Tất cả</option>
            <option>Free</option>
            <option>Plus</option>
            <option>Pro</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setCurrentPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option>Hoạt động</option>
            <option>Bị khóa</option>
          </select>

          <select
            value={loginTypeFilter}
            onChange={(e) => {
              setLoginTypeFilter(e.target.value as typeof loginTypeFilter);
              setCurrentPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
          >
            <option>Tất cả</option>
            <option>Google</option>
            <option>Password</option>
          </select>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600"
            >
              <Trash2 className="h-4 w-4" />
              Xóa đã chọn ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}

            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            Xuất file
          </button>
        </div>

        {/* table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </th>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Nguồn</th>
                <th className="px-4 py-3">Gói</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tham gia</th>
                <th className="px-4 py-3">Bài test</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.id} className={cn("border-t border-slate-100", selectedIds.includes(u.id) && "bg-slate-50")}>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </td>
                  <td className="px-4 py-3">

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-xs font-bold text-white">
                        {u.name?.charAt(0) || '?'}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-1 text-xs font-semibold",
                      u.login_type === 'Google' ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                    )}>
                      {u.login_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">

                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-semibold',
                        planBadge[u.plan],
                      )}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-semibold',
                        u.status === 'Hoạt động'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-600',
                      )}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(u.joined).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{u.tests}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 text-slate-500">
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={() => setDetailUser(u)}
                        className="rounded-lg p-1.5 hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Gửi email"
                        className="rounded-lg p-1.5 hover:bg-slate-100"
                        onClick={() => flash(`Đã gửi email tới ${u.email}`)}
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Đổi vai trò"
                        onClick={() => handleChangeRole(u.id)}
                        className="rounded-lg p-1.5 hover:bg-slate-100"
                      >
                        <UserCog className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title={u.status === 'Hoạt động' ? 'Khóa tài khoản' : 'Mở khóa'}
                        onClick={() => handleToggleStatus(u.id)}
                        className={cn(
                          'rounded-lg p-1.5 hover:bg-slate-100',
                          u.status === 'Bị khóa' && 'text-rose-500',
                        )}
                      >
                        {u.status === 'Hoạt động' ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Xóa người dùng"
                        onClick={() => handleDeleteUser(u.id)}
                        className="rounded-lg p-1.5 hover:bg-rose-50 text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>


              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-slate-500">
          <span>
            Hiển thị {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredUsers.length)} / {filteredUsers.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const n = i + 1;
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => setCurrentPage(n)}
                  className={`h-7 w-7 rounded-lg border text-xs ${
                    n === currentPage
                      ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </AdminPanel>

      {/* toast message */}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </p>
      )}

      {/* user detail drawer */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setDetailUser(null)}
            onKeyDown={(e) => e.key === 'Escape' && setDetailUser(null)}
            role="button"
            tabIndex={0}
            aria-label="Đóng"
          />
          <aside className="relative z-10 flex h-full w-96 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Chi tiết người dùng</h2>
              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500 text-xl font-bold text-white">
                  {detailUser.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{detailUser.name}</p>
                  <p className="text-sm text-slate-500">{detailUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <DetailRow label="Vai trò" icon={Shield}>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                    {detailUser.role}
                  </span>
                </DetailRow>
                <DetailRow label="Gói dịch vụ" icon={ShieldCheck}>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      planBadge[detailUser.plan],
                    )}
                  >
                    {detailUser.plan}
                  </span>
                </DetailRow>
                <DetailRow label="Trạng thái" icon={CheckCircle2}>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      detailUser.status === 'Hoạt động'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-600',
                    )}
                  >
                    {detailUser.status}
                  </span>
                </DetailRow>
                <DetailRow label="Ngày tham gia" icon={Eye}>
                  <span className="text-sm text-slate-700">
                    {new Date(detailUser.joined).toLocaleDateString('vi-VN')}
                  </span>
                </DetailRow>
                <DetailRow label="Bài test đã làm" icon={Eye}>
                  <span className="text-sm font-semibold text-slate-700">{detailUser.tests}</span>
                </DetailRow>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleChangeRole(detailUser.id);
                    setDetailUser(null);
                  }}
                  className="flex-1 rounded-xl bg-violet-500 py-2 text-sm font-semibold text-white hover:bg-violet-600"
                >
                  Đổi vai trò
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleToggleStatus(detailUser.id);
                    setDetailUser(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {detailUser.status === 'Hoạt động' ? 'Khóa tài khoản' : 'Mở khóa'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* helper */
function DetailRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Eye;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      {children}
    </div>
  );
}
