'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Clock, Eye, MessageCircle, PenSquare, Star, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

const tags = ['Tất cả', 'IT', 'Marketing', 'Kinh doanh', 'Thiết kế', 'Y tế', 'Giáo dục'];

const posts = [
  {
    id: 1,
    tag: 'IT',
    tagColor: 'bg-sky-light text-primary',
    title: 'Thực tập Frontend 6 tháng tại startup – Đây là những gì tôi học được',
    preview:
      'Mình bắt đầu thực tập khi chưa biết gì về React. Sau 6 tháng, mình đã ship 3 features lớn và nhận offer full-time...',
    author: 'Ẩn danh • SV năm 4',
    time: '2 giờ trước',
    likes: 42,
    comments: 15,
    views: 230,
    rating: 4.5,
  },
  {
    id: 2,
    tag: 'Marketing',
    tagColor: 'bg-coral-light text-coral',
    title: 'Marketing agency vs In-house: Chọn gì khi mới ra trường?',
    preview:
      'Sau 2 năm làm agency và 1 năm in-house, mình thấy mỗi bên có ưu nhược điểm rất khác nhau. Agency cho bạn tốc độ...',
    author: 'Ẩn danh • 3 năm kinh nghiệm',
    time: '5 giờ trước',
    likes: 38,
    comments: 22,
    views: 185,
    rating: 4.8,
  },
  {
    id: 3,
    tag: 'Kinh doanh',
    tagColor: 'bg-gold-light text-gold',
    title: 'Lương ngành tài chính – ngân hàng có thật sự cao như lời đồn?',
    preview:
      'Mình làm credit analyst tại Big4 bank. Chia sẻ thật về lương, thưởng, áp lực và career path thực tế...',
    author: 'Ẩn danh • 2 năm kinh nghiệm',
    time: '1 ngày trước',
    likes: 67,
    comments: 31,
    views: 420,
    rating: 4.2,
  },
  {
    id: 4,
    tag: 'IT',
    tagColor: 'bg-sky-light text-primary',
    title: 'Chuyển từ tester sang BA – Con đường và lời khuyên',
    preview:
      'Sau 1.5 năm làm QC, mình nhận ra mình thích phân tích hơn là test. Đây là cách mình chuyển sang BA thành công...',
    author: 'Ẩn danh • BA 1 năm',
    time: '2 ngày trước',
    likes: 55,
    comments: 18,
    views: 310,
    rating: 4.6,
  },
];

const Community = () => {
  const [activeTag, setActiveTag] = useState('Tất cả');

  const filtered = activeTag === 'Tất cả' ? posts : posts.filter((p) => p.tag === activeTag);

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <h1 className="font-display mb-2 text-2xl font-bold md:text-3xl">Cộng đồng Review</h1>
          <p className="text-muted-foreground">Chia sẻ thật từ người trong ngành – 100% ẩn danh</p>
        </div>
      </div>

      <div className="container mt-6 space-y-6">
        {/* Tags + Write CTA */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-2 overflow-x-auto pb-2">
            {tags.map((tag) => (
              <Button
                key={tag}
                variant={activeTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTag(tag)}
                className="flex-shrink-0"
              >
                {tag}
              </Button>
            ))}
          </div>
          <Button variant="hero" size="sm" className="flex-shrink-0 gap-1.5">
            <PenSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Viết bài</span>
          </Button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filtered.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card hover:shadow-elevated cursor-pointer rounded-2xl p-5 transition-shadow"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${post.tagColor}`}>
                  {post.tag}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" /> {post.time}
                </span>
              </div>

              <h3 className="font-display mb-2 leading-snug font-semibold">{post.title}</h3>
              <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{post.preview}</p>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{post.author}</span>
                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Star className="text-gold h-3 w-3" />
                    {post.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {post.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.views}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <MessageCircle className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground mb-1 font-medium">Chưa có bài viết nào</p>
            <p className="text-muted-foreground/70 text-sm">
              Hãy thử chọn chủ đề khác hoặc là người đầu tiên chia sẻ!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
