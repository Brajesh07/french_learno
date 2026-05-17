import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/lookup-email?username=...
 *
 * Looks up the email address associated with a given username.
 * This is used to support "login by username" since Supabase Auth
 * natively requires an email address.
 *
 * Uses service role to bypass RLS since the lookup happens
 * before the user is authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const adminClient = await createAdminClient();

    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("email")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("lookup-email error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ email: profile.email });
  } catch (err) {
    console.error("lookup-email unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
