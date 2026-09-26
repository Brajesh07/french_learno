"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  learningRequest,
  LearningRequestError,
  newestTotals,
} from "@/lib/gamification/client";
import type {
  ConfirmedAnswer,
  LearningCatalogue,
  SessionMode,
  StartedSession,
  StartSessionRequest,
} from "@/types/gamification";
export function useTrustedLearning(userId: string) {
  const [catalogue, setCatalogue] = useState<LearningCatalogue | null>(null);
  const [session, setSession] = useState<StartedSession | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pendingStart = useRef<StartSessionRequest | null>(null),
    locked = useRef(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await learningRequest<LearningCatalogue>("modules", userId);
      setCatalogue((old) => ({
        ...data,
        totals: old ? newestTotals(old.totals, data.totals) : data.totals,
      }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your modules could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  function confirm(receipt: ConfirmedAnswer) {
    setCatalogue((old) =>
      old ? { ...old, totals: newestTotals(old.totals, receipt.totals) } : old,
    );
  }
  async function open(
    moduleId?: string,
    mode: SessionMode = "lesson",
    resumeId?: string,
  ) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (!resumeId && moduleId) {
        // Retain this exact request after transport failure. Clicking Retry
        // cannot create a second session or reshuffle its presentation.
        if (
          pendingStart.current &&
          (pendingStart.current.moduleId !== moduleId ||
            pendingStart.current.mode !== mode)
        ) {
          throw new Error(
            "Retry the pending start request before choosing another lesson.",
          );
        }
        pendingStart.current ??= {
          moduleId,
          mode,
          idempotencyKey: crypto.randomUUID(),
        };
      }
      const data = resumeId
        ? await learningRequest<StartedSession>(`sessions/${resumeId}`, userId)
        : await learningRequest<StartedSession>(
            "sessions/start",
            userId,
            pendingStart.current,
          );
      pendingStart.current = null;
      setCatalogue((old) =>
        old ? { ...old, totals: newestTotals(old.totals, data.totals) } : old,
      );
      setSession(data);
      return data;
    } catch (e) {
      if (
        e instanceof LearningRequestError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.code !== "RETRY_TRANSACTION"
      )
        pendingStart.current = null;
      setError(
        e instanceof Error ? e.message : "This session could not start.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    catalogue,
    session,
    loading,
    busy,
    error,
    refresh,
    open,
    confirm,
    hasPendingStart: !!pendingStart.current,
    retryStart: () => open(),
    close: () => {
      setSession(null);
      void refresh();
    },
  };
}
