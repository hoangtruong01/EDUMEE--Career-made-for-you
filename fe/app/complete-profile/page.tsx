import RouteGuard from '@/components/auth/RouteGuard';
import CompleteProfileView from '@/views/CompleteProfile';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hoàn tất thông tin - EDUMEE',
};

export default function CompleteProfilePage() {
  return (
    <RouteGuard>
      <CompleteProfileView />
    </RouteGuard>
  );
}
