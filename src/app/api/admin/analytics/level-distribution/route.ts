import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/analytics/level-distribution
// Returns passed/failed quiz attempt counts grouped by course level.
// Join: quiz_attempts → quizzes → courses (to get level)
// ----------------------------------------------------------------

const LEVELS = ["A1", "B1", "B2"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();

    // Fetch all quiz attempts with their course level
    // Join: quiz_attempts → quizzes → courses
    const { data: attempts, error } = await supabase
      .from("quiz_attempts")
      .select("passed, quizzes!inner(course_id, courses!inner(level))");

    if (error) {
      console.error("Level distribution: fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch level distribution data" },
        { status: 500 },
      );
    }

    // Group by level
    const grouped: Record<string, { passed: number; failed: number }> = {};

    for (const attempt of attempts ?? []) {
      const quiz = attempt.quizzes as unknown as {
        courses: { level: string } | null;
      } | null;
      const level = quiz?.courses?.level;
      if (!level) continue;

      if (!grouped[level]) grouped[level] = { passed: 0, failed: 0 };
      if (attempt.passed) {
        grouped[level].passed += 1;
      } else {
        grouped[level].failed += 1;
      }
    }

    const passed = LEVELS.map((level) => grouped[level]?.passed ?? 0);
    const failed = LEVELS.map((level) => grouped[level]?.failed ?? 0);

    return NextResponse.json({
      levels: [...LEVELS],
      passed,
      failed,
    });
  } catch (err) {
    console.error("Analytics level-distribution error:", err);
    return NextResponse.json(
      { error: "Failed to fetch level distribution data" },
      { status: 500 },
    );
  }
}
