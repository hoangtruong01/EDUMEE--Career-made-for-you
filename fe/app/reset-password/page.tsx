import ResetPassword from '@/views/ResetPassword';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ResetPassword />
    </Suspense>
  );
}
