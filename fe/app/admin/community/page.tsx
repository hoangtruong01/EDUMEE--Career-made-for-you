'use client';

import { AdminPanel, AdminSectionHeader } from '@/components/admin/AdminPrimitives';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Flag,
  MessageSquare,
  MoreHorizontal,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { useState } from 'react';

type Tab = 'posts' | 'comments' | 'reports';

export default function AdminCommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [search, setSearch] = useState('');

  return (
    <div className="w-full">
      <AdminSectionHeader
        title="Quản lý Cộng đồng"
        subtitle="Kiểm duyệt bài viết, bình luận và xử lý báo cáo vi phạm từ người dùng."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabButton
            active={activeTab === 'posts'}
            onClick={() => setActiveTab('posts')}
            label="Bài viết"
            count={124}
          />
          <TabButton
            active={activeTab === 'comments'}
            onClick={() => setActiveTab('comments')}
            label="Bình luận"
            count={856}
          />
          <TabButton
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            label="Báo cáo"
            count={12}
            urgent
          />
        </div>

        <div className="relative min-w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm outline-none focus:border-violet-400"
            placeholder="Tìm kiếm nội dung..."
          />
        </div>
      </div>

      {activeTab === 'posts' && <PostsTable />}
      {activeTab === 'comments' && <CommentsTable />}
      {activeTab === 'reports' && <ReportsTable />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  urgent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  urgent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
        active
          ? 'bg-violet-500 text-white shadow'
          : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-bold',
          active
            ? 'bg-white/20 text-white'
            : urgent
            ? 'bg-rose-100 text-rose-600'
            : 'bg-slate-100 text-slate-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}

const mockPosts = [
  {
    id: '1',
    author: 'Nguyễn Văn A',
    title: 'Làm sao để trở thành AI Engineer?',
    content: 'Mình đang là sinh viên năm 3, muốn theo đuổi mảng AI...',
    category: 'Hướng nghiệp',
    likes: 45,
    comments: 12,
    status: 'published',
    date: '2024-05-01',
  },
  {
    id: '2',
    author: 'Trần Thị B',
    title: 'Review công ty X tại Quận 1',
    content: 'Môi trường làm việc ở đây khá thoải mái, sếp thân thiện...',
    category: 'Review Công ty',
    likes: 89,
    comments: 34,
    status: 'flagged',
    date: '2024-05-02',
  },
];

function PostsTable() {
  return (
    <AdminPanel className="p-0 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
          <tr>
            <th className="px-6 py-4">Tác giả & Bài viết</th>
            <th className="px-6 py-4">Chuyên mục</th>
            <th className="px-6 py-4">Tương tác</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4">Ngày đăng</th>
            <th className="px-6 py-4 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mockPosts.map((post) => (
            <tr key={post.id} className="hover:bg-slate-50/50 transition">
              <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{post.title}</p>
                    <p className="text-xs text-slate-500">Bởi {post.author}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 border border-sky-100">
                  {post.category}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> {post.comments}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                {post.status === 'flagged' ? (
                  <span className="flex items-center gap-1 text-rose-600 font-medium">
                    <Flag className="h-3.5 w-3.5" /> Bị báo cáo
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">Công khai</span>
                )}
              </td>
              <td className="px-6 py-4 text-slate-500">{post.date}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-rose-50 rounded-lg text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminPanel>
  );
}

function CommentsTable() {
  return (
    <AdminPanel className="p-8 text-center text-slate-500">
      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p>Giao diện quản lý bình luận đang được tải...</p>
    </AdminPanel>
  );
}

function ReportsTable() {
  const reports = [
    {
      id: '1',
      reporter: 'User123',
      target: 'Bài viết #2',
      reason: 'Nội dung xúc phạm',
      status: 'pending',
      date: '2 giờ trước',
    },
  ];

  return (
    <AdminPanel className="p-0 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
          <tr>
            <th className="px-6 py-4">Người báo cáo</th>
            <th className="px-6 py-4">Đối tượng bị báo cáo</th>
            <th className="px-6 py-4">Lý do</th>
            <th className="px-6 py-4">Thời gian</th>
            <th className="px-6 py-4 text-right">Xử lý</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {reports.map((report) => (
            <tr key={report.id}>
              <td className="px-6 py-4 font-medium text-slate-900">{report.reporter}</td>
              <td className="px-6 py-4 text-violet-600 font-medium underline cursor-pointer">
                {report.target}
              </td>
              <td className="px-6 py-4">
                <span className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1 rounded-full w-fit text-xs font-bold">
                  <AlertTriangle className="h-3 w-3" /> {report.reason}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-500">{report.date}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition">
                    Bỏ qua
                  </button>
                  <button className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition">
                    Xóa nội dung
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminPanel>
  );
}
