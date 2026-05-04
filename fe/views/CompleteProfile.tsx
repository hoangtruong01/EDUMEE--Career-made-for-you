'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { profileService } from '@/lib/profile.service';
import { userService } from '@/lib/user.service';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Phone, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompleteProfileView() {
  const { accessToken, onboardingCompleted, isAuthenticated, isHydrated } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    dob?: string;
    educationLevel?: string;
  }>({});
  const [serverOnboardingCompleted, setServerOnboardingCompleted] = useState(onboardingCompleted);
  const router = useRouter();

  const toDateInputValue = (value?: string) => {
    if (!value) return '';
    if (value.includes('T')) {
      return value.split('T')[0] || '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0] || '';
  };

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (accessToken) {
      const loadProfile = async () => {
        setIsPrefilling(true);
        setError('');

        try {
          const user = await userService.getMe(accessToken);
          let profile = null;

          try {
            profile = await profileService.getMyProfile(accessToken);
          } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) {
              profile = null;
            } else {
              throw err;
            }
          }

          setName(user?.name || '');
          setPhone(user?.phone_number || '');
          setDob(toDateInputValue(user?.date_of_birth));
          setEducationLevel(profile?.educationLevel || '');
          if (typeof user?.onboarding_completed === 'boolean') {
            setServerOnboardingCompleted(user.onboarding_completed);
          }
        } catch (err: unknown) {
          const errorMessage =
            (err as { message?: string })?.message || 'Không thể tải thông tin hồ sơ';
          setError(errorMessage);
        } finally {
          setIsPrefilling(false);
        }
      };

      void loadProfile();
    } else {
      setIsPrefilling(false);
    }
  }, [accessToken, isAuthenticated, isHydrated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      if (!accessToken) {
        throw new Error('Bạn cần đăng nhập để tiếp tục');
      }

      await Promise.all([
        userService.updateMe(accessToken, {
          name,
          phone_number: phone,
          date_of_birth: dob,
        }),
        profileService.updateMyProfile(accessToken, {
          educationLevel,
        }),
      ]);

      if (!serverOnboardingCompleted) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message || 'Có lỗi xảy ra khi cập nhật thông tin';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitting = isLoading || isPrefilling;
  const inputBaseClass =
    'block w-full rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:bg-white focus:ring-2';
  const inputNormalClass = 'border-slate-200 focus:border-primary focus:ring-primary/10';
  const inputErrorClass = 'border-rose-300 focus:border-rose-400 focus:ring-rose-200/60';

  const validateForm = () => {
    const nextErrors: typeof fieldErrors = {};
    const trimmedName = name.trim();
    const digitsOnly = phone.replace(/\D/g, '');
    const dobDate = dob ? new Date(dob) : null;

    if (!trimmedName) {
      nextErrors.name = 'Vui lòng nhập họ và tên.';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Họ và tên cần ít nhất 2 ký tự.';
    }

    if (!digitsOnly) {
      nextErrors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      nextErrors.phone = 'Số điện thoại chưa đúng định dạng.';
    }

    if (!dob || !dobDate || Number.isNaN(dobDate.getTime())) {
      nextErrors.dob = 'Vui lòng chọn ngày sinh.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate > today) {
        nextErrors.dob = 'Ngày sinh không hợp lệ.';
      }
    }

    if (!educationLevel) {
      nextErrors.educationLevel = 'Vui lòng chọn trình độ học vấn.';
    }

    setFieldErrors(nextErrors);
    setError(Object.values(nextErrors)[0] || '');
    return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Chào mừng bạn!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Vui lòng hoàn tất một số thông tin cơ bản để bắt đầu trải nghiệm EDUMEE.
          </p>
          {isPrefilling && (
            <p className="mt-2 text-xs font-medium text-slate-400">Đang tải thông tin hồ sơ...</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6" aria-busy={isSubmitting}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Họ và tên
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                    if (error) {
                      setError('');
                    }
                  }}
                  disabled={isPrefilling}
                  className={`${inputBaseClass} pr-3 pl-10 ${
                    fieldErrors.name ? inputErrorClass : inputNormalClass
                  }`}
                  placeholder="Nguyễn Văn A"
                  aria-invalid={!!fieldErrors.name}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Số điện thoại
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                    if (error) {
                      setError('');
                    }
                  }}
                  disabled={isPrefilling}
                  className={`${inputBaseClass} pr-3 pl-10 ${
                    fieldErrors.phone ? inputErrorClass : inputNormalClass
                  }`}
                  placeholder="0912 345 678"
                  aria-invalid={!!fieldErrors.phone}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700">
                Ngày sinh
              </label>
              <input
                id="dob"
                type="date"
                required
                autoComplete="bday"
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (fieldErrors.dob) {
                    setFieldErrors((prev) => ({ ...prev, dob: undefined }));
                  }
                  if (error) {
                    setError('');
                  }
                }}
                disabled={isPrefilling}
                className={`${inputBaseClass} ${
                  fieldErrors.dob ? inputErrorClass : inputNormalClass
                }`}
                aria-invalid={!!fieldErrors.dob}
              />
              {fieldErrors.dob && (
                <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors.dob}</p>
              )}
            </div>

            <div>
              <label htmlFor="educationLevel" className="block text-sm font-medium text-slate-700">
                Trình độ học vấn
              </label>
              <select
                id="educationLevel"
                required
                value={educationLevel}
                onChange={(e) => {
                  setEducationLevel(e.target.value);
                  if (fieldErrors.educationLevel) {
                    setFieldErrors((prev) => ({ ...prev, educationLevel: undefined }));
                  }
                  if (error) {
                    setError('');
                  }
                }}
                disabled={isPrefilling}
                className={`${inputBaseClass} ${
                  fieldErrors.educationLevel ? inputErrorClass : inputNormalClass
                }`}
                aria-invalid={!!fieldErrors.educationLevel}
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
              {fieldErrors.educationLevel && (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {fieldErrors.educationLevel}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Bạn có thể cập nhật lại thông tin này trong trang Hồ sơ sau.
              </p>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm font-medium text-rose-500"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="hero"
            className="w-full py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Tiếp tục khám phá <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
