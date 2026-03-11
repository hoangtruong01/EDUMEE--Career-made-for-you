'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowUp, Bookmark, MessageCircle, Search, Send, Share2, Users } from 'lucide-react';
import { useState } from 'react';

/* ─── Data ─── */
const CATEGORIES = [
  'Tất cả',
  'Review ngành',
  'Hỏi đáp',
  'Chia sẻ kinh nghiệm',
  'Tài nguyên',
  'Tuyển dụng',
];

const posts = [
  {
    id: 1,
    category: 'Review ngành',
    categoryColor: 'bg-sky-light text-primary',
    author: 'Nguyễn Minh Khôi',
    authorTitle: 'Kỹ sư Senior tại FPT Software',
    authorInitials: 'NK',
    authorBg: 'bg-violet-500',
    timeAgo: '3 giờ trước',
    title: 'Review thực tế ngành Kỹ sư Phần mềm sau 5 năm đi làm',
    preview:
      'Sau 5 năm làm việc tại các công ty lớn như FPT, VNG và startup, mình muốn chia sẻ thực tế về ngành này. Lương thì tốt, Remote rất phổ biến nhưng đôi khi tỷ lệ as công...',
    tags: ['Software Engineer', 'Review', 'Career Path'],
    upvotes: 234,
    comments: 45,
  },
  {
    id: 2,
    category: 'Chia sẻ kinh nghiệm',
    categoryColor: 'bg-mint-light text-mint',
    author: 'Trần Thu Hà',
    authorTitle: 'Data Scientist tại VinAI',
    authorInitials: 'TH',
    authorBg: 'bg-cyan-500',
    timeAgo: '5 giờ trước',
    title: 'Hành trình chuyển ngành từ Kế toán sang Data Science của mình',
    preview:
      'Nhiều người hỏi mình có học gì để chuyển sang Data Science mà không cần lý thuyết máy tính. Mình từng là kế toán 3 năm trước khi quyết định định hướng. Đây là những gì mình đã học...',
    tags: ['Data Science', 'Career Change', 'Bootcamp'],
    upvotes: 189,
    comments: 67,
  },
  {
    id: 3,
    category: 'Hỏi đáp',
    categoryColor: 'bg-gold-light text-gold',
    author: 'Lê Văn Đức',
    authorTitle: 'Sinh viên ĐHBK Hà Nội',
    authorInitials: 'VD',
    authorBg: 'bg-orange-500',
    timeAgo: '1 ngày trước',
    title: 'Nên chọn Frontend hay Backend khi mới bắt đầu học lập trình?',
    preview:
      'Mình đang học năm 2 CNTT và đang phân vân giữa Frontend và Backend. Anh chị nào có kinh nghiệm cho mình lời khuyên với? Mình tạm thời biết HTML/CSS và Python cơ bản...',
    tags: ['Frontend', 'Backend', 'Career Advice'],
    upvotes: 95,
    comments: 88,
  },
  {
    id: 4,
    category: 'Review ngành',
    categoryColor: 'bg-sky-light text-primary',
    author: 'Phạm Quỳnh Anh',
    authorTitle: 'UX Lead tại Tiki',
    authorInitials: 'QA',
    authorBg: 'bg-pink-500',
    timeAgo: '2 ngày trước',
    title: 'UX Design ở Việt Nam: Thực tế vs Kỳ vọng — Review thẳng thắn',
    preview:
      'Nhiều bạn romanticise ngành UX thấy đẹp và sáng tạo. Nhưng thực tế có những điều ít người nói tới. Từ việc convince stakeholder, justify design decision đến deadline gắp...',
    tags: ['UX Design', 'Career Review', 'Tiki'],
    upvotes: 312,
    comments: 72,
  },
  {
    id: 5,
    category: 'Tài nguyên',
    categoryColor: 'bg-lavender text-secondary',
    author: 'Hoàng Minh Tuấn',
    authorTitle: 'Product Manager tại Shopee',
    authorInitials: 'MT',
    authorBg: 'bg-emerald-500',
    timeAgo: '3 ngày trước',
    title: 'Tổng hợp tài nguyên học Product Management miễn phí tốt nhất 2026',
    preview:
      'Mình đã tổng hợp list các course, sách và community tốt nhất để học PM. Bao gồm cả tiếng Việt và tiếng Anh. Hy vọng hữu ích cho các bạn đang muốn vào ngành...',
    tags: ['Product Management', 'Resources', 'Free'],
    upvotes: 456,
    comments: 93,
  },
];

const trending = [
  '#KỹSưPhầnMềm',
  '#DataScience',
  '#UXDesign',
  '#CareerChange',
  '#Internship2026',
  '#RemoteWork',
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

/* ─── Post card ─── */
const PostCard = ({ post, index }: { post: (typeof posts)[number]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07 }}
    className="glass-card hover:shadow-elevated cursor-pointer rounded-2xl p-5 transition-shadow"
  >
    <div className="mb-3 flex flex-wrap items-start justify-between gap-y-2">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${post.authorBg}`}
        >
          {post.authorInitials}
        </div>
        <div>
          <p className="text-sm font-semibold">{post.author}</p>
          <p className="text-muted-foreground text-xs">{post.authorTitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.categoryColor}`}>
          {post.category}
        </span>
        <span className="text-muted-foreground text-xs">{post.timeAgo}</span>
      </div>
    </div>

    <h3 className="font-display mb-1.5 leading-snug font-semibold">{post.title}</h3>
    <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">{post.preview}</p>

    <div className="mb-4 flex flex-wrap gap-1.5">
      {post.tags.map((t) => (
        <span key={t} className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">
          {t}
        </span>
      ))}
    </div>

    <div className="flex items-center justify-between">
      <div className="text-muted-foreground flex items-center gap-4 text-sm">
        <button className="hover:text-primary flex items-center gap-1.5 transition-colors">
          <ArrowUp className="h-4 w-4" />
          <span className="font-medium">{post.upvotes}</span>
        </button>
        <button className="hover:text-primary flex items-center gap-1.5 transition-colors">
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments}</span>
        </button>
      </div>
      <div className="text-muted-foreground flex items-center gap-2">
        <button className="hover:text-primary p-1 transition-colors">
          <Bookmark className="h-4 w-4" />
        </button>
        <button className="hover:text-primary p-1 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </motion.div>
);

/* ─── Main component ─── */
const Community = () => {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');

  const filtered = posts.filter((p) => {
    const matchCat = activeCategory === 'Tất cả' || p.category === activeCategory;
    const matchSearch =
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
              <Button variant="hero" size="sm" className="shrink-0 gap-1.5">
                <Send className="h-4 w-4" /> Đăng bài
              </Button>
            </div>

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

            <div className="space-y-4">
              {filtered.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} />
              ))}
              {filtered.length === 0 && (
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
