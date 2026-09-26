"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ compact = false, disabled = false }: { compact?: boolean; disabled?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/temp/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={disabled}
      aria-label="Sign out"
      title={disabled ? "Waiting for your progress to save" : "Sign out"}
      className={compact ? "topbar-signout" : "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E5E5E5] bg-white text-[13px] font-bold text-[#FF4B4B] shadow-sm active:scale-95 transition-all"}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      {compact ? <span className="topbar-signout-label">Sign out</span> : "Logout"}
    </button>
  );
}
