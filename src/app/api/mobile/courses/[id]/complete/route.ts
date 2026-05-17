import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/supabase/notifications";

/**
 * POST /api/mobile/courses/:id/complete
 *
 * Marks a course as completed for the authenticated student and
 * fires an admin notification. Idempotent — safe to call multiple times.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: courseId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the course exists and is published
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("id", courseId)
      .eq("is_published", true)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check for an existing progress row, then update or insert.
    // Use adminClient to bypass RLS (user is already verified above).
    const adminClient = await createAdminClient();

    const { data: existing } = await adminClient
      .from("user_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    const completedAt = new Date().toISOString();
    let progressError;

    if (existing) {
      ({ error: progressError } = await adminClient
        .from("user_progress")
        .update({ completed: true, completed_at: completedAt })
        .eq("id", existing.id));
    } else {
      ({ error: progressError } = await adminClient
        .from("user_progress")
        .insert({
          user_id: user.id,
          course_id: courseId,
          completed: true,
          completed_at: completedAt,
        }));
    }

    if (progressError) {
      console.error("Error saving progress:", progressError);
      return NextResponse.json(
        { error: progressError.message || "Failed to save progress" },
        { status: 500 },
      );
    }

    // Notify admins
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    const studentName = profile?.name || profile?.email || "A student";

    await createNotification({
      type: "course_complete",
      title: "Course Completed",
      message: `${studentName} completed "${course.title}"`,
      userId: user.id,
      metadata: {
        userName: studentName,
        userEmail: profile?.email,
        courseId,
        courseTitle: course.title,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Course complete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
