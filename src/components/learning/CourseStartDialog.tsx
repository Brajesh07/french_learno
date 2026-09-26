"use client";
import { ArrowRight, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/learning/dialog";

export function CourseStartDialog({
  title,
  busy,
  canStart,
  error,
  onClose,
  onRead,
  onSkip,
}: {
  title: string;
  busy: boolean;
  canStart: boolean;
  error: string;
  onClose: () => void;
  onRead: () => void;
  onSkip: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8"
        showCloseButton={!busy}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <BookOpen />
        </span>
        <DialogTitle className="pr-5 text-2xl leading-tight">
          A little reading before you begin?
        </DialogTitle>
        <DialogDescription className="text-base leading-relaxed">
          Do you want to read the course material first, or skip directly to the
          exercises?
        </DialogDescription>
        <p className="break-words text-sm font-semibold text-slate-600">
          {title}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="grid gap-3 pt-2">
          <button
            className="primary justify-center"
            disabled={busy}
            onClick={onRead}
          >
            <BookOpen size={18} />
            Read Course Material
          </button>
          <button
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-violet-700 disabled:opacity-50"
            disabled={busy || !canStart}
            onClick={onSkip}
          >
            {busy ? "Opening exercises…" : "Skip to Exercises"}
            <ArrowRight size={18} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
