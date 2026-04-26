import { Suspense } from 'react';
import CareerAnalysisDetail from '@/views/CareerAnalysisDetail';

export const metadata = {
  title: 'Phân tích chi tiết nghề nghiệp | EDUMEE',
  description: 'Phân tích AI chi tiết về ưu nhược điểm và xu hướng ngành trong 5 năm tới.',
};

export default function CareerAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <CareerAnalysisDetail />
    </Suspense>
  );
}
