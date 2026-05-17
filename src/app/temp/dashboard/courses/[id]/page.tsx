import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CompleteButton from "./CompleteButton";

const LEVEL_STYLES: Record<string, string> = {
  A1: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  A2: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
  B1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  B2: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  C1: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  C2: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/temp/login");

  // Check subscription
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_subscription, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.has_subscription) redirect("/temp/dashboard");

  // Fetch course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description, level, content_text")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (courseError || !course) redirect("/temp/dashboard");

  // Check if already completed
  const { data: progress } = await supabase
    .from("user_progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("course_id", id)
    .maybeSingle();

  const isCompleted = progress?.completed ?? false;

  // Fetch quizzes for this course
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, description, passing_score")
    .eq("course_id", id)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/temp/dashboard"
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
            {course.title}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Course header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                LEVEL_STYLES[course.level] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {course.level}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                <svg
                  className="w-3.5 h-3.5"
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
                Completed
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {course.title}
          </h2>
          {course.description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Course content */}
        {course.content_text && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Course Content
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {course.content_text}
            </div>
          </div>
        )}

        {/* Mark complete */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              Finished this course?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Marking it complete notifies your instructor.
            </p>
          </div>
          <CompleteButton courseId={id} initiallyCompleted={isCompleted} />
        </div>

        {/* Quizzes */}
        {quizzes && quizzes.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                Quizzes
              </h3>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {quizzes.map((quiz) => (
                <li key={quiz.id}>
                  <Link
                    href={`/temp/dashboard/quizzes/${quiz.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {quiz.title}
                      </p>
                      {quiz.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {quiz.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Passing score: {quiz.passing_score}%
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
