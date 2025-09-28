"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User as AppUser } from "@/lib/types";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // First, authenticate with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Get the ID token
      const idToken = await result.user.getIdToken();

      // Verify admin access through our API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If not authorized as admin, sign out from Firebase
        await signOut(auth);
        throw new Error(data.error || "Not authorized as admin");
      }

      if (data.success && data.user) {
        const appUser: AppUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          createdAt: new Date(), // We could get this from the API if needed
          lastLoginAt: new Date(),
        };
        setUser(appUser);
      }
    } catch (err) {
      const authError = err as AuthError;
      console.error("Login error:", authError);

      // Handle specific Firebase auth errors
      if (authError.code) {
        switch (authError.code) {
          case "auth/user-not-found":
            setError("No account found with this email address");
            break;
          case "auth/wrong-password":
            setError("Incorrect password");
            break;
          case "auth/invalid-email":
            setError("Invalid email address");
            break;
          case "auth/user-disabled":
            setError("This account has been disabled");
            break;
          case "auth/too-many-requests":
            setError("Too many failed attempts. Please try again later");
            break;
          case "auth/network-request-failed":
            setError(
              "Network error. Please check your internet connection and try again."
            );
            break;
          case "auth/timeout":
            setError("Request timed out. Please try again.");
            break;
          default:
            setError(authError.message || "Failed to login");
        }
      } else {
        // Handle our custom admin authorization errors
        setError(authError.message || "Failed to login");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);

      // Call logout API to clear session cookie
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // Sign out from Firebase
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        try {
          setLoading(true);
          setError(null);

          if (firebaseUser) {
            try {
              // Get ID token and verify admin status
              const idToken = await firebaseUser.getIdToken();

              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ idToken }),
              });

              if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                  const appUser: AppUser = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    createdAt: new Date(),
                    lastLoginAt: new Date(),
                  };
                  setUser(appUser);
                } else {
                  // Not authorized as admin
                  setUser(null);
                  await signOut(auth);
                }
              } else {
                // API call failed, user not authorized
                setUser(null);
                await signOut(auth);
              }
            } catch (error) {
              console.error("Admin verification failed:", error);
              setUser(null);
              await signOut(auth);
            }
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
          setError("Failed to load user data");
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  const getIdToken = async (): Promise<string | null> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch (error) {
      console.error("Failed to get ID token:", error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
