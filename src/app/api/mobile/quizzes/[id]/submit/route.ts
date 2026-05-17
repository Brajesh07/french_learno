import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/supabase/notifications";

/**
 * POST /api/mobile/quizzes/:id/submit
 *
 * Accepts a student's quiz answers, scores them server-side,
 * stores the attempt, and returns the result.
 *
 * Body:
 * {
 *   answers: [{ question_id: string, answer_id: string }]
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify the student is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "answers array is required" },
        { status: 400 },
      );
    }

    // Use admin client for all data reads — auth is already verified above
    const adminSupabase = await createAdminClient();

    // 1. Fetch the quiz with its title and passing score
    const { data: quiz, error: quizError } = await adminSupabase
      .from("quizzes")
      .select("id, title, passing_score")
      .eq("id", id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questionIds = answers.map(
      (a: { question_id: string }) => a.question_id,
    );

    // 2. Fetch question text + ALL answers (text + is_correct) for these questions
    const [{ data: questions }, { data: allAnswers, error: answersError }] =
      await Promise.all([
        adminSupabase
          .from("quiz_questions")
          .select("id, question")
          .in("id", questionIds),
        adminSupabase
          .from("quiz_answers")
          .select("id, question_id, answer, is_correct")
          .in("question_id", questionIds),
      ]);

    if (answersError) {
      console.error("Error fetching answers:", answersError);
      return NextResponse.json(
        { error: "Failed to grade quiz" },
        { status: 500 },
      );
    }

    // 3. Build lookup maps
    const questionTextMap = new Map(
      (questions ?? []).map((q) => [q.id, q.question]),
    );
    const answerTextMap = new Map(
      (allAnswers ?? []).map((a) => [a.id, a.answer]),
    );
    // Map: question_id → the correct answer row
    const correctAnswerByQuestion = new Map(
      (allAnswers ?? [])
        .filter((a) => a.is_correct)
        .map((a) => [a.question_id, a]),
    );

    // 4. Score + build per-question breakdown
    let correctCount = 0;
    const total = answers.length;

    const breakdown = answers.map(
      (studentAnswer: { question_id: string; answer_id: string }) => {
        const correctAnswer = correctAnswerByQuestion.get(
          studentAnswer.question_id,
        );
        const isCorrect = correctAnswer?.id === studentAnswer.answer_id;
        if (isCorrect) correctCount++;
        return {
          questionId: studentAnswer.question_id,
          question: questionTextMap.get(studentAnswer.question_id) ?? "",
          selectedAnswerId: studentAnswer.answer_id,
          selectedAnswer: answerTextMap.get(studentAnswer.answer_id) ?? "",
          correctAnswerId: correctAnswer?.id ?? null,
          correctAnswer: correctAnswer?.answer ?? "",
          isCorrect,
        };
      },
    );

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passed = percentage >= quiz.passing_score;

    // 5. Store the attempt
    const { data: attempt, error: attemptError } = await adminSupabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: id,
        score: percentage,
        passed,
      })
      .select("id")
      .single();

    if (attemptError) {
      console.error("Error saving quiz attempt:", attemptError);
      // Don't fail the request — result is still valid
    }

    // 6. Store per-question answers (requires quiz_attempt_answers table)
    if (attempt?.id) {
      const attemptAnswers = breakdown.map((b) => ({
        attempt_id: attempt.id,
        question_id: b.questionId,
        selected_answer_id: b.selectedAnswerId,
        is_correct: b.isCorrect,
      }));
      const { error: answerInsertError } = await adminSupabase
        .from("quiz_attempt_answers")
        .insert(attemptAnswers);
      if (answerInsertError) {
        // Table may not exist yet — log but don't fail
        console.warn(
          "Could not save per-question answers:",
          answerInsertError.message,
        );
      }
    }

    // Fire-and-forget: notify admins of the quiz completion
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    const studentName = profile?.name || profile?.email || "A student";
    const quizTitle = quiz.title || "a quiz";

    await createNotification({
      type: "quiz_complete",
      title: "Quiz Completed",
      message: `${studentName} scored ${percentage}% on "${quizTitle}" — ${passed ? "Passed ✓" : "Failed ✗"}`,
      userId: user.id,
      metadata: {
        userName: studentName,
        userEmail: profile?.email,
        quizId: id,
        quizTitle,
        score: percentage,
        passed,
      },
    });

    return NextResponse.json({
      score: percentage,
      correct: correctCount,
      total,
      passed,
      breakdown,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 },
    );
  }
}
