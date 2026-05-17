import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

export default async function TempDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/temp/login");
  }

  // Fetch profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let profile = existingProfile;

  // If no profile yet, create it via admin client
  if (!existingProfile && !fetchError) {
    const meta = user.user_metadata ?? {};
    const admin = await createAdminClient();

    const { data: newProfile } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        name: meta.name ?? "Unknown",
        username: meta.username ?? user.email?.split("@")[0] ?? "user",
        email: user.email ?? "",
        role: "student",
        is_active: true,
        has_subscription: false,
      })
      .select()
      .maybeSingle();

    profile = newProfile;
  }

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const isSubscribed = profile?.has_subscription ?? false;
  const isActive = profile?.is_active ?? true;

  // Use admin client to ensure we see all published content regardless of RLS
  const admin = await createAdminClient();

  // Fetch published courses
  const { data: courses, error: coursesError } = await admin
    .from("courses")
    .select("id, title, description, level, content_text")
    .eq("is_published", true)
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });

  if (coursesError) console.error("Courses fetch error:", coursesError);

  // Fetch published quizzes
  const { data: quizzes, error: quizzesError } = await admin
    .from("quizzes")
    .select("id, title, description, course_id")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (quizzesError) console.error("Quizzes fetch error:", quizzesError);

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm select-none">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                {profile?.name ?? "Student"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile?.email ?? user.email}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
            !
          </p>
        </div>

        {fetchError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            Profile fetch error: {fetchError.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Profile card ─────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Profile
              </h2>
            </div>

            {!profile ? (
              <div className="p-6 text-gray-500 dark:text-gray-400 text-sm">
                No profile found for this user.
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <Row label="Full Name" value={profile.name} />
                <Row label="Username" value={`@${profile.username}`} />
                <Row label="Email" value={profile.email} />
                {profile.phone && <Row label="Phone" value={profile.phone} />}
                {profile.class && <Row label="Class" value={profile.class} />}
                {memberSince && (
                  <Row label="Member since" value={memberSince} />
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Account Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`}
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Subscription card ────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Subscription
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Plan badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Current Plan
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isSubscribed
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Pro
                    </>
                  ) : (
                    "Free"
                  )}
                </span>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5">
                {[
                  { label: "Access to all courses", pro: true },
                  { label: "Unlimited quizzes", pro: true },
                  { label: "Progress tracking", pro: true },
                  { label: "Offline downloads", pro: true },
                  { label: "Priority support", pro: true },
                ].map(({ label, pro }) => {
                  const unlocked = !pro || isSubscribed;
                  return (
                    <li
                      key={label}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      {unlocked ? (
                        <svg
                          className="w-4 h-4 text-green-500 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      )}
                      <span
                        className={
                          unlocked
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-400 dark:text-gray-600"
                        }
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* CTA for free users */}
              {!isSubscribed && (
                <div className="mt-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Upgrade to Pro to unlock all features
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Courses section ───────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Courses
              </h2>
            </div>
            {courses && courses.length > 0 && (
              <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                {courses.length} available
              </span>
            )}
          </div>

          {isSubscribed ? (
            /* ── Unlocked: show course grid ── */
            !courses || courses.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No courses published yet. Check back soon!
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )
          ) : (
            /* ── Locked: upgrade prompt ── */
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {courses && courses.length > 0
                    ? `${courses.length} course${courses.length > 1 ? "s" : ""} waiting for you`
                    : "Courses coming soon"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Subscribe to get full access to all published courses.
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Contact your administrator to upgrade your plan
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Quizzes section ────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">
                Practice Quizzes
              </h2>
            </div>
            {quizzes && quizzes.length > 0 && (
              <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                {quizzes.length} available
              </span>
            )}
          </div>

          {isSubscribed ? (
            /* ── Unlocked: show quiz grid ── */
            !quizzes || quizzes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No quizzes available yet. Check back soon!
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {quizzes.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            )
          ) : (
            /* ── Locked: upgrade prompt ── */
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {quizzes && quizzes.length > 0
                    ? `${quizzes.length} quiz${quizzes.length > 1 ? "zes" : ""} waiting for you`
                    : "Quizzes coming soon"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Subscribe to unlock all practice quizzes.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Quiz card used in the subscribed quizzes grid
function QuizCard({
  quiz,
}: {
  quiz: {
    id: string;
    title: string;
    description?: string | null;
  };
}) {
  return (
    <Link
      href={`/temp/dashboard/quizzes/${quiz.id}`}
      className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
          {quiz.title}
        </h3>
        <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-wider">
          Quiz
        </span>
      </div>
      {quiz.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {quiz.description}
        </p>
      )}
      <div className="mt-auto pt-1">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Take Quiz →
          </span>
          </div>
          </Link>
          );
          }

// Course card used in the subscribed courses grid
const LEVEL_STYLES: Record<string, string> = {
  A1: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  B1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  B2: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function CourseCard({
  course,
}: {
  course: {
    id: string;
    title: string;
    description?: string | null;
    level: string;
    content_text?: string | null;
  };
}) {
  const preview = course.description || course.content_text || null;
  return (
    <Link
      href={`/temp/dashboard/courses/${course.id}`}
      className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
          {course.title}
        </h3>
        <span
          className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-md ${
            LEVEL_STYLES[course.level] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {course.level}
        </span>
      </div>
      {preview && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {preview}
        </p>
      )}
      <div className="mt-auto pt-1">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Start learning →
        </span>
      </div>
    </Link>
  );
}

// Small helper to render a label/value row
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  );
}
