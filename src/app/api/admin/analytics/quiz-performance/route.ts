import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/analytics/quiz-performance
// Returns avg score and pass rate grouped by course level.
// Join: quiz_attempts → quizzes → courses (to get level)
// ----------------------------------------------------------------

const LEVELS = ["A1", "B1", "B2"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();

    // Fetch all quiz attempts with their quiz's course level
    // Join: quiz_attempts → quizzes → courses
    const { data: attempts, error } = await supabase
      .from("quiz_attempts")
      .select("score, passed, quizzes!inner(course_id, courses!inner(level))");

    if (error) {
      console.error("Quiz performance: fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch quiz performance data" },
        { status: 500 },
      );
    }

    // Group by level and compute avgScore + passRate
    const grouped: Record<
      string,
      { scoreSum: number; total: number; passed: number }
    > = {};

    for (const attempt of attempts ?? []) {
      const quiz = attempt.quizzes as unknown as {
        courses: { level: string } | null;
      } | null;
      const level = quiz?.courses?.level;
      if (!level) continue;

      if (!grouped[level])
        grouped[level] = { scoreSum: 0, total: 0, passed: 0 };
      grouped[level].scoreSum += attempt.score ?? 0;
      grouped[level].total += 1;
      if (attempt.passed) grouped[level].passed += 1;
    }

    const avgScores = LEVELS.map((level) => {
      const g = grouped[level];
      if (!g || g.total === 0) return 0;
      return Math.round((g.scoreSum / g.total) * 10) / 10;
    });

    const passRates = LEVELS.map((level) => {
      const g = grouped[level];
      if (!g || g.total === 0) return 0;
      return Math.round((g.passed / g.total) * 1000) / 10;
    });

    return NextResponse.json({
      levels: [...LEVELS],
      avgScores,
      passRates,
    });
  } catch (err) {
    console.error("Analytics quiz-performance error:", err);
    return NextResponse.json(
      { error: "Failed to fetch quiz performance data" },
      { status: 500 },
    );
  }
}
