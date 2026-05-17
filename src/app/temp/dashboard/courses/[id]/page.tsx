import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import CompleteButton from "./CompleteButton";

const LEVEL_STYLES: Record<string, string> = {
  A1: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  A2: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
  B1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  B2: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  C1: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  C2: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/temp/login");

  // Check subscription
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_subscription, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.has_subscription) redirect("/temp/dashboard");

  // Fetch course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select(
      "id, title, description, level, content_text, content_image_url, content_audio_url, content_video_url",
    )
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (courseError || !course) redirect("/temp/dashboard");

  // Check if already completed
  const { data: progress } = await supabase
    .from("user_progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("course_id", id)
    .maybeSingle();

  const isCompleted = progress?.completed ?? false;

  // Fetch quizzes for this course
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, description, passing_score")
    .eq("course_id", id)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  const renderVideo = (videoUrl: string) => {
    // Check for YouTube URLs
    const youtubeMatch = videoUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/,
    );

    if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      return (
        <iframe
          className="w-full aspect-video rounded-xl shadow-sm"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      );
    }

    // Check for Vimeo URLs
    const vimeoMatch = videoUrl.match(
      /(?:https?:\/\/)?(?:vimeo\.com\/)(\d+)/,
    );

    if (vimeoMatch && vimeoMatch[1]) {
      const videoId = vimeoMatch[1];
      return (
        <iframe
          className="w-full aspect-video rounded-xl shadow-sm"
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Vimeo video player"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    // Fallback to standard HTML5 video player
    return (
      <video controls className="w-full rounded-xl shadow-sm bg-black max-h-96">
        <source src={videoUrl} />
        Your browser does not support the video element.
      </video>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/temp/dashboard"
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
            {course.title}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Course header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                LEVEL_STYLES[course.level] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {course.level}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Completed
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {course.title}
          </h2>
          {course.description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Media: Image (if present) */}
        {course.content_image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
            <Image
              src={course.content_image_url}
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Course content */}
        {course.content_text && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Lesson Content
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {course.content_text}
            </div>
          </div>
        )}

        {/* Media: Video & Audio */}
        {(course.content_video_url || course.content_audio_url) && (
          <div className="space-y-6">
            {course.content_video_url && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Video Lesson
                  </h3>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                  {renderVideo(course.content_video_url)}
                </div>
              </div>
            )}

            {course.content_audio_url && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Audio Practice
                  </h3>
                </div>
                <div className="p-6">
                  <audio controls className="w-full">
                    <source src={course.content_audio_url} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mark complete */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
              Finished this course?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Marking it complete notifies your instructor.
            </p>
          </div>
          <CompleteButton courseId={id} initiallyCompleted={isCompleted} />
        </div>

        {/* Quizzes */}
        {quizzes && quizzes.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                Quizzes
              </h3>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {quizzes.map((quiz) => (
                <li key={quiz.id}>
                  <Link
                    href={`/temp/dashboard/quizzes/${quiz.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {quiz.title}
                      </p>
                      {quiz.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {quiz.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Passing score: {quiz.passing_score}%
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

