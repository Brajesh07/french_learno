import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/signup
 *
 * Creates an auth user and matching profiles row for student signup.
 * Uses the service role so profile insert is not blocked by RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: "Name, username, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const admin = await createAdminClient();

    const { data: existingUsername } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 },
      );
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, username },
      });

    if (authError) {
      const message = authError.message.toLowerCase();
      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        return NextResponse.json(
          { error: "User already registered. Please sign in instead." },
          { status: 422 },
        );
      }

      console.error("signup route: auth error —", authError.message);
      return NextResponse.json(
        { error: authError.message || "Failed to create account" },
        { status: 400 },
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Account created but user id was missing" },
        { status: 500 },
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      name,
      username,
      email,
      role: "student",
    });

    if (profileError) {
      console.error("signup route: profile insert error —", profileError.message);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create profile. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("signup route: unexpected error —", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
