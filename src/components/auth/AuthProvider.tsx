"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

  const clearError = () => setError(null);

  // ----------------------------------------------------------------
  // Fetch profile from `profiles` table
  // ----------------------------------------------------------------
  const fetchProfile = async (supabaseUser: User): Promise<AppUser | null> => {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, username, email, role")
      .eq("id", supabaseUser.id)
      .single();

    if (profileError || !data) {
      console.error("Failed to fetch profile:", profileError?.message);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      username: data.username,
      role: data.role as "admin" | "student",
    };
  };

  // ----------------------------------------------------------------
  // Login — supports email OR username
  // ----------------------------------------------------------------
  const login = async (emailOrUsername: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      let email = emailOrUsername.trim();

      // If the input doesn't contain '@', treat it as a username
      if (!email.includes("@")) {
        const { data: profileData, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", email)
          .single();

        if (lookupError || !profileData) {
          setError("No account found with that username");
          return;
        }

        email = profileData.email;
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
        return;
      }

      if (data.user) {
        const profile = await fetchProfile(data.user);
        if (!profile) {
          await supabase.auth.signOut();
          setError("User profile not found. Contact administrator.");
          return;
        }

        // For admin dashboard: enforce admin role
        if (profile.role !== "admin") {
          await supabase.auth.signOut();
          setError("Access denied: admin accounts only");
          return;
        }

        setUser(profile);
        setSession(data.session);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
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

      if (currentSession?.user) {
        const profile = await fetchProfile(currentSession.user);
        if (profile && profile.role === "admin") {
          setUser(profile);
          setSession(currentSession);
        } else {
          // Not an admin — clear session
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    };

    initSession();

    // Subscribe to auth state changes (e.g., token refresh, logout from other tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession) {
        setUser(null);
        setSession(null);
      } else if (newSession?.user) {
        const profile = await fetchProfile(newSession.user);
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
