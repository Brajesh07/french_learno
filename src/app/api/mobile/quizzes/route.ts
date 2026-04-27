import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/mobile/quizzes
 *
 * Returns published quizzes.
 * Optionally filter by course_id: GET /api/mobile/quizzes?course_id=xxx
 *
 * NOTE: Correct answers are NOT returned here — only question text and
 * answer options (without is_correct). The submit endpoint calculates scores.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    let quizzesQuery = supabase
      .from('quizzes')
      .select('id, title, description, course_id, passing_score, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: true });

    if (courseId) quizzesQuery = quizzesQuery.eq('course_id', courseId);

    const { data, error } = await quizzesQuery;

    if (error) {
      console.error('Error fetching quizzes (mobile):', error);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Mobile quizzes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}
