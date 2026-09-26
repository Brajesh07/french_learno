"use client";
import type { AuthoringQuestion } from "@/lib/gamification/authoring";
import type { ExerciseType } from "@/types/gamification";
export const questionTypes: { value: ExerciseType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "typed_recall", label: "Typed recall" },
  { value: "sentence_builder", label: "Sentence builder" },
  { value: "listening_choice", label: "Listening choice" },
];
export function newQuestion(
  type: ExerciseType,
  questionId = crypto.randomUUID(),
): AuthoringQuestion {
  const presentation = {
    prompt: { en: "" },
    instructions: { en: "Choose the correct answer." },
    hints: [],
    media: [],
  };
  const feedback = { correctAnswerDisplay: "", explanation: { en: "" } };
  const base = { questionId, feedback };
  if (type === "typed_recall")
    return {
      ...base,
      type,
      presentation: {
        ...presentation,
        instructions: { en: "Type your answer in French." },
        interaction: {
          inputLanguage: "fr-FR",
          maxLength: 120,
          characterPalette: ["é", "è", "ê", "à", "ç", "ù", "œ"],
        },
      },
      assessment: {
        gradingStrategy: "accepted_text",
        gradingVersion: 1,
        maxScore: 1,
        normalizationPolicy: "fr-basic-v1",
        acceptedAnswers: [""],
      },
    };
  if (type === "sentence_builder")
    return {
      ...base,
      type,
      presentation: {
        ...presentation,
        instructions: { en: "Build the sentence using the words below." },
        interaction: {
          tokens: [
            { id: crypto.randomUUID(), text: "" },
            { id: crypto.randomUUID(), text: "" },
          ],
          shuffleTokens: true,
          allowTokenReturn: true,
        },
      },
      assessment: {
        gradingStrategy: "ordered_tokens",
        gradingVersion: 1,
        maxScore: 1,
        acceptedSequences: [[] as unknown as [string]],
      },
    };
  const interaction = {
    options: [
      { id: crypto.randomUUID(), text: "" },
      { id: crypto.randomUUID(), text: "" },
    ] as [{ id: string; text: string }, { id: string; text: string }],
    shuffleOptions: true,
  };
  const assessment = {
    gradingStrategy: "single_option" as const,
    gradingVersion: 1 as const,
    maxScore: 1 as const,
    correctOptionId: "",
  };
  if (type === "listening_choice")
    return {
      ...base,
      type,
      presentation: {
        ...presentation,
        instructions: { en: "Listen, then choose the correct answer." },
        interaction,
        media: [
          {
            kind: "audio",
            source: "tts",
            text: "",
            locale: "fr-FR",
            rate: 0.78,
            transcript: { text: "", reveal: "on_request" },
          },
        ],
      },
      assessment,
    };
  return {
    ...base,
    type,
    presentation: { ...presentation, interaction },
    assessment,
  };
}
export function QuestionEditor({
  question: q,
  onChange,
}: {
  question: AuthoringQuestion;
  onChange: (q: AuthoringQuestion) => void;
}) {
  // Local form state may be incomplete; the shared validator gates save/preview.
  const update = (edit: (draft: AuthoringQuestion) => void) => {
    const draft = structuredClone(q);
    edit(draft);
    onChange(draft);
  };
  const feedback = q.feedback;
  return (
    <div className="rich-question-fields">
      <label>
        Question type
        <select
          value={q.type}
          onChange={(e) => {
            const replacement = newQuestion(
              e.target.value as ExerciseType,
              q.questionId,
            );
            replacement.presentation.prompt = q.presentation.prompt;
            replacement.feedback = q.feedback;
            onChange(replacement);
          }}
        >
          {questionTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <small>Changing type replaces the answer fields.</small>
      </label>
      <label>
        Prompt in English
        <textarea
          maxLength={2000}
          value={q.presentation.prompt.en}
          onChange={(e) =>
            update((d) => {
              d.presentation.prompt.en = e.target.value;
            })
          }
        />
      </label>
      <label>
        Instructions in English
        <input
          maxLength={2000}
          value={q.presentation.instructions.en}
          onChange={(e) =>
            update((d) => {
              d.presentation.instructions.en = e.target.value;
            })
          }
        />
      </label>
      {q.type === "listening_choice" && (
        <section className="rich-field-section">
          <h3>French audio</h3>
          {q.presentation.media[0].source === "tts" ? (
            <>
              <label>
                Text to speak
                <textarea
                  lang="fr"
                  maxLength={2000}
                  value={q.presentation.media[0].text}
                  onChange={(e) =>
                    update((d) => {
                      if (
                        d.type === "listening_choice" &&
                        d.presentation.media[0].source === "tts"
                      ) {
                        d.presentation.media[0].text = e.target.value;
                        d.presentation.media[0].transcript.text =
                          e.target.value;
                      }
                    })
                  }
                />
              </label>
              <label>
                Speech rate
                <input
                  type="number"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={q.presentation.media[0].rate}
                  onChange={(e) =>
                    update((d) => {
                      if (
                        d.type === "listening_choice" &&
                        d.presentation.media[0].source === "tts"
                      )
                        d.presentation.media[0].rate = Number(e.target.value);
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="rich-secondary"
                onClick={() => {
                  if (
                    "speechSynthesis" in window &&
                    q.presentation.media[0].source === "tts"
                  ) {
                    speechSynthesis.cancel();
                    const speech = new SpeechSynthesisUtterance(
                      q.presentation.media[0].text,
                    );
                    speech.lang = "fr-FR";
                    speech.rate = q.presentation.media[0].rate;
                    speechSynthesis.speak(speech);
                  }
                }}
              >
                Listen to preview
              </button>
            </>
          ) : (
            <p>
              Recorded audio asset: {q.presentation.media[0].assetId}. This
              editor preserves the existing audio asset.
            </p>
          )}
          <label>
            Accessible transcript
            <textarea
              lang="fr"
              maxLength={2000}
              value={q.presentation.media[0].transcript.text}
              onChange={(e) =>
                update((d) => {
                  if (d.type === "listening_choice")
                    d.presentation.media[0].transcript.text = e.target.value;
                })
              }
            />
          </label>
        </section>
      )}
      {(q.type === "multiple_choice" || q.type === "listening_choice") && (
        <section className="rich-field-section">
          <h3>Answer options</h3>
          <p>
            Select exactly one correct answer. Students see randomized options.
          </p>
          {q.presentation.interaction.options.map((option, i) => (
            <div className="rich-option-row" key={option.id}>
              <input
                type="radio"
                name={`correct-${q.questionId}`}
                aria-label={`Option ${i + 1} is correct`}
                checked={q.assessment.correctOptionId === option.id}
                onChange={() =>
                  update((d) => {
                    if (
                      d.type === "multiple_choice" ||
                      d.type === "listening_choice"
                    )
                      d.assessment.correctOptionId = option.id;
                  })
                }
              />
              <input
                aria-label={`Option ${i + 1}`}
                maxLength={500}
                value={option.text}
                onChange={(e) =>
                  update((d) => {
                    if (
                      d.type === "multiple_choice" ||
                      d.type === "listening_choice"
                    )
                      d.presentation.interaction.options =
                        d.presentation.interaction.options.map((o) =>
                          o.id === option.id
                            ? { ...o, text: e.target.value }
                            : o,
                        ) as unknown as typeof d.presentation.interaction.options;
                  })
                }
              />
              <button
                type="button"
                className="rich-text-button"
                disabled={q.presentation.interaction.options.length <= 2}
                onClick={() =>
                  update((d) => {
                    if (
                      d.type === "multiple_choice" ||
                      d.type === "listening_choice"
                    ) {
                      d.presentation.interaction.options =
                        d.presentation.interaction.options.filter(
                          (o) => o.id !== option.id,
                        ) as unknown as unknown as typeof d.presentation.interaction.options;
                      if (d.assessment.correctOptionId === option.id)
                        d.assessment.correctOptionId = "";
                    }
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rich-secondary"
            disabled={q.presentation.interaction.options.length >= 6}
            onClick={() =>
              update((d) => {
                if (
                  d.type === "multiple_choice" ||
                  d.type === "listening_choice"
                )
                  d.presentation.interaction.options = [
                    ...d.presentation.interaction.options,
                    { id: crypto.randomUUID(), text: "" },
                  ];
              })
            }
          >
            Add option
          </button>
        </section>
      )}
      {q.type === "typed_recall" && (
        <section className="rich-field-section">
          <h3>Accepted answers</h3>
          <label>
            One accepted French answer per line
            <textarea
              lang="fr"
              value={q.assessment.acceptedAnswers.join("\n")}
              onChange={(e) =>
                update((d) => {
                  if (d.type === "typed_recall")
                    d.assessment.acceptedAnswers = e.target.value.split(
                      "\n",
                    ) as [string, ...string[]];
                })
              }
            />
            <small>
              Accents matter. Case, repeated spaces and common punctuation are
              normalized.
            </small>
          </label>
          <label>
            Maximum student answer length
            <input
              type="number"
              min={1}
              max={500}
              value={q.presentation.interaction.maxLength}
              onChange={(e) =>
                update((d) => {
                  if (d.type === "typed_recall")
                    d.presentation.interaction.maxLength = Number(
                      e.target.value,
                    );
                })
              }
            />
          </label>
        </section>
      )}
      {q.type === "sentence_builder" && (
        <section className="rich-field-section">
          <h3>Word bank</h3>
          <p>
            Give repeated words separate tokens. Select tokens below to build
            each accepted sentence.
          </p>
          {q.presentation.interaction.tokens.map((token, i) => (
            <div key={token.id} className="rich-option-row">
              <span>{i + 1}</span>
              <input
                aria-label={`Token ${i + 1}`}
                lang="fr"
                maxLength={100}
                value={token.text}
                onChange={(e) =>
                  update((d) => {
                    if (d.type === "sentence_builder")
                      d.presentation.interaction.tokens =
                        d.presentation.interaction.tokens.map((t) =>
                          t.id === token.id
                            ? { ...t, text: e.target.value }
                            : t,
                        ) as unknown as typeof d.presentation.interaction.tokens;
                  })
                }
              />
              <button
                type="button"
                className="rich-text-button"
                disabled={q.presentation.interaction.tokens.length <= 2}
                onClick={() =>
                  update((d) => {
                    if (d.type === "sentence_builder") {
                      d.presentation.interaction.tokens =
                        d.presentation.interaction.tokens.filter(
                          (t) => t.id !== token.id,
                        ) as unknown as unknown as typeof d.presentation.interaction.tokens;
                      d.assessment.acceptedSequences =
                        d.assessment.acceptedSequences.map((seq) =>
                          seq.filter((id) => id !== token.id),
                        ) as unknown as unknown as typeof d.assessment.acceptedSequences;
                    }
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rich-secondary"
            disabled={q.presentation.interaction.tokens.length >= 20}
            onClick={() =>
              update((d) => {
                if (d.type === "sentence_builder")
                  d.presentation.interaction.tokens = [
                    ...d.presentation.interaction.tokens,
                    { id: crypto.randomUUID(), text: "" },
                  ];
              })
            }
          >
            Add token
          </button>
          {q.assessment.acceptedSequences.map((sequence, i) => (
            <div className="rich-sequence" key={i}>
              <h4>Accepted sentence {i + 1}</h4>
              <div className="rich-token-row">
                {sequence.length === 0 && (
                  <small>Choose tokens in the correct order.</small>
                )}
                {sequence.map((id, position) => (
                  <button
                    type="button"
                    key={id}
                    aria-label={`Remove word ${position + 1} from sentence ${i + 1}`}
                    onClick={() =>
                      update((d) => {
                        if (d.type === "sentence_builder")
                          d.assessment.acceptedSequences =
                            d.assessment.acceptedSequences.map((seq, j) =>
                              j === i
                                ? seq.filter((_, k) => k !== position)
                                : seq,
                            ) as unknown as unknown as typeof d.assessment.acceptedSequences;
                      })
                    }
                  >
                    {q.presentation.interaction.tokens.find((t) => t.id === id)
                      ?.text || `Token ${position + 1}`}{" "}
                    ×
                  </button>
                ))}
              </div>
              <div className="rich-token-row">
                {q.presentation.interaction.tokens.map((t, j) => (
                  <button
                    type="button"
                    key={t.id}
                    disabled={sequence.includes(t.id)}
                    onClick={() =>
                      update((d) => {
                        if (d.type === "sentence_builder")
                          d.assessment.acceptedSequences =
                            d.assessment.acceptedSequences.map((seq, k) =>
                              k === i ? [...seq, t.id] : seq,
                            ) as unknown as typeof d.assessment.acceptedSequences;
                      })
                    }
                  >
                    {t.text || `Token ${j + 1}`}
                  </button>
                ))}
              </div>
              {i > 0 && (
                <button
                  type="button"
                  className="rich-text-button"
                  onClick={() =>
                    update((d) => {
                      if (d.type === "sentence_builder")
                        d.assessment.acceptedSequences =
                          d.assessment.acceptedSequences.filter(
                            (_, j) => i !== j,
                          ) as unknown as unknown as typeof d.assessment.acceptedSequences;
                    })
                  }
                >
                  Remove variant
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="rich-secondary"
            disabled={q.assessment.acceptedSequences.length >= 20}
            onClick={() =>
              update((d) => {
                if (d.type === "sentence_builder")
                  d.assessment.acceptedSequences = [
                    ...d.assessment.acceptedSequences,
                    [],
                  ] as unknown as unknown as typeof d.assessment.acceptedSequences;
              })
            }
          >
            Add accepted variant
          </button>
        </section>
      )}
      <section className="rich-field-section">
        <h3>Help and feedback</h3>
        {q.presentation.hints.map((h, i) => (
          <div className="rich-option-row" key={h.id}>
            <input
              aria-label={`Hint ${i + 1}`}
              maxLength={2000}
              value={h.text.en}
              onChange={(e) =>
                update((d) => {
                  d.presentation.hints = d.presentation.hints.map((v) =>
                    v.id === h.id ? { ...v, text: { en: e.target.value } } : v,
                  );
                })
              }
            />
            <button
              type="button"
              className="rich-text-button"
              onClick={() =>
                update((d) => {
                  d.presentation.hints = d.presentation.hints.filter(
                    (v) => v.id !== h.id,
                  );
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rich-secondary"
          disabled={q.presentation.hints.length >= 3}
          onClick={() =>
            update((d) => {
              d.presentation.hints = [
                ...d.presentation.hints,
                { id: crypto.randomUUID(), text: { en: "" } },
              ];
            })
          }
        >
          Add hint
        </button>
        <label>
          Correct answer to show after submission
          <input
            lang="fr"
            maxLength={500}
            value={feedback.correctAnswerDisplay}
            onChange={(e) =>
              update((d) => {
                d.feedback.correctAnswerDisplay = e.target.value;
              })
            }
          />
        </label>
        <label>
          Explanation in English
          <textarea
            maxLength={2000}
            value={feedback.explanation.en}
            onChange={(e) =>
              update((d) => {
                d.feedback.explanation.en = e.target.value;
              })
            }
          />
        </label>
        <details>
          <summary>Pronunciation, example and culture note</summary>
          <label>
            IPA pronunciation (optional)
            <input
              maxLength={500}
              value={feedback.pronunciation?.ipa ?? ""}
              onChange={(e) =>
                update((d) => {
                  d.feedback.pronunciation = {
                    ...d.feedback.pronunciation,
                    ipa: e.target.value,
                    respelling: d.feedback.pronunciation?.respelling ?? {
                      en: "",
                    },
                  };
                  if (
                    !e.target.value &&
                    !d.feedback.pronunciation.respelling.en
                  )
                    delete d.feedback.pronunciation;
                })
              }
            />
          </label>
          <label>
            Pronunciation guide in English
            <input
              maxLength={2000}
              value={feedback.pronunciation?.respelling.en ?? ""}
              onChange={(e) =>
                update((d) => {
                  d.feedback.pronunciation = {
                    ...d.feedback.pronunciation,
                    ipa: d.feedback.pronunciation?.ipa ?? "",
                    respelling: { en: e.target.value },
                  };
                  if (!e.target.value && !d.feedback.pronunciation.ipa)
                    delete d.feedback.pronunciation;
                })
              }
            />
          </label>
          <label>
            Example in French
            <input
              maxLength={2000}
              value={feedback.example?.target ?? ""}
              onChange={(e) =>
                update((d) => {
                  d.feedback.example = {
                    target: e.target.value,
                    translation: d.feedback.example?.translation ?? { en: "" },
                  };
                  if (!e.target.value && !d.feedback.example.translation.en)
                    delete d.feedback.example;
                })
              }
            />
          </label>
          <label>
            English translation
            <input
              maxLength={2000}
              value={feedback.example?.translation.en ?? ""}
              onChange={(e) =>
                update((d) => {
                  d.feedback.example = {
                    target: d.feedback.example?.target ?? "",
                    translation: { en: e.target.value },
                  };
                  if (!e.target.value && !d.feedback.example.target)
                    delete d.feedback.example;
                })
              }
            />
          </label>
          <label>
            Culture note
            <textarea
              maxLength={2000}
              value={feedback.cultureNote?.en ?? ""}
              onChange={(e) =>
                update((d) => {
                  if (e.target.value)
                    d.feedback.cultureNote = { en: e.target.value };
                  else delete d.feedback.cultureNote;
                })
              }
            />
          </label>
        </details>
      </section>
    </div>
  );
}
