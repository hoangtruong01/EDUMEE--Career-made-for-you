'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  communityService,
  type CommunityComment,
  type CommunityPost,
} from '@/lib/community.service';
import { profileService, type UserProfile } from '@/lib/profile.service';
import { userService, type UserMe } from '@/lib/user.service';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  Hash,
  Heart,
  MessageCircle,
  MoreVertical,
  Send,
  Share2,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
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

type TokenPayload = {
  user_id?: string;
  id?: string;
  role?: string;
};

const decodeTokenPayload = (token?: string): TokenPayload | null => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!decoded || typeof decoded !== 'object') return null;
    const payload = decoded as Record<string, unknown>;
    return {
      user_id: typeof payload.user_id === 'string' ? payload.user_id : undefined,
      id: typeof payload.id === 'string' ? payload.id : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  } catch {
    return null;
  }
};

const getProfileUserId = (user: UserProfile['userId'] | undefined): string | undefined => {
  if (!user) return undefined;
  const candidate = user as unknown as { id?: string; _id?: string };
  return candidate.id || candidate._id;
};

const getProfileUserRole = (user: UserProfile['userId'] | undefined): string | undefined => {
  if (!user) return undefined;
  const candidate = user as unknown as { role?: string };
  return candidate.role;
};

const CommunityDetail = () => {
  const router = useRouter();
  const params = useParams();
  const postId = String(params?.id || '');
  const { accessToken } = useAuth();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | null>(null);
  
  const [reportTarget, setReportTarget] = useState<{ id: string; type: 'post' | 'comment' } | null>(null);
  const [isReporting, setIsReporting] = useState(false);

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

    const fetchUser = async () => {
      try {
        const me = await userService.getMe(accessToken);
        setUserMe(me);
      } catch (err) {
        console.error('Failed to fetch user', err);
      }
    };
    void fetchUser();
  }, [loadPost, accessToken]);

  const handleAddComment = async () => {
    if (!accessToken || !postId || !commentInput.trim()) return;

    const publicDisplayName = userMe?.name?.trim() || profile?.userId?.name?.trim() || '';
    if (!isAnonymous && !publicDisplayName) {
      setError('Vui lòng chờ thông tin tài khoản được tải...');
      return;
    }

    setIsSubmitting(true);
    try {
      const displayName = isAnonymous ? 'Ẩn danh' : publicDisplayName;
      const authorTitle = isAnonymous ? undefined : profile?.educationLevel || undefined;

      const updated = await communityService.addComment(accessToken, postId, {
        content: commentInput.trim(),
        authorName: displayName,
        authorTitle,
        authorAvatar: userMe?.avatar,
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

  const handleDeleteComment = async (commentId: string) => {
    if (!accessToken || !postId) return;
    const ok = window.confirm('Bạn có chắc chắn muốn xoá bình luận này?');
    if (!ok) return;

    try {
      const updated = await communityService.deleteComment(accessToken, postId, commentId);
      setPost(updated);
      setComments(updated.comments || []);
      setActiveCommentMenu(null);
    } catch (err) {
      console.error('Delete comment failed', err);
      setError('Không thể xoá bình luận. Vui lòng thử lại sau.');
    }
  };

  const handleReport = (id: string, type: 'post' | 'comment') => {
    setReportTarget({ id, type });
    setActiveCommentMenu(null);
  };

  const submitReport = async (reason: string, details?: string) => {
    if (!accessToken || !reportTarget) return;
    setIsReporting(true);
    try {
      await communityService.report(accessToken, {
        targetId: reportTarget.id,
        targetType: reportTarget.type,
        reason,
        details,
        postId: reportTarget.type === 'comment' ? postId : reportTarget.id,
      });
      alert('Cảm ơn bạn đã báo cáo. Chúng tôi sẽ sớm xem xét nội dung này.');
      setReportTarget(null);
    } catch {
      alert('Không thể gửi báo cáo lúc này.');
    } finally {
      setIsReporting(false);
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

  const decodedToken = decodeTokenPayload(accessToken);

  const currentUserId =
    getProfileUserId(profile?.userId) ||
    userMe?.id ||
    userMe?._id ||
    decodedToken?.user_id ||
    decodedToken?.id;
  const userRole = getProfileUserRole(profile?.userId) || userMe?.role || decodedToken?.role;

  return (
    <div className="aurora-bg min-h-screen pb-24">
      <div className="relative overflow-hidden pt-12 pb-10">
        <div className="relative z-10 container">
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
            <h1 className="font-display py-2 text-3xl leading-[1.2] font-extrabold tracking-tight md:text-5xl">
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

      <div className="relative z-10 container mt-2 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {error && (
            <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-2xl border px-4 py-4 text-sm font-bold">
              ⚠️ {error}
            </div>
          )}

          <div className="bento-card-v2 p-8">
            <div className="border-border/50 mb-8 flex items-start justify-between gap-6 border-b border-dashed pb-6">
              <div className="flex items-center gap-4">
                {post.authorAvatar ? (
                  <div
                    aria-label={authorName}
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-cover bg-center shadow-lg"
                    role="img"
                    style={{ backgroundImage: `url(${post.authorAvatar})` }}
                  />
                ) : (
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-lg ${avatarBg}`}
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-base font-bold tracking-tight">{authorName}</p>
                  <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    {post.authorTitle || 'Thành viên cộng đồng'}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-6">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-colors ${
                    post.likedUserIds?.some((id) => String(id) === String(currentUserId))
                      ? 'text-rose-500'
                      : 'hover:text-rose-500'
                  }`}
                >
                  <div
                    className={`rounded-full p-2 ${
                      post.likedUserIds?.some((id) => String(id) === String(currentUserId))
                        ? 'bg-rose-500/10'
                        : 'bg-muted/50'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        post.likedUserIds?.some((id) => String(id) === String(currentUserId))
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </div>
                  <span className="text-sm font-black">{post.likeCount ?? 0}</span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary rounded-full p-2">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-black">{post.commentCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Logic for bookmark
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Lưu bài viết"
                  >
                    <div className="bg-muted/50 hover:bg-primary/10 rounded-full p-2 transition-colors">
                      <Bookmark className="h-4 w-4" />
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.share) {
                        navigator
                          .share({
                            title: post.title,
                            text: post.content,
                            url: window.location.href,
                          })
                          .catch(() => {});
                      } else {
                        void navigator.clipboard.writeText(window.location.href);
                        alert('Đã sao chép liên kết vào bộ nhớ tạm!');
                      }
                    }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Chia sẻ"
                  >
                    <div className="bg-muted/50 hover:bg-primary/10 rounded-full p-2 transition-colors">
                      <Share2 className="h-4 w-4" />
                    </div>
                  </button>
                  <button
                    onClick={() => handleReport(postId, 'post')}
                    className="text-muted-foreground hover:text-rose-500 transition-colors"
                    title="Báo cáo vi phạm"
                  >
                    <div className="bg-muted/50 hover:bg-rose-500/10 rounded-full p-2 transition-colors">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-foreground/90 text-lg leading-relaxed font-medium whitespace-pre-line">
              {post.content}
            </p>

            {post.hashtags?.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl px-3 py-1.5 text-xs font-bold transition-colors"
                  >
                    <Hash className="mr-1 inline h-3.5 w-3.5" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bento-card-v2 p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="bg-primary/20 text-primary rounded-xl p-2">
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
                      className="border-border/60 bg-muted/20 hover:bg-muted/40 relative rounded-2xl border p-5 transition-colors"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {comment.authorAvatar ? (
                            <div
                              aria-label={cName}
                              className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-cover bg-center shadow-sm"
                              role="img"
                              style={{ backgroundImage: `url(${comment.authorAvatar})` }}
                            />
                          ) : (
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${cAvatarBg}`}
                            >
                              {cInitials}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold tracking-tight">{cName}</p>
                            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                              {comment.authorTitle || 'Thành viên'} •{' '}
                              {formatTimeAgo(comment.createdAt)}
                            </p>
                          </div>
                        </div>

                        {(() => {
                          const isCommentAuthor =
                            currentUserId &&
                            comment.authorId &&
                            String(currentUserId) === String(comment.authorId);
                          const isPostAuthor =
                            currentUserId &&
                            post.authorId &&
                            String(currentUserId) === String(post.authorId);
                          const isAdmin = userRole === 'admin';

                          return (
                            (isCommentAuthor || isPostAuthor || isAdmin) && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const cId = comment.id || comment._id;
                                    if (cId)
                                      setActiveCommentMenu(activeCommentMenu === cId ? null : cId);
                                  }}
                                  className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                                <AnimatePresence>
                                  {activeCommentMenu === (comment.id || comment._id) && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                      className="border-border bg-popover shadow-elevated absolute right-0 z-10 mt-1 w-28 rounded-xl border p-1"
                                    >
                                      <button
                                        onClick={() => {
                                          const cId = comment.id || comment._id;
                                          if (cId) handleDeleteComment(cId);
                                        }}
                                        className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors"
                                      >
                                        Xóa
                                      </button>
                                      <button
                                        onClick={() => {
                                          const cId = comment.id || comment._id;
                                          if (cId) handleReport(cId, 'comment');
                                        }}
                                        className="hover:bg-primary/10 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors"
                                      >
                                        Báo cáo
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          );
                        })()}
                      </div>
                      <p className="text-foreground/90 text-sm leading-relaxed font-medium whitespace-pre-line">
                        {comment.content}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="border-border/60 mt-10 border-t border-dashed pt-8">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="text-sm font-black tracking-widest uppercase">Viết bình luận</h4>
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

              {!isAnonymous && (userMe?.name || profile?.userId?.name) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-primary/5 border-primary/10 mb-5 flex items-center gap-3 rounded-xl border p-3"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white ${getAvatarColor(userMe?.name || profile?.userId?.name || '')}`}
                  >
                    {getInitials(userMe?.name || profile?.userId?.name || '')}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{userMe?.name || profile?.userId?.name}</p>
                    <p className="text-muted-foreground text-[10px] font-medium">
                      Bình luận công khai
                    </p>
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {!isAnonymous && !(userMe?.name || profile?.userId?.name) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-muted-foreground mb-5 text-xs font-medium italic"
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
                    className="shadow-primary/25 gap-2 px-8 font-bold tracking-wide uppercase shadow-lg"
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
              <div className="bg-primary/20 text-primary rounded-lg p-2">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold">Lưu ý cộng đồng</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm leading-relaxed font-medium">
                <span className="text-primary font-black">•</span>
                <span>Tôn trọng và hỗ trợ nhau khi chia sẻ kinh nghiệm.</span>
              </li>
              <li className="flex gap-3 text-sm leading-relaxed font-medium">
                <span className="text-primary font-black">•</span>
                <span>Không đăng thông tin cá nhân nhạy cảm của bản thân hoặc người khác.</span>
              </li>
              <li className="flex gap-3 text-sm leading-relaxed font-medium">
                <span className="text-primary font-black">•</span>
                <span>Bình luận văn minh, đúng chủ đề thảo luận.</span>
              </li>
            </ul>
          </div>

          <div className="bento-card-v2 bg-gradient-mint/10 border-mint/20 p-6">
            <h3 className="mb-4 text-lg font-bold">Cần hỗ trợ từ Mentor?</h3>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed font-medium">
              Bạn đang gặp khó khăn trong định hướng? Kết nối ngay với các Mentor giàu kinh nghiệm.
            </p>
            <Button
              onClick={() => router.push('/mentor-matching')}
              variant="hero"
              className="w-full font-bold tracking-wider uppercase"
            >
              Tìm Mentor ngay
            </Button>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {reportTarget && (
          <ReportModal
            onClose={() => setReportTarget(null)}
            onSubmit={submitReport}
            isSubmitting={isReporting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function ReportModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState('Spam');
  const [details, setDetails] = useState('');

  const reasons = [
    'Spam',
    'Nội dung nhạy cảm',
    'Ngôn từ thù ghét',
    'Lừa đảo/Độc hại',
    'Thông tin sai lệch',
    'Khác',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-card border border-border shadow-elevated w-full max-w-md overflow-hidden rounded-[32px]"
      >
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3 text-rose-500">
            <div className="bg-rose-500/10 p-2 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">Báo cáo vi phạm</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-full transition-all active:scale-95"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Lý do báo cáo
            </label>
            <div className="grid grid-cols-2 gap-3">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left border-2 ${
                    reason === r 
                      ? "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-sm" 
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:border-border"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Chi tiết thêm (Tùy chọn)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Vui lòng cung cấp thêm thông tin để chúng tôi xử lý..."
              rows={4}
              className="w-full bg-muted/50 border-2 border-transparent focus:border-rose-500/30 rounded-[24px] p-5 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-4 rounded-2xl text-sm font-black tracking-widest uppercase text-muted-foreground hover:bg-muted transition-all"
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit(reason, details)}
            disabled={isSubmitting}
            className="flex-1 bg-rose-500 text-white px-4 py-4 rounded-2xl text-sm font-black tracking-widest uppercase shadow-lg shadow-rose-500/25 hover:bg-rose-600 hover:shadow-rose-500/40 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CommunityDetail;
