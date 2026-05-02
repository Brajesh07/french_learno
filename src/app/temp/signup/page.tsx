"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <div>
      <h1>Temp Signup</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <br />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <br />
        <div>
          <label>Username</label>
          <br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <br />
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <br />
        <div>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <br />
        <button type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      {message && <p>{message}</p>}
      <br />
      <a href="/temp/login">Already have an account? Login</a>
    </div>
  );
}
