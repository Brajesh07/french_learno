import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/analytics/activity?range=weekly|monthly
// Returns time-series data for signups and active students.
// ----------------------------------------------------------------

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  return weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const range =
      searchParams.get("range") === "monthly" ? "monthly" : "weekly";

    const now = new Date();
    const bucketCount = range === "weekly" ? 8 : 6;

    // Build ordered bucket keys
    const buckets: { key: string; label: string; start: Date; end: Date }[] =
      [];

    if (range === "weekly") {
      // 8 complete weeks ending today
      const thisWeekStart = startOfWeekMonday(now);
      for (let i = bucketCount - 1; i >= 0; i--) {
        const start = new Date(thisWeekStart);
        start.setUTCDate(start.getUTCDate() - i * 7);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 7);
        buckets.push({
          key: start.toISOString().slice(0, 10),
          label: formatWeekLabel(start),
          start,
          end,
        });
      }
    } else {
      // 6 calendar months ending this month
      for (let i = bucketCount - 1; i >= 0; i--) {
        const start = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
        );
        const end = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1),
        );
        buckets.push({
          key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
          label: formatMonthLabel(start),
          start,
          end,
        });
      }
    }

    const rangeStart = buckets[0].start.toISOString();

    // Fetch student signups in the window — join profiles
    const { data: signupRows, error: signupError } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("role", "student")
      .gte("created_at", rangeStart);

    if (signupError) {
      console.error("Activity: signup rows error:", signupError);
      return NextResponse.json(
        { error: "Failed to fetch signup data" },
        { status: 500 },
      );
    }

    // Fetch quiz_attempts (active students) in the window
    const { data: attemptRows, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("user_id, created_at")
      .gte("created_at", rangeStart);

    if (attemptError) {
      console.error("Activity: attempt rows error:", attemptError);
      return NextResponse.json(
        { error: "Failed to fetch activity data" },
        { status: 500 },
      );
    }

    // Bucket signups
    const signupMap: Record<string, number> = {};
    for (const row of signupRows ?? []) {
      const d = new Date(row.created_at);
      const bucketKey =
        range === "weekly"
          ? startOfWeekMonday(d).toISOString().slice(0, 10)
          : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      signupMap[bucketKey] = (signupMap[bucketKey] ?? 0) + 1;
    }

    // Bucket active (distinct user_id per bucket)
    const activeMap: Record<string, Set<string>> = {};
    for (const row of attemptRows ?? []) {
      const d = new Date(row.created_at);
      const bucketKey =
        range === "weekly"
          ? startOfWeekMonday(d).toISOString().slice(0, 10)
          : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!activeMap[bucketKey]) activeMap[bucketKey] = new Set();
      activeMap[bucketKey].add(row.user_id);
    }

    const labels = buckets.map((b) => b.label);
    const signups = buckets.map((b) => signupMap[b.key] ?? 0);
    const active = buckets.map((b) => activeMap[b.key]?.size ?? 0);

    return NextResponse.json({ labels, signups, active });
  } catch (err) {
    console.error("Analytics activity error:", err);
    return NextResponse.json(
      { error: "Failed to fetch activity data" },
      { status: 500 },
    );
  }
}
