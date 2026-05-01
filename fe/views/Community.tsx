'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { communityService, type CommunityPost } from '@/lib/community.service';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Hash,
  Heart,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Share2,
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

const trending = [
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
}: {
  post: CommunityPost;
  index: number;
  onOpen: (postId: string) => void;
  onToggleMenu: (postId: string) => void;
  onDelete: (postId: string) => void;
  isMenuOpen: boolean;
}) => {
  const postId = post.id || post._id || '';
  const authorName = post.authorName || 'Thành viên EDUMEE';
  const initials = getInitials(authorName);
  const avatarBg = getAvatarColor(authorName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={() => postId && onOpen(postId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && postId) onOpen(postId);
      }}
      role="button"
      tabIndex={0}
      className="glass-card hover:shadow-elevated cursor-pointer rounded-2xl p-5 transition-shadow"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-y-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarBg}`}
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
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClass(post.category)}`}
          >
            {post.category}
          </span>
          <span className="text-muted-foreground text-xs">{formatTimeAgo(post.createdAt)}</span>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (postId) onToggleMenu(postId);
              }}
              className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
              aria-label="Mo tuy chon"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {isMenuOpen && (
              <div
                className="border-border bg-popover text-foreground shadow-card absolute right-0 z-20 mt-2 w-36 rounded-xl border p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => postId && onDelete(postId)}
                  className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm"
                >
                  Xóa bài viết
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="font-display mb-1.5 leading-snug font-semibold">{post.title}</h3>
      <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">{post.content}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {post.hashtags?.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <button
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary flex items-center gap-1.5 transition-colors"
          >
            <Heart className="h-4 w-4" />
            <span className="font-medium">{post.likeCount ?? 0}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (postId) onOpen(postId);
            }}
            className="hover:text-primary flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentCount ?? 0}</span>
          </button>
        </div>
        <div className="text-muted-foreground flex items-center gap-2">
          <button
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary p-1 transition-colors"
          >
            <Bookmark className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary p-1 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Review ngành');
  const [authorName, setAuthorName] = useState('');
  const [authorTitle, setAuthorTitle] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

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
    setAuthorName('');
    setAuthorTitle('');
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
    if (!isAnonymous && authorName.trim().length < 2) {
      return 'Tên hiển thị cần tối thiểu 2 ký tự.';
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

    const displayName = isAnonymous ? 'Ẩn danh' : authorName.trim() || 'Thành viên EDUMEE';

    setIsSubmitting(true);
    setFormError(null);
    try {
      await communityService.createPost(accessToken, {
        title: title.trim(),
        content: content.trim(),
        category,
        hashtags,
        authorName: displayName,
        authorTitle: isAnonymous ? undefined : authorTitle.trim() || undefined,
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

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              <Users className="h-4 w-4" /> 50,000+ thành viên
            </span>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Cộng đồng nghề nghiệp</h1>
            <p className="text-muted-foreground mt-2">
              Nơi sinh viên và người đi làm chia sẻ kinh nghiệm thực tế về các ngành nghề
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm bài viết..."
                  className="border-input bg-background focus:ring-ring h-10 w-full rounded-xl border pr-4 pl-9 text-sm outline-none focus:ring-2"
                />
              </div>
              <Button
                variant="hero"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setIsFormOpen((prev) => !prev)}
              >
                <Send className="h-4 w-4" /> {isFormOpen ? 'Đóng' : 'Đăng bài'}
              </Button>
            </div>

            {isFormOpen && (
              <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold">Tạo bài viết mới</h3>
                    <p className="text-muted-foreground text-xs">
                      Chia sẻ trải nghiệm hoặc đặt câu hỏi cho cộng đồng.
                    </p>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <input
                      id="anonymous-toggle"
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="accent-primary h-4 w-4"
                    />
                    <label htmlFor="anonymous-toggle">Ẩn danh</label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">Chủ đề</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                    >
                      {postCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">Tiêu đề</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nhập tiêu đề bài viết"
                      className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                    />
                  </div>
                </div>

                {!isAnonymous && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        Tên hiển thị
                      </label>
                      <input
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs font-medium">Chức danh</label>
                      <input
                        value={authorTitle}
                        onChange={(e) => setAuthorTitle(e.target.value)}
                        placeholder="Ví dụ: Data Analyst"
                        className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-1">
                  <label className="text-muted-foreground text-xs font-medium">Hashtag</label>
                  <div className="border-input bg-background flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
                    <Hash className="text-muted-foreground h-4 w-4" />
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      >
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>
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
                      placeholder="Gõ hashtag và Enter"
                      className="min-w-[140px] flex-1 bg-transparent text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="text-primary text-xs font-medium"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <label className="text-muted-foreground text-xs font-medium">Nội dung</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Chia sẻ chi tiết để cộng đồng dễ hỗ trợ bạn hơn"
                    rows={5}
                    className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>

                {formError && <p className="mt-3 text-xs font-medium text-rose-500">{formError}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button type="submit" variant="hero" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang đăng...' : 'Đăng bài'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                    Làm mới
                  </Button>
                </div>
              </form>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {error && (
              <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {!accessToken && (
              <div className="border-border bg-muted/40 text-muted-foreground rounded-xl border px-4 py-3 text-sm">
                Vui lòng đăng nhập để xem và đăng bài viết.
              </div>
            )}

            <div className="space-y-4">
              {isLoading ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground text-sm">Đang tải bài viết...</p>
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
                  />
                ))
              )}
              {!isLoading && filteredPosts.length === 0 && (
                <div className="py-16 text-center">
                  <MessageCircle className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground font-medium">Chưa có bài viết nào</p>
                  <p className="text-muted-foreground/70 mt-1 text-sm">
                    Hãy thử chọn chủ đề khác hoặc là người đầu tiên chia sẻ!
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-base">🔥</span>
                <h3 className="font-display font-semibold">Xu hướng hôm nay</h3>
              </div>
              <ol className="space-y-2">
                {trending.map((tag, i) => (
                  <li key={tag} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-5 text-sm font-bold">{i + 1}</span>
                    <button className="text-primary text-sm font-medium hover:underline">
                      {tag}
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display mb-4 font-semibold">Cộng đồng CareerAI</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Thành viên</span>
                  <span className="text-primary font-bold">90,234</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bài viết hôm nay</span>
                  <span className="font-bold">127</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ngành được review</span>
                  <span className="font-bold">89</span>
                </div>
              </div>
              <Button
                onClick={() =>
                  window.open('https://www.facebook.com/profile.php?id=61586675294663', '_blank')
                }
                variant="hero"
                size="sm"
                className="mt-4 w-full"
              >
                Tham gia ngay
              </Button>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display mb-4 font-semibold">Top đóng góp</h3>
              <div className="space-y-3">
                {topContributors.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${c.bg}`}
                    >
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{c.role}</p>
                    </div>
                    <span className="text-primary shrink-0 text-xs font-semibold">
                      {c.posts} bài
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
