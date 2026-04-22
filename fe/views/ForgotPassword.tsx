'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể gửi yêu cầu lúc này. Vui lòng thử lại.');
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
          <div className="mb-8 text-center">
            <div className="bg-gradient-hero mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              {sent ? (
                <CheckCircle2 className="text-primary-foreground h-7 w-7" />
              ) : (
                <Sparkles className="text-primary-foreground h-7 w-7" />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold">
              {sent ? 'Kiểm tra email!' : 'Quên mật khẩu?'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {sent
                ? `Chúng tôi đã gửi link đặt lại mật khẩu đến ${email}`
                : 'Nhập email để nhận link đặt lại mật khẩu'}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button variant="hero" className="w-full" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
              </Button>

              {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
            </form>
          ) : (
            <Button variant="hero" className="w-full" onClick={() => setSent(false)}>
              Gửi lại email
            </Button>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="h-3 w-3" /> Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
