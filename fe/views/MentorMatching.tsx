'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  Calendar,
  Filter,
  GraduationCap,
  MessageCircle,
  Star,
} from 'lucide-react';
import { useState } from 'react';

const mentors = [
  {
    name: 'Nguyễn Minh Tuấn',
    role: 'Senior Frontend Developer',
    company: 'FPT Software',
    avatar: '👨‍💻',
    rating: 4.9,
    reviews: 32,
    type: 'Kỹ năng kỹ thuật',
    skills: ['React', 'TypeScript', 'System Design'],
    matchScore: 95,
    price: '200K/giờ',
    available: true,
  },
  {
    name: 'Trần Thị Lan',
    role: 'Tech Lead',
    company: 'VNG Corporation',
    avatar: '👩‍💻',
    rating: 4.8,
    reviews: 45,
    type: 'Career Mentor',
    skills: ['Career Planning', 'Leadership', 'Fullstack'],
    matchScore: 88,
    price: '300K/giờ',
    available: true,
  },
  {
    name: 'Lê Hoàng Nam',
    role: 'AI Engineer',
    company: 'Google',
    avatar: '🧑‍🔬',
    rating: 5.0,
    reviews: 18,
    type: 'Kỹ năng kỹ thuật',
    skills: ['Python', 'ML', 'Deep Learning'],
    matchScore: 82,
    price: '500K/giờ',
    available: false,
  },
  {
    name: 'Phạm Quỳnh Anh',
    role: 'HR Manager',
    company: 'Shopee',
    avatar: '👩‍🏫',
    rating: 4.7,
    reviews: 60,
    type: 'Soft Skills',
    skills: ['Communication', 'Interview Prep', 'CV Review'],
    matchScore: 78,
    price: '150K/giờ',
    available: true,
  },
];

const filters = ['Tất cả', 'Career Mentor', 'Kỹ năng kỹ thuật', 'Soft Skills'];

const MentorMatching = () => {
  const [activeFilter, setActiveFilter] = useState('Tất cả');

  const filtered =
    activeFilter === 'Tất cả' ? mentors : mentors.filter((m) => m.type === activeFilter);

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-primary/10 text-primary mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm">
              <GraduationCap className="h-4 w-4" /> AI đề xuất
            </div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Mentor phù hợp với bạn</h1>
            <p className="text-muted-foreground mt-1">Dựa trên skill gap và mục tiêu nghề nghiệp</p>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((f) => (
            <Button
              key={f}
              variant={activeFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(f)}
              className="flex-shrink-0"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Mentor cards */}
        {filtered.map((mentor, i) => (
          <motion.div
            key={mentor.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="bg-gradient-card flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl">
                {mentor.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{mentor.name}</h3>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {mentor.matchScore}% phù hợp
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm">
                  <Briefcase className="h-3 w-3" /> {mentor.role} · {mentor.company}
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="text-gold fill-gold h-3.5 w-3.5" /> {mentor.rating}
                  </span>
                  <span className="text-muted-foreground">({mentor.reviews} reviews)</span>
                  <span className="font-medium">{mentor.price}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {mentor.type}
              </Badge>
              {mentor.skills.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              {mentor.available ? (
                <Button variant="hero" size="sm" className="flex-1 gap-1">
                  <Calendar className="h-4 w-4" />
                  Đặt lịch
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                  <Bell className="h-4 w-4" />
                  Nhận thông báo khi có slot
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" /> Nhắn tin
              </Button>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Filter className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">Không tìm thấy mentor phù hợp với bộ lọc</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorMatching;
