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
      // isActive / hasSubscription are not in the current schema;
      // returning safe defaults until columns are added.
      isActive: profile ? true : false,
      hasSubscription: false,
      // include full profile for future use
      profile: profile ?? null,
    },
  });
}

// ----------------------------------------------------------------
// PATCH /api/admin/student/[uid]
// Updates student fields. isActive/hasSubscription are not yet
// in the schema — updates to those fields are acknowledged but
// not persisted until the columns exist.
// ----------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { uid } = await params;
  const body = await request.json();

  console.log("[admin/student PATCH] uid:", uid, "body:", body);

  const admin = await createAdminClient();

  // Re-fetch current auth user to return an up-to-date response
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

  // Reflect the requested change in the response (optimistic) even though
  // isActive/hasSubscription have no backing column yet.
  return NextResponse.json({
    student: {
      uid: authUser.id,
      email: authUser.email ?? null,
      creationTime: authUser.created_at ?? null,
      lastSignInTime: authUser.last_sign_in_at ?? null,
      isActive: "isActive" in body ? body.isActive : profile ? true : false,
      hasSubscription: "hasSubscription" in body ? body.hasSubscription : false,
      profile: profile ?? null,
    },
  });
}
