"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
      } catch (err) {
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Temp Login
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your temporary account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="emailOrUsername"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email or Username
              </label>
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="Email or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-md text-sm ${
              message.includes("error")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/temp/signup"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
