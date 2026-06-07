import { Redirect } from 'expo-router';

export default function MentorDashboardRedirect() {
  return <Redirect href={'/(mentor-tabs)' as any} />;
}
