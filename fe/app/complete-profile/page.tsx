import CompleteProfileView from '@/views/CompleteProfile';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hoàn tất thông tin - EDUMEE',
};

export default function CompleteProfilePage() {
  return <CompleteProfileView />;
}
