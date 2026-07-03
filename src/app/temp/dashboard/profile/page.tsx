import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "../LogoutButton";
import { ProfileEditForm } from "./ProfileEditForm";

const FRENCH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const LEVEL_LABELS: Record<string, string> = {
  A1: "Absolute Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Mastery",
};

const LEVEL_COLORS: Record<string, string> = {
  A1: "#FBBF24",
  A2: "#93C5FD",
  B1: "#F9A8D4",
  B2: "#A78BFA",
  C1: "#6EE7B7",
  C2: "#FCA5A5",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/temp/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/temp/dashboard");

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Fetch completed courses count
  const { count: completedCount } = await supabase
    .from("user_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completed", true);

  // Fetch quiz attempts count
  const { count: quizCount } = await supabase
    .from("quiz_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Best quiz score
  const { data: bestAttempt } = await supabase
    .from("quiz_attempts")
    .select("score")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  const bestScore = bestAttempt?.score ?? null;

  // Infer current French level from class field or default
  const currentLevel =
    profile.class?.match(/^(A1|A2|B1|B2|C1|C2)/)?.[1] ?? "A1";

  return (
    <>
      {/* ── Header ────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 pt-4 pb-5">
        <h1 className="text-[22px] font-black text-[#111111] tracking-[-0.5px]">
          Profile
        </h1>
        <LogoutButton />
      </header>

      <div className="px-5 flex flex-col gap-4 pb-4">
        {/* ── Avatar card ──────────────────────────────────── */}
        <div className="bg-[#A78BFA] rounded-[24px] p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(167,139,250,0.35)] flex items-center gap-4">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute right-8 -bottom-4 w-20 h-20 rounded-full bg-white/[0.07]" />
          <div className="w-16 h-16 rounded-full bg-white/70 flex items-center justify-center text-[22px] font-black text-[#7C3AED] shrink-0 relative z-10">
            {initials}
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-[19px] font-black text-[#111111] truncate leading-tight">
              {profile.name}
            </p>
            <p className="text-[13px] text-[#444444] truncate">
              @{profile.username}
            </p>
            <p className="text-[12px] text-[#444444] truncate mt-0.5">
              {profile.email}
            </p>
          </div>
        </div>

        {/* ── Subscription status ──────────────────────────── */}
        <div
          className={`rounded-[20px] p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
            profile.has_subscription
              ? "bg-[#6EE7B7]/30"
              : "bg-white border border-[#E5E5E5]"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              profile.has_subscription ? "bg-green-500" : "bg-[#E5E5E5]"
            }`}
          >
            {profile.has_subscription ? (
              <svg
                className="w-5 h-5 text-white"
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
            ) : (
              <svg
                className="w-5 h-5 text-[#999999]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            )}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#111111]">
              {profile.has_subscription ? "Pro Subscriber" : "Free Plan"}
            </p>
            <p className="text-[12px] text-[#666666]">
              {profile.has_subscription
                ? "Full access to all courses & quizzes"
                : "Contact your admin to upgrade"}
            </p>
          </div>
        </div>

        {/* ── French level progress ────────────────────────── */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <p className="text-[13px] font-semibold text-[#666666] mb-3">
            French Level
          </p>
          <div className="flex gap-2 flex-wrap">
            {FRENCH_LEVELS.map((lvl) => {
              const isActive = lvl === currentLevel;
              const color = LEVEL_COLORS[lvl];
              return (
                <div key={lvl} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-[13px] font-black transition-all ${
                      isActive
                        ? "text-white scale-110 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        : "text-[#666666]"
                    }`}
                    style={{ background: isActive ? color : "#F0F0F0" }}
                  >
                    {lvl}
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-semibold text-[#7C3AED]">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {currentLevel && (
            <p className="text-[13px] text-[#555555] mt-3">
              <span className="font-bold">{currentLevel}</span> —{" "}
              {LEVEL_LABELS[currentLevel]}
            </p>
          )}
        </div>

        {/* ── Stats ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={completedCount ?? 0}
            label="Courses Done"
            color="#FBBF24"
          />
          <StatCard
            value={quizCount ?? 0}
            label="Quizzes Taken"
            color="#A78BFA"
          />
          <StatCard
            value={bestScore !== null ? `${bestScore}%` : "—"}
            label="Best Score"
            color="#6EE7B7"
          />
        </div>

        {/* ── Account info ─────────────────────────────────── */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-[#E5E5E5]">
            <p className="text-[13px] font-semibold text-[#666666]">
              Account Details
            </p>
          </div>
          <InfoRow label="Email" value={profile.email} />
          {profile.phone && <InfoRow label="Phone" value={profile.phone} />}
          {profile.class && <InfoRow label="Class" value={profile.class} />}
          <InfoRow
            label="Account Status"
            value={profile.is_active ? "Active" : "Inactive"}
          />
          <InfoRow label="Role" value={profile.role} />
        </div>

        {/* ── Edit form ────────────────────────────────────── */}
        <ProfileEditForm
          profile={{
            id: profile.id,
            name: profile.name,
            username: profile.username,
            email: profile.email,
            phone: profile.phone,
            class: profile.class,
          }}
        />
      </div>
    </>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[20px] p-4 flex flex-col gap-1 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
      style={{ background: color + "33" }}
    >
      <span className="text-[22px] font-black text-[#111111] leading-tight">
        {value}
      </span>
      <span className="text-[11px] text-[#666666] leading-tight">{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5E5] last:border-0">
      <span className="text-[13px] text-[#666666]">{label}</span>
      <span className="text-[13px] font-semibold text-[#111111] text-right max-w-[60%] truncate capitalize">
        {value}
      </span>
    </div>
  );
}
