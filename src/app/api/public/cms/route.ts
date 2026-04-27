import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/public/cms
 *
 * Returns all visible CMS sections for the public website.
 * No authentication required.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('showcase_content')
      .select('section_key, title, subtitle, body, image_url, cta_text, cta_url')
      .eq('is_visible', true)
      .order('section_key', { ascending: true });

    if (error) {
      console.error('Error fetching public CMS content:', error);
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Public CMS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
