import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Transform a raw snake_case DB course row into the camelCase shape the frontend expects. */
function transformCourse(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    level: row.level,
    content: {
      text: row.content_text ?? "",
      audioUrl: row.content_audio_url ?? undefined,
      imageUrl: row.content_image_url ?? undefined,
      videoUrl: row.content_video_url ?? undefined,
    },
    isPublished: row.is_published ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Transform a raw snake_case DB quiz row into the camelCase shape the frontend expects. */
function transformQuiz(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    courseId: row.course_id,
    passingScore: row.passing_score ?? 70,
    isPublished: row.is_published ?? false,
    questions: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------
// GET /api/admin/courses/:id
// Returns a single course with its linked quizzes.
// ----------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("course_id", id)
      .order("created_at", { ascending: true });

    if (quizzesError) {
      console.error("Error fetching quizzes for course:", quizzesError);
    }

    return NextResponse.json({
      course: transformCourse(course),
      quizzes: (quizzes ?? []).map(transformQuiz),
    });
  } catch (error) {
    console.error("Course GET [id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------
// PATCH /api/admin/courses/:id
// Partially updates a course.
// ----------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Accept the camelCase / nested format sent by the frontend
    const { title, description, level, content, isPublished } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (level !== undefined) updateData.level = level;
    if (isPublished !== undefined) updateData.is_published = isPublished;
    if (content !== undefined) {
      if (content.text !== undefined) updateData.content_text = content.text;
      if (content.audioUrl !== undefined)
        updateData.content_audio_url = content.audioUrl;
      if (content.imageUrl !== undefined)
        updateData.content_image_url = content.imageUrl;
      if (content.videoUrl !== undefined)
        updateData.content_video_url = content.videoUrl;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("courses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 },
        );
      }
      console.error("Error updating course:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update course" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      courseId: data.id,
      data: transformCourse(data as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Course PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------
// DELETE /api/admin/courses/:id
// Deletes a course (cascades to quizzes via FK constraint).
// ----------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 },
        );
      }
      console.error("Error deleting course:", error);
      return NextResponse.json(
        { error: "Failed to delete course" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Course DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 },
    );
  }
}
