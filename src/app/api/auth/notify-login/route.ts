import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/supabase/notifications";

/**
 * POST /api/auth/notify-login
 *
 * Called by the student-facing login page immediately after a successful
 * signInWithPassword(). Requires a valid session (cookie) — no request body.
 * Creates a 'login' notification visible to admins.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  // Skip only confirmed admins; emit for students and users without a profile yet
  if (profile?.role !== "admin") {
    const name = profile?.name || profile?.email || user.email || "Unknown";
    const email = profile?.email || user.email || "";
    await createNotification({
      type: "login",
      title: "Student Login",
      message: `${name} just logged in`,
      userId: user.id,
      metadata: { userName: name, userEmail: email },
    });
  }

  return NextResponse.json({ ok: true });
}
