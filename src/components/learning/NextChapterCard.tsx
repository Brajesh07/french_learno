"use client";
import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/learning/progress";
import type { AvailableModule } from "@/types/gamification";

export function NextChapterCard({
  module,
  completed,
  total,
  disabled,
  onContinue,
}: {
  module: AvailableModule;
  completed: number;
  total: number;
  disabled: boolean;
  onContinue: () => void;
}) {
  return (
    <section className="next-chapter-card relative grid min-w-0 gap-6 overflow-hidden rounded-3xl border border-violet-100 bg-[#f1edff] p-5 sm:p-7">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_80px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_130px] sm:gap-5">
        <div className="grid min-w-0 gap-4">
          <span className="text-[10px] font-bold tracking-[.12em] text-violet-700">
            YOUR NEXT CHAPTER
          </span>
          <h2 className="break-words text-2xl font-bold leading-tight sm:text-3xl">
            {module.title}
          </h2>
          <p className="break-words text-sm leading-relaxed text-slate-600">
            {module.objective}
          </p>
          <span className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <BookOpen size={15} />
            {module.questionCount} questions · {module.proficiency}
          </span>
        </div>
        <Image
          src="/learning/learning-mascot.png"
          alt=""
          width={240}
          height={240}
          className="pointer-events-none h-auto w-full self-center object-contain"
        />
      </div>
      <div className="grid min-w-0 gap-3">
        <Progress
          value={total ? (completed / total) * 100 : 0}
          aria-label="Completed modules"
        />
        <span className="text-xs text-slate-600">
          {completed} of {total} modules completed
        </span>
        <button
          className="primary w-full justify-center sm:w-fit"
          disabled={disabled}
          onClick={onContinue}
        >
          Continue learning <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
