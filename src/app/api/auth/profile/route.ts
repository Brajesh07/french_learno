import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/profile
 *
 * Fetches the profile row for the currently authenticated user.
 * Uses the service role key (bypasses RLS) so the query always
 * succeeds regardless of RLS policy timing issues on the client.
 *
 * Requires: Authorization: Bearer <access_token> header.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 },
      );
    }

    const accessToken = authHeader.slice(7);

    // Verify the token and extract the user ID using the anon client.
    // createServerClient respects the token without needing cookies here.
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
      console.error("profile route: invalid token —", userError?.message);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    console.log("profile route: fetching profile for user.id =", user.id);

    // Use service role client — bypasses RLS completely.
    const adminClient = await createAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, name, username, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "profile route: DB error —",
        profileError.message,
        profileError.code,
      );
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 },
      );
    }

    if (!profile) {
      console.warn(
        "profile route: no profile row found for user.id =",
        user.id,
      );
      return NextResponse.json(
        { error: "Profile not found", userId: user.id },
        { status: 404 },
      );
    }

    console.log("profile route: profile found —", {
      id: profile.id,
      role: profile.role,
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("profile route: unexpected error —", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
