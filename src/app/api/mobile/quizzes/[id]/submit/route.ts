import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // 1. Fetch the quiz with its title and passing score
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, passing_score")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 2. Fetch all correct answers for this quiz
    const { data: correctAnswers, error: answersError } = await supabase
      .from("quiz_answers")
      .select("id, question_id, is_correct")
      .in(
        "question_id",
        answers.map((a: { question_id: string }) => a.question_id),
      )
      .eq("is_correct", true);

    if (answersError) {
      console.error("Error fetching correct answers:", answersError);
      return NextResponse.json(
        { error: "Failed to grade quiz" },
        { status: 500 },
      );
    }

    // 3. Calculate score
    const correctAnswerMap = new Map(
      (correctAnswers ?? []).map((a) => [a.question_id, a.id]),
    );

    let correctCount = 0;
    const total = answers.length;

    for (const studentAnswer of answers) {
      const correctAnswerId = correctAnswerMap.get(studentAnswer.question_id);
      if (correctAnswerId && studentAnswer.answer_id === correctAnswerId) {
        correctCount++;
      }
    }

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passed = percentage >= quiz.passing_score;

    // 4. Store the attempt
    const { error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: id,
        score: percentage,
        passed,
      });

    if (attemptError) {
      console.error("Error saving quiz attempt:", attemptError);
      // Don't fail the request — result is still valid
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
      score: correctCount,
      total,
      percentage,
      passed,
      passing_score: quiz.passing_score,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 },
    );
  }
}
