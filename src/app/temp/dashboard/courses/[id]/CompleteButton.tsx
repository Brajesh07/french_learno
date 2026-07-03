"use client";

import { useState } from "react";

interface CompleteButtonProps {
  courseId: string;
  initiallyCompleted: boolean;
}

export default function CompleteButton({
  courseId,
  initiallyCompleted,
}: CompleteButtonProps) {
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (completed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20 font-bold text-[13px] shadow-sm animate-in fade-in zoom-in duration-300">
        <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center shadow-sm">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        Completed
      </div>
    );
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mobile/courses/${courseId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to mark as complete. Please try again.");
        return;
      }
      setCompleted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleComplete}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-95 disabled:opacity-60 text-white font-bold text-[13px] transition-all shadow-md shadow-purple-500/20"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {loading ? "Saving..." : "Mark as Complete"}
      </button>
      {error && (
        <p className="text-[11px] text-[#FF4B4B] font-medium">{error}</p>
      )}
    </div>
  );
}
