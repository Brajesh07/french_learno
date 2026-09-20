"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import type { ProgressSnapshot } from "@/lib/learning/progress";
import { StudentSurface } from "@/components/ui/learning/portal";
import { LanguageSelection } from "./LanguageSelection";
import { ProgressSyncNotice } from "./ProgressSyncNotice";
import { LogoutButton } from "@/app/temp/dashboard/LogoutButton";
import "./student-learning.css";
import {
  Home,
  Map,
  Gamepad2,
  Trophy,
  User,
  ArrowRight,
  Flame,
  Zap,
  Coins,
  Heart,
  BookOpen,
  Headphones,
  Sparkles,
  Lock,
  Check,
  ChevronRight,
  Target,
  Settings,
  Compass,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/learning/sidebar";
import { Progress } from "@/components/ui/learning/progress";
import { Onboarding, Lesson, Session } from "@/components/learning/flows";
import {
  LearningPath,
  PlayView,
  ProfileView,
  LeaderboardView,
} from "@/components/learning/views";
import { questions, units } from "@/lib/learning/content";
import {
  Profile,
  recordAnswer,
  completeSession,
  streak,
  dateKey,
} from "@/lib/learning/model";
const nav = [
  { name: "Home", icon: Home },
  { name: "Learn", icon: Map },
  { name: "Play", icon: Gamepad2 },
  { name: "Leaderboard", icon: Trophy },
  { name: "Profile", icon: User },
];
type Props = {
  userId: string;
  learnerName: string;
  initialProgress: ProgressSnapshot | null;
  initialError: string | null;
};

export function StudentLearningApp(props: Props) {
  return (
    <StudentSurface>
      {props.initialProgress && !props.initialError ? (
        <LearningDashboard {...props} initialProgress={props.initialProgress} />
      ) : (
        <main className="language-selection">
          <h1>Your journey will be right here.</h1>
          <p role="alert">
            {props.initialError || "Your progress could not be loaded."}
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
  initialProgress,
}: Omit<Props, "initialError"> & { initialProgress: ProgressSnapshot }) {
  const router = useRouter();
  const { state, setState, progress, status, error, selectFrench, flush } =
    useLearningProgress(userId, initialProgress);
  const [active, setActive] = useState("Home");
  const [onboarding, setOnboarding] = useState(false),
    [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const pending = useRef<{ mode: Session["mode"]; unit?: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const canPractice = ready && (status === "saved" || status === "saving");
  const languageReady = !!progress.selectedLanguage && progress.revision > 0;
  async function leave(href: string) {
    try {
      await flush();
      router.push(href);
    } catch {
      /* The sync notice offers retry without dropping work. */
    }
  }
  const today = dateKey(),
    nextUnit = units.find((u) => !state.completed.includes(u.id))?.id || 4,
    minutes = Math.floor((state.seconds[today] || 0) / 60),
    goal = state.profile?.goal || 10;
  function begin(mode: Session["mode"], unit = nextUnit) {
    if (!canPractice || !languageReady) return;
    if (!stateRef.current.profile) {
      pending.current = { mode, unit };
      setOnboarding(true);
      return;
    }
    const current = stateRef.current;
    const unlocked = questions.filter(
      (q) => q.level === 1 || current.completed.includes(q.level - 1),
    );
    if (
      mode === "lesson" &&
      unit !== 1 &&
      !current.completed.includes(unit - 1)
    )
      return;
    let selected =
      mode === "lesson"
        ? questions.filter((q) => q.level === unit)
        : mode === "listening"
          ? unlocked.filter((q) => q.type === "listening")
          : mode === "words"
            ? unlocked.filter(
                (q) => q.type !== "listening" && q.type !== "sentence_builder",
              )
            : mode === "review"
              ? unlocked.filter((q) =>
                  current.mistakes.some((m) => m.id === q.id && m.due <= today),
                )
              : unlocked;
    if (mode === "daily") {
      const seed = Number(today.replaceAll("-", ""));
      selected = [...selected].sort((a, b) => {
        const due = (id: string) =>
          current.mistakes.some((m) => m.id === id && m.due <= today) ? 0 : 1;
        return (
          due(a.id) - due(b.id) ||
          ((Number(a.id.slice(-3)) * 13 + seed) % 23) -
            ((Number(b.id.slice(-3)) * 13 + seed) % 23)
        );
      });
    }
    if (!selected.length) selected = unlocked.slice(0, 5);
    setSession({
      key: Date.now(),
      questions: selected.slice(0, 5),
      mode,
      unit: mode === "lesson" ? unit : 0,
    });
  }
  function saveProfile(profile: Profile) {
    setState((s) => ({ ...s, profile }));
    stateRef.current = { ...stateRef.current, profile };
    setOnboarding(false);
    if (pending.current) {
      const p = pending.current;
      pending.current = null;
      begin(p.mode, p.unit);
    }
  }

  if (!ready)
    return (
      <main className="language-selection" aria-busy="true">
        <h1>Loading your French journey…</h1>
        <p>Your account progress is ready. Preparing your dashboard.</p>
      </main>
    );
  if (!languageReady)
    return (
      <>
        <LanguageSelection
          name={learnerName}
          saving={status === "saving"}
          onSelect={() => {
            void selectFrench().catch(() => {});
          }}
        />
        <ProgressSyncNotice status={status} error={error} retry={flush} />
      </>
    );

  return (
    <SidebarProvider
      style={{ "--lla-sidebar-width": "232px" } as React.CSSProperties}
    >
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <button className="brand" onClick={() => setActive("Home")}>
            <span className="brand-mark">
              ll<span>a</span>
            </span>
            <span className="brand-caption">a little, every day.</span>
          </button>
        </SidebarHeader>
        <SidebarContent>
          <span className="nav-caption">YOUR LEARNING SPACE</span>
          <nav>
            {nav.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => setActive(name)}
                className={`nav-item ${active === name ? "active" : ""}`}
              >
                <Icon size={21} />
                {name}
                {name === "Learn" && <span className="new-dot" />}
              </button>
            ))}
          </nav>
          <div className="existing-student-links">
            <span className="nav-caption">YOUR COURSE LIBRARY</span>
            <button onClick={() => void leave("/temp/dashboard/courses")}>
              Published courses
            </button>
            <button onClick={() => void leave("/temp/dashboard/quizzes")}>
              Course quizzes
            </button>
            <button onClick={() => void leave("/temp/dashboard/profile")}>
              Account settings
            </button>
          </div>
          <div className="side-note">
            <Compass size={29} />
            <strong>
              Small steps.
              <br />
              Whole new worlds.
            </strong>
            <p>Your next adventure starts with a word.</p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <button className="profile-link" onClick={() => setActive("Profile")}>
            <span className="avatar">
              {(state.profile?.name || learnerName)[0]?.toUpperCase() || "Y"}
            </span>
            <span>
              <strong>{state.profile?.name || learnerName}</strong>
              <small>French explorer</small>
            </span>
            <Settings size={18} />
          </button>
        </SidebarFooter>
      </Sidebar>
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
              <span className="flag" aria-hidden="true">🇫🇷</span>
              <span>French</span>
              <span className="language-level">A1</span>
            </span>
            <span className="sync-status" role="status" data-state={status}>
              <span className="sync-dot" aria-hidden="true" />
              <span>{status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Not saved"}</span>
            </span>
            <div className="topbar-account">
              <button
                aria-label="Open your profile"
                className="avatar small"
                onClick={() => setActive("Profile")}
              >
                {(state.profile?.name || learnerName)[0]?.toUpperCase() || "Y"}
              </button>
              <LogoutButton compact disabled={status !== "saved"} />
            </div>
          </div>
        </header>
        <main className="dashboard">
          {active === "Home" && (
            <>
              <section className="greeting">
                <div>
                  <div className="eyebrow">LET’S MAKE A LITTLE PROGRESS</div>
                  <h1>
                    Bonjour, {state.profile?.name || learnerName} <span>✦</span>
                  </h1>
                  <p>A new day. A few new words. A world of possibilities.</p>
                </div>
                <div className="date-label">
                  YOUR FRENCH ADVENTURE
                  <br />
                  <strong>One lesson at a time</strong>
                </div>
              </section>
              <div className="stats-row">
                {[
                  {
                    icon: Flame,
                    value: String(streak(state.days)),
                    label: "day streak",
                    color: "orange",
                  },
                  {
                    icon: Zap,
                    value: String(state.xp),
                    label: "total XP",
                    color: "violet",
                  },
                  {
                    icon: Coins,
                    value: String(state.coins),
                    label: "coins earned",
                    color: "gold",
                  },
                  {
                    icon: Heart,
                    value: `${state.hearts} / 5`,
                    label: "hearts",
                    color: "pink",
                  },
                ].map(({ icon: Icon, value, label, color }) => (
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
              <div className="dashboard-grid">
                <div className="main-column">
                  <section className="continue-card">
                    <div className="lesson-content">
                      <span className="pill">
                        {state.completed.length
                          ? "YOUR NEXT CHAPTER"
                          : "YOUR FIRST CHAPTER"}
                      </span>
                      <h2>
                        {state.completed.length
                          ? "Your next adventure?"
                          : "Big adventures start"}
                        <br />
                        {state.completed.length
                          ? units[nextUnit - 1].title
                          : "with “bonjour”."}
                      </h2>
                      <p>Meet new words. Make your first connections.</p>
                      <div className="lesson-meta">
                        <span>
                          <BookOpen size={15} /> Unit {nextUnit} ·{" "}
                          {units[nextUnit - 1].title}
                        </span>
                        <span>5 min</span>
                      </div>
                      <Progress
                        value={(state.completed.length / 4) * 100}
                        aria-label="Learning path progress"
                        className="lesson-progress"
                      />
                      <button
                        className="primary"
                        disabled={!ready}
                        onClick={() => begin("lesson")}
                      >
                        {state.profile
                          ? "Continue learning"
                          : "Start my journey"}{" "}
                        <ArrowRight size={18} />
                      </button>
                    </div>
                    <Image
                      className="mascot-image"
                      sizes="(max-width: 767px) 140px, 240px"
                      src="/learning/learning-mascot.png"
                      alt="A cheerful little orange explorer holding a blue journal"
                      width={270}
                      height={270}
                    />
                  </section>
                  <section className="journey-section">
                    <div className="section-heading">
                      <h2>Your learning journey</h2>
                      <button
                        className="text-button"
                        onClick={() => setActive("Learn")}
                      >
                        View path <ArrowRight size={16} />
                      </button>
                    </div>
                    <p className="section-subtitle">
                      Every little step brings you closer.
                    </p>
                    <div className="journey-track">
                      {[
                        {
                          title: "First words",
                          icon: BookOpen,
                          n: "01",
                          open: true,
                        },
                        {
                          title: "About you",
                          icon: User,
                          n: "02",
                          open: state.completed.includes(1),
                        },
                        {
                          title: "At the café",
                          icon: Headphones,
                          n: "03",
                          open: state.completed.includes(2),
                        },
                        {
                          title: "Out & about",
                          icon: Compass,
                          n: "04",
                          open: state.completed.includes(3),
                        },
                      ].map(({ title, icon: Icon, n, open }) => (
                        <button
                          className={`journey-stop ${open ? "current" : ""}`}
                          key={n}
                          disabled={!open}
                          onClick={() => begin("lesson", Number(n))}
                        >
                          <span className="journey-node">
                            {open ? <Icon size={27} /> : <Lock size={22} />}
                          </span>
                          <small>UNIT {n}</small>
                          <strong>{title}</strong>
                          <span className="node-status">
                            {state.completed.includes(Number(n))
                              ? "Complete"
                              : open
                                ? "Let’s begin"
                                : "Locked"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <div className="section-heading">
                      <h2>A little extra practice</h2>
                      <span className="muted">Find your flow</span>
                    </div>
                    <div className="practice-grid">
                      <button
                        className="practice-card"
                        onClick={() => begin("words")}
                      >
                        <span className="practice-icon violet">
                          <BookOpen />
                        </span>
                        <strong>Word play</strong>
                        <p>Small words, big discoveries.</p>
                        <span className="card-link">
                          Build your vocabulary <ArrowRight size={16} />
                        </span>
                      </button>
                      <button
                        className="practice-card"
                        onClick={() => begin("listening")}
                      >
                        <span className="practice-icon peach">
                          <Headphones />
                        </span>
                        <strong>Listen & learn</strong>
                        <p>Tune your ear to French.</p>
                        <span className="card-link">
                          Try listening practice <ArrowRight size={16} />
                        </span>
                      </button>
                    </div>
                  </section>
                </div>
                <aside className="right-column">
                  <section className="daily-goal panel">
                    <div className="section-heading">
                      <h3>Your daily goal</h3>
                      <Target size={20} />
                    </div>
                    <div
                      className="goal-ring"
                      style={{
                        background: `conic-gradient(#b5a5ed ${Math.min(100, (minutes / goal) * 100)}%, #fff 0)`,
                      }}
                    >
                      <span>
                        <strong>
                          {minutes}
                          <span>/{goal}</span>
                        </strong>
                        <small>minutes today</small>
                      </span>
                    </div>
                    <p>A little focus goes a long way.</p>
                    <div className="week-row">
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = new Date();
                        day.setDate(
                          day.getDate() - ((day.getDay() + 6) % 7) + i,
                        );
                        const key = dateKey(day);
                        return (
                          <span key={key}>
                            <small>
                              {day.toLocaleDateString("en", {
                                weekday: "narrow",
                              })}
                            </small>
                            <span className="week-day">
                              {state.days.includes(key) ? (
                                <Check size={12} />
                              ) : key === today ? (
                                <span className="today-dot" />
                              ) : (
                                "·"
                              )}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </section>
                  <section className="challenge-card">
                    <div className="challenge-heading">
                      <span className="challenge-icon">
                        <Zap size={23} />
                      </span>
                      <span className="mini-pill">DAILY CHALLENGE</span>
                    </div>
                    <h3>Make today count.</h3>
                    <p>
                      Five quick questions.
                      <br />
                      One satisfying little win.
                    </p>
                    <span className="reward">✦ +50 bonus XP</span>
                    <button
                      className="secondary"
                      onClick={() => begin("daily")}
                    >
                      {state.daily.includes(today)
                        ? "Practise again"
                        : "Take the challenge"}{" "}
                      <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="tip-card">
                    <span className="eyebrow">
                      <Sparkles size={15} /> A LITTLE FRENCH CULTURE
                    </span>
                    <h3>Start with “bonjour”.</h3>
                    <p>
                      When entering a shop in France, a friendly “bonjour” is a
                      lovely way to greet the person serving you.
                    </p>
                    <span className="tip-footer">
                      Little words. Meaningful connections.
                    </span>
                  </section>
                </aside>
              </div>
              <div className="mobile-library-links">
                <button onClick={() => void leave("/temp/dashboard/courses")}>
                  Courses
                </button>
                <button onClick={() => void leave("/temp/dashboard/quizzes")}>
                  Quizzes
                </button>
                <button onClick={() => void leave("/temp/dashboard/profile")}>
                  Account settings
                </button>
              </div>
              <footer className="page-footer">
                Made for your own pace.{" "}
                <span>Every word is a step forward.</span>
              </footer>
            </>
          )}
          {active === "Learn" && <LearningPath state={state} start={begin} />}{" "}
          {active === "Play" && <PlayView state={state} start={begin} />}{" "}
          {active === "Profile" && (
            <ProfileView
              state={state}
              edit={() => {
                pending.current = null;
                setOnboarding(true);
              }}
              toggleText={() =>
                setState((s) =>
                  s.profile
                    ? {
                        ...s,
                        profile: {
                          ...s.profile,
                          largeText: !s.profile.largeText,
                        },
                      }
                    : s,
                )
              }
            />
          )}{" "}
          {active === "Leaderboard" && <LeaderboardView state={state} />}
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
      {onboarding && (
        <Onboarding
          learnerName={learnerName}
          profile={state.profile}
          onClose={() => {
            setOnboarding(false);
            pending.current = null;
          }}
          onSave={saveProfile}
        />
      )}{" "}
      {session && (
        <Lesson
          key={session.key}
          session={session}
          hearts={state.hearts}
          onClose={() => setSession(null)}
          onAnswer={(q, correct, review) =>
            setState((s) => recordAnswer(s, q.id, correct, q.xpReward, review))
          }
          onComplete={(correct, total, seconds) =>
            setState((s) =>
              completeSession(
                s,
                session.unit,
                session.mode,
                correct,
                total,
                seconds,
              ),
            )
          }
        />
      )}
      <ProgressSyncNotice status={status} error={error} retry={flush} />
    </SidebarProvider>
  );
}
