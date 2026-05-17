import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/analytics/kpis
// Returns key performance indicators for the analytics dashboard.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();

    // 1. Total students — count from profiles
    const { count: totalStudents, error: studentsError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    if (studentsError) {
      console.error("KPI: students count error:", studentsError);
      return NextResponse.json(
        { error: "Failed to count students" },
        { status: 500 },
      );
    }

    // 2. Active this week — distinct user_ids in quiz_attempts from last 7 days
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: recentAttempts, error: activeError } = await supabase
      .from("quiz_attempts")
      .select("user_id")
      .gte("created_at", sevenDaysAgo);

    if (activeError) {
      console.error("KPI: active this week error:", activeError);
      return NextResponse.json(
        { error: "Failed to count active students" },
        { status: 500 },
      );
    }

    const activeThisWeek = new Set((recentAttempts ?? []).map((a) => a.user_id))
      .size;

    // 3. Avg quiz score + overall pass rate — from all quiz_attempts
    const { data: allAttempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("score, passed");

    if (attemptsError) {
      console.error("KPI: all attempts error:", attemptsError);
      return NextResponse.json(
        { error: "Failed to fetch quiz attempts" },
        { status: 500 },
      );
    }

    const attempts = allAttempts ?? [];
    const avgQuizScore =
      attempts.length > 0
        ? Math.round(
            (attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) /
              attempts.length) *
              10,
          ) / 10
        : 0;

    const overallPassRate =
      attempts.length > 0
        ? Math.round(
            (attempts.filter((a) => a.passed).length / attempts.length) * 1000,
          ) / 10
        : 0;

    return NextResponse.json({
      totalStudents: totalStudents ?? 0,
      activeThisWeek,
      avgQuizScore,
      overallPassRate,
    });
  } catch (err) {
    console.error("Analytics KPIs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch KPIs" },
      { status: 500 },
    );
  }
}
