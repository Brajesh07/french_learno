import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ uid: string }>;
}

// ----------------------------------------------------------------
// GET /api/admin/student/[uid]
// Returns auth metadata + profile for a single student.
// ----------------------------------------------------------------
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { uid } = await params;
  const admin = await createAdminClient();

  // Fetch auth user (gives us creationTime, lastSignInTime, email)
  const {
    data: { user: authUser },
    error: authError,
  } = await admin.auth.admin.getUserById(uid);

  console.log("[admin/student GET] authUser:", authUser, "error:", authError);

  if (authError || !authUser) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Fetch profile
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  console.log("[admin/student GET] profile:", profile, "error:", profileError);

  return NextResponse.json({
    student: {
      uid: authUser.id,
      email: authUser.email ?? null,
      creationTime: authUser.created_at ?? null,
      lastSignInTime: authUser.last_sign_in_at ?? null,
      isActive: profile?.is_active ?? true,
      hasSubscription: profile?.has_subscription ?? false,
      // include full profile for future use
      profile: profile ?? null,
    },
  });
}

// ----------------------------------------------------------------
// PATCH /api/admin/student/[uid]
// Updates isActive and/or hasSubscription on the student's profile.
// ----------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { uid } = await params;
  const body = await request.json();

  console.log("[admin/student PATCH] uid:", uid, "body:", body);

  const admin = await createAdminClient();

  // Build the update payload from whitelisted fields only
  const updateData: Record<string, boolean> = {};
  if ("isActive" in body) updateData.is_active = body.isActive;
  if ("hasSubscription" in body)
    updateData.has_subscription = body.hasSubscription;

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", uid);

    if (updateError) {
      console.error("[admin/student PATCH] update error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update student" },
        { status: 500 },
      );
    }
  }

  // Re-fetch the updated record to return a consistent response
  const {
    data: { user: authUser },
    error: authError,
  } = await admin.auth.admin.getUserById(uid);

  if (authError || !authUser) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  return NextResponse.json({
    student: {
      uid: authUser.id,
      email: authUser.email ?? null,
      creationTime: authUser.created_at ?? null,
      lastSignInTime: authUser.last_sign_in_at ?? null,
      isActive: profile?.is_active ?? true,
      hasSubscription: profile?.has_subscription ?? false,
      profile: profile ?? null,
    },
  });
}
