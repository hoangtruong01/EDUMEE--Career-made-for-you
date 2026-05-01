'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  communityService,
  type CommunityComment,
  type CommunityPost,
} from '@/lib/community.service';
import { motion } from 'framer-motion';
import { ArrowLeft, Hash, Heart, MessageCircle, Send } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const avatarColors = [
  'bg-violet-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getAvatarColor = (name: string) => {
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[sum % avatarColors.length];
};

const formatTimeAgo = (timestamp?: string) => {
  if (!timestamp) return 'Vừa xong';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} tuần trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(days / 365);
  return `${years} năm trước`;
};

const CommunityDetail = () => {
  const router = useRouter();
  const params = useParams();
  const postId = String(params?.id || '');
  const { accessToken } = useAuth();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentName, setCommentName] = useState('');
  const [commentTitle, setCommentTitle] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPost = useCallback(async () => {
    if (!accessToken || !postId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await communityService.getPost(accessToken, postId);
      setPost(data);
      setComments(data.comments || []);
    } catch {
      setError('Không thể tải bài viết. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, postId]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setError('Vui lòng đăng nhập để xem bài viết.');
      return;
    }
    void loadPost();
  }, [loadPost]);

  const handleAddComment = async () => {
    if (!accessToken || !postId || !commentInput.trim()) return;

    setIsSubmitting(true);
    try {
      const displayName = isAnonymous ? 'Ẩn danh' : commentName.trim() || 'Thành viên EDUMEE';
      const updated = await communityService.addComment(accessToken, postId, {
        content: commentInput.trim(),
        authorName: displayName,
        authorTitle: isAnonymous ? undefined : commentTitle.trim() || undefined,
      });
      setPost(updated);
      setComments(updated.comments || []);
      setCommentInput('');
    } catch {
      setError('Không thể gửi bình luận. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Đang tải bài viết...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Không tìm thấy bài viết.</p>
      </div>
    );
  }

  const authorName = post.authorName || 'Thành viên EDUMEE';
  const avatarBg = getAvatarColor(authorName);
  const initials = getInitials(authorName);

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="border-border/60 bg-gradient-card border-b">
        <div className="container py-6">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại cộng đồng
          </button>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-2xl font-bold md:text-3xl">{post.title}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {formatTimeAgo(post.createdAt)} • {post.category}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {error && (
            <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarBg}`}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{authorName}</p>
                  <p className="text-muted-foreground text-xs">
                    {post.authorTitle || 'Thành viên cộng đồng'}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" /> {post.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" /> {post.commentCount ?? 0}
                </span>
              </div>
            </div>

            <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{post.content}</p>

            {post.hashtags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
                  >
                    <Hash className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="text-primary h-4 w-4" />
              <h3 className="font-display font-semibold">Bình luận</h3>
            </div>

            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-muted-foreground text-sm">Chưa có bình luận nào.</p>
              )}
              {comments.map((comment, idx) => {
                const cName = comment.authorName || 'Thành viên EDUMEE';
                const cInitials = getInitials(cName);
                const cAvatarBg = getAvatarColor(cName);
                return (
                  <div
                    key={`${comment.id || idx}`}
                    className="border-border/60 rounded-xl border p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${cAvatarBg}`}
                      >
                        {cInitials}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{cName}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {comment.authorTitle || 'Thành viên cộng đồng'} •{' '}
                          {formatTimeAgo(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {comment.content}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-border/60 mt-5 border-t pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-xs font-medium">Viết bình luận</p>
                <label className="text-muted-foreground flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-primary h-4 w-4"
                  />
                  Ẩn danh
                </label>
              </div>

              {!isAnonymous && (
                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <input
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Tên hiển thị"
                    className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                  />
                  <input
                    value={commentTitle}
                    onChange={(e) => setCommentTitle(e.target.value)}
                    placeholder="Chức danh"
                    className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={3}
                  placeholder="Nhập bình luận của bạn..."
                  className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="hero"
                  size="sm"
                  disabled={isSubmitting || !commentInput.trim()}
                  onClick={handleAddComment}
                  className="h-fit shrink-0 gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Đang gửi...' : 'Gửi'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display mb-3 font-semibold">Lưu ý cộng đồng</h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>• Tôn trọng và hỗ trợ nhau khi chia sẻ.</li>
              <li>• Không đăng thông tin cá nhân nhạy cảm.</li>
              <li>• Bình luận đúng chủ đề bài viết.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;
