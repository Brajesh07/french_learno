import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
const within = (path: string, base: string) => path === base || path.startsWith(base + '/');
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const bounce = (path: string) => {
    const next = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach(cookie => next.cookies.set(cookie));
    return next;
  };
  const path = request.nextUrl.pathname;
  const admin = within(path, '/dashboard'), teacher = within(path, '/teacher');
  const student = within(path, '/temp/dashboard'), studentAuth = ['/temp/login', '/temp/signup'].includes(path);
  const login = path === '/login';
  if ((admin || teacher || login) && request.headers.get('user-agent')?.includes('FrenchLearnoApp')) return new NextResponse('Not found', { status: 404 });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return admin || teacher ? bounce('/login') : student ? bounce('/temp/login') : response;
  if (!(admin || teacher || student || login || studentAuth)) return response;
  const { data: profile, error } = await client.from('profiles').select('role, is_active, must_change_password').eq('id', user.id).maybeSingle();
  if (error || !profile) return admin || teacher ? bounce('/staff/access') : student ? bounce('/temp/login') : response;
  if (admin || teacher || login) {
    if (!profile.is_active || profile.must_change_password) return login ? response : bounce('/staff/access');
    if (admin && profile.role !== 'admin') return bounce('/staff/access');
    if (teacher && profile.role !== 'teacher') return bounce('/staff/access');
    if (profile.role === 'teacher') {
      const { data: application } = await client.from('teacher_profiles').select('verification_status').eq('id', user.id).maybeSingle();
      const approved = application?.verification_status === 'approved';
      if (login || (teacher && !approved && path !== '/teacher/pending')) return bounce(approved ? '/teacher/courses' : '/teacher/pending');
    }
    if (login && profile.role === 'admin') return bounce('/dashboard');
  }
  if (student && (profile.role !== 'student' || !profile.is_active)) return bounce('/temp/wrong-account');
  if (studentAuth && profile.role === 'student' && profile.is_active) return bounce('/temp/dashboard');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
