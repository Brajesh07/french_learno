import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/analytics/subscriptions
// Returns free vs paid split and conversion rate.
// Paid status is tracked via profiles.has_subscription (boolean),
// set manually by the admin on each student's profile.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();

    // Total student count
    const { count: totalStudents, error: totalError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    if (totalError) {
      console.error("Subscriptions: total count error:", totalError);
      return NextResponse.json(
        { error: "Failed to count students" },
        { status: 500 },
      );
    }

    // Paid students — profiles WHERE role = 'student' AND has_subscription = true
    const { count: paidStudents, error: paidError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .eq("has_subscription", true);

    if (paidError) {
      console.error("Subscriptions: paid count error:", paidError);
      return NextResponse.json(
        { error: "Failed to count paid students" },
        { status: 500 },
      );
    }

    const total = totalStudents ?? 0;
    const paid = paidStudents ?? 0;
    const free = Math.max(0, total - paid);
    const conversionRate =
      total > 0 ? Math.round((paid / total) * 1000) / 10 : 0;

    return NextResponse.json({ free, paid, conversionRate });
  } catch (err) {
    console.error("Analytics subscriptions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscription data" },
      { status: 500 },
    );
  }
}
