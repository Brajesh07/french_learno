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

// ----------------------------------------------------------------
// GET /api/admin/courses/:id
// Returns a single course with its linked quizzes (including questions/answers).
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
      .select("*, quiz_questions(*, quiz_answers(*))")
      .eq("course_id", id)
      .order("created_at", { ascending: true });

    if (quizzesError) {
      console.error("Error fetching quizzes for course:", quizzesError);
    }

    // Transform course
    const transformedCourse = transformCourse(course);

    // Transform quizzes
    const transformedQuizzes = (quizzes ?? []).map((q: {
      id: string;
      title: string;
      description: string | null;
      course_id: string;
      passing_score: number | null;
      is_published: boolean | null;
      created_at: string;
      updated_at: string;
      quiz_questions: {
        id: string;
        question: string;
        type: string;
        points: number;
        explanation: string | null;
        quiz_answers: { id: string; answer: string; is_correct: boolean }[];
      }[];
    }) => ({
      id: q.id,
      title: q.title,
      description: q.description || "",
      courseId: q.course_id,
      passingScore: q.passing_score ?? 70,
      isPublished: q.is_published ?? false,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      questions: (q.quiz_questions || []).map((question) => ({
        id: question.id,
        question: question.question,
        type: question.type,
        points: question.points,
        explanation: question.explanation,
        answers: (question.quiz_answers || []).map((answer) => ({
          id: answer.id,
          text: answer.answer,
          isCorrect: answer.is_correct,
        })),
        correctAnswerId: (question.quiz_answers || []).find(
          (a) => a.is_correct,
        )?.id,
      })),
    }));

    return NextResponse.json({
      course: transformedCourse,
      quizzes: transformedQuizzes,
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
    const supabase = await createAdminClient();
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
