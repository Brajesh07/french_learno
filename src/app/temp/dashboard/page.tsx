import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

const CARD_COLORS = ["#FBBF24", "#93C5FD", "#F9A8D4", "#A78BFA"] as const;

export default async function TempDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/temp/login");
  }

  // Fetch profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let profile = existingProfile;

  // If no profile yet, create it via admin client
  if (!existingProfile && !fetchError) {
    const meta = user.user_metadata ?? {};
    const admin = await createAdminClient();

    const { data: newProfile } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        name: meta.name ?? "Unknown",
        username: meta.username ?? user.email?.split("@")[0] ?? "user",
        email: user.email ?? "",
        role: "student",
        is_active: true,
        has_subscription: false,
      })
      .select()
      .maybeSingle();

    profile = newProfile;
  }

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const isSubscribed = profile?.has_subscription ?? false;
  const isActive = profile?.is_active ?? true;

  // Use admin client to ensure we see all published content regardless of RLS
  const admin = await createAdminClient();

  // Fetch published courses
  const { data: courses, error: coursesError } = await admin
    .from("courses")
    .select("id, title, description, level, content_text")
    .eq("is_published", true)
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });

  if (coursesError) console.error("Courses fetch error:", coursesError);

  // Fetch published quizzes
  const { data: quizzes, error: quizzesError } = await admin
    .from("quizzes")
    .select("id, title, description, course_id")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (quizzesError) console.error("Quizzes fetch error:", quizzesError);

  // Compute 7-day window centered on today for the calendar strip
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return {
      date: d.getDate(),
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()],
      isToday: i === 3,
    };
  });

  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const firstName = profile?.name?.split(" ")[0] ?? "Student";

  return (
    <>
      {/* ── Screen Header ────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full bg-[#A78BFA] flex items-center justify-center text-white font-bold text-[15px] border-2 border-white shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            {initials}
          </div>
          <div>
            <p className="text-[17px] font-semibold text-[#111111] leading-[1.3] m-0">
              Bonjour, {firstName}!
            </p>
            <p className="text-[13px] text-[#999999] m-0">{todayLabel}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* ── Hero Banner ───────────────────────────────────── */}
      <div className="mx-5 mb-6 rounded-[24px] bg-[#A78BFA] p-5 min-h-[160px] relative overflow-hidden flex flex-col justify-between shadow-[0_4px_20px_rgba(167,139,250,0.35)]">
        {/* Decorative circles */}
        <div className="absolute -right-[30px] -top-[30px] w-[160px] h-[160px] rounded-full bg-white/[0.12]" />
        <div className="absolute right-10 -bottom-5 w-[100px] h-[100px] rounded-full bg-white/[0.08]" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/25 rounded-[20px] px-3 py-1 mb-3">
            <span className="text-[11px] font-medium text-[#111111]">
              {isSubscribed ? "✦ Pro Member" : "Free Plan"}
            </span>
          </div>
          <h2 className="text-[26px] font-black text-[#111111] leading-tight tracking-[-0.5px] mb-1.5">
            Apprenez le
            <br />
            Français
          </h2>
          <p className="text-[13px] text-[#444444]">
            {isSubscribed
              ? `${courses?.length ?? 0} courses · ${quizzes?.length ?? 0} quizzes`
              : "Subscribe to unlock all content"}
          </p>
        </div>
      </div>

      {/* ── Week Calendar Strip ───────────────────────────── */}
      <div className="flex justify-between gap-1.5 px-5 mb-6">
        {weekDays.map(({ date, day, isToday }) => (
          <div
            key={`${day}-${date}`}
            className={`flex-1 h-16 flex flex-col items-center justify-center gap-1 rounded-[14px] transition-colors duration-200 ${
              isToday
                ? "bg-[#111111] border-none"
                : "bg-white border border-[#E5E5E5] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            }`}
          >
            {/* Activity dot */}
            <div
              className={`w-[5px] h-[5px] rounded-full ${
                isToday ? "bg-white" : "bg-transparent"
              }`}
            />
            <span
              className={`text-[11px] capitalize ${
                isToday ? "text-white" : "text-[#999999]"
              }`}
            >
              {day}
            </span>
            <span
              className={`text-[15px] font-semibold ${
                isToday ? "text-white" : "text-[#333333]"
              }`}
            >
              {date}
            </span>
          </div>
        ))}
      </div>

      {/* ── Courses Section ───────────────────────────────── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[20px] font-bold text-[#111111]">Your Courses</h2>
          {courses && courses.length > 0 && (
            <span className="text-[11px] font-medium text-[#555555] bg-white border border-black/[0.08] rounded-[20px] px-[10px] py-1">
              {courses.length} available
            </span>
          )}
        </div>

        {isSubscribed ? (
          !courses || courses.length === 0 ? (
            <div className="bg-white rounded-[20px] py-8 px-5 text-center text-[#999999] text-[13px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              No courses published yet. Check back soon!
            </div>
          ) : (
            <CardGrid
              items={courses.map((c, i) => ({
                id: c.id,
                title: c.title,
                meta: c.description ?? c.content_text ?? undefined,
                badge: c.level,
                color: CARD_COLORS[i % CARD_COLORS.length],
                href: `/temp/dashboard/courses/${c.id}`,
                cta: "Start learning →",
              }))}
            />
          )
        ) : (
          <LockedCard
            count={courses?.length ?? 0}
            noun="course"
            color="#FBBF24"
          />
        )}
      </section>

      {/* ── Quizzes Section ────────────────────────────────── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[20px] font-bold text-[#111111]">
            Practice Quizzes
          </h2>
          {quizzes && quizzes.length > 0 && (
            <span className="text-[11px] font-medium text-[#555555] bg-white border border-black/[0.08] rounded-[20px] px-[10px] py-1">
              {quizzes.length} available
            </span>
          )}
        </div>

        {isSubscribed ? (
          !quizzes || quizzes.length === 0 ? (
            <div className="bg-white rounded-[20px] py-8 px-5 text-center text-[#999999] text-[13px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              No quizzes available yet. Check back soon!
            </div>
          ) : (
            <CardGrid
              items={quizzes.map((q, i) => ({
                id: q.id,
                title: q.title,
                meta: q.description ?? undefined,
                badge: "Quiz",
                color: CARD_COLORS[(i + 1) % CARD_COLORS.length],
                href: `/temp/dashboard/quizzes/${q.id}`,
                cta: "Take quiz →",
              }))}
            />
          )
        ) : (
          <LockedCard
            count={quizzes?.length ?? 0}
            noun="quiz"
            color="#93C5FD"
          />
        )}
      </section>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CardItem {
  id: string;
  title: string;
  meta?: string;
  badge: string;
  color: string;
  href: string;
  cta: string;
}

function CardGrid({ items }: { items: CardItem[] }) {
  return (
    <div className="flex overflow-x-auto pb-4 gap-4 snap-x no-scrollbar -mx-5 px-5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          style={{ background: item.color }}
          className="flex-shrink-0 w-[280px] snap-center rounded-[24px] p-5 flex flex-col justify-between min-h-[180px] overflow-hidden relative no-underline shadow-[0_4px_20px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all"
        >
          {/* Decorative background shapes */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute right-4 -bottom-4 w-20 h-20 rounded-full bg-white/[0.07]" />

          <span className="inline-block bg-white/70 backdrop-blur-sm rounded-[20px] px-3 py-1 text-[11px] font-bold text-[#444444] border border-black/[0.06] self-start relative z-10">
            {item.badge}
          </span>
          <div className="relative z-10">
            <h3 className="text-[20px] font-black text-[#111111] leading-tight mb-1.5 px-0.5 line-clamp-1">
              {item.title}
            </h3>
            {item.meta && (
              <p className="text-[13px] font-medium text-[#333333] mb-3 leading-relaxed line-clamp-2 px-0.5">
                {item.meta}
              </p>
            )}
            <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#111111] px-0.5">
              {item.cta}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LockedCard({
  count,
  noun,
  color,
}: {
  count: number;
  noun: string;
  color: string;
}) {
  return (
    <div
      style={{ background: color }}
      className="rounded-[20px] py-6 px-5 flex flex-col items-center text-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center">
        <svg
          width="22"
          height="22"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#555555"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <div>
        <p className="text-base font-bold text-[#111111] mb-1">
          {count > 0
            ? `${count} ${noun}${count > 1 ? (noun === "quiz" ? "zes" : "s") : ""} waiting for you`
            : `${noun === "quiz" ? "Quizzes" : "Courses"} coming soon`}
        </p>
        <p className="text-[13px] text-[#444444]">
          Contact your administrator to upgrade your plan
        </p>
      </div>
    </div>
  );
}
