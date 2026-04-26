import { Suspense } from 'react';
import LearningRoadmap from '@/views/LearningRoadmap';

export default function LearningRoadmapPage() {
  return (
    <Suspense fallback={null}>
      <LearningRoadmap />
    </Suspense>
  );
}
