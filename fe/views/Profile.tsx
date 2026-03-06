'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  Award,
  Bell,
  ChevronRight,
  Clock,
  FileText,
  LogOut,
  Palette,
  Settings,
  Shield,
  Target,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const Profile = () => {
  const router = useRouter();
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  const handleLogout = () => {
    router.push('/');
  };

  const showComingSoon = (label: string) => {
    setComingSoon(label);
    setTimeout(() => setComingSoon(null), 2000);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-card">
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="bg-gradient-hero flex h-16 w-16 items-center justify-center rounded-2xl text-2xl">
              👨‍🎓
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Nguyễn Văn A</h1>
              <p className="text-muted-foreground text-sm">Sinh viên năm 3 · CNTT</p>
              <div className="mt-1 flex gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Nhà Khám Phá
                </Badge>
                <Badge className="bg-gold/10 text-gold border-gold/20 text-xs">12 badges</Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mt-6 space-y-4">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { icon: Clock, label: 'Ngày streak', value: '7' },
            { icon: Award, label: 'Badges', value: '12' },
            { icon: Target, label: 'Hoàn thành', value: '65%' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
              <stat.icon className="text-primary mx-auto mb-1 h-5 w-5" />
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Weekly progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6"
        >
          <h2 className="mb-3 font-semibold">Tiến độ tuần này</h2>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Bài học hoàn thành</span>
                <span className="font-medium">4/7</span>
              </div>
              <Progress value={57} className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Thời gian học</span>
                <span className="font-medium">5.2h / 10h</span>
              </div>
              <Progress value={52} className="h-2" />
            </div>
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden rounded-2xl"
        >
          {[
            { icon: User, label: 'Thông tin tài khoản' },
            { icon: FileText, label: 'Xuất báo cáo PDF' },
            { icon: Bell, label: 'Thông báo' },
            { icon: Shield, label: 'Bảo mật' },
            { icon: Palette, label: 'Giao diện' },
            { icon: Settings, label: 'Cài đặt' },
          ].map((menuItem, i) => (
            <button
              key={menuItem.label}
              onClick={() => showComingSoon(menuItem.label)}
              className={`hover:bg-muted/50 flex w-full items-center gap-3 px-6 py-4 text-left transition-colors ${i > 0 ? 'border-border/50 border-t' : ''}`}
            >
              <menuItem.icon className="text-muted-foreground h-5 w-5" />
              <span className="flex-1 text-sm font-medium">{menuItem.label}</span>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </button>
          ))}
        </motion.div>

        {/* Coming soon toast */}
        {comingSoon && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-foreground text-background shadow-elevated fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-medium"
          >
            {comingSoon} — Sắp ra mắt!
          </motion.div>
        )}

        {/* Logout */}
        <Button
          variant="outline"
          className="text-destructive border-destructive/20 hover:bg-destructive/5 w-full gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default Profile;
