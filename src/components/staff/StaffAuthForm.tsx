"use client";
import { useState, type FormEvent } from "react";
import { InputField } from "./InputField";
import ToggleButton from "./ToggleButton";

export function StaffAuthForm() {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res = await fetch(
        signup ? "/api/auth/teacher-signup" : "/api/auth/staff/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Please try again.");
      // Full navigation restores the existing admin context from the new cookie.
      window.location.assign(body.destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className="h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 gap-9">
      <div className="w-full flex-1 rounded-2xl bg-white p-6 shadow-md h-full flex items-start justify-end flex-col dark:bg-gray-800">
        <p className="text-sm font-semibold text-blue-600">
          LLA (Language Learning Application)
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {signup ? "Become a teacher" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          {signup
            ? "Create your account. An administrator will review your application before you can publish lessons."
            : "Sign in to your admin or teacher workspace."}
        </p>
        <div
          className="my-6 flex gap-2"
          role="group"
          aria-label="Staff account options"
        >
          <ToggleButton
            active={!signup}
            onClick={() => {
              setSignup(false);
              setError("");
            }}
          >
            Sign in
          </ToggleButton>
          <ToggleButton
            active={signup}
            onClick={() => {
              setSignup(true);
              setError("");
            }}
          >
            Sign Up as Teacher
          </ToggleButton>
        </div>
      </div>
      <section className="w-full flex-1">
        <form key={String(signup)} onSubmit={submit} className="space-y-4">
          {signup ? (
            <>
              <InputField
                label="Full name"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
              />
              <InputField
                label="Username"
                name="username"
                autoComplete="username"
                required
                pattern="[a-zA-Z0-9_]{3,40}"
                maxLength={40}
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </>
          ) : (
            <InputField
              label="Email or username"
              name="identifier"
              autoComplete="username"
              required
              maxLength={254}
            />
          )}
          <InputField
            label="Password"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={signup ? 10 : 1}
            maxLength={256}
          />
          {signup && (
            <>
              <InputField
                label="Expertise"
                name="expertise"
                maxLength={300}
                placeholder="French A1–B2, conversation…"
              />
              <InputField
                label="About you"
                name="bio"
                maxLength={2000}
                textarea
                rows={3}
              />
            </>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : signup
                ? "Submit teacher application"
                : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
