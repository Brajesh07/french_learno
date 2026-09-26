"use client";
import { BadgeCheck, BookOpen, CreditCard, Mail } from "lucide-react";

export type StudentAccount = {
  email: string;
  hasSubscription: boolean;
  active: boolean;
  frenchLevel: string | null;
};
const levelNames: Record<string, string> = {
  A1: "Absolute beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Mastery",
};
export function StudentProfile({
  name,
  account,
  focus,
  stats,
  largeText,
  onEdit,
  onToggleText,
}: {
  name: string;
  account: StudentAccount | null;
  focus: string;
  stats: { label: string; value: string | number }[];
  largeText: boolean;
  onEdit: () => void;
  onToggleText: () => void;
}) {
  return (
    <section className="view-page grid gap-6">
      <div className="grid gap-2">
        <span className="eyebrow">YOUR LEARNING SPACE</span>
        <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
        <p>Your account, your pace, your French journey.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <span className="avatar profile-avatar">{name[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-bold">{name}</h2>
          <p className="text-sm text-slate-500">{focus}</p>
        </div>
        <button
          className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-violet-700 disabled:opacity-50"
          onClick={onEdit}
        >
          Edit preferences
        </button>
      </div>
      {account ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              label: "Subscription",
              value: account.hasSubscription ? "Premium plan" : "Free plan",
              detail: account.hasSubscription
                ? "Access to free and premium lessons"
                : "Access to free lessons",
              icon: CreditCard,
            },
            {
              label: "French level",
              value: account.frenchLevel ?? "Not assigned",
              detail: account.frenchLevel
                ? levelNames[account.frenchLevel]
                : "Your teacher can assign your level",
              icon: BookOpen,
            },
            {
              label: "Account email",
              value: account.email,
              detail: "Your sign-in email",
              icon: Mail,
            },
            {
              label: "Account status",
              value: account.active ? "Active" : "Inactive",
              detail: "Student account",
              icon: BadgeCheck,
            },
          ].map(({ label, value, detail, icon: Icon }) => (
            <section
              key={label}
              className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Icon size={18} />
                {label}
              </div>
              <h2 className="break-words text-lg font-semibold">{value}</h2>
              <p className="text-sm text-slate-500">{detail}</p>
            </section>
          ))}
        </div>
      ) : (
        <p role="alert">
          Your account details could not be loaded. Refresh the page to try
          again.
        </p>
      )}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Your learning progress"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <strong className="text-2xl">{s.value}</strong>
            <span className="text-xs text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold">Reading comfort</h2>
          <p className="text-sm text-slate-500">
            Make the dashboard text easier to read.
          </p>
        </div>
        <button
          className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-violet-700 disabled:opacity-50"
          aria-pressed={largeText}
          onClick={onToggleText}
        >
          {largeText ? "Use standard text" : "Use larger text"}
        </button>
      </div>
    </section>
  );
}
