import Link from "next/link";
import { loadAdminCourse } from "@/lib/staff/content-read";
import { CourseText } from "@/components/learning/CourseText";
import { CourseMedia } from "@/components/learning/CourseMedia";

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { course, modules } = await loadAdminCourse((await params).id);
  return (
    <article className="mx-auto grid max-w-5xl gap-6 p-4 text-gray-900 dark:text-white sm:p-6">
      <Link
        href="/dashboard/courses"
        className="w-fit text-blue-600 dark:text-blue-400"
      >
        ← Back to courses
      </Link>
      <header className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Admin moderation · Read-only ·{" "}
          {course.is_published ? "Published" : "Draft"} · {course.level}
        </p>
        <h1 className="break-words text-3xl font-bold">{course.title}</h1>
      </header>
      <section
        className="grid min-w-0 gap-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-7"
        aria-label="Course material"
      >
        <h2 className="text-xl font-semibold">Course material</h2>
        {course.description && <CourseText text={course.description} />}
        {course.content_text?.trim() ? (
          <CourseText text={course.content_text} />
        ) : (
          <p className="text-slate-500">
            No written course material has been added.
          </p>
        )}
        <CourseMedia
          title={course.title}
          imageUrl={course.content_image_url}
          audioUrl={course.content_audio_url}
          videoUrl={course.content_video_url}
        />
      </section>
      <section className="grid gap-4" aria-labelledby="course-modules-heading">
        <h2 id="course-modules-heading" className="text-xl font-semibold">
          Modules and quizzes ({modules.length})
        </h2>
        {modules.map((item) => (
          <article
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {item.is_published ? "Published" : "Draft"} ·{" "}
                {item.learning_runtime === "gamified"
                  ? "Interactive module"
                  : "Legacy quiz"}
              </p>
              {item.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {item.description}
                </p>
              )}
            </div>
            <Link
              href={`/dashboard/quizzes/${item.id}`}
              className="shrink-0 rounded-xl border border-blue-200 px-4 py-2 text-blue-600 dark:text-blue-400"
              aria-label={`View ${item.title}`}
            >
              View preview →
            </Link>
          </article>
        ))}
        {!modules.length && (
          <p className="rounded-xl border p-6 text-gray-500">
            No modules or quizzes belong to this course yet.
          </p>
        )}
      </section>
    </article>
  );
}
