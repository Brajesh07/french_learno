import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { createAdminClient } from '@/lib/supabase/server';

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
    const supabase = await createAdminClient();

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
      questions: ((quiz.quiz_questions || []) as {
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
        answers: (q.quiz_answers || []).map((a) => ({
          id: a.id,
          text: a.answer,
          isCorrect: a.is_correct,
        })),
        correctAnswerId: (q.quiz_answers || []).find((a) => a.is_correct)?.id,
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
// Updates quiz metadata and optionally replaces questions/answers.
// ----------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = await createAdminClient();
    const body = await request.json();

    const {
      questions,
    } = body;

    // 1. Update quiz metadata
    const allowedFields = ['title', 'description', 'passing_score', 'is_published', 'course_id'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length > 0) {
      const { error: quizError } = await supabase
        .from('quizzes')
        .update(updateData)
        .eq('id', id);

      if (quizError) {
        console.error('Error updating quiz metadata:', quizError);
        return NextResponse.json({ error: 'Failed to update quiz metadata' }, { status: 500 });
      }
    }

    // 2. If questions are provided, replace them all
    if (questions && Array.isArray(questions)) {
      // Validate questions first
      for (const q of questions) {
        if (!q.question?.trim()) {
          return NextResponse.json({ error: "All questions must have content" }, { status: 400 });
        }
        if (!q.answers || q.answers.length < 2) {
          return NextResponse.json({ error: "Each question needs at least 2 answers" }, { status: 400 });
        }
      }

      // Delete existing questions (cascades to answers)
      const { error: deleteError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', id);

      if (deleteError) {
        console.error('Error deleting old questions:', deleteError);
        return NextResponse.json({ error: 'Failed to clear old questions' }, { status: 500 });
      }

      // Insert new questions
      const questionsToInsert = questions.map((q: {
        question: string;
        type?: string;
        points?: number;
        explanation?: string;
      }) => ({
        quiz_id: id,
        question: q.question.trim(),
        type: q.type || 'mcq',
        points: q.points ?? 1,
        explanation: q.explanation?.trim() || null,
      }));

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert)
        .select();

      if (questionsError || !insertedQuestions) {
        console.error('Error inserting new questions:', questionsError);
        return NextResponse.json({ error: 'Failed to save new questions' }, { status: 500 });
      }

      // Insert new answers
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
        .from('quiz_answers')
        .insert(answersToInsert);

      if (answersError) {
        console.error('Error inserting new answers:', answersError);
        return NextResponse.json({ error: 'Failed to save new answers' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Quiz updated successfully' });
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
    const supabase = await createAdminClient();

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
