import Link from "next/link";
import { loadAdminQuiz } from "@/lib/staff/content-read";
import { AdminQuizPreview } from "@/components/staff/AdminQuizPreview";
import { CourseText } from "@/components/learning/CourseText";

export default async function AdminQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id } = await params;
  const { revision } = await searchParams;
  const { quiz, revisions, selected, questions } = await loadAdminQuiz(
    id,
    revision,
  );
  return (
    <article className="mx-auto grid max-w-4xl gap-6 p-4 text-gray-900 dark:text-white sm:p-6">
      <nav
        className="flex flex-wrap gap-5 text-blue-600 dark:text-blue-400"
        aria-label="Content navigation"
      >
        <Link href="/dashboard/quizzes">← Back to quizzes</Link>
        {quiz.course_id && (
          <Link href={`/dashboard/courses/${quiz.course_id}`}>
            View parent course
          </Link>
        )}
      </nav>
      <header className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Admin moderation · Read-only ·{" "}
          {quiz.is_published ? "Module published" : "Module unpublished"}
        </p>
        <h1 className="break-words text-3xl font-bold">
          {selected?.title ?? quiz.title}
        </h1>
        {selected && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Revision {selected.revision} · {selected.status} ·{" "}
            {selected.proficiency} · {selected.access_tier}
          </p>
        )}
      </header>
      {(selected?.description || quiz.description || selected?.objective) && (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900">
          {selected?.objective && (
            <p className="font-medium">{selected.objective}</p>
          )}
          <CourseText
            text={
              selected ? (selected.description ?? "") : (quiz.description ?? "")
            }
          />
        </section>
      )}
      {!!revisions.length && (
        <nav className="flex flex-wrap gap-2" aria-label="Module revisions">
          {revisions.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/quizzes/${id}?revision=${item.id}`}
              aria-current={item.id === selected?.id ? "page" : undefined}
              className={`rounded-xl border px-4 py-2 text-sm ${item.id === selected?.id ? "border-violet-600 bg-violet-600 text-white" : "border-gray-200 dark:border-gray-700"}`}
            >
              Revision {item.revision} · {item.status}
            </Link>
          ))}
        </nav>
      )}
      <AdminQuizPreview
        key={selected ? `${selected.id}:${selected.edit_version}` : quiz.id}
        questions={questions}
      />
    </article>
  );
}
