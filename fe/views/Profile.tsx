'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import {
  Award,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  LogOut,
  Palette,
  Settings,
  Shield,
  Target,
  User,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const Profile = () => {
  const router = useRouter();
  const { logout } = useAuth();

  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // State độc lập cho Giao diện để đảm bảo luôn bấm được
  const [currentTheme, setCurrentTheme] = useState<string>('system');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'system';

    setCurrentTheme(savedTheme);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const openModal = (label: string) => {
    setActiveModal(label);
    setSaveSuccess(false);
    if (label === 'Xuất báo cáo PDF') {
      setDownloadProgress(0);
      setIsDownloaded(false);
    }
  };

  const handleFakeSave = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setActiveModal(null);
    }, 1500);
  };

  // Hàm "ép cứng" đổi theme chống lỗi
  const handleThemeChange = (newTheme: string) => {
    // 1. Đổi state để UI trong Modal sáng lên ngay lập tức
    setCurrentTheme(newTheme);

    // 2. Gọi thư viện next-themes (nếu có)
    if (setTheme) {
      setTheme(newTheme);
    }

    // 3. Can thiệp trực tiếp DOM để chắc chắn 100% giao diện web đổi màu
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (newTheme === 'light') {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        localStorage.removeItem('theme');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }
  };

  useEffect(() => {
    if (activeModal === 'Xuất báo cáo PDF' && downloadProgress < 100) {
      const timer = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsDownloaded(true);
            return 100;
          }
          return prev + 15;
        });
      }, 300);
      return () => clearInterval(timer);
    }
  }, [activeModal, downloadProgress]);

  const renderModalContent = () => {
    if (saveSuccess) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-900 dark:text-white">
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
          <h3 className="text-xl font-bold">Thành công!</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Dữ liệu của bạn đã được cập nhật.
          </p>
        </div>
      );
    }

    switch (activeModal) {
      case 'Thông tin tài khoản':
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="space-y-2">
              <label className="text-sm font-medium">Họ và tên</label>
              <input
                type="text"
                defaultValue="Nguyễn Văn A"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                defaultValue="nguyenvana@gmail.com"
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm opacity-70 outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Số điện thoại</label>
              <input
                type="text"
                defaultValue="0987654321"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <Button
              onClick={handleFakeSave}
              className="mt-4 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              Lưu thay đổi
            </Button>
          </div>
        );

      case 'Xuất báo cáo PDF':
        return (
          <div className="space-y-6 py-6 text-center text-zinc-900 dark:text-white">
            {!isDownloaded ? (
              <>
                <FileText className="mx-auto h-16 w-16 animate-pulse text-violet-500" />
                <div>
                  <h3 className="mb-2 font-semibold">Đang khởi tạo tài liệu...</h3>
                  <Progress
                    value={downloadProgress}
                    className="h-2 w-full bg-zinc-200 dark:bg-zinc-800"
                  >
                    <div
                      className="h-full bg-violet-600 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </Progress>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {downloadProgress}% hoàn thành
                  </p>
                </div>
              </>
            ) : (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
                <h3 className="font-bold">Đã tải xong!</h3>
                <p className="mt-1 mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  File báo cáo đã được lưu vào máy của bạn.
                </p>
                <Button
                  onClick={() => setActiveModal(null)}
                  variant="outline"
                  className="w-full rounded-xl border-zinc-300 dark:border-zinc-700"
                >
                  Đóng cửa sổ
                </Button>
              </motion.div>
            )}
          </div>
        );

      case 'Thông báo':
        return (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-900 dark:text-white">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
              <BellOff className="h-10 w-10 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold">Chưa có thông báo mới</h3>
            <p className="mt-2 max-w-[250px] text-sm text-zinc-500 dark:text-zinc-400">
              Khi có tin tức cập nhật từ Edumee hoặc lộ trình học, chúng sẽ hiển thị ở đây.
            </p>
          </div>
        );

      case 'Bảo mật':
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu hiện tại</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <Button
              onClick={handleFakeSave}
              className="mt-4 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        );

      case 'Giao diện':
        if (!mounted) return null;
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="grid grid-cols-3 gap-3">
              {/* Nút giao diện sáng */}
              <div
                onClick={() => handleThemeChange('light')}
                className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all duration-200 ${currentTheme === 'light' ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-zinc-200 hover:border-violet-400 dark:border-zinc-700'}`}
              >
                <div className="mx-auto mb-2 h-8 w-8 rounded-full border border-zinc-200 bg-white shadow-sm"></div>
                <span
                  className={`text-sm font-medium ${currentTheme === 'light' ? 'text-violet-600' : 'text-zinc-500'}`}
                >
                  Sáng
                </span>
              </div>

              {/* Nút giao diện tối */}
              <div
                onClick={() => handleThemeChange('dark')}
                className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all duration-200 ${currentTheme === 'dark' ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-zinc-200 hover:border-violet-400 dark:border-zinc-700'}`}
              >
                <div className="mx-auto mb-2 h-8 w-8 rounded-full border border-zinc-700 bg-zinc-800 shadow-sm"></div>
                <span
                  className={`text-sm font-medium ${currentTheme === 'dark' ? 'text-violet-600' : 'text-zinc-500'}`}
                >
                  Tối
                </span>
              </div>

              {/* Nút giao diện hệ thống */}
              <div
                onClick={() => handleThemeChange('system')}
                className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all duration-200 ${currentTheme === 'system' ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-zinc-200 hover:border-violet-400 dark:border-zinc-700'}`}
              >
                <div className="mx-auto mb-2 h-8 w-8 rounded-full border border-zinc-300 bg-gradient-to-tr from-zinc-200 to-zinc-700 shadow-sm"></div>
                <span
                  className={`text-sm font-medium ${currentTheme === 'system' ? 'text-violet-600' : 'text-zinc-500'}`}
                >
                  Hệ thống
                </span>
              </div>
            </div>
            <Button
              onClick={handleFakeSave}
              className="mt-4 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              Lưu giao diện
            </Button>
          </div>
        );

      case 'Cài đặt':
        return (
          <div className="space-y-6 text-zinc-900 dark:text-white">
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                Tùy chọn chung
              </h4>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ngôn ngữ hiển thị</label>
                <select className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2.5 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div>
                  <p className="text-sm font-medium">Âm thanh hệ thống</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Phát âm thanh khi có thông báo mới</p>
                </div>
                {/* Nút Toggle giả lập */}
                <div className="flex h-6 w-11 cursor-pointer items-center rounded-full bg-violet-600 p-1">
                  <div className="h-4 w-4 translate-x-5 rounded-full bg-white shadow-sm transition-all"></div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <h4 className="mb-3 text-xs font-bold tracking-wider text-red-500 uppercase">
                Vùng nguy hiểm
              </h4>
              <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Xóa tài khoản
                  </p>
                  <p className="mt-0.5 text-xs text-red-500/80">Xóa vĩnh viễn dữ liệu.</p>
                </div>
                <Button
                  variant="outline"
                  className="border-red-200 bg-transparent text-red-600 hover:bg-red-100 dark:border-red-900 dark:hover:bg-red-900/50"
                >
                  Xóa
                </Button>
              </div>
            </div>
            <Button
              onClick={handleFakeSave}
              className="mt-2 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              Lưu cài đặt
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen pb-20">
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
              onClick={() => openModal(menuItem.label)}
              className={`hover:bg-muted/50 flex w-full items-center gap-3 px-6 py-4 text-left transition-colors focus:outline-none ${i > 0 ? 'border-border/50 border-t' : ''}`}
            >
              <menuItem.icon className="text-muted-foreground h-5 w-5" />
              <span className="flex-1 text-sm font-medium">{menuItem.label}</span>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </button>
          ))}
        </motion.div>

        <Button
          variant="outline"
          className="text-destructive border-destructive/20 hover:bg-destructive/5 w-full gap-2 rounded-xl py-6"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>

      {activeModal && (
        <div className="z- fixed inset-0 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          ></div>

          <div className="z- relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {activeModal}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">{renderModalContent()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
