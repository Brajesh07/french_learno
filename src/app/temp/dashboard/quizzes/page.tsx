import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export default async function QuizzesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/temp/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_subscription")
    .eq("id", user.id)
    .maybeSingle();

  const isSubscribed = profile?.has_subscription ?? false;

  const admin = await createAdminClient();
  const { data: quizzes } = await admin
    .from("quizzes")
    .select("id, title, description, passing_score, course_id")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  // Get course titles for display
  const { data: courses } = await admin
    .from("courses")
    .select("id, title")
    .eq("is_published", true);

  const courseMap: Record<string, string> = {};
  for (const c of courses ?? []) {
    courseMap[c.id] = c.title;
  }

  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-4 pb-5 sticky top-0 bg-[#F5F5F7] z-10">
        <h1 className="text-[22px] font-black text-[#111111] tracking-[-0.5px]">
          Quizzes
        </h1>
        {quizzes && quizzes.length > 0 && (
          <span className="ml-auto text-[11px] font-medium text-[#555555] bg-white border border-black/[0.08] rounded-[20px] px-[10px] py-1">
            {quizzes.length} available
          </span>
        )}
      </header>

      <div className="px-5 flex flex-col gap-3">
        {!isSubscribed ? (
          <div className="bg-[#A78BFA] rounded-[24px] p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(167,139,250,0.35)]">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
            <div className="relative z-10">
              <p className="text-[17px] font-bold text-[#111111] mb-1">
                Unlock All Quizzes
              </p>
              <p className="text-[13px] text-[#333333]">
                Contact your administrator to upgrade your plan and access all{" "}
                {quizzes?.length ?? 0} quizzes.
              </p>
            </div>
          </div>
        ) : !quizzes || quizzes.length === 0 ? (
          <div className="bg-white rounded-[20px] py-10 px-5 text-center text-[#999999] text-[13px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            No quizzes available yet. Check back soon!
          </div>
        ) : (
          quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/temp/dashboard/quizzes/${quiz.id}`}
              className="no-underline flex items-center gap-4 bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] group transition-colors hover:bg-[#F5F5F7]"
            >
              {/* Icon swatch */}
              <div className="w-12 h-12 rounded-[14px] shrink-0 bg-[#A78BFA]/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#7C3AED]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#111111] group-hover:text-[#7C3AED] transition-colors truncate">
                  {quiz.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {quiz.course_id && courseMap[quiz.course_id] && (
                    <span className="text-[11px] text-[#999999] truncate">
                      {courseMap[quiz.course_id]}
                    </span>
                  )}
                  <span className="text-[11px] text-[#999999]">
                    · Pass: {quiz.passing_score}%
                  </span>
                </div>
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
          ))
        )}
      </div>
    </>
  );
}
