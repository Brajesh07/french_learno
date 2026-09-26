"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import type { CourseMaterial } from "@/types/gamification";
import { learningRequest } from "@/lib/gamification/client";
import { CourseText } from "./CourseText";

function mediaUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function videoEmbed(value: string) {
  const url = new URL(value);
  const id = ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
    url.hostname,
  )
    ? (url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1])
    : url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : null;
  return id && /^[\w-]{11}$/.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : null;
}
export function CourseMaterialView({
  material,
  disabled,
  onStart,
}: {
  material: CourseMaterial;
  disabled: boolean;
  onStart: () => void;
}) {
  const image = mediaUrl(material.imageUrl),
    audio = mediaUrl(material.audioUrl),
    video = mediaUrl(material.videoUrl);
  const embed = video ? videoEmbed(video) : null;
  return (
    <article className="grid min-w-0 gap-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <header className="grid gap-3 border-b border-slate-100 pb-6">
        <span className="eyebrow">
          COURSE MATERIAL · {material.courseTitle}
        </span>
        <h1 className="break-words text-3xl font-bold leading-tight">
          {material.title}
        </h1>
        <p className="text-slate-600">{material.objective}</p>
        {material.description && <CourseText text={material.description} />}
      </header>
      {material.courseDescription && (
        <CourseText text={material.courseDescription} />
      )}
      {material.text?.trim() ? (
        <CourseText text={material.text} />
      ) : (
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-5">
          <BookOpen size={24} />
          <p>
            Your teacher hasn’t added written material for this course yet. You
            can still try the exercises.
          </p>
        </div>
      )}
      {image && (
        <figure className="min-w-0">
          {/* Teacher media hosts vary; plain img avoids a broad Next image allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`Course illustration for ${material.courseTitle}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mx-auto max-h-[420px] max-w-full rounded-2xl object-contain"
          />
        </figure>
      )}
      {audio && (
        <section className="grid min-w-0 gap-3">
          <h2 className="font-semibold">Listen along</h2>
          <audio
            aria-label="Course audio"
            controls
            preload="none"
            src={audio}
            className="w-full"
          />
          <a
            href={audio}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-violet-700 underline"
          >
            Open audio separately
          </a>
        </section>
      )}
      {video && (
        <section className="grid min-w-0 gap-3">
          <h2 className="font-semibold">Watch and learn</h2>
          {embed ? (
            <iframe
              src={embed}
              title="Course video"
              loading="lazy"
              referrerPolicy="no-referrer"
              allow="fullscreen"
              allowFullScreen
              className="aspect-video w-full rounded-2xl border-0"
            />
          ) : (
            <video
              controls
              preload="none"
              src={video}
              aria-label="Course video"
              className="max-h-[420px] w-full rounded-2xl"
            />
          )}
          <a
            href={video}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-violet-700 underline"
          >
            Open video separately
          </a>
        </section>
      )}
      <footer className="grid gap-4 border-t border-slate-100 pt-6 sm:flex sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">
            Ready to put it into practice?
          </h2>
          <p className="text-sm text-slate-500">
            Take your time. Your exercises are ready when you are.
          </p>
        </div>
        <button
          className="primary shrink-0 justify-center"
          disabled={disabled}
          onClick={onStart}
        >
          Start Exercises
          <ArrowRight size={18} />
        </button>
      </footer>
    </article>
  );
}

export function CourseMaterialReader({
  userId,
  moduleId,
  disabled,
  onBack,
  onStart,
}: {
  userId: string;
  moduleId: string;
  disabled: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const [material, setMaterial] = useState<CourseMaterial | null>(null);
  const [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setMaterial(null);
    setError("");
    learningRequest<CourseMaterial>(
      `modules/${moduleId}/material`,
      userId,
      undefined,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setMaterial(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Course material could not be loaded.",
          );
      });
    return () => controller.abort();
  }, [userId, moduleId, attempt]);
  return (
    <section className="mx-auto grid w-full max-w-3xl min-w-0 gap-5">
      <button
        className="text-button flex w-fit items-center gap-2"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back to lessons
      </button>
      <h2 ref={heading} tabIndex={-1} className="sr-only">
        Course material reader
      </h2>
      {error ? (
        <div
          role="alert"
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <p>{error}</p>
          <button
            className="secondary w-fit"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : material ? (
        <CourseMaterialView
          material={material}
          disabled={disabled}
          onStart={onStart}
        />
      ) : (
        <p role="status" className="rounded-2xl bg-white p-6">
          Loading your course material…
        </p>
      )}
    </section>
  );
}
