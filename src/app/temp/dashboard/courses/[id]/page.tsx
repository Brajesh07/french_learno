import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import CompleteButton from "./CompleteButton";

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-[#FBBF24]/25 text-[#111111]",
  A2: "bg-[#93C5FD]/30 text-[#111111]",
  B1: "bg-[#F9A8D4]/40 text-[#111111]",
  B2: "bg-[#A78BFA]/25 text-[#111111]",
  C1: "bg-[#7C3AED]/20 text-[#111111]",
  C2: "bg-[#1A1A1A]/10 text-[#111111]",
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
    const youtubeMatch = videoUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/,
    );
    if (youtubeMatch?.[1]) {
      return (
        <iframe
          className="w-full aspect-video rounded-[14px]"
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    }
    const vimeoMatch = videoUrl.match(/(?:https?:\/\/)?(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch?.[1]) {
      return (
        <iframe
          className="w-full aspect-video rounded-[14px]"
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          title="Vimeo video player"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return (
      <video controls className="w-full rounded-[14px] bg-black max-h-72">
        <source src={videoUrl} />
        Your browser does not support the video element.
      </video>
    );
  };

  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-4 pb-5 sticky top-0 bg-[#F5F5F7] z-50">
        <Link
          href="/temp/dashboard"
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#111111] shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] no-underline"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <h1 className="text-[17px] font-semibold text-[#111111] truncate">
          {course.title}
        </h1>
      </header>

      <div className="px-5 flex flex-col gap-4">
        <div className="bg-[#A78BFA] rounded-[24px] p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(167,139,250,0.35)]">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute right-8 -bottom-4 w-20 h-20 rounded-full bg-white/[0.07]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className={`text-[11px] font-semibold px-3 py-1 rounded-[20px] bg-white/70 backdrop-blur-sm border border-black/[0.06] text-[#444444]`}
              >
                {course.level}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-[20px] bg-white/70 text-green-700">
                  <svg
                    className="w-3 h-3"
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
            <h2 className="text-[22px] font-black text-[#111111] leading-tight tracking-[-0.5px] mb-1.5">
              {course.title}
            </h2>
            {course.description && (
              <p className="text-[13px] text-[#333333] leading-relaxed">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {course.content_image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] bg-[#E5E5E5]">
            <Image
              src={course.content_image_url}
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {course.content_text && (
          <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <h3 className="text-[13px] font-semibold text-[#555555] mb-4">
              Lesson Content
            </h3>
            <div className="text-[14px] text-[#333333] whitespace-pre-wrap leading-relaxed">
              {course.content_text}
            </div>
          </div>
        )}

        {course.content_video_url && (
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#A78BFA]/20 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-[#7C3AED]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-[14px] font-semibold text-[#111111]">
                Video Lesson
              </h3>
            </div>
            <div className="p-4 bg-[#F5F5F7]">
              {renderVideo(course.content_video_url)}
            </div>
          </div>
        )}

        {course.content_audio_url && (
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#93C5FD]/30 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </div>
              <h3 className="text-[14px] font-semibold text-[#111111]">
                Audio Practice
              </h3>
            </div>
            <div className="p-5">
              <audio controls className="w-full">
                <source src={course.content_audio_url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div
          className={`rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center justify-between gap-4 flex-wrap transition-all ${
            isCompleted
              ? "bg-[#10B981]/5 border border-[#10B981]/15"
              : "bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            {isCompleted && (
              <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-[#10B981]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
            <div>
              <p className="text-[15px] font-bold text-[#111111]">
                {isCompleted
                  ? "Bravo ! Course Finish"
                  : "Finished this course?"}
              </p>
              <p className="text-[12px] text-[#666666] mt-0.5">
                {isCompleted
                  ? "You've successfully mastered this lesson."
                  : "Marking it complete notifies your instructor."}
              </p>
            </div>
          </div>
          <CompleteButton courseId={id} initiallyCompleted={isCompleted} />
        </div>

        {quizzes && quizzes.length > 0 && (
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="px-5 py-4 border-b border-[#E5E5E5]">
              <h3 className="text-[15px] font-bold text-[#111111]">Quizzes</h3>
            </div>
            <ul className="divide-y divide-[#E5E5E5]">
              {quizzes.map((quiz) => (
                <li key={quiz.id}>
                  <Link
                    href={`/temp/dashboard/quizzes/${quiz.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 no-underline group transition-colors hover:bg-[#F5F5F7]"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#111111] group-hover:text-[#7C3AED] transition-colors truncate">
                        {quiz.title}
                      </p>
                      {quiz.description && (
                        <p className="text-[12px] text-[#999999] mt-0.5 line-clamp-1">
                          {quiz.description}
                        </p>
                      )}
                      <p className="text-[11px] text-[#999999] mt-0.5">
                        Pass: {quiz.passing_score}%
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F7] group-hover:bg-[#A78BFA]/20 flex items-center justify-center shrink-0 transition-colors">
                      <svg
                        className="w-3.5 h-3.5 text-[#999999] group-hover:text-[#7C3AED] transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
