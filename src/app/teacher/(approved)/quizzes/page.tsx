import Link from "next/link";
import { requireStaffPage } from "@/lib/staff/auth";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { client, user } = await requireStaffPage("teacher");
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number((await searchParams).page) || 1)),
  );
  const { data, count, error } = await client
    .from("quizzes")
    .select(
      "id,title,description,is_published,quiz_revisions(id,title,status,revision)",
      { count: "exact" },
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Unable to load your modules.");
  return (
    <section className="p-6 text-gray-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My learning modules</h1>
          <p className="mt-2 text-gray-500">
            Create interactive lessons, preview the student experience, and
            publish when ready.
          </p>
        </div>
        <Link
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
          href="/teacher/quizzes/new"
        >
          Create module
        </Link>
      </div>
      <div className="mt-6 space-y-4">
        {data?.map((q) => {
          const revisions = [...q.quiz_revisions].sort(
              (a, b) => b.revision - a.revision,
            ),
            latest = revisions[0];
          return (
            <article
              key={q.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
            >
              <div>
                <h2 className="text-lg font-semibold">
                  {latest?.title ?? q.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {latest
                    ? `${latest.status === "draft" ? "Draft revision" : "Published revision"} ${latest.revision}${latest.status === "draft" && q.is_published ? " · Earlier version is live" : ""}`
                    : `Legacy MCQ · ${q.is_published ? "Published" : "Draft"}`}
                </p>
              </div>
              <Link
                className="rounded-lg border px-4 py-2"
                href={`/teacher/quizzes/${q.id}/edit`}
              >
                Edit
              </Link>
            </article>
          );
        })}
        {!data?.length && (
          <div className="rounded-xl border p-10 text-center">
            <h2 className="text-xl font-semibold">
              Your first French lesson starts here.
            </h2>
            <p className="mt-2 text-gray-500">
              Create a course, then add a module with interactive questions.
            </p>
            <Link
              className="mt-5 inline-block text-indigo-600"
              href="/teacher/courses"
            >
              Open my courses →
            </Link>
          </div>
        )}
      </div>
      <nav className="mt-6 flex gap-6" aria-label="Module pages">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        <span>Page {page}</span>
        {page * 25 < (count ?? 0) && (
          <Link href={`?page=${page + 1}`}>Next</Link>
        )}
      </nav>
    </section>
  );
}
