import RouteGuard from '@/components/auth/RouteGuard';
import PersonalityTest from '@/views/PersonalityTest';

export default function PersonalityTestPage() {
  return (
    <RouteGuard>
      <PersonalityTest />
    </RouteGuard>
  );
}
