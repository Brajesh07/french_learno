"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TempLoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let email = emailOrUsername.trim();

    // Support username login
    if (!email.includes("@")) {
      try {
        const res = await fetch(
          `/api/auth/lookup-email?username=${encodeURIComponent(email)}`,
        );
        if (!res.ok) {
          const body = await res.json();
          setMessage("Error: " + (body.error || "Username not found"));
          setLoading(false);
          return;
        }
        const { email: resolvedEmail } = await res.json();
        email = resolvedEmail;
      } catch {
        setMessage("Error: Failed to verify username");
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("[temp/login] signInWithPassword result:", data, error);

    if (error) {
      setMessage("Login error: " + error.message);
      setLoading(false);
      return;
    }

    // Notify admins that this student just logged in (fire-and-forget)
    try {
      await fetch("/api/auth/notify-login", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Non-critical — proceed regardless
    }

    router.push("/temp/dashboard");
  }

  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-[390px]">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] rounded-3xl bg-[#A78BFA] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_rgba(167,139,250,0.4)]">
            <span className="text-white text-[32px] font-black leading-none">
              F
            </span>
          </div>
          <h1 className="text-[28px] font-black text-[#111111] tracking-[-0.5px] leading-tight mb-2">
            Bon retour !
          </h1>
          <p className="text-[13px] text-[#999999]">
            Sign in to continue learning French
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="emailOrUsername"
                className="block text-[13px] font-medium text-[#555555] mb-2"
              >
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                type="text"
                placeholder="Email or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="w-full px-4 py-[14px] rounded-[14px] border border-[#E5E5E5] text-[16px] text-[#111111] bg-[#F5F5F7] outline-none box-border"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[#555555] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-[14px] rounded-[14px] border border-[#E5E5E5] text-[16px] text-[#111111] bg-[#F5F5F7] outline-none box-border"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-[20px] text-white text-base font-bold border-none mt-2 transition-colors duration-200 ${
                loading
                  ? "bg-[#C4B5FD] cursor-not-allowed"
                  : "bg-[#7C3AED] cursor-pointer hover:bg-[#6D28D9]"
              }`}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 px-4 py-3 rounded-[14px] text-[13px] font-medium ${
                message.toLowerCase().includes("error")
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="text-center mt-6">
          <Link
            href="/temp/signup"
            className="text-[14px] font-semibold text-[#7C3AED] no-underline"
          >
            Don&apos;t have an account?{" "}
            <span className="underline">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
