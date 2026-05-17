import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/notifications
//
// Query params:
//   ?count=true   → returns { count: number } (unread count only)
//   ?unread=true  → returns only unread items
//   ?limit=N      → max items (default 20)
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);

    // Fast-path: just return the unread badge count
    if (searchParams.get("count") === "true") {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      if (error) {
        return NextResponse.json(
          { error: "Failed to count notifications" },
          { status: 500 },
        );
      }
      return NextResponse.json({ count: count ?? 0 });
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const unreadOnly = searchParams.get("unread") === "true";

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;

    if (error) {
      console.error("Notifications query error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch notifications" },
        { status: 500 },
      );
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------
// PATCH /api/admin/notifications
//
// Body:
//   { markAllRead: true }   → marks every unread notification as read
//   { id: "<uuid>" }        → marks a single notification as read
// ----------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();
    const body = await request.json();

    if (body.markAllRead === true) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) {
        return NextResponse.json(
          { error: "Failed to mark all as read" },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id === "string") {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", body.id);

      if (error) {
        return NextResponse.json(
          { error: "Failed to mark notification as read" },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Provide markAllRead or id" },
      { status: 400 },
    );
  } catch (err) {
    console.error("Notifications PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
