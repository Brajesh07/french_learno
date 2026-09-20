import Link from 'next/link';
import { requireStaffPage } from '@/lib/staff/auth';
export async function ContentList({ role, kind, page = 1 }: { role: 'admin' | 'teacher'; kind: 'courses' | 'quizzes'; page?: number }) {
  const session = await requireStaffPage(role), base = role === 'admin' ? '/dashboard' : '/teacher';
  let query = session.client.from(kind).select('id, title, description, is_published, created_by', { count: 'exact' }).order('created_at', { ascending: false });
  if (role === 'teacher') query = query.eq('created_by', session.user.id);
  const { data, error, count } = await query.range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error('Unable to load content.');
  return <section className="p-4 text-gray-900 dark:text-white"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">{role === 'teacher' ? 'My ' : ''}{kind === 'courses' ? 'Courses' : 'Quizzes'}</h1><p className="mt-2 text-gray-500">{role === 'teacher' ? 'Create and edit content owned by your teacher account.' : 'Content is authored by approved teachers. This catalogue is read-only.'}</p></div>{role === 'teacher' && <Link className="rounded-lg bg-blue-600 px-5 py-3 text-white" href={`${base}/${kind}/create`}>Create {kind === 'courses' ? 'course' : 'quiz'}</Link>}</div>
    <div className="mt-6 space-y-3">{data?.map(item => <article key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p><p className="mt-2 text-sm">{item.is_published ? 'Published' : 'Draft'}{!item.created_by && ' · Legacy platform content'}</p></div><Link className="rounded-lg border px-4 py-2" href={`${base}/${kind}/${item.id}${role === 'teacher' ? '/edit' : ''}`}>{role === 'teacher' ? 'Edit' : 'View'}</Link></article>)}{!data?.length && <p className="rounded-xl border p-8 text-center text-gray-500">No {kind} yet.{role === 'teacher' && kind === 'quizzes' && ' Create a course first, then add its quiz.'}</p>}</div>
    <nav className="mt-6 flex gap-6" aria-label="Content pages">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}<span>Page {page}</span>{page * 25 < (count ?? 0) && <Link href={`?page=${page + 1}`}>Next</Link>}</nav>
  </section>;
}
