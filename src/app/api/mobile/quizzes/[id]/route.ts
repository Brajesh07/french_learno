import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/mobile/quizzes/:id
 *
 * Returns a specific quiz with questions and answer OPTIONS (no is_correct).
 * The student's app uses this to render the quiz UI.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, description, course_id, passing_score')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Fetch questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, type, points')
      .eq('quiz_id', id)
      .order('created_at', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
    }

    // Fetch answers WITHOUT is_correct (prevent cheating)
    const questionIds = (questions ?? []).map((q) => q.id);
    let answers: { id: string; question_id: string; answer: string }[] = [];

    if (questionIds.length > 0) {
      const { data: answerData, error: answersError } = await supabase
        .from('quiz_answers')
        .select('id, question_id, answer') // ← no is_correct
        .in('question_id', questionIds);

      if (answersError) {
        console.error('Error fetching answers:', answersError);
        return NextResponse.json({ error: 'Failed to fetch quiz answers' }, { status: 500 });
      }
      answers = answerData ?? [];
    }

    // Attach answers to questions
    const questionsWithAnswers = (questions ?? []).map((q) => ({
      ...q,
      answers: answers.filter((a) => a.question_id === q.id),
    }));

    return NextResponse.json({ ...quiz, questions: questionsWithAnswers });
  } catch (error) {
    console.error('Mobile quiz GET [id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}
