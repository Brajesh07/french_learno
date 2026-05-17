import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/courses
// Returns a paginated, filterable list of all courses.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const level = searchParams.get("level");
    const isPublished = searchParams.get("isPublished");
    const search = searchParams.get("search");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("courses")
      .select("*, quizzes(count)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (level) query = query.eq("level", level);
    if (isPublished !== null && isPublished !== undefined) {
      query = query.eq("is_published", isPublished === "true");
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json(
        { error: "Failed to fetch courses" },
        { status: 500 },
      );
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ data, total, page, limit, totalPages });
  } catch (error) {
    console.error("Courses GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------
// POST /api/admin/courses
// Creates a new course.
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const body = await request.json();

    // Accept the camelCase / nested format sent by the frontend
    const { title, description, level, content, isPublished } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Course title is required" },
        { status: 400 },
      );
    }
    if (!level || !["A1", "B1", "B2"].includes(level)) {
      return NextResponse.json(
        { error: "Valid level (A1, B1, B2) is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("courses")
      .insert({
        title: title.trim(),
        description: description || null,
        level,
        content_text: content?.text || null,
        content_audio_url: content?.audioUrl || null,
        content_image_url: content?.imageUrl || null,
        content_video_url: content?.videoUrl || null,
        is_published: isPublished ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create course" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, courseId: data.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Courses POST error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 },
    );
  }
}
