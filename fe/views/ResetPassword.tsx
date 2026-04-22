'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type TokenStatus = 'checking' | 'valid' | 'invalid';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('checking');
  const [tokenMessage, setTokenMessage] = useState('Đang xác thực token...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, verifyForgotPasswordToken } = useAuth();
  const token =
    searchParams.get('forgot_password_token') ||
    searchParams.get('token') ||
    searchParams.get('forgotPasswordToken') ||
    '';

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        setTokenMessage('Link đặt lại mật khẩu không hợp lệ hoặc thiếu token.');
        return;
      }

      setTokenStatus('checking');
      setTokenMessage('Đang xác thực token...');

      try {
        await verifyForgotPasswordToken(token);
        setTokenStatus('valid');
        setTokenMessage('Token hợp lệ. Bạn có thể đặt mật khẩu mới.');
      } catch (error) {
        if (error instanceof ApiError) {
          setTokenMessage(error.message);
        } else {
          setTokenMessage('Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.');
        }
        setTokenStatus('invalid');
      }
    };

    void verifyToken();
  }, [token, verifyForgotPasswordToken]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (tokenStatus !== 'valid') {
      setErrorMessage('Token chưa hợp lệ. Vui lòng yêu cầu lại link đặt mật khẩu.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Mật khẩu cần tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirm) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      router.push('/login');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.');
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
              <CheckCircle2 className="text-primary-foreground h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold">Đặt mật khẩu mới</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Tạo mật khẩu mới cho tài khoản của bạn
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                tokenStatus === 'invalid'
                  ? 'border-destructive/50 text-destructive'
                  : tokenStatus === 'valid'
                    ? 'border-green-500/40 text-green-700'
                    : 'border-border text-muted-foreground'
              }`}
            >
              {tokenMessage}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ít nhất 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10"
                  minLength={8}
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10"
                  minLength={8}
                  required
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-destructive text-xs">Mật khẩu không khớp</p>
              )}
            </div>

            <Button
              variant="hero"
              className="w-full"
              disabled={loading || password !== confirm || tokenStatus !== 'valid'}
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </Button>

            {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}

            {tokenStatus === 'invalid' && (
              <div className="text-center">
                <Link href="/forgot-password" className="text-primary text-sm hover:underline">
                  Yêu cầu link đặt lại mật khẩu mới
                </Link>
              </div>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
