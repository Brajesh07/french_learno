import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const LEVEL_COLORS: Record<string, string> = {
  A1: "#FBBF24",
  A2: "#93C5FD",
  B1: "#F9A8D4",
  B2: "#A78BFA",
  C1: "#6EE7B7",
  C2: "#FCA5A5",
};

export default async function CoursesPage() {
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
  const { data: courses } = await admin
    .from("courses")
    .select("id, title, description, level, content_text")
    .eq("is_published", true)
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <>
      <header className="flex items-center gap-3 px-5 pt-4 pb-5 sticky top-0 bg-[#F5F5F7] z-10">
        <h1 className="text-[22px] font-black text-[#111111] tracking-[-0.5px]">
          Courses
        </h1>
        {courses && courses.length > 0 && (
          <span className="ml-auto text-[11px] font-medium text-[#555555] bg-white border border-black/[0.08] rounded-[20px] px-[10px] py-1">
            {courses.length} available
          </span>
        )}
      </header>

      <div className="px-5 flex flex-col gap-3">
        {!isSubscribed ? (
          <div className="bg-[#A78BFA] rounded-[24px] p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(167,139,250,0.35)]">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
            <div className="relative z-10">
              <p className="text-[17px] font-bold text-[#111111] mb-1">
                Unlock All Courses
              </p>
              <p className="text-[13px] text-[#333333]">
                Contact your administrator to upgrade your plan and access all{" "}
                {courses?.length ?? 0} courses.
              </p>
            </div>
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="bg-white rounded-[20px] py-10 px-5 text-center text-[#999999] text-[13px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            No courses published yet. Check back soon!
          </div>
        ) : (
          courses.map((course, i) => {
            const color = LEVEL_COLORS[course.level] ?? "#E5E5E5";
            return (
              <Link
                key={course.id}
                href={`/temp/dashboard/courses/${course.id}`}
                className="no-underline flex items-center gap-4 bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] group transition-colors hover:bg-[#F5F5F7]"
              >
                {/* Color swatch */}
                <div
                  className="w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center text-[13px] font-bold text-[#111111]"
                  style={{ background: color }}
                >
                  {course.level}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[#111111] group-hover:text-[#7C3AED] transition-colors truncate">
                    {course.title}
                  </p>
                  {(course.description ?? course.content_text) && (
                    <p className="text-[12px] text-[#999999] mt-0.5 line-clamp-1">
                      {course.description ?? course.content_text}
                    </p>
                  )}
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
            );
          })
        )}
      </div>
    </>
  );
}
