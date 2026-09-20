import { writeTeacherContent } from '@/lib/staff/content-write';
import { NextRequest, NextResponse } from "next/server";
import { requireApprovedTeacher } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/courses
// Returns a paginated, filterable list of all courses.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireApprovedTeacher();
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
      .eq("created_by", auth.userId)
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


export async function POST(request: NextRequest) { return writeTeacherContent(request, 'course', null); }
