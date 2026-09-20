import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/staff/auth';
export async function ContentReadOnly({ id, kind }: { id: string; kind: 'courses' | 'quizzes' }) {
  const { client } = await requireStaffPage('admin');
  const { data, error } = await client.from(kind).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Unable to load content.');
  if (!data) notFound();
  const { data: questions } = kind === 'quizzes' ? await client.from('quiz_questions').select('id, question, explanation, quiz_answers(id, answer, is_correct)').eq('quiz_id', id).order('created_at') : { data: null };
  return <article className="max-w-4xl p-6 text-gray-900 dark:text-white"><Link href={`/dashboard/${kind}`} className="text-blue-600">← Back to {kind}</Link><h1 className="mt-5 text-3xl font-bold">{data.title}</h1><p className="my-4 text-gray-500">Read-only · {data.is_published ? 'Published' : 'Draft'}</p><p className="whitespace-pre-wrap">{data.description}</p>{kind === 'courses' && <div className="mt-6 whitespace-pre-wrap rounded-xl border p-6">{data.content_text || 'No text content.'}</div>}{questions?.map((q, i) => <section key={q.id} className="mt-5 rounded-xl border p-5"><h2 className="font-semibold">{i + 1}. {q.question}</h2><ul className="mt-3 space-y-2">{q.quiz_answers.map(a => <li key={a.id}>{a.answer}{a.is_correct ? ' ✓' : ''}</li>)}</ul><p className="mt-3 text-sm text-gray-500">{q.explanation}</p></section>)}</article>;
}
