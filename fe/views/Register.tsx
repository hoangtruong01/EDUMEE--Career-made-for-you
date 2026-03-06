'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const getPasswordStrength = (pw: string) => {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Yếu', color: 'bg-destructive' };
  if (score === 2) return { level: 2, label: 'Trung bình', color: 'bg-gold' };
  if (score === 3) return { level: 3, label: 'Khá', color: 'bg-mint' };
  return { level: 4, label: 'Mạnh', color: 'bg-primary' };
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/onboarding');
    }, 1000);
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
              <Sparkles className="text-primary-foreground h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold">Tạo tài khoản mới</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Bắt đầu hành trình khám phá nghề nghiệp
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Họ và tên</label>
              <div className="relative">
                <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

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
              <label className="text-sm font-medium">Mật khẩu</label>
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
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs ${strength.level <= 1 ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    Độ mạnh: {strength.label}
                  </p>
                </div>
              )}
            </div>

            <Button variant="hero" className="w-full gap-2" disabled={loading}>
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="text-muted-foreground mt-6 text-center text-sm">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
