import RouteGuard from '@/components/auth/RouteGuard';
import MentorCallRoom from '@/views/MentorCallRoom';

export default async function MentorCallPage({
  params,
}: {
  params: Promise<{ meetingCode: string }>;
}) {
  const { meetingCode } = await params;

  return (
    <RouteGuard>
      <MentorCallRoom meetingCode={meetingCode} />
    </RouteGuard>
  );
}
