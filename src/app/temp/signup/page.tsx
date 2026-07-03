"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function TempSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    // Store name/username in user_metadata — profile will be created on first login
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, username },
      },
    });

    console.log("[temp/signup] signUp result:", authData, authError);

    if (authError) {
      setMessage("Signup error: " + authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setMessage(
        "Signup succeeded but no user returned. Check your email for a confirmation link.",
      );
      setLoading(false);
      return;
    }

    setMessage("Signup successful! Redirecting to login...");
    setTimeout(() => router.push("/temp/login"), 1500);
    setLoading(false);
  }

  const inputCls =
    "w-full px-4 py-[14px] rounded-[14px] border border-[#E5E5E5] text-[16px] text-[#111111] bg-[#F5F5F7] outline-none box-border";
  const labelCls = "block text-[13px] font-medium text-[#555555] mb-2";

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
            Créer un compte
          </h1>
          <p className="text-[13px] text-[#999999]">
            Start your French learning journey
          </p>
        </div>

        {/* Signup card */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className={labelCls}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="username" className={labelCls}>
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="jeandupont"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelCls}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputCls}
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
              {loading ? "Creating account..." : "Create Account"}
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
            href="/temp/login"
            className="text-[14px] font-semibold text-[#7C3AED] no-underline"
          >
            Already have an account? <span className="underline">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
