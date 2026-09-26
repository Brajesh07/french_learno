import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/ensure-profile
 *
 * Creates a missing profiles row for an authenticated user (e.g. after
 * signup before profile creation was implemented). Uses user_metadata
 * from auth.users as the source of name/username.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 },
      );
    }

    const accessToken = authHeader.slice(7);
    const { createClient: createSupabaseClient } =
      await import("@supabase/supabase-js");

    const anonClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const admin = await createAdminClient();

    const { data: existing } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ profile: existing, created: false });
    }

    const metadata = user.user_metadata ?? {};
    const name =
      String(metadata.name ?? "").trim() ||
      user.email?.split("@")[0] ||
      "Student";
    const username =
      String(metadata.username ?? "").trim() ||
      `user_${user.id.slice(0, 8)}`;
    const email = user.email ?? "";

    if (!email) {
      return NextResponse.json(
        { error: "User has no email; cannot create profile" },
        { status: 400 },
      );
    }

    const { data: usernameTaken } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    const finalUsername = usernameTaken
      ? `${username}_${user.id.slice(0, 6)}`
      : username;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        name,
        username: finalUsername,
        email,
        role: "student",
      })
      .select("id, role, name, username, email")
      .single();

    if (profileError) {
      console.error("ensure-profile: insert error —", profileError.message);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 },
      );
    }

    return NextResponse.json({ profile, created: true });
  } catch (err) {
    console.error("ensure-profile: unexpected error —", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
