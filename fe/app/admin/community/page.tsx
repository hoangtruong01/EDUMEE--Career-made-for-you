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
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { communityService } from '@/lib/community.service';

type Tab = 'posts' | 'comments' | 'reports';

interface CommunityReport {
  id: string;
  reporterId: { name: string; email: string };
  targetId: string;
  targetType: 'post' | 'comment';
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  postId?: string;
  createdAt: string;
}

interface AdminPost {
  id: string;
  _id?: string;
  authorName: string;
  title: string;
  category: string;
  likeCount: number;
  commentCount: number;
  status: string;
  createdAt: string;
}

export default function AdminCommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [search, setSearch] = useState('');
  const { accessToken } = useAuth();
  const [reportCount, setReportCount] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    try {
      const reports = await communityService.listReportsAdmin(accessToken) as CommunityReport[];
      setReportCount(reports.filter((r) => r.status === 'pending').length);
    } catch {
      console.error('Failed to fetch admin stats');
    }
  }, [accessToken]);

  useEffect(() => {
    const init = async () => {
      await fetchStats();
    };
    void init();
  }, [fetchStats]);

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
            count={reportCount}
            urgent={reportCount > 0}
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

function PostsTable() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const res = await communityService.listPosts(accessToken, { limit: 50 });
      setPosts((res.data as unknown as AdminPost[]) || []);
    } catch {
      console.error('Load posts failed');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const init = async () => {
      await loadPosts();
    };
    void init();
  }, [loadPosts]);

  const handleDelete = async (postId: string) => {
    if (!accessToken) return;
    const ok = window.confirm('Bạn chắc chắn muốn xóa bài viết này?');
    if (!ok) return;

    try {
      await communityService.updatePostStatus(accessToken, postId, 'deleted');
      await loadPosts();
      alert('Đã xóa bài viết thành công.');
    } catch (err) {
      alert('Thất bại khi xóa bài viết.');
    }
  };

  if (isLoading) {
    return <AdminPanel className="p-12 text-center text-slate-500">Đang tải bài viết...</AdminPanel>;
  }

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
          {posts.map((post) => (
            <tr key={post.id || post._id} className="hover:bg-slate-50/50 transition">
              <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-black text-[10px]">
                    {post.authorName?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="max-w-xs">
                    <p className="font-bold text-slate-900 truncate">{post.title}</p>
                    <p className="text-xs text-slate-500">Bởi {post.authorName}</p>
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
                    <CheckCircle className="h-3.5 w-3.5" /> {post.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                {post.status === 'hidden' || post.status === 'deleted' ? (
                  <span className="flex items-center gap-1 text-rose-600 font-medium">
                    <Flag className="h-3.5 w-3.5" /> {post.status === 'deleted' ? 'Đã xóa' : 'Bị ẩn'}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">Công khai</span>
                )}
              </td>
              <td className="px-6 py-4 text-slate-500 text-xs">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-2 hover:bg-rose-50 rounded-lg text-rose-500" onClick={() => handleDelete(post.id || post._id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không có bài viết nào.</td>
            </tr>
          )}
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
  const { accessToken } = useAuth();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await communityService.listReportsAdmin(accessToken);
      setReports(data as CommunityReport[]);
    } catch {
      console.error('Load reports failed');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const init = async () => {
      await loadReports();
    };
    void init();
  }, [loadReports]);

  const handleDismiss = async (reportId: string) => {
    if (!accessToken) return;
    try {
      await communityService.updateReportStatus(accessToken, reportId, 'dismissed');
      await loadReports();
    } catch (err) {
      alert('Thất bại khi cập nhật báo cáo.');
    }
  };

  const handleDeleteContent = async (report: CommunityReport) => {
    if (!accessToken) return;
    const ok = window.confirm('Bạn chắc chắn muốn xóa nội dung này?');
    if (!ok) return;

    try {
      if (report.targetType === 'post') {
        await communityService.updatePostStatus(accessToken, report.targetId, 'deleted');
      } else {
        // For comments, we use the deleteComment API
        if (report.postId) {
          await communityService.deleteComment(accessToken, report.postId, report.targetId);
        } else {
          alert('Không tìm thấy thông tin bài viết để xóa bình luận.');
          return;
        }
      }
      await communityService.updateReportStatus(accessToken, report.id, 'resolved');
      await loadReports();
      alert('Đã xóa nội dung thành công.');
    } catch (err) {
      alert('Thất bại khi xóa nội dung.');
    }
  };

  if (isLoading) {
    return <AdminPanel className="p-12 text-center text-slate-500">Đang tải báo cáo...</AdminPanel>;
  }

  return (
    <AdminPanel className="p-0 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
          <tr>
            <th className="px-6 py-4">Người báo cáo</th>
            <th className="px-6 py-4">Đối tượng</th>
            <th className="px-6 py-4">Lý do</th>
            <th className="px-6 py-4">Trạng thái</th>
            <th className="px-6 py-4">Thời gian</th>
            <th className="px-6 py-4 text-right">Xử lý</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {reports.map((report) => (
            <tr key={report.id} className={cn(report.status !== 'pending' && 'opacity-60 bg-slate-50/30')}>
              <td className="px-6 py-4">
                <p className="font-bold text-slate-900">{report.reporterId?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500">{report.reporterId?.email}</p>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                  report.targetType === 'post' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  {report.targetType === 'post' ? 'Bài viết' : 'Bình luận'}
                </span>
                <p className="text-xs text-slate-400 mt-1 truncate max-w-40">ID: {report.targetId}</p>
              </td>
              <td className="px-6 py-4">
                <span className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1 rounded-full w-fit text-xs font-bold">
                  <AlertTriangle className="h-3 w-3" /> {report.reason}
                </span>
                {report.details && <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-1">{report.details}</p>}
              </td>
              <td className="px-6 py-4">
                 <span className={cn(
                   "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                   report.status === 'pending' ? "bg-slate-100 text-slate-600" : 
                   report.status === 'resolved' ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
                 )}>
                   {report.status === 'pending' ? 'Chờ duyệt' : report.status === 'resolved' ? 'Đã giải quyết' : 'Bỏ qua'}
                 </span>
              </td>
              <td className="px-6 py-4 text-slate-500 text-xs">{new Date(report.createdAt).toLocaleString('vi-VN')}</td>
              <td className="px-6 py-4">
                {report.status === 'pending' ? (
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleDismiss(report.id)}
                      className="px-3 py-1.5 bg-slate-500 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition"
                    >
                      Bỏ qua
                    </button>
                    <button 
                      onClick={() => handleDeleteContent(report)}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition"
                    >
                      Xóa nội dung
                    </button>
                  </div>
                ) : (
                  <div className="text-right text-slate-400 text-[10px] font-bold italic">
                    Đã xử lý
                  </div>
                )}
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">Không có báo cáo nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
