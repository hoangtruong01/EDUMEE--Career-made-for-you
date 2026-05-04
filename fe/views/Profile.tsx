'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { assessmentService, CareerFitResult } from '@/lib/assessment.service';
import { profileService, UserProfile } from '@/lib/profile.service';
import { userService } from '@/lib/user.service';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
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
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const Profile = () => {
  const router = useRouter();
  const { logout, accessToken } = useAuth();
  const { setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<CareerFitResult[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: '',
    educationLevel: '',
    bio: '',
  });

  const [currentTheme, setCurrentTheme] = useState<string>('system');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'system';
    setCurrentTheme(savedTheme);

    const fetchData = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const [profData, resData, userData] = await Promise.all([
          profileService.getMyProfile(accessToken),
          assessmentService.getMyResults(accessToken),
          userService.getMe(accessToken),
        ]);
        console.log('Profile Data Loaded:', profData);
        setProfile(profData);
        setResults(resData);
        if (profData && typeof profData === 'object') {
          setFormData({
            fullName: userData?.name || profData?.userId?.name || '',
            phone: userData?.phone_number || profData?.phone || '',
            city: profData?.city || '',
            educationLevel: profData?.educationLevel || '',
            bio: profData?.bio || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        toast.error('Không thể tải thông tin cá nhân');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [accessToken]);

  const openModal = (label: string) => {
    setActiveModal(label);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleThemeChange = (newTheme: string) => {
    setCurrentTheme(newTheme);
    if (setTheme) setTheme(newTheme);

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

  const handleUpdateProfile = async () => {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      await Promise.all([
        profileService.updateMyProfile(accessToken, {
          phone: formData.phone,
          city: formData.city,
          educationLevel: formData.educationLevel,
          bio: formData.bio,
        }),
        userService.updateMe(accessToken, { phone_number: formData.phone }),
      ]);
      toast.success('Cập nhật hồ sơ thành công');
      setActiveModal(null);
      // Refresh data
      const [updatedProfile, updatedUser] = await Promise.all([
        profileService.getMyProfile(accessToken),
        userService.getMe(accessToken),
      ]);
      setProfile(updatedProfile);
      setFormData((prev) => ({
        ...prev,
        fullName: updatedUser?.name || prev.fullName,
        phone: updatedUser?.phone_number || prev.phone,
      }));
    } catch (err) {
      toast.error('Cập nhật thất bại');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Critical: Strip modern color functions before rendering
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            // Force basic colors for anything that might have oklch/lab from Tailwind 4
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.color.includes('lab') || computedStyle.color.includes('oklch')) {
              el.style.color = '#000000';
            }
            if (
              computedStyle.backgroundColor.includes('lab') ||
              computedStyle.backgroundColor.includes('oklch')
            ) {
              el.style.backgroundColor = 'transparent';
            }
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`EDUMEE_Report_${profile?.userId?.name?.replace(/\s+/g, '_') || 'User'}.pdf`);
      toast.success('Báo cáo đã được tải về');
      setActiveModal(null);
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Lỗi khi xuất PDF. Đang mở chế độ in an toàn...');
      // Fallback: Print current view if canvas fails
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'Thông tin tài khoản':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Họ và tên</label>
              <input
                type="text"
                value={formData.fullName}
                readOnly
                className="border-input bg-muted text-muted-foreground w-full cursor-not-allowed rounded-xl border px-4 py-2 text-sm outline-none"
              />
              <p className="text-muted-foreground text-[10px] italic">
                * Tên được quản lý bởi hệ thống đăng ký
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Email</label>
              <input
                type="email"
                value={profile?.userId?.email || ''}
                readOnly
                className="border-input bg-muted text-muted-foreground w-full cursor-not-allowed rounded-xl border px-4 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Số điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="VD: 0987654321"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Thành phố</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="VD: Hà Nội"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Trình độ học vấn</label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                className="border-input bg-background text-foreground w-full appearance-none rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="">Chọn trình độ</option>
                <option value="elementary">Tiểu học</option>
                <option value="middle_school">THCS</option>
                <option value="high_school">THPT</option>
                <option value="college">Cao đẳng</option>
                <option value="bachelor">Đại học</option>
                <option value="master">Thạc sĩ</option>
                <option value="phd">Tiến sĩ</option>
                <option value="vocational">Trung cấp nghề</option>
                <option value="certificate">Chứng chỉ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Giới thiệu bản thân</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Chia sẻ một chút về đam mê của bạn..."
                className="border-input bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isSaving}
              className="mt-4 h-11 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
            </Button>
          </div>
        );

      case 'Xuất báo cáo PDF':
        return (
          <div className="space-y-6 py-4 text-center text-zinc-900 dark:text-white">
            <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <FileText className="text-primary h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xuất báo cáo hướng nghiệp</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Hệ thống sẽ tổng hợp kết quả phân tích AI và thông tin lộ trình của bạn vào một file
                PDF chuyên nghiệp.
              </p>
            </div>

            <div className="border-border bg-muted/30 rounded-xl border p-4 text-left">
              <p className="text-muted-foreground mb-2 text-[11px] font-bold tracking-wider uppercase">
                Thông tin bao gồm:
              </p>
              <ul className="space-y-1.5">
                {[
                  'Hồ sơ năng lực cá nhân',
                  'Phân tích Top 3 ngành nghề phù hợp',
                  'Lộ trình học tập chi tiết từ AI',
                  'Dự báo xu hướng thị trường 2026',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={exportPDF}
              disabled={isExporting || results.length === 0}
              className="h-11 w-full gap-2 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang khởi tạo PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {results.length > 0 ? 'Tải xuống ngay' : 'Chưa có dữ liệu kết quả'}
                </>
              )}
            </Button>
            {results.length === 0 && (
              <p className="text-[10px] text-red-500 italic">
                Bạn cần thực hiện bài trắc nghiệm để có dữ liệu xuất báo cáo.
              </p>
            )}
          </div>
        );

      case 'Giao diện':
        if (!mounted) return null;
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="grid grid-cols-3 gap-3">
              {['light', 'dark', 'system'].map((t) => (
                <div
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all duration-200 ${currentTheme === t ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-zinc-200 hover:border-violet-400 dark:border-zinc-700'}`}
                >
                  <div
                    className={`mx-auto mb-2 h-8 w-8 rounded-full border shadow-sm ${
                      t === 'light'
                        ? 'bg-white'
                        : t === 'dark'
                          ? 'bg-zinc-800'
                          : 'bg-linear-to-tr from-zinc-200 to-zinc-700'
                    }`}
                  ></div>
                  <span
                    className={`text-sm font-medium capitalize ${currentTheme === t ? 'text-violet-600' : 'text-zinc-500'}`}
                  >
                    {t === 'light' ? 'Sáng' : t === 'dark' ? 'Tối' : 'Hệ thống'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-900 dark:text-white">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
              <Settings className="h-10 w-10 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold">Chức năng đang phát triển</h3>
            <p className="mt-2 max-w-62.5 text-sm text-zinc-500 dark:text-zinc-400">
              Tính năng này sẽ sớm được cập nhật trong phiên bản tiếp theo.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20">
      {/* Hidden Report for PDF Export */}
      <div className="fixed top-0 -left-750 overflow-hidden">
        <div
          ref={reportRef}
          className="min-h-[297mm] w-[210mm] bg-white p-12 font-sans text-zinc-950"
          style={{ colorScheme: 'light', background: '#ffffff', color: '#000000' }}
        >
          <div
            className="mb-8 flex items-start justify-between pb-8"
            style={{ borderBottom: '2px solid #7c3aed' }}
          >
            <div>
              <h1 className="mb-2 text-4xl font-black" style={{ color: '#7c3aed' }}>
                EDUMEE
              </h1>
              <p
                className="text-sm font-bold tracking-widest uppercase"
                style={{ color: '#000000' }}
              >
                Career Guidance Analysis Report
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-500">
                DATE: {new Date().toLocaleDateString('vi-VN')}
              </p>
              <p className="text-xs font-bold text-zinc-500">
                ID: #{profile?.id?.slice(-8).toUpperCase() || 'N/A'}
              </p>
            </div>
          </div>

          <div className="mb-12 grid grid-cols-2 gap-8">
            <div
              className="rounded-2xl border border-zinc-200 p-6"
              style={{ background: '#f9fafb' }}
            >
              <h3 className="mb-4 text-lg font-bold" style={{ color: '#6d28d9' }}>
                Thông tin cá nhân
              </h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Họ tên:</strong> {profile?.userId?.name || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {profile?.userId?.email || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Thành phố:</strong> {profile?.city || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Trình độ:</strong> {profile?.educationLevel || 'N/A'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl p-6 text-white shadow-xl" style={{ background: '#7c3aed' }}>
              <h3 className="mb-2 text-lg font-bold">Tổng kết sự nghiệp</h3>
              <p className="text-xs leading-relaxed italic opacity-90">
                &quot;
                {profile?.bio ||
                  'Hành trình khám phá tương lai bắt đầu từ những lựa chọn đúng đắn hôm nay.'}
                &quot;
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-black">
              <Target className="h-6 w-6" style={{ color: '#7c3aed' }} />
              TOP 3 NGÀNH NGHỀ PHÙ HỢP NHẤT
            </h3>
            <div className="space-y-6">
              {results.slice(0, 3).map((res, i) => (
                <div key={i} className="py-2 pl-6" style={{ borderLeft: '4px solid #7c3aed' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-lg font-bold">
                      {i + 1}. {res.careerTitle}
                    </h4>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-black"
                      style={{ background: '#ede9fe', color: '#6d28d9' }}
                    >
                      ĐỘ PHÙ HỢP: {Math.round(res.overallFitScore || 0)}%
                    </span>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-600">{res.aiExplanation}</p>
                  <div className="flex flex-wrap gap-2">
                    {res.strengths?.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-100 pt-12 text-center">
            <p className="text-[10px] font-medium text-zinc-400">
              Báo cáo được tạo tự động bởi Hệ thống Hướng nghiệp Thông minh Edumee AI
            </p>
            <p className="text-[10px] text-zinc-400 italic">
              © 2026 EDUMEE - Bản quyền thuộc về đội ngũ phát triển Edumee Team
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-card">
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="bg-gradient-hero shadow-primary/20 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-xl">
              {profile?.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">
                {profile?.userId?.name || 'Người dùng Edumee'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {profile?.educationLevel || 'Sinh viên'} {profile?.city ? `· ${profile.city}` : ''}
              </p>
              <div className="mt-1 flex gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black tracking-wider uppercase">
                  Nhà Khám Phá
                </Badge>
                <Badge className="border-amber-400/20 bg-amber-400/10 text-[10px] font-black tracking-wider text-amber-600 uppercase dark:text-amber-400">
                  {results.length > 0 ? 'Đã hoàn thành test' : 'Chưa làm test'}
                </Badge>
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
            { icon: Clock, label: 'Streak', value: '1' },
            { icon: Target, label: 'Lộ trình', value: results.length > 0 ? '1' : '0' },
            {
              icon: Award,
              label: 'Phù hợp',
              value: results.length > 0 ? `${Math.round(results[0]?.overallFitScore || 0)}%` : '0%',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card border-border/40 rounded-xl p-4 text-center"
            >
              <stat.icon className="text-primary mx-auto mb-1 h-5 w-5" />
              <div className="text-lg font-black tracking-tight">{stat.value}</div>
              <div className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {profile?.bio && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card text-muted-foreground border-primary rounded-2xl border-l-4 p-4 text-sm italic"
          >
            &quot;{profile.bio}&quot;
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card border-border/40 overflow-hidden rounded-2xl"
        >
          {[
            { icon: User, label: 'Thông tin tài khoản' },
            { icon: FileText, label: 'Xuất báo cáo PDF' },
            { icon: Palette, label: 'Giao diện' },
            { icon: Shield, label: 'Bảo mật' },
            { icon: Settings, label: 'Cài đặt' },
          ].map((menuItem, i) => (
            <button
              key={menuItem.label}
              onClick={() => openModal(menuItem.label)}
              className={`hover:bg-primary/5 group flex w-full items-center gap-4 px-6 py-4 text-left transition-all ${i > 0 ? 'border-border/50 border-t' : ''}`}
            >
              <div className="bg-muted group-hover:bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
                <menuItem.icon className="text-muted-foreground group-hover:text-primary h-4 w-4" />
              </div>
              <span className="flex-1 text-sm font-bold">{menuItem.label}</span>
              <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-all group-hover:translate-x-1" />
            </button>
          ))}
        </motion.div>

        <Button
          variant="outline"
          className="text-destructive border-destructive/20 hover:bg-destructive/5 w-full gap-2 rounded-xl py-6 font-bold shadow-sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất hệ thống
        </Button>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          ></motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="border-border bg-card relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl"
          >
            <div className="border-border bg-muted/30 flex items-center justify-between border-b px-6 py-4">
              <h3 className="font-display text-lg font-black tracking-tight">{activeModal}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:bg-muted rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="custom-scrollbar max-h-[80vh] overflow-y-auto p-6">
              {renderModalContent()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;
