import CommunityDetail from '@/views/CommunityDetail';
import { Suspense } from 'react';

export default function CommunityDetailPage() {
  return (
    <Suspense fallback={null}>
      <CommunityDetail />
    </Suspense>
  );
}
