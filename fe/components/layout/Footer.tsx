import { Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  { href: '/assessment-result', label: 'Đánh giá nghề nghiệp' },
  { href: '/specialization', label: 'Khám phá ngành' },
  { href: '/career-compare', label: 'So sánh nghề' },
  { href: '/learning-roadmap', label: 'Lộ trình học tập' },
];

const SUPPORT = [
  { href: '/community', label: 'Cộng đồng' },
  { href: '/mentor-matching', label: 'Mentor' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Liên hệ' },
];

export default function Footer() {
  return (
    <footer className="border-border bg-background border-t">
      {/* ─── Main grid ─── */}
      <div className="container py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand — spans 2 cols */}
          <div className="sm:col-span-2">
            <Link href="/" className="font-display mb-3 flex items-center gap-2 text-lg font-bold">
              <div className="bg-gradient-hero flex h-8 w-8 items-center justify-center rounded-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              EDUMEE
            </Link>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Nền tảng AI tư vấn nghề nghiệp hàng đầu Việt Nam, giúp học sinh và sinh viên tìm con
              đường sự nghiệp phù hợp nhất.
            </p>
          </div>

          {/* Tính năng */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Tính năng</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              {FEATURES.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Hỗ trợ</h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              {SUPPORT.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Bottom bar ─── */}
      <div className="border-border border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm sm:flex-row">
          <p className="text-muted-foreground">© 2026 EDUMEE. Tất cả quyền được bảo lưu.</p>
          <p className="text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> for Vietnamese
            students
          </p>
        </div>
      </div>
    </footer>
  );
}
