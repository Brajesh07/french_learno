import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';

// ----------------------------------------------------------------
// GET /api/admin/quizzes/:id
// Returns a quiz with its questions and answers.
// ----------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          *,
          quiz_answers (*)
        )
      `)
      .eq('id', id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Map to camelCase to match frontend interfaces
    const mappedQuiz = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      courseId: quiz.course_id,
      passingScore: quiz.passing_score,
      isPublished: quiz.is_published,
      timeLimit: quiz.time_limit || 30, // Assuming default or from quiz
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      questions: (quiz.quiz_questions as {
        id: string;
        question: string;
        type: string;
        points: number;
        explanation: string;
        quiz_answers: { id: string; answer: string; is_correct: boolean }[];
      }[]).map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        points: q.points,
        explanation: q.explanation,
        answers: q.quiz_answers.map((a) => ({
          id: a.id,
          text: a.answer,
          isCorrect: a.is_correct,
        })),
        correctAnswerId: q.quiz_answers.find((a) => a.is_correct)?.id,
      })),
    };

    return NextResponse.json(mappedQuiz);
  } catch (error) {
    console.error('Quiz GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}

// ----------------------------------------------------------------
// PATCH /api/admin/quizzes/:id
// Partially updates quiz metadata (not questions/answers).
// ----------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const allowedFields = ['title', 'description', 'passing_score', 'is_published', 'course_id'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('quizzes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      console.error('Error updating quiz:', error);
      return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Quiz PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

// ----------------------------------------------------------------
// DELETE /api/admin/quizzes/:id
// Deletes a quiz (cascades to quiz_questions → quiz_answers).
// ----------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      console.error('Error deleting quiz:', error);
      return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Quiz DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}
