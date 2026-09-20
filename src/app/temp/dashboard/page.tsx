import { requireStudentPage } from '@/lib/supabase/page-auth';
import { createClient } from '@/lib/supabase/server';
import { loadLearningProgress } from '@/lib/learning/progress-server';
import { StudentLearningApp } from '@/components/learning/StudentLearningApp';

export default async function TempDashboardPage() {
  const { user, profile } = await requireStudentPage({ includeName: true });
  const supabase = await createClient();

  // A failed read must never be mistaken for a new account and overwritten.
  const progress = await loadLearningProgress(supabase, user.id)
    .then(initialProgress => ({ initialProgress, initialError: null }))
    .catch(() => ({
      initialProgress: null,
      initialError: 'Your learning progress could not be loaded. Please try again.',
    }));

  return (
    <StudentLearningApp
      key={user.id}
      userId={user.id}
      learnerName={profile.name ?? 'Student'}
      {...progress}
    />
  );
}
