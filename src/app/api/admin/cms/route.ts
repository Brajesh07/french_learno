import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';

// ----------------------------------------------------------------
// GET /api/admin/cms
// Returns all showcase content sections.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('showcase_content')
      .select('*')
      .order('section_key', { ascending: true });

    if (error) {
      console.error('Error fetching CMS content:', error);
      return NextResponse.json({ error: 'Failed to fetch CMS content' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('CMS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch CMS content' }, { status: 500 });
  }
}
