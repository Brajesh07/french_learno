"use client";
import { useEffect, useState } from "react";
import { Lightbulb, Volume2 } from "lucide-react";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/learning/radio-group";
import type { AudioSource } from "@/types/gamification";
import type { ExerciseView } from "@/types/exercise-presentation";

export function AudioButton({
  audio,
  assetUrl,
}: {
  audio: AudioSource;
  assetUrl: (id: string) => string;
}) {
  const [error, setError] = useState("");
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (audio.source === "asset")
    return (
      <>
        <audio
          controls
          preload="none"
          onError={() =>
            setError("Audio could not load. Use the transcript or try again.")
          }
          src={assetUrl(audio.assetId)}
          aria-label="French audio"
        />
        {error && <p role="status">{error}</p>}
      </>
    );
  return (
    <>
      <button
        type="button"
        className="audio-button"
        onClick={() => {
          if (!window.speechSynthesis) {
            setError("Speech playback is unavailable. Use the transcript.");
            return;
          }
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(audio.text);
          utterance.lang = audio.locale;
          utterance.rate = audio.rate;
          utterance.onerror = () =>
            setError("Audio could not play. Use the transcript.");
          window.speechSynthesis.speak(utterance);
        }}
      >
        <Volume2 size={19} /> Listen
      </button>
      {error && <p role="status">{error}</p>}
    </>
  );
}
/** Shared display only: no session creation, grading, rewards or network writes. */
export function ExercisePresentation({
  question: q,
  displayOrder,
  answer,
  setAnswer,
  tokens,
  setTokens,
  hints,
  setHints,
  transcript,
  setTranscript,
  disabled = false,
  assistanceDisabled = false,
  onSubmit,
  assetUrl,
}: {
  question: ExerciseView;
  displayOrder: readonly string[];
  answer: string;
  setAnswer: (value: string) => void;
  tokens: string[];
  setTokens: (value: string[]) => void;
  hints: string[];
  setHints: (value: string[]) => void;
  transcript: boolean;
  setTranscript: (value: boolean) => void;
  disabled?: boolean;
  assistanceDisabled?: boolean;
  onSubmit?: () => void;
  assetUrl: (id: string) => string;
}) {
  return (
    <>
      {q.presentation.media.map((media, i) =>
        media.kind === "image" ? (
          // Authorized route serves short-lived private media, not arbitrary URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            className="exercise-image"
            src={assetUrl(media.assetId)}
            alt={media.alt.en}
          />
        ) : (
          <div key={i} className="audio-section">
            <AudioButton audio={media} assetUrl={assetUrl} />
            {q.type === "listening_choice" && (
              <button
                className="plain-button"
                disabled={assistanceDisabled}
                onClick={() => setTranscript(true)}
              >
                Show transcript
              </button>
            )}
            {transcript && <p lang="fr">{media.transcript.text}</p>}
          </div>
        ),
      )}
      {q.type === "typed_recall" && (
        <>
          <input
            className="answer-input"
            aria-label="Your French answer"
            lang="fr"
            autoComplete="off"
            spellCheck={false}
            maxLength={q.presentation.interaction.maxLength}
            disabled={disabled}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answer.trim()) onSubmit?.();
            }}
          />
          <div className="word-bank">
            {q.presentation.interaction.characterPalette.map((c) => (
              <button
                key={c}
                disabled={disabled}
                onClick={() =>
                  setAnswer(
                    (answer + c).slice(0, q.presentation.interaction.maxLength),
                  )
                }
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}
      {(q.type === "multiple_choice" || q.type === "listening_choice") && (
        <RadioGroup
          className="answer-options"
          value={answer}
          onValueChange={setAnswer}
          disabled={disabled}
        >
          {displayOrder.map((id) => {
            const option = q.presentation.interaction.options.find(
              (o) => o.id === id,
            )!;
            return (
              <label
                key={id}
                className={`answer-option ${answer === id ? "chosen" : ""}`}
              >
                <RadioGroupItem value={id} />
                <span lang="fr">{option.text}</span>
              </label>
            );
          })}
        </RadioGroup>
      )}
      {q.type === "sentence_builder" && (
        <>
          <div className="sentence-answer" aria-label="Your sentence">
            {tokens.length === 0 && (
              <span>Tap words below to build your sentence.</span>
            )}
            {tokens.map((id, i) => (
              <button
                key={id}
                disabled={disabled}
                onClick={() => setTokens(tokens.filter((_, j) => j !== i))}
                aria-label={`Remove ${q.presentation.interaction.tokens.find((t) => t.id === id)!.text}`}
              >
                {
                  q.presentation.interaction.tokens.find((t) => t.id === id)!
                    .text
                }
              </button>
            ))}
          </div>
          <div className="word-bank">
            {displayOrder.map((id) => (
              <button
                key={id}
                lang="fr"
                disabled={disabled || tokens.includes(id)}
                onClick={() => setTokens([...tokens, id])}
              >
                {
                  q.presentation.interaction.tokens.find((t) => t.id === id)!
                    .text
                }
              </button>
            ))}
          </div>
        </>
      )}
      {q.presentation.hints.map((hint) => (
        <div key={hint.id}>
          {hints.includes(hint.id) ? (
            <p className="inline-note">{hint.text.en}</p>
          ) : (
            <button
              className="plain-button hint-button"
              disabled={assistanceDisabled}
              onClick={() => setHints([...hints, hint.id])}
            >
              <Lightbulb size={16} /> Show hint
            </button>
          )}
        </div>
      ))}
    </>
  );
}
