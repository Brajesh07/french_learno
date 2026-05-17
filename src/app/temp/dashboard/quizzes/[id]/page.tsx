import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuizForm from "./QuizForm";

export default async function QuizPage({
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
    .select("has_subscription")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.has_subscription) redirect("/temp/dashboard");

  // Fetch quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, title, description, passing_score, course_id")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (quizError || !quiz) redirect("/temp/dashboard");

  // Fetch questions
  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("id, question, type, points")
    .eq("quiz_id", id)
    .order("created_at", { ascending: true });

  if (questionsError || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center space-y-3">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            This quiz has no questions yet.
          </p>
          <Link
            href="/temp/dashboard"
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch answer options (without is_correct)
  const questionIds = questions.map((q) => q.id);
  const { data: answers } = await supabase
    .from("quiz_answers")
    .select("id, question_id, answer")
    .in("question_id", questionIds);

  const answersByQuestion: Record<string, { id: string; answer: string }[]> =
    {};
  for (const a of answers ?? []) {
    if (!answersByQuestion[a.question_id]) {
      answersByQuestion[a.question_id] = [];
    }
    answersByQuestion[a.question_id].push({ id: a.id, answer: a.answer });
  }

  const questionsWithAnswers = questions.map((q) => ({
    ...q,
    answers: answersByQuestion[q.id] ?? [],
  }));

  const quizData = { ...quiz, questions: questionsWithAnswers };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href={
              quiz.course_id
                ? `/temp/dashboard/courses/${quiz.course_id}`
                : "/temp/dashboard"
            }
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
            {quiz.title}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Quiz header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {quiz.title}
          </h2>
          {quiz.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {quiz.description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {questions.length} question{questions.length !== 1 ? "s" : ""} ·
            Passing score: {quiz.passing_score}%
          </p>
        </div>

        <QuizForm quiz={quizData} />
      </main>
    </div>
  );
}
