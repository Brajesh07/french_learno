import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';

// ----------------------------------------------------------------
// PATCH /api/admin/cms/:section_key
// Updates a specific CMS section (e.g. 'hero', 'features').
// ----------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ section_key: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { section_key } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const allowedFields = ['title', 'subtitle', 'body', 'image_url', 'cta_text', 'cta_url', 'is_visible'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('showcase_content')
      .update(updateData)
      .eq('section_key', section_key)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 });
      }
      console.error('Error updating CMS section:', error);
      return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('CMS PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update CMS section' }, { status: 500 });
  }
}

// ----------------------------------------------------------------
// GET /api/admin/cms/:section_key
// Returns a single CMS section.
// ----------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section_key: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { section_key } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('showcase_content')
      .select('*')
      .eq('section_key', section_key)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('CMS GET [section_key] error:', error);
    return NextResponse.json({ error: 'Failed to fetch section' }, { status: 500 });
  }
}
