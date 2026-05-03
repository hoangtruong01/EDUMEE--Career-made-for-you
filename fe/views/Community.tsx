'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { communityService, type CommunityPost } from '@/lib/community.service';
import { profileService, type UserProfile } from '@/lib/profile.service';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Hash,
  Heart,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

const CATEGORIES = [
  'Tất cả',
  'Review ngành',
  'Hỏi đáp',
  'Chia sẻ kinh nghiệm',
  'Tài nguyên',
  'Tuyển dụng',
];

const CATEGORY_STYLES: Record<string, string> = {
  'Review ngành': 'bg-sky-light text-primary',
  'Hỏi đáp': 'bg-gold-light text-gold',
  'Chia sẻ kinh nghiệm': 'bg-mint-light text-mint',
  'Tài nguyên': 'bg-lavender text-secondary',
  'Tuyển dụng': 'bg-coral-light text-coral',
};

// Initial mock tags, will be replaced by real data
const initialTrending = [
  '#kysuphanmem',
  '#datascience',
  '#uxdesign',
  '#careerchange',
  '#internship2026',
  '#remotework',
];

const topContributors = [
  {
    name: 'Hoàng Minh Tuấn',
    role: 'Product Manager',
    posts: 45,
    initials: 'MT',
    bg: 'bg-emerald-500',
  },
  { name: 'Phạm Quỳnh Anh', role: 'UX Lead', posts: 39, initials: 'QA', bg: 'bg-pink-500' },
  { name: 'Nguyễn Minh Khôi', role: 'Senior Dev', posts: 32, initials: 'NK', bg: 'bg-violet-500' },
];

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

const getCategoryBadgeClass = (category: string) =>
  CATEGORY_STYLES[category] || 'bg-muted text-muted-foreground';

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

const PostCard = ({
  post,
  index,
  onOpen,
  onToggleMenu,
  onDelete,
  isMenuOpen,
  onLike,
  currentUserId,
}: {
  post: CommunityPost;
  index: number;
  onOpen: (postId: string) => void;
  onToggleMenu: (postId: string) => void;
  onDelete: (postId: string) => void;
  onLike: (postId: string) => void;
  isMenuOpen: boolean;
  currentUserId?: string;
}) => {
  const postId = post.id || post._id || '';
  const isLiked = post.likedUserIds?.some((id) => String(id) === currentUserId);
  const authorName = post.authorName || 'Thành viên EDUMEE';
  const initials = getInitials(authorName);
  const avatarBg = getAvatarColor(authorName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      onClick={() => postId && onOpen(postId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && postId) onOpen(postId);
      }}
      role="button"
      tabIndex={0}
      className="bento-card-v2 hover:shadow-elevated cursor-pointer p-5 transition-all"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-y-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ${avatarBg}`}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">{authorName}</p>
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              {post.authorTitle || 'Thành viên'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`tag-pill ${getCategoryBadgeClass(post.category)} border-none bg-opacity-10`}
          >
            {post.category}
          </span>
          <span className="text-muted-foreground text-xs font-medium">
            {formatTimeAgo(post.createdAt)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Logic for bookmark
              }}
              className="text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full p-2 transition-colors"
              title="Lưu bài viết"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Logic for share
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.content,
                    url: `${window.location.origin}/community/${postId}`,
                  }).catch(console.error);
                } else {
                  void navigator.clipboard.writeText(`${window.location.origin}/community/${postId}`);
                  alert('Đã sao chép liên kết vào bộ nhớ tạm!');
                }
              }}
              className="text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full p-2 transition-colors"
              title="Chia sẻ"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (postId) onToggleMenu(postId);
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
              aria-label="Mo tuy chon"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="border-border bg-popover/90 text-foreground shadow-elevated absolute right-0 z-30 mt-2 w-40 rounded-2xl border p-1.5 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => postId && onDelete(postId)}
                    className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    Xóa bài viết
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <h3 className="font-display mb-2 text-lg font-bold leading-tight tracking-tight">
        {post.title}
      </h3>
      <p className="text-muted-foreground/90 mb-4 line-clamp-3 text-sm leading-relaxed">
        {post.content}
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {post.hashtags?.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="bg-muted/50 text-muted-foreground hover:bg-muted rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors"
          >
            {tag}
          </span>
        ))}
        {post.hashtags && post.hashtags.length > 4 && (
          <span className="text-muted-foreground self-center text-[10px] font-bold">
            +{post.hashtags.length - 4}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-border/50 pt-4">
        <div className="flex items-center gap-5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (postId) onLike(postId);
            }}
            className={`${isLiked ? 'text-rose-500' : 'text-muted-foreground'} hover:text-rose-500 group flex items-center gap-2 transition-colors`}
          >
            <div className={`${isLiked ? 'bg-rose-500/10' : 'group-hover:bg-rose-500/10'} rounded-full p-1.5 transition-colors`}>
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-xs font-bold">{post.likeCount ?? 0}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (postId) onOpen(postId);
            }}
            className="text-muted-foreground hover:text-primary group flex items-center gap-2 transition-colors"
          >
            <div className="group-hover:bg-primary/10 rounded-full p-1.5 transition-colors">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold">{post.commentCount ?? 0}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            {post.category}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const Community = () => {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Review ngành');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);

  const postCategories = useMemo(() => CATEGORIES.filter((cat) => cat !== 'Tất cả'), []);

  const loadPosts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await communityService.listPosts(accessToken, {
        category: activeCategory === 'Tất cả' ? undefined : activeCategory,
        q: search.trim() || undefined,
        limit: 20,
      });
      setPosts(res.data || []);
    } catch {
      setError('Không thể tải bài viết. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, activeCategory, search]);

  useEffect(() => {
    if (!accessToken) return;
    const timer = setTimeout(() => {
      void loadPosts();
    }, 250);

    const fetchProfile = async () => {
      try {
        const p = await profileService.getMyProfile(accessToken);
        setProfile(p);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    void fetchProfile();

    const fetchTrending = async () => {
      try {
        const tags = await communityService.getTrendingHashtags(accessToken);
        setTrendingTags(tags);
      } catch (err) {
        console.error('Failed to fetch trending hashtags', err);
      }
    };
    void fetchTrending();

    return () => clearTimeout(timer);
  }, [accessToken, loadPosts]);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
    }
  }, [accessToken]);

  const handleAddTag = (raw: string) => {
    const trimmed = raw.trim().replace(/^#+/, '');
    if (!trimmed) return;
    const normalized = `#${trimmed.toLowerCase()}`;
    if (hashtags.some((tag) => tag.toLowerCase() === normalized)) return;
    setHashtags((prev) => [...prev, normalized].slice(0, 10));
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('Review ngành');
    setIsAnonymous(true);
    setHashtags([]);
    setTagInput('');
    setFormError(null);
  };

  const validateForm = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) return 'Vui lòng nhập tiêu đề bài viết.';
    if (trimmedTitle.length < 3) return 'Tiêu đề cần tối thiểu 3 ký tự.';
    if (!trimmedContent) return 'Vui lòng nhập nội dung bài viết.';
    if (trimmedContent.length < 10) return 'Nội dung cần tối thiểu 10 ký tự.';
    if (!category.trim()) return 'Vui lòng chọn chủ đề.';
    if (!isAnonymous && !profile) {
      return 'Vui lòng chờ thông tin cá nhân được tải...';
    }
    if (hashtags.length > 10) return 'Tối đa 10 hashtag.';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setFormError('Vui lòng đăng nhập để đăng bài.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const displayName = isAnonymous ? 'Ẩn danh' : (profile?.userId?.name || 'Thành viên EDUMEE');

    setIsSubmitting(true);
    setFormError(null);
    try {
      await communityService.createPost(accessToken, {
        title: title.trim(),
        content: content.trim(),
        category,
        hashtags,
        authorName: displayName,
        authorTitle: isAnonymous ? undefined : (profile?.educationLevel || undefined),
      });
      resetForm();
      setIsFormOpen(false);
      await loadPosts();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Không thể đăng bài lúc này. Vui lòng thử lại.');
      } else {
        setFormError('Không thể đăng bài lúc này. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!accessToken) {
      setError('Vui lòng đăng nhập để thích bài viết.');
      return;
    }
    try {
      const updatedPost = await communityService.likePost(accessToken, postId);
      setPosts((prev) =>
        prev.map((p) => ((p.id || p._id) === (updatedPost.id || updatedPost._id) ? updatedPost : p)),
      );
    } catch (err) {
      console.error('Like failed', err);
    }
  };

  const handleOpenPost = (postId: string) => {
    router.push(`/community/${postId}`);
  };

  const handleToggleMenu = (postId: string) => {
    setMenuPostId((prev) => (prev === postId ? null : postId));
  };

  const handleDeletePost = async (postId: string) => {
    if (!accessToken) {
      setError('Vui lòng đăng nhập để xoá bài viết.');
      return;
    }

    const ok = window.confirm('Bạn chắc chắn muốn xoá bài viết này?');
    if (!ok) return;

    try {
      await communityService.deletePost(accessToken, postId);
      setPosts((prev) => prev.filter((post) => (post.id || post._id) !== postId));
      setMenuPostId(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Không thể xoá bài viết.');
      } else {
        setError('Không thể xoá bài viết.');
      }
    }
  };

  const filteredPosts = posts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decodedToken: any = null;
  if (accessToken) {
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
         
        decodedToken = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      }
    } catch {
      // ignore
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUserId = profile?.userId?.id || (profile?.userId as any)?._id || decodedToken?.user_id || decodedToken?.id;

  return (
    <div className="aurora-bg min-h-screen pb-20">
      <div className="relative overflow-hidden pt-16 pb-12 text-center">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm backdrop-blur-md">
              <Users className="h-3.5 w-3.5" /> 50,000+ thành viên đang kết nối
            </span>
            <h1 className="text-gradient-animate font-display mb-4 py-2 text-4xl font-extrabold tracking-tight md:text-6xl leading-[1.2]">
              Cộng đồng CareerAI
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-base font-medium leading-relaxed md:text-lg">
              Không gian chia sẻ kinh nghiệm thực tế, kết nối mentor và kiến tạo tương lai nghề nghiệp
              cho Gen Z.
            </p>
          </motion.div>
        </div>
        <div className="gradient-orb bg-primary/20 top-0 left-1/4 h-64 w-64 opacity-50 blur-[100px]" />
        <div className="gradient-orb bg-secondary/20 right-1/4 bottom-0 h-64 w-64 opacity-50 blur-[100px]" />
      </div>

      <div className="container relative z-10 mt-2">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Quick Post & Search Section */}
            <div className="flex flex-col gap-4">
              <div className="glass-card flex items-center gap-3 rounded-2xl p-3 shadow-soft">
                <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="text-muted-foreground hover:bg-muted flex-1 rounded-xl px-4 py-2 text-left text-sm font-medium transition-colors"
                >
                  Bạn đang nghĩ gì? Chia sẻ ngay...
                </button>
                <div className="h-6 w-[1px] bg-border/50" />
                <div className="relative flex-[0.8]">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm nội dung..."
                    className="bg-muted/50 focus:ring-primary/30 h-10 w-full rounded-xl pr-4 pl-9 text-sm font-medium outline-none transition-all focus:ring-4"
                  />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-xl px-5 py-2 text-xs font-bold tracking-wide transition-all ${
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                        : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {isFormOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleSubmit} className="bento-card-v2 mb-6 p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 rounded-xl p-2 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">Tạo bài viết mới</h3>
                          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                            Góp ý kiến, nhận chia sẻ
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="text-muted-foreground hover:bg-muted rounded-full p-2 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                          Chủ đề thảo luận
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="bg-muted focus:ring-primary/20 h-11 w-full rounded-xl border-none px-4 text-sm font-medium outline-none focus:ring-4"
                        >
                          {postCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                          Tiêu đề bài viết
                        </label>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Tiêu đề ấn tượng..."
                          className="bg-muted focus:ring-primary/20 h-11 w-full rounded-xl border-none px-4 text-sm font-medium outline-none focus:ring-4"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          id="anonymous-toggle"
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="accent-primary h-4 w-4 rounded-md"
                        />
                        <label
                          htmlFor="anonymous-toggle"
                          className="text-xs font-bold leading-none select-none"
                        >
                          Đăng bài ẩn danh
                        </label>
                      </div>
                    </div>

                    {!isAnonymous && profile && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-5 flex items-center gap-3 bg-primary/5 p-3 rounded-xl border border-primary/10"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white ${getAvatarColor(profile.userId?.name || '')}`}>
                          {getInitials(profile.userId?.name || '')}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{profile.userId?.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Tên hiển thị công khai</p>
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {!isAnonymous && !profile && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-5 text-muted-foreground text-xs font-medium italic"
                        >
                          Đang tải thông tin cá nhân...
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-5 space-y-1.5">
                      <label className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                        Hashtags
                      </label>
                      <div className="bg-muted focus-within:ring-primary/20 flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 transition-all focus-within:ring-4">
                        <Hash className="text-muted-foreground h-4 w-4" />
                        {hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                          placeholder="Gõ tag và Enter..."
                          className="min-w-[120px] flex-1 bg-transparent text-sm font-medium outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-1.5">
                      <label className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                        Nội dung chia sẻ
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Kể lại câu chuyện của bạn hoặc đặt câu hỏi..."
                        rows={6}
                        className="bg-muted focus:ring-primary/20 w-full resize-none rounded-xl border-none px-4 py-3 text-sm font-medium outline-none focus:ring-4"
                      />
                    </div>

                    {formError && (
                      <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-4 text-xs font-bold text-rose-500"
                      >
                        ⚠️ {formError}
                      </motion.p>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetForm}
                        className="text-xs font-bold tracking-wide uppercase"
                      >
                        Làm mới
                      </Button>
                      <Button
                        type="submit"
                        variant="hero"
                        size="default"
                        disabled={isSubmitting}
                        className="gap-2 px-8 font-bold tracking-wide uppercase shadow-lg shadow-primary/25"
                      >
                        {isSubmitting ? 'Đang gửi...' : 'Đăng bài viết'}
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-2xl border px-4 py-4 text-sm font-bold">
                ⚠️ {error}
              </div>
            )}

            {!accessToken && (
              <div className="border-border bg-muted/40 text-muted-foreground rounded-2xl border px-4 py-4 text-center text-sm font-medium backdrop-blur-sm">
                Chào mừng bạn! Vui lòng đăng nhập để tham gia thảo luận cùng cộng đồng.
              </div>
            )}

            <div className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center py-20">
                  <div className="bg-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                  <p className="text-muted-foreground mt-4 text-sm font-bold uppercase tracking-widest">
                    Đang tải dữ liệu...
                  </p>
                </div>
              ) : (
                filteredPosts.map((post, i) => (
                  <PostCard
                    key={post.id || post._id || i}
                    post={post}
                    index={i}
                    onOpen={handleOpenPost}
                    onToggleMenu={handleToggleMenu}
                    onDelete={handleDeletePost}
                    isMenuOpen={menuPostId === (post.id || post._id)}
                    onLike={handleLike}
                    currentUserId={currentUserId}
                  />
                ))
              )}
              {!isLoading && filteredPosts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <div className="bg-muted/50 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                    <MessageCircle className="text-muted-foreground/30 h-10 w-10" />
                  </div>
                  <h3 className="text-lg font-bold">Chưa có bài viết nào</h3>
                  <p className="text-muted-foreground mt-2 text-sm font-medium">
                    Hãy là người đầu tiên khơi dậy cuộc thảo luận trong chủ đề này!
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bento-card-v2 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="bg-amber-500/20 rounded-lg p-2 text-amber-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">Xu hướng 🔥</h3>
              </div>
              <ul className="space-y-4">
                {(trendingTags.length > 0 ? trendingTags : initialTrending.map(t => ({ tag: t, count: 0 }))).map((item, i) => {
                  const tag = typeof item === 'string' ? item : item.tag;
                  return (
                    <li key={tag} className="group flex items-center gap-4">
                      <span className="bg-muted text-muted-foreground flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black transition-colors group-hover:bg-primary group-hover:text-white">
                        {i + 1}
                      </span>
                      <button 
                        onClick={() => {
                          setSearch(tag);
                          setActiveCategory('Tất cả');
                        }}
                        className="text-foreground hover:text-primary text-sm font-bold transition-colors"
                      >
                        {tag}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="bento-card-v2 bg-primary/5 border-primary/20 p-6">
              <h3 className="mb-5 text-lg font-bold">Hoạt động sôi nổi</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 h-2 w-2 animate-pulse rounded-full" />
                    <span className="text-muted-foreground text-sm font-bold">Thành viên</span>
                  </div>
                  <span className="stat-number text-xl font-black">90.2K</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 h-2 w-2 rounded-full" />
                    <span className="text-muted-foreground text-sm font-bold">Thảo luận mới</span>
                  </div>
                  <span className="stat-number text-xl font-black">127</span>
                </div>
              </div>
              <Button
                onClick={() =>
                  window.open('https://www.facebook.com/profile.php?id=61586675294663', '_blank')
                }
                variant="hero"
                className="shimmer-btn mt-6 w-full font-bold uppercase tracking-wider"
              >
                Gia nhập ngay
              </Button>
            </div>

            <div className="bento-card-v2 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold">Cây bút nổi bật</h3>
                <Sparkles className="text-primary h-4 w-4" />
              </div>
              <div className="space-y-6">
                {topContributors.map((c) => (
                  <div key={c.name} className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-md ${c.bg}`}
                    >
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold tracking-tight">{c.name}</p>
                      <p className="text-muted-foreground truncate text-[10px] font-bold uppercase tracking-widest">
                        {c.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary text-xs font-black">{c.posts}</p>
                      <p className="text-muted-foreground text-[9px] font-bold uppercase">Bài</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Community;
