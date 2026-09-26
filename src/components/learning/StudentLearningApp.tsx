"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Trophy,
  ArrowRight,
  Flame,
  Zap,
  Coins,
  Heart,
  BookOpen,
  Headphones,
  ChevronRight,
  Lock,
  Check,
} from "lucide-react";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import { useTrustedLearning } from "@/hooks/useTrustedLearning";
import type { ProgressSnapshot } from "@/lib/learning/progress";
import type { AvailableModule, SessionMode } from "@/types/gamification";
import { StudentSurface } from "@/components/ui/learning/portal";
import { SidebarProvider } from "@/components/ui/learning/sidebar";
import {
  StudentSidebar,
  studentNav as nav,
  type StudentView,
} from "./StudentSidebar";
import { StudentProfile, type StudentAccount } from "./StudentProfile";
import { NextChapterCard } from "./NextChapterCard";
import { CourseStartDialog } from "./CourseStartDialog";
import { CourseMaterialReader } from "./CourseMaterialReader";
import { LanguageSelection } from "./LanguageSelection";
import { ProgressSyncNotice } from "./ProgressSyncNotice";
import { Onboarding } from "./Onboarding";
import { TrustedLesson } from "./TrustedLesson";
import { LogoutButton } from "@/app/temp/dashboard/LogoutButton";
import "./student-learning.css";
type Props = {
  userId: string;
  learnerName: string;
  account: StudentAccount | null;
  initialProgress: ProgressSnapshot | null;
  initialError: string | null;
};
function utcStreak(days: string[]) {
  const date = new Date();
  const key = () => date.toISOString().slice(0, 10);
  if (!days.includes(key())) date.setUTCDate(date.getUTCDate() - 1);
  let count = 0;
  while (days.includes(key())) {
    count++;
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return count;
}
export function StudentLearningApp(props: Props) {
  return (
    <StudentSurface>
      {props.initialProgress && !props.initialError ? (
        <LearningDashboard {...props} initialProgress={props.initialProgress} />
      ) : (
        <main className="language-selection">
          <h1>Your journey will be right here.</h1>
          <p role="alert">
            {props.initialError || "Your preferences could not be loaded."}
          </p>
          <button className="primary" onClick={() => window.location.reload()}>
            Try again
          </button>
          <LogoutButton />
        </main>
      )}
    </StudentSurface>
  );
}
function LearningDashboard({
  userId,
  learnerName,
  account,
  initialProgress,
}: Omit<Props, "initialError"> & { initialProgress: ProgressSnapshot }) {
  const router = useRouter();
  // Legacy snapshot is preferences only. No gamification reads or writes here.
  const { state, setState, progress, status, error, selectFrench, flush } =
    useLearningProgress(userId, initialProgress);
  const learning = useTrustedLearning(userId);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active =
    nav.find((item) => item.name.toLowerCase() === searchParams.get("view"))
      ?.name ?? "Home";
  const [onboarding, setOnboarding] = useState(false);
  const [courseChoice, setCourseChoice] = useState<AvailableModule | null>(
    null,
  );
  const [reader, setReader] = useState<AvailableModule | null>(null);
  const [startError, setStartError] = useState("");
  function setActive(view: StudentView) {
    setReader(null);
    const query = new URLSearchParams(searchParams.toString());
    query.set("view", view.toLowerCase());
    router.replace(`${pathname}?${query}`, { scroll: false });
  }
  const name = state.profile?.name || learnerName;
  const { catalogue, session } = learning;
  const modules = catalogue?.assignment ? catalogue.modules : [],
    available = modules.filter((m) => !m.locked);
  const next = available.find((m) => !m.completed) ?? available[0];
  const canPractice =
    !!catalogue?.assignment &&
    (status === "saved" || status === "saving") &&
    !learning.busy &&
    !learning.loading;
  const due = available.reduce((n, m) => n + m.dueReviews, 0);
  const complete = modules.filter((m) => m.completed).length;
  function begin(mode: SessionMode, moduleId = next?.id) {
    if (!canPractice || !moduleId) return;
    if (mode === "lesson") {
      const selectedModule = available.find((item) => item.id === moduleId);
      if (selectedModule) {
        setStartError("");
        setCourseChoice(selectedModule);
      }
    } else void learning.open(moduleId, mode);
  }
  async function startExercises(moduleId: string) {
    if (!canPractice) return;
    setStartError("");
    const started = await learning.open(moduleId, "lesson");
    if (started) {
      setCourseChoice(null);
      setReader(null);
    } else
      setStartError(
        "The exercises could not start. Please try again; your progress is safe.",
      );
  }
  if (!progress.selectedLanguage || progress.revision === 0)
    return (
      <>
        <LanguageSelection
          name={name}
          saving={status === "saving"}
          onSelect={() => void selectFrench().catch(() => {})}
        />
        <ProgressSyncNotice status={status} error={error} retry={flush} />
      </>
    );
  const stats = catalogue
    ? [
        {
          icon: Flame,
          value: utcStreak(catalogue.days),
          label: "day streak · UTC",
          color: "orange",
        },
        {
          icon: Zap,
          value: catalogue.totals.xp,
          label: "total XP",
          color: "violet",
        },
        {
          icon: Coins,
          value: catalogue.totals.coins,
          label: "coins earned",
          color: "gold",
        },
        {
          icon: Heart,
          value: `${catalogue.totals.hearts} / 5`,
          label: "hearts",
          color: "pink",
        },
      ]
    : [];
  const moduleList = (
    <div className="unit-list">
      {modules.map((m, i) => (
        <section key={m.id} className={`unit-card ${m.locked ? "locked" : ""}`}>
          <span className="unit-number">
            {m.locked ? <Lock /> : m.completed ? <Check /> : i + 1}
          </span>
          <div>
            <span className="eyebrow">
              {m.courseTitle} · {m.proficiency}
            </span>
            <h2>{m.title}</h2>
            <p>{m.objective}</p>
            <small>
              {m.questionCount} questions ·{" "}
              {m.accessTier === "premium" ? "Premium" : "Free"}
              {m.completed ? " · Completed" : ""}
            </small>
          </div>
          <button
            className="primary"
            disabled={!canPractice || m.locked}
            onClick={() => begin("lesson", m.id)}
          >
            {m.locked
              ? "Subscription required"
              : m.completed
                ? "Practise again"
                : "Start lesson"}
            <ArrowRight size={17} />
          </button>
        </section>
      ))}
    </div>
  );
  const practice = (
    <div className="play-grid">
      {[
        {
          mode: "review" as const,
          title: "Gentle review",
          copy: `${due} questions due across your lessons. Correct answers restore hearts.`,
          icon: Heart,
          module: available.find((m) => m.dueReviews > 0) ?? next,
        },
        {
          mode: "words" as const,
          title: "Word practice",
          copy: "Recall useful French words and choose their meanings.",
          icon: BookOpen,
          module: available.find((m) =>
            m.types.some(
              (t) => t === "typed_recall" || t === "multiple_choice",
            ),
          ),
        },
        {
          mode: "listening" as const,
          title: "Tune your ear",
          copy: "Listen to French, then choose what you heard.",
          icon: Headphones,
          module: available.find((m) => m.types.includes("listening_choice")),
        },
        {
          mode: "daily" as const,
          title: "Daily challenge",
          copy: "Complete a session for your daily bonus. Rewards reset at midnight UTC.",
          icon: Trophy,
          module: next,
        },
      ].map(({ mode, title, copy, icon: Icon, module }) => (
        <section className="play-card" key={mode}>
          <Icon size={26} />
          <h2>{title}</h2>
          <p>{copy}</p>
          <button
            className="primary"
            disabled={!canPractice || !module}
            onClick={() => begin(mode, module?.id)}
          >
            Let’s practise <ArrowRight size={16} />
          </button>
        </section>
      ))}
    </div>
  );
  return (
    <SidebarProvider
      style={{ "--lla-sidebar-width": "232px" } as React.CSSProperties}
    >
      <StudentSidebar active={active} onNavigate={setActive} />
      <div
        className={`app-shell ${state.profile?.largeText ? "large-text" : ""}`}
      >
        <header className="topbar">
          <div className="breadcrumb">
            My learning space <ChevronRight size={14} />
            <b>{active}</b>
          </div>
          <div className="top-tools">
            <span className="language-chip">
              <span className="flag" aria-hidden>
                🇫🇷
              </span>
              <span>French</span>
              <span className="language-level">
                {account?.frenchLevel || next?.proficiency || "A1"}
              </span>
            </span>
            <span className="sync-status" role="status" data-state={status}>
              <span className="sync-dot" aria-hidden />
              <span>
                {learning.loading
                  ? "Loading…"
                  : learning.error
                    ? "Needs attention"
                    : status === "saved"
                      ? "Saved"
                      : status === "saving"
                        ? "Saving…"
                        : "Not saved"}
              </span>
            </span>
            <div className="topbar-account">
              <button
                aria-label="Open your profile"
                className="avatar small"
                onClick={() => setActive("Profile")}
              >
                {name[0]?.toUpperCase()}
              </button>
              <LogoutButton compact disabled={status !== "saved"} />
            </div>
          </div>
        </header>
        <main className="dashboard">
          {learning.error && (
            <div className="storage-warning" role="alert">
              {learning.error}
              <button
                className="plain-button"
                disabled={learning.busy || learning.loading}
                onClick={() =>
                  void (learning.hasPendingStart
                    ? learning.retryStart()
                    : learning.refresh())
                }
              >
                Try again
              </button>
            </div>
          )}
          {learning.loading && !catalogue && (
            <p role="status">Loading your lessons and saved progress…</p>
          )}
          {!reader &&
            ["Home", "Learn", "Play"].includes(active) &&
            catalogue?.assignment &&
            modules.length === 0 && (
              <section className="leaderboard-empty">
                <BookOpen size={38} />
                <h2>Your next chapter is on its way.</h2>
                <p>
                  Your teachers are preparing interactive French lessons.
                  Published lessons will appear here.
                </p>
                <button
                  className="primary"
                  onClick={() => void learning.refresh()}
                >
                  Check for lessons
                </button>
              </section>
            )}
          {catalogue &&
            !catalogue.assignment &&
            ["Home", "Learn", "Play"].includes(active) && (
              <section className="leaderboard-empty" role="status">
                <BookOpen size={38} />
                <h2>Your learning space is ready.</h2>
                <p>
                  You have not been assigned to a teacher yet. Please wait or
                  contact your administrator.
                </p>
                <button
                  className="primary"
                  disabled={learning.loading}
                  onClick={() => void learning.refresh()}
                >
                  Check assignment
                </button>
              </section>
            )}
          {reader && catalogue?.assignment && (
            <CourseMaterialReader
              key={reader.id}
              userId={userId}
              moduleId={reader.id}
              disabled={!canPractice}
              onBack={() => setActive("Learn")}
              onStart={() => void startExercises(reader.id)}
            />
          )}
          {!reader && active === "Home" && (
            <>
              <section className="greeting">
                <div>
                  <div className="eyebrow">LET’S MAKE A LITTLE PROGRESS</div>
                  <h1>
                    Bonjour, {name} <span>✦</span>
                  </h1>
                  <p>A few new words. A world of possibilities.</p>
                </div>
                <div className="date-label">
                  YOUR FRENCH ADVENTURE
                  <br />
                  <strong>One lesson at a time</strong>
                </div>
              </section>
              <div className="stats-row">
                {stats.map(({ icon: Icon, value, label, color }) => (
                  <div className="stat" key={label}>
                    <span className={`stat-icon ${color}`}>
                      <Icon size={23} />
                    </span>
                    <div>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
              {catalogue && catalogue.activeSessions.length > 0 && (
                <section className="resume-panel">
                  <div>
                    <strong>Pick up where you left off</strong>
                    <p>Your previous answers are already saved.</p>
                  </div>
                  <button
                    className="secondary"
                    disabled={!canPractice}
                    onClick={() =>
                      void learning.open(
                        undefined,
                        "lesson",
                        catalogue.activeSessions[0].id,
                      )
                    }
                  >
                    Resume session <ArrowRight size={16} />
                  </button>
                </section>
              )}
              {next && (
                <div className="dashboard-grid">
                  <div className="main-column">
                    <NextChapterCard
                      module={next}
                      completed={complete}
                      total={modules.length}
                      disabled={!canPractice}
                      onContinue={() => begin("lesson")}
                    />
                    <section className="trusted-path">
                      <div className="section-heading">
                        <h2>Your learning path</h2>
                        <button
                          className="text-button"
                          onClick={() => setActive("Learn")}
                        >
                          View all
                        </button>
                      </div>
                      {moduleList}
                    </section>
                  </div>
                  <aside className="right-column">
                    <section className="panel">
                      <span className="eyebrow">A LITTLE, EVERY DAY</span>
                      <h3>
                        {catalogue?.completedSessions ?? 0} sessions completed
                      </h3>
                      <p className="small-copy">
                        Every completed session counts towards your streak. Your
                        saved progress follows you between devices.
                      </p>
                    </section>
                    <section className="challenge-card">
                      <span className="eyebrow">KEEP YOUR FRENCH FRESH</span>
                      <h3>Gentle review</h3>
                      <p>
                        {due
                          ? `${due} questions are ready for another look.`
                          : "Revisit a lesson and build your confidence."}{" "}
                        Correct answers restore hearts.
                      </p>
                      <button
                        className="secondary"
                        disabled={!canPractice}
                        onClick={() =>
                          begin(
                            "review",
                            (available.find((m) => m.dueReviews > 0) ?? next)
                              .id,
                          )
                        }
                      >
                        Start review <Heart size={16} />
                      </button>
                    </section>
                  </aside>
                </div>
              )}
              {!next && modules.length > 0 && moduleList}
              <footer className="page-footer">
                Made for your own pace.
                <span>Every word is a step forward.</span>
              </footer>
            </>
          )}
          {!reader && !!catalogue?.assignment && active === "Learn" && (
            <section className="view-page">
              <span className="eyebrow">YOUR FRENCH JOURNEY</span>
              <h1>One chapter at a time.</h1>
              <p>Explore lessons published by your teachers.</p>
              {moduleList}
            </section>
          )}
          {!reader && !!catalogue?.assignment && active === "Play" && (
            <section className="view-page">
              <span className="eyebrow">PRACTICE THAT FEELS LIKE PLAY</span>
              <h1>A little practice goes a long way.</h1>
              <p>Choose your next challenge.</p>
              {practice}
            </section>
          )}
          {!reader && active === "Profile" && (
            <StudentProfile
              name={name}
              account={account}
              focus={state.profile?.focus || "Everyday French"}
              stats={stats}
              largeText={!!state.profile?.largeText}
              onEdit={() => setOnboarding(true)}
              onToggleText={() =>
                state.profile
                  ? setState((s) => ({
                      ...s,
                      profile: s.profile && {
                        ...s.profile,
                        largeText: !s.profile.largeText,
                      },
                    }))
                  : setOnboarding(true)
              }
            />
          )}
          {!reader && active === "Leaderboard" && (
            <section className="leaderboard-empty">
              <Trophy size={40} />
              <h2>Your own progress comes first.</h2>
              <p>
                Shared leaderboards are coming later. You’ve earned{" "}
                {catalogue?.totals.xp ?? "…"} XP so far.
              </p>
            </section>
          )}
        </main>
        <nav className="mobile-nav">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={active === name ? "selected" : ""}
              onClick={() => setActive(name)}
            >
              <Icon size={20} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
      </div>
      {courseChoice && !session && (
        <CourseStartDialog
          title={courseChoice.title}
          busy={learning.busy}
          canStart={canPractice}
          error={learning.error || startError}
          onClose={() => setCourseChoice(null)}
          onRead={() => {
            setActive("Learn");
            setReader(courseChoice);
            setCourseChoice(null);
          }}
          onSkip={() => void startExercises(courseChoice.id)}
        />
      )}
      {onboarding && (
        <Onboarding
          learnerName={learnerName}
          profile={state.profile}
          onClose={() => setOnboarding(false)}
          onSave={(profile) => {
            setState((s) => ({ ...s, profile }));
            setOnboarding(false);
          }}
        />
      )}
      {session && (
        <TrustedLesson
          key={`${session.id}:${session.receipts.length}`}
          session={session}
          userId={userId}
          hearts={catalogue?.totals.hearts ?? session.totals.hearts}
          onConfirm={learning.confirm}
          onClose={learning.close}
          onResume={() => void learning.open(undefined, "lesson", session.id)}
        />
      )}
      <ProgressSyncNotice status={status} error={error} retry={flush} />
    </SidebarProvider>
  );
}
