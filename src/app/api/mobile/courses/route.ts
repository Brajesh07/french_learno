import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/mobile/courses
 *
 * Returns all published courses, optionally filtered by level.
 * This endpoint is accessible to authenticated students.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    let query = supabase
      .from('courses')
      .select('id, title, description, level, content_text, content_audio_url, content_image_url, content_video_url, created_at')
      .eq('is_published', true)
      .order('level', { ascending: true })
      .order('created_at', { ascending: true });

    if (level) query = query.eq('level', level);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching courses (mobile):', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Mobile courses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
