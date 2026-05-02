'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import {
  Award,
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
  Loader2,
  Download
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { profileService, UserProfile } from '@/lib/profile.service';
import { assessmentService, CareerFitResult } from '@/lib/assessment.service';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
        const [profData, resData] = await Promise.all([
          profileService.getMyProfile(accessToken),
          assessmentService.getMyResults(accessToken)
        ]);
        console.log('Profile Data Loaded:', profData);
        setProfile(profData);
        setResults(resData);
        if (profData && typeof profData === 'object') {
          setFormData({
            fullName: profData?.userId?.name || '',
            phone: profData?.phone || '',
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
      await profileService.updateMyProfile(accessToken, {
        phone: formData.phone,
        city: formData.city,
        educationLevel: formData.educationLevel,
        bio: formData.bio,
      });
      toast.success('Cập nhật hồ sơ thành công');
      setActiveModal(null);
      // Refresh data
      const updated = await profileService.getMyProfile(accessToken);
      setProfile(updated);
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
        backgroundColor: '#ffffff'
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
      toast.error('Lỗi khi xuất PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'Thông tin tài khoản':
        return (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="space-y-2">
              <label className="text-sm font-medium">Họ và tên</label>
              <input
                type="text"
                value={formData.fullName}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm opacity-70 outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
              <p className="text-[10px] text-muted-foreground italic">* Tên được quản lý bởi hệ thống đăng ký</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={profile?.userId?.email || ''}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm opacity-70 outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Số điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="VD: 0987654321"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Thành phố</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="VD: Hà Nội"
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trình độ học vấn</label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({...formData, educationLevel: e.target.value})}
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700"
              >
                <option value="">Chọn trình độ</option>
                <option value="high_school">Học sinh THPT</option>
                <option value="college">Sinh viên Cao đẳng</option>
                <option value="bachelor">Sinh viên Đại học</option>
                <option value="master">Thạc sĩ</option>
                <option value="vocational">Trung cấp nghề</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Giới thiệu bản thân</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
                placeholder="Chia sẻ một chút về đam mê của bạn..."
                className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-violet-600 dark:border-zinc-700 resize-none"
              />
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isSaving}
              className="mt-4 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700 h-11"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu thay đổi'}
            </Button>
          </div>
        );

      case 'Xuất báo cáo PDF':
        return (
          <div className="space-y-6 py-4 text-center text-zinc-900 dark:text-white">
            <div className="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xuất báo cáo hướng nghiệp</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Hệ thống sẽ tổng hợp kết quả phân tích AI và thông tin lộ trình của bạn vào một file PDF chuyên nghiệp.
              </p>
            </div>
            
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Thông tin bao gồm:</p>
              <ul className="space-y-1.5">
                {[
                  'Hồ sơ năng lực cá nhân',
                  'Phân tích Top 3 ngành nghề phù hợp',
                  'Lộ trình học tập chi tiết từ AI',
                  'Dự báo xu hướng thị trường 2026'
                ].map(item => (
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
              className="w-full gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 h-11 shadow-lg shadow-violet-500/20"
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
              <p className="text-[10px] text-red-500 italic">Bạn cần thực hiện bài trắc nghiệm để có dữ liệu xuất báo cáo.</p>
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
                  <div className={`mx-auto mb-2 h-8 w-8 rounded-full border shadow-sm ${
                    t === 'light' ? 'bg-white' : t === 'dark' ? 'bg-zinc-800' : 'bg-gradient-to-tr from-zinc-200 to-zinc-700'
                  }`}></div>
                  <span className={`text-sm font-medium capitalize ${currentTheme === t ? 'text-violet-600' : 'text-zinc-500'}`}>
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
            <p className="mt-2 max-w-[250px] text-sm text-zinc-500 dark:text-zinc-400">
              Tính năng này sẽ sớm được cập nhật trong phiên bản tiếp theo.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20">
      {/* Hidden Report for PDF Export */}
      <div className="fixed -left-[3000px] top-0 overflow-hidden">
        <div 
          ref={reportRef} 
          className="w-[210mm] min-h-[297mm] p-12 bg-white text-zinc-950 font-sans"
          style={{ colorScheme: 'light', background: '#ffffff', color: '#000000' }}
        >
          <div className="flex justify-between items-start pb-8 mb-8" style={{ borderBottom: '2px solid #7c3aed' }}>
            <div>
              <h1 className="text-4xl font-black mb-2" style={{ color: '#7c3aed' }}>EDUMEE</h1>
              <p className="text-sm font-bold tracking-widest uppercase" style={{ color: '#000000' }}>Career Guidance Analysis Report</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-500">DATE: {new Date().toLocaleDateString('vi-VN')}</p>
              <p className="text-xs font-bold text-zinc-500">ID: #{profile?.id?.slice(-8).toUpperCase() || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="p-6 rounded-2xl border border-zinc-200" style={{ background: '#f9fafb' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#6d28d9' }}>Thông tin cá nhân</h3>
              <div className="space-y-2">
                <p className="text-sm"><strong>Họ tên:</strong> {profile?.userId?.name || 'N/A'}</p>
                <p className="text-sm"><strong>Email:</strong> {profile?.userId?.email || 'N/A'}</p>
                <p className="text-sm"><strong>Thành phố:</strong> {profile?.city || 'N/A'}</p>
                <p className="text-sm"><strong>Trình độ:</strong> {profile?.educationLevel || 'N/A'}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl text-white shadow-xl" style={{ background: '#7c3aed' }}>
              <h3 className="text-lg font-bold mb-2">Tổng kết sự nghiệp</h3>
              <p className="text-xs opacity-90 leading-relaxed italic">
                &quot;{profile?.bio || 'Hành trình khám phá tương lai bắt đầu từ những lựa chọn đúng đắn hôm nay.'}&quot;
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Target className="h-6 w-6" style={{ color: '#7c3aed' }} />
              TOP 3 NGÀNH NGHỀ PHÙ HỢP NHẤT
            </h3>
            <div className="space-y-6">
              {results.slice(0, 3).map((res, i) => (
                <div key={i} className="pl-6 py-2" style={{ borderLeft: '4px solid #7c3aed' }}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-bold">{i+1}. {res.careerTitle}</h4>
                    <span className="font-black px-3 py-1 rounded-full text-xs" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                      ĐỘ PHÙ HỢP: {Math.round(res.overallFitScore || 0)}%
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                    {res.aiExplanation}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {res.strengths?.map(s => (
                      <span key={s} className="bg-zinc-100 text-[10px] font-bold px-2 py-1 rounded uppercase">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-12 border-t border-zinc-100 text-center">
            <p className="text-[10px] text-zinc-400 font-medium">Báo cáo được tạo tự động bởi Hệ thống Hướng nghiệp Thông minh Edumee AI</p>
            <p className="text-[10px] text-zinc-400 italic">© 2026 EDUMEE - Bản quyền thuộc về đội ngũ phát triển Edumee Team</p>
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
            <div className="bg-gradient-hero flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-xl shadow-primary/20">
              {profile?.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{profile?.userId?.name || 'Người dùng Edumee'}</h1>
              <p className="text-muted-foreground text-sm">
                {profile?.educationLevel || 'Sinh viên'} {profile?.city ? `· ${profile.city}` : ''}
              </p>
              <div className="mt-1 flex gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-wider">
                  Nhà Khám Phá
                </Badge>
                <Badge className="bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/20 text-[10px] font-black uppercase tracking-wider">
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
            { icon: Award, label: 'Phù hợp', value: results.length > 0 ? `${Math.round(results[0]?.overallFitScore || 0)}%` : '0%' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 text-center border-border/40">
              <stat.icon className="text-primary mx-auto mb-1 h-5 w-5" />
              <div className="text-lg font-black tracking-tight">{stat.value}</div>
              <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {profile?.bio && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 italic text-sm text-muted-foreground border-l-4 border-primary"
          >
            &quot;{profile.bio}&quot;
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden rounded-2xl border-border/40"
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
              className={`hover:bg-primary/5 flex w-full items-center gap-4 px-6 py-4 text-left transition-all group ${i > 0 ? 'border-border/50 border-t' : ''}`}
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
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
              <h3 className="font-display text-lg font-black tracking-tight">
                {activeModal}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {renderModalContent()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;
