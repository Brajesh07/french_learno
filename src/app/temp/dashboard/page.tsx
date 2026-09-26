import { requireStudentPage } from "@/lib/supabase/page-auth";
import { createClient } from "@/lib/supabase/server";
import { loadLearningProgress } from "@/lib/learning/progress-server";
import { StudentLearningApp } from "@/components/learning/StudentLearningApp";

export default async function TempDashboardPage() {
  const { user, profile } = await requireStudentPage({ includeName: true });
  const supabase = await createClient();

  // A failed read must never be mistaken for a new account and overwritten.
  const progress = await loadLearningProgress(supabase, user.id)
    .then((initialProgress) => ({ initialProgress, initialError: null }))
    .catch(() => ({
      initialProgress: null,
      initialError:
        "Your learning progress could not be loaded. Please try again.",
    }));

  const { data: account, error: accountError } = await supabase
    .from("profiles")
    .select("email, has_subscription, is_active, class")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <StudentLearningApp
      key={user.id}
      userId={user.id}
      learnerName={profile.name ?? "Student"}
      account={
        account && !accountError
          ? {
              email: account.email,
              hasSubscription: account.has_subscription,
              active: account.is_active,
              frenchLevel:
                account.class
                  ?.match(/^(A1|A2|B1|B2|C1|C2)\b/i)?.[1]
                  .toUpperCase() ?? null,
            }
          : null
      }
      {...progress}
    />
  );
}
