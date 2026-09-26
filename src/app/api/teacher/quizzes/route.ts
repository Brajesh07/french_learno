import { writeTeacherContent } from '@/lib/staff/content-write';
import { NextRequest, NextResponse } from "next/server";
import { requireApprovedTeacher } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/quizzes
// Returns a paginated, filterable list of all quizzes.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireApprovedTeacher();
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const courseId = searchParams.get("courseId");
    const isPublished = searchParams.get("isPublished");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Map frontend sort names to DB columns
    const sortMap: Record<string, string> = {
      title: "title",
      courseId: "course_id",
      isPublished: "is_published",
      createdAt: "created_at",
      level: "courses(level)",
    };

    const dbSortBy = sortMap[sortBy] || "created_at";

    let query = supabase
      .from("quizzes")
      .select("*, courses(title, level), quiz_questions(count)", {
        count: "exact",
      });

    query = query.eq("created_by", auth.userId);

    if (courseId) query = query.eq("course_id", courseId);
    if (isPublished === "true") query = query.eq("is_published", true);
    if (isPublished === "false") query = query.eq("is_published", false);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    if (dbSortBy.includes("(")) {
      // Handle nested sort if needed, but Supabase simple order is better for top level
      query = query.order("created_at", { ascending: sortOrder === "asc" });
    } else {
      query = query.order(dbSortBy, { ascending: sortOrder === "asc" });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Error fetching quizzes:", error);
      return NextResponse.json(
        { error: "Failed to fetch quizzes" },
        { status: 500 },
      );
    }

    // Map to camelCase and include course info
    const mappedData = data.map(
      (q: {
        id: string;
        title: string;
        description: string | null;
        course_id: string;
        courses: { title: string; level: string } | null;
        passing_score: number;
        is_published: boolean;
        created_at: string;
        updated_at: string;
        quiz_questions: { count: number }[];
      }) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        courseId: q.course_id,
        courseName: q.courses?.title,
        level: q.courses?.level,
        passingScore: q.passing_score,
        isPublished: q.is_published,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        questions: new Array(q.quiz_questions?.[0]?.count || 0), // Mock array for .length
      }),
    );

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: mappedData,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Quizzes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 },
    );
  }
}


export async function POST(request: NextRequest) { return writeTeacherContent(request, 'quiz', null); }
