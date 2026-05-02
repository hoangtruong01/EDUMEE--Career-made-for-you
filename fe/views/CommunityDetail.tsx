'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  communityService,
  type CommunityComment,
  type CommunityPost,
} from '@/lib/community.service';
import { profileService, type UserProfile } from '@/lib/profile.service';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Hash, Heart, MessageCircle, Send, Sparkles } from 'lucide-react';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
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

    const fetchProfile = async () => {
      try {
        const p = await profileService.getMyProfile(accessToken);
        setProfile(p);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    void fetchProfile();
  }, [loadPost, accessToken]);

  const handleAddComment = async () => {
    if (!accessToken || !postId || !commentInput.trim()) return;

    if (!isAnonymous && !profile) {
      setError('Vui lòng chờ thông tin cá nhân được tải...');
      return;
    }

    setIsSubmitting(true);
    try {
      const displayName = isAnonymous ? 'Ẩn danh' : (profile?.full_name || 'Thành viên EDUMEE');
      
      const updated = await communityService.addComment(accessToken, postId, {
        content: commentInput.trim(),
        authorName: displayName,
        authorTitle: isAnonymous ? undefined : (profile?.target_career || undefined),
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

  const handleLike = async () => {
    if (!accessToken || !postId) return;
    try {
      const updated = await communityService.likePost(accessToken, postId);
      setPost(updated);
    } catch (err) {
      console.error('Like failed', err);
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
    <div className="aurora-bg min-h-screen pb-24">
      <div className="relative overflow-hidden pt-12 pb-10">
        <div className="container relative z-10">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-primary mb-6 flex items-center gap-2 text-sm font-bold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại cộng đồng
          </button>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <h1 className="font-display py-2 text-3xl font-extrabold tracking-tight md:text-5xl leading-[1.2]">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="tag-pill bg-primary/10 text-primary border-none font-bold">
                {post.category}
              </span>
              <span className="text-muted-foreground text-sm font-medium">
                Đăng bởi <span className="text-foreground font-bold">{authorName}</span> •{' '}
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>
          </motion.div>
        </div>
        <div className="gradient-orb bg-primary/10 -top-20 -left-20 h-80 w-80 opacity-40 blur-[120px]" />
      </div>

      <div className="container relative z-10 mt-2 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {error && (
            <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-2xl border px-4 py-4 text-sm font-bold">
              ⚠️ {error}
            </div>
          )}

          <div className="bento-card-v2 p-8">
            <div className="mb-8 flex items-start justify-between gap-6 border-b border-dashed border-border/50 pb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-lg ${avatarBg}`}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-base font-bold tracking-tight">{authorName}</p>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    {post.authorTitle || 'Thành viên cộng đồng'}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-6">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-colors ${post.likedUserIds?.some((id) => String(id) === profile?.userId) ? 'text-rose-500' : 'hover:text-rose-500'}`}
                >
                  <div className={`rounded-full p-2 ${post.likedUserIds?.some((id) => String(id) === profile?.userId) ? 'bg-rose-500/10' : 'bg-muted/50'}`}>
                    <Heart className={`h-4 w-4 ${post.likedUserIds?.some((id) => String(id) === profile?.userId) ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-sm font-black">{post.likeCount ?? 0}</span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded-full p-2 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-black">{post.commentCount ?? 0}</span>
                </div>
              </div>
            </div>

            <p className="text-foreground/90 leading-relaxed whitespace-pre-line text-lg font-medium">
              {post.content}
            </p>

            {post.hashtags?.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl px-3 py-1.5 text-xs font-bold transition-colors"
                  >
                    <Hash className="h-3.5 w-3.5 inline mr-1" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bento-card-v2 p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="bg-primary/20 rounded-xl p-2 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tight">Thảo luận cộng đồng</h3>
            </div>

            <div className="space-y-4">
              {comments.length === 0 && (
                <div className="bg-muted/30 rounded-2xl py-12 text-center">
                  <MessageCircle className="text-muted-foreground/20 mx-auto mb-4 h-10 w-10" />
                  <p className="text-muted-foreground text-sm font-bold">Chưa có bình luận nào.</p>
                  <p className="text-muted-foreground/60 mt-1 text-xs font-medium">
                    Hãy là người đầu tiên đưa ra ý kiến!
                  </p>
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {comments.map((comment, idx) => {
                  const cName = comment.authorName || 'Thành viên EDUMEE';
                  const cInitials = getInitials(cName);
                  const cAvatarBg = getAvatarColor(cName);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={`${comment.id || idx}`}
                      className="border-border/60 bg-muted/20 hover:bg-muted/40 rounded-2xl border p-5 transition-colors"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${cAvatarBg}`}
                        >
                          {cInitials}
                        </div>
                        <div>
                          <p className="text-xs font-bold tracking-tight">{cName}</p>
                          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                            {comment.authorTitle || 'Thành viên'} •{' '}
                            {formatTimeAgo(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-line font-medium">
                        {comment.content}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="mt-10 border-t border-dashed border-border/60 pt-8">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-widest">Viết bình luận</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-primary h-4 w-4 rounded-md"
                  />
                  <span className="text-xs font-bold select-none">Bình luận ẩn danh</span>
                </div>
              </div>

              {!isAnonymous && profile && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 flex items-center gap-3 bg-primary/5 p-3 rounded-xl border border-primary/10"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white ${getAvatarColor(profile.full_name)}`}>
                    {getInitials(profile.full_name)}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{profile.full_name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Bình luận công khai</p>
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {!isAnonymous && !profile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-5 text-muted-foreground text-xs font-medium italic"
                  >
                    Đang tải thông tin cá nhân...
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={4}
                  placeholder="Chia sẻ suy nghĩ của bạn..."
                  className="bg-muted focus:ring-primary/20 w-full resize-none rounded-2xl border-none px-5 py-4 text-sm font-medium outline-none focus:ring-4"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="hero"
                    size="default"
                    disabled={isSubmitting || !commentInput.trim()}
                    onClick={handleAddComment}
                    className="gap-2 px-8 font-bold tracking-wide uppercase shadow-lg shadow-primary/25"
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bento-card-v2 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-primary/20 rounded-lg p-2 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">Lưu ý cộng đồng</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm font-medium leading-relaxed">
                <span className="text-primary font-black">•</span>
                <span>Tôn trọng và hỗ trợ nhau khi chia sẻ kinh nghiệm.</span>
              </li>
              <li className="flex gap-3 text-sm font-medium leading-relaxed">
                <span className="text-primary font-black">•</span>
                <span>Không đăng thông tin cá nhân nhạy cảm của bản thân hoặc người khác.</span>
              </li>
              <li className="flex gap-3 text-sm font-medium leading-relaxed">
                <span className="text-primary font-black">•</span>
                <span>Bình luận văn minh, đúng chủ đề thảo luận.</span>
              </li>
            </ul>
          </div>

          <div className="bento-card-v2 bg-gradient-mint/10 border-mint/20 p-6">
            <h3 className="mb-4 text-lg font-bold">Cần hỗ trợ từ Mentor?</h3>
            <p className="text-muted-foreground mb-6 text-sm font-medium leading-relaxed">
              Bạn đang gặp khó khăn trong định hướng? Kết nối ngay với các Mentor giàu kinh nghiệm.
            </p>
            <Button
              onClick={() => router.push('/mentor-matching')}
              variant="hero"
              className="w-full font-bold uppercase tracking-wider"
            >
              Tìm Mentor ngay
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CommunityDetail;
