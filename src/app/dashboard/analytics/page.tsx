"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ActivityData } from "./ActivityLineChart";
import type { SubscriptionData } from "./SubscriptionDonutChart";
import type { QuizPerformanceData } from "./QuizPerformanceChart";
import type { LevelDistributionData } from "./LevelDistributionChart";

// Dynamically import chart components with SSR disabled (canvas requires browser)
const ActivityLineChart = dynamic(
  () => import("./ActivityLineChart").then((m) => m.ActivityLineChart),
  { ssr: false },
);
const SubscriptionDonutChart = dynamic(
  () =>
    import("./SubscriptionDonutChart").then((m) => m.SubscriptionDonutChart),
  { ssr: false },
);
const QuizPerformanceChart = dynamic(
  () => import("./QuizPerformanceChart").then((m) => m.QuizPerformanceChart),
  { ssr: false },
);
const LevelDistributionChart = dynamic(
  () =>
    import("./LevelDistributionChart").then((m) => m.LevelDistributionChart),
  { ssr: false },
);

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface KPIData {
  totalStudents: number;
  activeThisWeek: number;
  avgQuizScore: number;
  overallPassRate: number;
}

// ----------------------------------------------------------------
// Skeleton helpers
// ----------------------------------------------------------------
function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
    />
  );
}

// ----------------------------------------------------------------
// KPI Card
// ----------------------------------------------------------------
function KPICard({
  label,
  value,
  sub,
  loading,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
  trend?: { label: string; positive: boolean };
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      {loading ? (
        <>
          <SkeletonBox className="h-8 w-24 mt-1" />
          <SkeletonBox className="h-4 w-16 mt-1" />
        </>
      ) : (
        <>
          <span className="text-3xl font-semibold text-gray-900 dark:text-white leading-none mt-1">
            {value}
          </span>
          {sub && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {sub}
            </span>
          )}
          {trend && (
            <span
              className={`text-xs font-medium mt-1 ${
                trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {trend.label}
            </span>
          )}
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Chart card wrapper
// ----------------------------------------------------------------
function ChartCard({
  title,
  subtitle,
  error,
  loading,
  loadingHeight = "h-64",
  children,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  loading: boolean;
  loadingHeight?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {headerRight}
      </div>
      {loading ? (
        <SkeletonBox className={`w-full ${loadingHeight}`} />
      ) : error ? (
        <div
          className={`${loadingHeight} flex items-center justify-center text-sm text-red-500 dark:text-red-400`}
        >
          {error}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Legend row component
// ----------------------------------------------------------------
function Legend({
  items,
}: {
  items: { color: string; label: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
            style={{
              backgroundColor: item.color,
              backgroundImage: item.dashed
                ? `repeating-linear-gradient(90deg, ${item.color} 0px, ${item.color} 4px, transparent 4px, transparent 8px)`
                : "none",
              opacity: item.dashed ? 0.85 : 1,
            }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------
// Main analytics page
// ----------------------------------------------------------------
export default function AnalyticsPage() {
  // Data state
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData | null>(
    null,
  );
  const [quizPerf, setQuizPerf] = useState<QuizPerformanceData | null>(null);
  const [levelDist, setLevelDist] = useState<LevelDistributionData | null>(
    null,
  );

  // Loading state per section
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingQuizPerf, setLoadingQuizPerf] = useState(true);
  const [loadingLevelDist, setLoadingLevelDist] = useState(true);

  // Error state per section
  const [errorKpis, setErrorKpis] = useState<string | null>(null);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);
  const [errorSubs, setErrorSubs] = useState<string | null>(null);
  const [errorQuizPerf, setErrorQuizPerf] = useState<string | null>(null);
  const [errorLevelDist, setErrorLevelDist] = useState<string | null>(null);

  // Activity range toggle
  const [activityRange, setActivityRange] = useState<"weekly" | "monthly">(
    "weekly",
  );

  // ----------------------------------------------------------------
  // Fetch helpers
  // ----------------------------------------------------------------
  const fetchKpis = useCallback(async () => {
    setLoadingKpis(true);
    setErrorKpis(null);
    try {
      const res = await fetch("/api/admin/analytics/kpis", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load KPIs");
      setKpis(await res.json());
    } catch {
      setErrorKpis("Failed to load");
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  const fetchActivity = useCallback(async (range: "weekly" | "monthly") => {
    setLoadingActivity(true);
    setErrorActivity(null);
    try {
      const res = await fetch(`/api/admin/analytics/activity?range=${range}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load activity");
      setActivity(await res.json());
    } catch {
      setErrorActivity("Failed to load");
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    setErrorSubs(null);
    try {
      const res = await fetch("/api/admin/analytics/subscriptions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load subscriptions");
      setSubscriptions(await res.json());
    } catch {
      setErrorSubs("Failed to load");
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const fetchQuizPerf = useCallback(async () => {
    setLoadingQuizPerf(true);
    setErrorQuizPerf(null);
    try {
      const res = await fetch("/api/admin/analytics/quiz-performance", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load quiz performance");
      setQuizPerf(await res.json());
    } catch {
      setErrorQuizPerf("Failed to load");
    } finally {
      setLoadingQuizPerf(false);
    }
  }, []);

  const fetchLevelDist = useCallback(async () => {
    setLoadingLevelDist(true);
    setErrorLevelDist(null);
    try {
      const res = await fetch("/api/admin/analytics/level-distribution", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load level distribution");
      setLevelDist(await res.json());
    } catch {
      setErrorLevelDist("Failed to load");
    } finally {
      setLoadingLevelDist(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchKpis();
    fetchActivity(activityRange);
    fetchSubscriptions();
    fetchQuizPerf();
    fetchLevelDist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when range toggles
  useEffect(() => {
    fetchActivity(activityRange);
  }, [activityRange, fetchActivity]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of student activity, quiz performance, and subscription
          metrics.
        </p>
      </div>

      {/* ── Row 1: KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Students"
          value={kpis ? kpis.totalStudents.toLocaleString() : "—"}
          sub="All registered students"
          loading={loadingKpis}
        />
        <KPICard
          label="Active This Week"
          value={kpis ? kpis.activeThisWeek.toLocaleString() : "—"}
          sub="Distinct quiz takers (7 days)"
          loading={loadingKpis}
          trend={
            kpis
              ? {
                  label:
                    kpis.activeThisWeek > 0
                      ? `${kpis.activeThisWeek} students active`
                      : "No activity yet",
                  positive: kpis.activeThisWeek > 0,
                }
              : undefined
          }
        />
        <KPICard
          label="Avg Quiz Score"
          value={kpis ? `${kpis.avgQuizScore}%` : "—"}
          sub="Across all quiz attempts"
          loading={loadingKpis}
          trend={
            kpis
              ? {
                  label:
                    kpis.avgQuizScore >= 70
                      ? "Above pass threshold"
                      : "Below pass threshold",
                  positive: kpis.avgQuizScore >= 70,
                }
              : undefined
          }
        />
        <KPICard
          label="Overall Pass Rate"
          value={kpis ? `${kpis.overallPassRate}%` : "—"}
          sub="All quiz attempts"
          loading={loadingKpis}
          trend={
            kpis
              ? {
                  label:
                    kpis.overallPassRate >= 70
                      ? "Healthy pass rate"
                      : "Needs attention",
                  positive: kpis.overallPassRate >= 70,
                }
              : undefined
          }
        />
      </div>

      {/* ── Row 2: Activity Chart + Subscription Donut ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Line Chart — 3/5 width */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Student Activity"
            subtitle="Signups and active students over time"
            error={errorActivity}
            loading={loadingActivity}
            loadingHeight="h-72"
            headerRight={
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(["weekly", "monthly"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActivityRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activityRange === r
                        ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            }
          >
            <>
              <Legend
                items={[
                  { color: "#534AB7", label: "New Signups" },
                  { color: "#1D9E75", label: "Active Students", dashed: true },
                ]}
              />
              <div className="h-64 mt-4">
                {activity && <ActivityLineChart data={activity} />}
              </div>
            </>
          </ChartCard>
        </div>

        {/* Subscription Donut — 2/5 width */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Subscription Split"
            subtitle="Free vs paid plan distribution"
            error={errorSubs}
            loading={loadingSubs}
            loadingHeight="h-72"
          >
            <>
              <div className="flex items-center justify-center h-48 relative">
                {subscriptions && (
                  <>
                    <SubscriptionDonutChart data={subscriptions} />
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {subscriptions.free + subscriptions.paid}
                      </span>
                      <span className="text-xs text-gray-400">total</span>
                    </div>
                  </>
                )}
              </div>
              {subscriptions && (
                <>
                  <div className="flex justify-center gap-6 mt-2">
                    <Legend
                      items={[
                        {
                          color: "#534AB7",
                          label: `Free (${subscriptions.free})`,
                        },
                        {
                          color: "#1D9E75",
                          label: `Paid (${subscriptions.paid})`,
                        },
                      ]}
                    />
                  </div>
                  {/* Conversion metric */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Conversion rate
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        subscriptions.conversionRate >= 10
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {subscriptions.conversionRate}%
                    </span>
                  </div>
                </>
              )}
            </>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 3: Quiz Performance + Level Distribution ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Performance grouped bar */}
        <ChartCard
          title="Quiz Performance by Level"
          subtitle="Average score and pass rate per course level"
          error={errorQuizPerf}
          loading={loadingQuizPerf}
          loadingHeight="h-64"
        >
          <>
            <Legend
              items={[
                { color: "#534AB7", label: "Avg Score" },
                { color: "#1D9E75", label: "Pass Rate" },
                {
                  color: "#ef4444",
                  label: "Pass Threshold (70%)",
                  dashed: true,
                },
              ]}
            />
            <div className="h-56 mt-4">
              {quizPerf && <QuizPerformanceChart data={quizPerf} />}
            </div>
          </>
        </ChartCard>

        {/* Level Distribution stacked horizontal bar */}
        <ChartCard
          title="Students per Level"
          subtitle="Quiz attempt outcomes grouped by course level"
          error={errorLevelDist}
          loading={loadingLevelDist}
          loadingHeight="h-64"
        >
          <>
            <Legend
              items={[
                { color: "#534AB7", label: "Passed" },
                { color: "#E24B4A", label: "Failed" },
              ]}
            />
            <div className="h-56 mt-4">
              {levelDist && <LevelDistributionChart data={levelDist} />}
            </div>
          </>
        </ChartCard>
      </div>
    </div>
  );
}
