"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Heart, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/learning/dialog";
import { Progress } from "@/components/ui/learning/progress";
import { AudioButton, ExercisePresentation } from "./ExercisePresentation";
import {
  learningRequest,
  LearningRequestError,
} from "@/lib/gamification/client";
import type {
  AnswerSubmission,
  ConfirmedAnswer,
  ExerciseResponse,
  StartedSession,
} from "@/types/gamification";

export function TrustedLesson({
  session,
  userId,
  hearts,
  onConfirm,
  onClose,
  onResume,
  previewSubmit,
  assetUrl,
}: {
  session: StartedSession;
  userId: string;
  hearts: number;
  onConfirm: (r: ConfirmedAnswer) => void;
  onClose: () => void;
  onResume: () => void;
  /** Teacher-only sandbox transport. Never writes student progress. */
  previewSubmit?: (answer: AnswerSubmission) => Promise<ConfirmedAnswer>;
  assetUrl?: (id: string) => string;
}) {
  const resolveAsset =
    assetUrl ??
    ((id: string) => `/api/student/sessions/${session.id}/assets/${id}`);
  const [index, setIndex] = useState(session.receipts.length);
  const [receipts, setReceipts] = useState(session.receipts);
  const [answer, setAnswer] = useState(""),
    [tokens, setTokens] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]),
    [transcript, setTranscript] = useState(false);
  const [receipt, setReceipt] = useState<ConfirmedAnswer | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [needsResume, setNeedsResume] = useState(false);
  const pending = useRef<AnswerSubmission | null>(null),
    inFlight = useRef(false);
  const done = index >= session.questions.length;
  const item = session.questions[index],
    q = item?.exercise;
  const frozen = busy || !!pending.current || !!receipt || needsResume;
  const paused = hearts === 0 && session.mode !== "review" && !receipt;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function submit() {
    if (inFlight.current || receipt || !q || paused || needsResume) return;
    if (!pending.current) {
      const response: ExerciseResponse =
        q.type === "typed_recall"
          ? { type: q.type, response: { text: answer } }
          : q.type === "sentence_builder"
            ? {
                type: q.type,
                response: { tokenIds: tokens as [string, ...string[]] },
              }
            : { type: q.type, response: { optionId: answer } };
      pending.current = {
        schemaVersion: 1,
        sessionId: session.id,
        sessionQuestionId: item.id,
        idempotencyKey: crypto.randomUUID(),
        assistance: { hintIds: hints, transcriptShown: transcript },
        ...response,
      };
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = previewSubmit
        ? await previewSubmit(pending.current)
        : await learningRequest<ConfirmedAnswer>(
            `sessions/${session.id}/submit`,
            userId,
            pending.current,
          );
      pending.current = null;
      setReceipt(saved);
      setReceipts((previous) => [...previous, saved]);
      onConfirm(saved);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your answer could not be confirmed.",
      );
      if (
        e instanceof LearningRequestError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.code !== "RETRY_TRANSACTION"
      ) {
        pending.current = null;
        // A definitive input rejection can be edited. Other conflicts need a
        // fresh server snapshot; never manufacture a local result or advance.
        if (e.status !== 400) setNeedsResume(true);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function next() {
    setIndex(index + 1);
    setAnswer("");
    setTokens([]);
    setHints([]);
    setTranscript(false);
    setReceipt(null);
    setError("");
  }
  const totalXp = receipts.reduce((sum, r) => sum + r.reward.xp, 0);
  const totalCoins = receipts.reduce((sum, r) => sum + r.reward.coins, 0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="flow-dialog"
        showCloseButton={!busy}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {done ? (
          <>
            <Trophy size={48} className="completion-icon" />
            <DialogTitle className="flow-title">
              {previewSubmit
                ? "Preview complete"
                : "A little progress, well earned."}
            </DialogTitle>
            <DialogDescription>
              {receipts.filter((r) => r.isCorrect).length} of{" "}
              {session.questions.length} correct.{" "}
              {receipts.at(-1)?.session.passed === false
                ? "Keep practising, then try this lesson again."
                : previewSubmit
                  ? "Preview only. No progress or rewards were saved."
                  : "Your results are saved to your account."}
            </DialogDescription>
            <div className="result-grid">
              <span>
                <strong>+{totalXp}</strong>XP earned
              </span>
              <span>
                <strong>+{totalCoins}</strong>coins earned
              </span>
            </div>
            <button className="primary" onClick={onClose}>
              {previewSubmit ? "Back to editor" : "Back to my journey"}{" "}
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <div className="lesson-dialog-top">
              <span className="eyebrow">
                {previewSubmit ? "TEACHER PREVIEW" : session.mode} · {index + 1}{" "}
                OF {session.questions.length}
              </span>
              <span className="heart-count">
                <Heart size={18} />
                {hearts} / 5
              </span>
            </div>
            <Progress value={(index / session.questions.length) * 100} />
            <DialogTitle className="flow-title">
              {q.presentation.prompt.en}
            </DialogTitle>
            <DialogDescription>
              {q.presentation.instructions.en}
            </DialogDescription>
            <ExercisePresentation
              question={q}
              displayOrder={item.displayOrder}
              answer={answer}
              setAnswer={setAnswer}
              tokens={tokens}
              setTokens={setTokens}
              hints={hints}
              setHints={setHints}
              transcript={transcript}
              setTranscript={setTranscript}
              disabled={frozen || paused}
              assistanceDisabled={frozen}
              onSubmit={() => void submit()}
              assetUrl={resolveAsset}
            />
            {paused && (
              <p className="inline-note">
                Your hearts are empty. Close this session and choose Gentle
                review to recover hearts.
              </p>
            )}
            {error && (
              <p role="alert" className="storage-warning">
                {error}
              </p>
            )}
            {receipt && (
              <div
                className={`feedback ${receipt.isCorrect ? "success" : "try-again"}`}
                role="status"
              >
                <strong>
                  {receipt.isCorrect
                    ? "Bien joué!"
                    : "A little learning moment."}{" "}
                  +{receipt.reward.xp} XP
                </strong>
                <p lang="fr">{receipt.feedback.correctAnswerDisplay}</p>
                <p>{receipt.feedback.explanation.en}</p>
                {receipt.feedback.pronunciation && (
                  <p>
                    {receipt.feedback.pronunciation.ipa} ·{" "}
                    {receipt.feedback.pronunciation.respelling.en}
                  </p>
                )}
                {receipt.feedback.pronunciation?.audio && (
                  <AudioButton
                    assetUrl={resolveAsset}
                    audio={receipt.feedback.pronunciation.audio}
                  />
                )}
                {receipt.feedback.example && (
                  <p>
                    <span lang="fr">{receipt.feedback.example.target}</span> —{" "}
                    {receipt.feedback.example.translation.en}
                  </p>
                )}
                {receipt.feedback.cultureNote && (
                  <p>{receipt.feedback.cultureNote.en}</p>
                )}
              </div>
            )}
            <div className="flow-actions">
              {needsResume ? (
                <>
                  <button className="plain-button" onClick={onClose}>
                    Back to dashboard
                  </button>
                  <button className="primary" onClick={onResume}>
                    Reload session
                  </button>
                </>
              ) : receipt ? (
                <button className="primary" onClick={next}>
                  {receipt.session.completed ? "See results" : "Continue"}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    paused ||
                    (!pending.current &&
                      (q.type === "sentence_builder"
                        ? !tokens.length
                        : !answer.trim()))
                  }
                  onClick={() => void submit()}
                >
                  {busy
                    ? "Checking…"
                    : pending.current
                      ? "Retry saving answer"
                      : "Check answer"}
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
