'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { adminLogin } = useAuth();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await adminLogin({ email, password });
      const nextPath = result.redirectTo?.startsWith('/') ? result.redirectTo : '/admin/dashboard';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Animated background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, hsl(220 25% 8%), hsl(240 20% 12%), hsl(260 25% 10%))'
      }} />

      {/* Floating orbs */}
      <div className="floating-blob absolute top-1/4 -left-20 h-64 w-64" style={{
        background: 'hsl(205 90% 55%)', opacity: 0.08
      }} />
      <div className="floating-blob absolute -right-20 bottom-1/4 h-80 w-80" style={{
        background: 'hsl(260 60% 65%)', opacity: 0.06
      }} />
      <div className="floating-blob absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2" style={{
        background: 'hsl(25 95% 60%)', opacity: 0.05
      }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'hsl(210 15% 50%)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>
        </motion.div>

        {/* Main card */}
        <div className="relative overflow-hidden rounded-2xl border" style={{
          background: 'hsl(220 20% 12% / 0.9)',
          backdropFilter: 'blur(24px)',
          borderColor: 'hsl(220 15% 20% / 0.6)',
          boxShadow: '0 25px 60px -12px hsl(0 0% 0% / 0.5), 0 0 0 1px hsl(220 15% 18% / 0.5), inset 0 1px 0 0 hsl(0 0% 100% / 0.03)'
        }}>
          {/* Top accent line */}
          <div className="h-1 w-full" style={{
            background: 'linear-gradient(90deg, hsl(205 90% 55%), hsl(260 60% 65%), hsl(25 95% 60%))'
          }} />

          <div className="p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="mb-5 flex justify-center"
              >
                <div className="relative">
                  {/* Glow ring */}
                  <div className="absolute -inset-3 rounded-full opacity-20 blur-md" style={{
                    background: 'linear-gradient(135deg, hsl(205 90% 55%), hsl(260 60% 65%))'
                  }} />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full" style={{
                    background: 'linear-gradient(135deg, hsl(220 20% 16%), hsl(220 20% 14%))',
                    border: '1px solid hsl(220 15% 22%)',
                    boxShadow: '0 8px 32px -4px hsl(0 0% 0% / 0.4)'
                  }}>
                    <Image src="/edumee-logo-icon.svg" alt="Edumee logo" width={36} height={34} />
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <ShieldCheck className="h-5 w-5" style={{ color: 'hsl(205 90% 60%)' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(205 90% 60%)' }}>
                      Quản trị viên
                    </span>
                  </div>
                  <h1 className="font-display text-2xl font-bold" style={{ color: 'hsl(210 30% 95%)' }}>
                    Đăng nhập Admin
                  </h1>
                  <p className="mt-1.5 text-sm" style={{ color: 'hsl(210 15% 50%)' }}>
                    Khu vực dành riêng cho quản trị viên hệ thống
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Form */}
            <motion.form
              onSubmit={handleAdminLogin}
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'hsl(210 20% 70%)' }}>
                  Email quản trị
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" style={{ color: 'hsl(210 15% 40%)' }} />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@edumee.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border pl-10 transition-all focus:ring-2"
                    style={{
                      background: 'hsl(220 20% 10%)',
                      borderColor: 'hsl(220 15% 20%)',
                      color: 'hsl(210 30% 95%)',
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'hsl(210 20% 70%)' }}>
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" style={{ color: 'hsl(210 15% 40%)' }} />
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border pr-10 pl-10 transition-all focus:ring-2"
                    style={{
                      background: 'hsl(220 20% 10%)',
                      borderColor: 'hsl(220 15% 20%)',
                      color: 'hsl(210 30% 95%)',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    style={{ color: 'hsl(210 15% 40%)' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                id="admin-login-button"
                type="submit"
                className="shimmer-btn w-full gap-2 border-0 font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, hsl(205 90% 50%), hsl(260 60% 55%))',
                  boxShadow: '0 4px 20px -4px hsl(205 90% 55% / 0.4)',
                }}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xác thực...
                  </span>
                ) : (
                  <>
                    Đăng nhập quản trị
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg p-3 text-sm"
                  style={{
                    background: 'hsl(0 62% 30% / 0.15)',
                    border: '1px solid hsl(0 62% 30% / 0.3)',
                    color: 'hsl(0 84% 70%)',
                  }}
                >
                  <span>⚠️</span>
                  {errorMessage}
                </motion.div>
              )}
            </motion.form>
          </div>

          {/* Footer */}
          <div className="border-t px-8 py-4" style={{
            borderColor: 'hsl(220 15% 18%)',
            background: 'hsl(220 20% 10% / 0.5)'
          }}>
            <p className="text-center text-xs" style={{ color: 'hsl(210 15% 40%)' }}>
              🔒 Khu vực bảo mật — Chỉ quản trị viên được phép truy cập
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
