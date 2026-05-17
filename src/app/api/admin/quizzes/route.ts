import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// GET /api/admin/quizzes
// Returns a paginated, filterable list of all quizzes.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();
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

// ----------------------------------------------------------------
// POST /api/admin/quizzes
// Creates a full quiz with questions and answers in a transaction.
// Body: {
//   title, description, course_id, passing_score, is_published,
//   questions: [
//     { question, type, points, explanation,
//       answers: [{ answer, is_correct }] }
//   ]
// }
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createAdminClient();
    const body = await request.json();

    const {
      title,
      description,
      course_id,
      passing_score,
      is_published,
      questions,
    } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Quiz title is required" },
        { status: 400 },
      );
    }
    if (!course_id?.trim()) {
      return NextResponse.json(
        { error: "course_id is required" },
        { status: 400 },
      );
    }
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 },
      );
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question?.trim()) {
        return NextResponse.json(
          { error: "All questions must have content" },
          { status: 400 },
        );
      }
      if (!q.answers || q.answers.length < 2) {
        return NextResponse.json(
          { error: "Each question needs at least 2 answers" },
          { status: 400 },
        );
      }
      const hasCorrect = q.answers.some(
        (a: { is_correct: boolean }) => a.is_correct,
      );
      if (!hasCorrect) {
        return NextResponse.json(
          { error: `Question "${q.question}" has no correct answer marked` },
          { status: 400 },
        );
      }
      if (q.answers.some((a: { answer?: string }) => !a.answer?.trim())) {
        return NextResponse.json(
          { error: "All answer options must be filled" },
          { status: 400 },
        );
      }
    }

    // Verify the course exists
    const { error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", course_id)
      .single();

    if (courseError) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // 1. Insert the quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        course_id,
        passing_score: passing_score ?? 70,
        is_published: is_published ?? false,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error("Error creating quiz:", quizError);
      return NextResponse.json(
        { error: quizError?.message || "Failed to create quiz" },
        { status: 500 },
      );
    }

    // 2. Insert questions
    const questionsToInsert = questions.map(
      (q: {
        question: string;
        type?: string;
        points?: number;
        explanation?: string;
      }) => ({
        quiz_id: quiz.id,
        question: q.question.trim(),
        type: q.type || "mcq",
        points: q.points ?? 1,
        explanation: q.explanation?.trim() || null,
      }),
    );

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select();

    if (questionsError || !insertedQuestions) {
      console.error(
        "Error creating quiz questions:",
        JSON.stringify(questionsError),
      );
      // Rollback: delete the quiz we just created
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return NextResponse.json(
        {
          error: questionsError?.message || "Failed to save quiz questions",
          code: questionsError?.code,
          details: questionsError?.details,
          hint: questionsError?.hint,
        },
        { status: 500 },
      );
    }

    // 3. Insert answers for each question
    const answersToInsert: {
      question_id: string;
      answer: string;
      is_correct: boolean;
    }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const questionId = insertedQuestions[i].id;
      for (const a of questions[i].answers) {
        answersToInsert.push({
          question_id: questionId,
          answer: a.answer.trim(),
          is_correct: a.is_correct ?? false,
        });
      }
    }

    const { error: answersError } = await supabase
      .from("quiz_answers")
      .insert(answersToInsert);

    if (answersError) {
      console.error("Error creating quiz answers:", answersError);
      // Rollback: delete the quiz (cascades to questions)
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return NextResponse.json(
        { error: "Failed to save quiz answers" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { quizId: quiz.id, quiz },
        message: "Quiz created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Quizzes POST error:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 },
    );
  }
}
