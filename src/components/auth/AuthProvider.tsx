"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface AppUser {
  id: string;
  email: string;
  name: string;
  username: string;
  role: "admin" | "student";
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  /** Supports email OR username login */
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ----------------------------------------------------------------
// Provider
// ----------------------------------------------------------------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const supabase = createClient();

  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevents onAuthStateChange from racing with an in-progress login() call.
  const isHandlingLogin = useRef(false);

  const clearError = () => setError(null);

  // ----------------------------------------------------------------
  // Fetch profile via server-side API route.
  // The route uses the service role key (bypasses RLS) so the result
  // is never affected by RLS timing issues or missing policies.
  // Requires an access token to authenticate the request server-side.
  // ----------------------------------------------------------------
  const fetchProfile = async (
    supabaseUser: User | null | undefined,
    accessToken?: string,
  ): Promise<AppUser | null> => {
    if (!supabaseUser?.id) {
      console.warn(
        "fetchProfile: called with no user or missing id — skipping",
      );
      return null;
    }

    if (!accessToken) {
      console.warn("fetchProfile: no access token available — skipping");
      return null;
    }

    console.log(
      "fetchProfile: calling /api/auth/profile for user.id =",
      supabaseUser.id,
    );

    try {
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 404) {
        const body = await res.json();
        console.warn("fetchProfile: profile not found —", body);
        return null;
      }

      if (!res.ok) {
        const body = await res.json();
        console.error("fetchProfile: API error —", res.status, body);
        return null;
      }

      const { profile } = await res.json();
      console.log("fetchProfile: profile loaded —", {
        id: profile.id,
        role: profile.role,
      });

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username,
        role: profile.role as "admin" | "student",
      };
    } catch (err) {
      console.error("fetchProfile: fetch failed —", err);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Login — supports email OR username
  // ----------------------------------------------------------------
  const login = async (emailOrUsername: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      isHandlingLogin.current = true;

      let email = emailOrUsername.trim();

      // If the input doesn't contain '@', treat it as a username.
      if (!email.includes("@")) {
        try {
          const res = await fetch(
            `/api/auth/lookup-email?username=${encodeURIComponent(email)}`,
          );
          if (!res.ok) {
            const body = await res.json();
            setError(body.error || "No account found with that username");
            isHandlingLogin.current = false;
            setLoading(false);
            return;
          }
          const { email: resolvedEmail } = await res.json();
          email = resolvedEmail;
        } catch (err) {
          console.error("Username lookup failed:", err);
          setError("Failed to verify username. Please try again.");
          isHandlingLogin.current = false;
          setLoading(false);
          return;
        }
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        switch (signInError.message) {
          case "Invalid login credentials":
            setError("Incorrect email/username or password");
            break;
          case "Email not confirmed":
            setError("Please confirm your email address first");
            break;
          default:
            setError(signInError.message || "Failed to login");
        }
        isHandlingLogin.current = false;
        return;
      }

      if (data.user && data.session) {
        // Pass the access token directly so fetchProfile creates an authenticated
        // client — this bypasses the async session state update on the shared
        // browser client and guarantees RLS sees auth.uid() immediately.
        const profile = await fetchProfile(
          data.user,
          data.session.access_token,
        );
        if (!profile) {
          await supabase.auth.signOut();
          setError(
            "Admin profile not found. Ensure a profile row exists in the database for this user.",
          );
          isHandlingLogin.current = false;
          return;
        }

        // For admin dashboard: enforce admin role
        if (profile.role !== "admin") {
          await supabase.auth.signOut();
          setError("Access denied: admin accounts only");
          isHandlingLogin.current = false;
          return;
        }

        setUser(profile);
        setSession(data.session);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      isHandlingLogin.current = false;
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // Logout
  // ----------------------------------------------------------------
  const logout = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout");
    }
  };

  // ----------------------------------------------------------------
  // Restore session on mount
  // ----------------------------------------------------------------
  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.user && currentSession.access_token) {
        const profile = await fetchProfile(
          currentSession.user,
          currentSession.access_token,
        );
        if (profile && profile.role === "admin") {
          setUser(profile);
          setSession(currentSession);
        }
        // Non-admin user (e.g., student) — don't populate admin context,
        // but do NOT sign them out. Their session stays valid for /temp routes.
      }
      setLoading(false);
    };

    initSession();

    // Subscribe to auth state changes (e.g., token refresh, logout from other tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("onAuthStateChange: event =", event);

      if (event === "SIGNED_OUT" || !newSession) {
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      // TOKEN_REFRESHED fires frequently — just update the session object.
      if (event === "TOKEN_REFRESHED") {
        setSession(newSession);
        setLoading(false);
        return;
      }

      // SIGNED_IN fires during login() as well. If login() is already
      // handling auth + profile loading, skip here to avoid a race condition
      // where both run fetchProfile concurrently and one overwrites the other.
      if (event === "SIGNED_IN" && isHandlingLogin.current) {
        return;
      }

      if (newSession?.user && newSession.access_token) {
        const profile = await fetchProfile(
          newSession.user,
          newSession.access_token,
        );
        if (profile && profile.role === "admin") {
          setUser(profile);
          setSession(newSession);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
