import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth-helpers';
import { createClient } from '@/lib/supabase/server';

// ----------------------------------------------------------------
// GET /api/admin/list-students
// Returns all users with role = 'student'.
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('profiles')
      .select('id, name, username, email, phone, class, created_at', { count: 'exact' })
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error listing students:', error);
      return NextResponse.json({ error: 'Failed to list students' }, { status: 500 });
    }

    return NextResponse.json({
      students: data,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error('List students error:', error);
    return NextResponse.json({ error: 'Failed to list students' }, { status: 500 });
  }
}
