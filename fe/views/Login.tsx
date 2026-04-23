'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  // Đếm click logo để chuyển sang trang admin login
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = useCallback(() => {
    clickCountRef.current += 1;

    // Reset timer mỗi lần click
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      router.push('/admin-login');
      return;
    }

    // Reset sau 3 giây nếu không đủ 5 lần
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 3000);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await login({ email, password });
      const nextPath = result.redirectTo?.startsWith('/') ? result.redirectTo : '/dashboard';
      router.push(nextPath);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể đăng nhập lúc này. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-card flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8">
          {/* Logo - Ấn 5 lần để chuyển sang admin login */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div
                onClick={handleLogoClick}
                className="cursor-pointer select-none"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogoClick();
                }}
              >
                <Image src="/edumee-logo-icon.svg" alt="Edumee logo" width={56} height={52} />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold">Chào mừng trở lại!</h1>
            <p className="text-muted-foreground mt-1 text-sm">Đăng nhập để tiếp tục hành trình</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Mật khẩu</label>
                <Link href="/forgot-password" className="text-primary text-xs hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button variant="hero" className="w-full gap-2" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
          </form>

          <div className="text-muted-foreground mt-6 text-center text-sm">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
