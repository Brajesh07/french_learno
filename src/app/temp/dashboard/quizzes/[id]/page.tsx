import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import QuizForm from "./QuizForm";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = await createAdminClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/temp/login");

  // Check subscription (using user client)
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_subscription")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.has_subscription) {
    console.log("Redirecting: user has no subscription");
    redirect("/temp/dashboard");
  }

  // Fetch quiz (using admin client to ensure we see it if published)
  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select("id, title, description, passing_score, course_id")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (quizError || !quiz) {
    console.log("Redirecting: quiz not found or not published", quizError);
    redirect("/temp/dashboard");
  }

  // Fetch questions (using admin client)
  const { data: questions, error: questionsError } = await admin
    .from("quiz_questions")
    .select("id, question, type, points")
    .eq("quiz_id", id)
    .order("created_at", { ascending: true });

  if (questionsError || !questions || questions.length === 0) {
    return (
      <div className="min-h-[100svh] bg-[#F5F5F7] flex items-center justify-center px-5">
        <div className="text-center flex flex-col gap-3">
          <p className="text-[#999999] text-[13px]">
            This quiz has no questions yet.
          </p>
          <Link
            href="/temp/dashboard"
            className="text-[#7C3AED] text-[13px] font-semibold no-underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch answer options (without is_correct) using admin client
  const questionIds = questions.map((q) => q.id);
  const { data: answers } = await admin
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
    <>
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-5">
        <Link
          href={
            quiz.course_id
              ? `/temp/dashboard/courses/${quiz.course_id}`
              : "/temp/dashboard"
          }
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#111111] shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] no-underline"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold text-[#111111] truncate">
          {quiz.title}
        </h1>
      </header>

      {/* ── Hero banner ─────────────────────────────────── */}
      <div className="mx-5 mb-6 rounded-[24px] bg-[#A78BFA] p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(167,139,250,0.35)]">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute right-8 -bottom-4 w-20 h-20 rounded-full bg-white/[0.07]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/25 rounded-[20px] px-3 py-1 mb-3">
            <span className="text-[11px] font-medium text-[#111111]">
              {questions.length} question{questions.length !== 1 ? "s" : ""} ·
              Pass: {quiz.passing_score}%
            </span>
          </div>
          <h2 className="text-[22px] font-black text-[#111111] leading-tight tracking-[-0.5px] mb-1">
            {quiz.title}
          </h2>
          {quiz.description && (
            <p className="text-[13px] text-[#444444]">{quiz.description}</p>
          )}
        </div>
      </div>

      {/* ── Quiz form ───────────────────────────────────── */}
      <div className="px-5">
        <QuizForm quiz={quizData} />
      </div>
    </>
  );
}
