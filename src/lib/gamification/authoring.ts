import type {
  AuthoringExercise,
  AccessTier,
  Proficiency,
} from "@/types/gamification";
import { isUuid } from "./submission";
/** Identity/version fields are assigned by SQL, never uploaded as snapshots. */
type Editable<T> = T extends AuthoringExercise
  ? Omit<
      T,
      | "questionRevisionId"
      | "contentRevision"
      | "schemaVersion"
      | "targetLanguage"
      | "instructionLanguage"
      | "proficiency"
      | "difficulty"
      | "skillIds"
      | "tags"
      | "rewardClass"
    >
  : never;
export type AuthoringQuestion = Editable<AuthoringExercise>;
export interface AuthoringDocument {
  schemaVersion: 1;
  courseId: string;
  title: string;
  description: string;
  objective: string;
  kind: "lesson" | "quiz";
  proficiency: Proficiency;
  accessTier: AccessTier;
  passingScore: number;
  questions: AuthoringQuestion[];
}
export interface EditorSnapshot {
  moduleId: string;
  revisionId: string;
  editVersion: number;
  status: "draft" | "published" | "archived";
  document: AuthoringDocument;
}
export interface DraftWrite {
  mutationId: string;
  moduleId: string | null;
  baseRevisionId: string | null;
  expectedVersion: number;
  document: AuthoringDocument;
}
export interface PublishWrite {
  mutationId: string;
  moduleId: string;
  revisionId: string;
  expectedVersion: number;
}
export interface RevisionReceipt {
  moduleId: string;
  revisionId: string;
  editVersion: number;
  status: "draft" | "published";
}
export class AuthoringError extends Error {
  constructor(
    public path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
  }
}
type ObjectValue = Record<string, unknown>;
function fail(path: string, message: string): never {
  throw new AuthoringError(path, message);
}
function object(
  v: unknown,
  path: string,
  required: string[],
  optional: string[] = [],
): ObjectValue {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return fail(path, "Expected an object.");
  const o = v as ObjectValue;
  if (
    required.some((k) => !(k in o)) ||
    Object.keys(o).some((k) => !required.includes(k) && !optional.includes(k))
  )
    fail(path, "Unexpected or missing fields.");
  return o;
}
function text(
  v: unknown,
  path: string,
  max = 2000,
  empty = false,
): asserts v is string {
  if (typeof v !== "string" || (!empty && !v.trim()) || v.length > max)
    fail(path, `Enter ${empty ? "at most" : "1–"}${max} characters.`);
}
function literal(v: unknown, expected: unknown, path: string) {
  if (v !== expected) fail(path, `Expected ${String(expected)}.`);
}
function list(v: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(v) || v.length < min || v.length > max)
    return fail(path, `Provide ${min}–${max} items.`);
  return v;
}
function localized(v: unknown, path: string) {
  const o = object(v, path, ["en"]);
  text(o.en, `${path}.en`);
}
function integer(v: unknown, path: string, min: number, max: number) {
  if (!Number.isInteger(v) || Number(v) < min || Number(v) > max)
    fail(path, `Enter an integer from ${min} to ${max}.`);
}
function uuid(v: unknown, path: string) {
  if (!isUuid(v)) fail(path, "Invalid identifier.");
}
function bool(v: unknown, path: string) {
  if (typeof v !== "boolean") fail(path, "Expected true or false.");
}
function audio(value: unknown, path: string, media = false) {
  const v = value as ObjectValue;
  if (!v || typeof v !== "object")
    fail(path, "Choose TTS or a ready audio asset.");
  const common = media ? ["kind", "transcript"] : [];
  if (v.source === "tts") {
    object(v, path, ["source", "text", "locale", "rate", ...common]);
    text(v.text, `${path}.text`);
    if (
      typeof v.rate !== "number" ||
      !Number.isFinite(v.rate) ||
      v.rate < 0.5 ||
      v.rate > 1.5
    )
      fail(path, "Speech rate must be 0.5–1.5.");
  } else if (v.source === "asset") {
    object(v, path, ["source", "assetId", "locale", ...common], ["fallback"]);
    uuid(v.assetId, `${path}.assetId`);
    if (v.fallback !== undefined) {
      literal(
        (v.fallback as ObjectValue)?.source,
        "tts",
        `${path}.fallback.source`,
      );
      audio(v.fallback, `${path}.fallback`);
    }
  } else fail(path, "Choose TTS or a ready audio asset.");
  literal(v.locale, "fr-FR", `${path}.locale`);
  if (media) {
    literal(v.kind, "audio", `${path}.kind`);
    const tr = object(v.transcript, `${path}.transcript`, ["text", "reveal"]);
    text(tr.text, `${path}.transcript.text`);
    literal(tr.reveal, "on_request", path);
  }
}
function feedback(value: unknown, path: string) {
  const f = object(
    value,
    path,
    ["correctAnswerDisplay", "explanation"],
    ["pronunciation", "example", "cultureNote"],
  );
  text(f.correctAnswerDisplay, `${path}.correctAnswerDisplay`, 500);
  localized(f.explanation, `${path}.explanation`);
  if (f.pronunciation !== undefined) {
    const p = object(
      f.pronunciation,
      `${path}.pronunciation`,
      ["ipa", "respelling"],
      ["audio"],
    );
    text(p.ipa, `${path}.ipa`, 500);
    localized(p.respelling, `${path}.respelling`);
    if (p.audio !== undefined) audio(p.audio, `${path}.audio`);
  }
  if (f.example !== undefined) {
    const e = object(f.example, `${path}.example`, ["target", "translation"]);
    text(e.target, `${path}.example.target`);
    localized(e.translation, `${path}.example.translation`);
  }
  if (f.cultureNote !== undefined)
    localized(f.cultureNote, `${path}.cultureNote`);
}
export function validateDocument(raw: unknown): AuthoringDocument {
  const d = object(raw, "module", [
    "schemaVersion",
    "courseId",
    "title",
    "description",
    "objective",
    "kind",
    "proficiency",
    "accessTier",
    "passingScore",
    "questions",
  ]);
  literal(d.schemaVersion, 1, "module.schemaVersion");
  uuid(d.courseId, "module.courseId");
  text(d.title, "module.title", 200);
  text(d.description, "module.description", 4000, true);
  text(d.objective, "module.objective");
  if (!["lesson", "quiz"].includes(d.kind as string))
    fail("module.kind", "Choose lesson or quiz.");
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(d.proficiency as string))
    fail("module.proficiency", "Choose a CEFR level.");
  if (!["free", "premium"].includes(d.accessTier as string))
    fail("module.accessTier", "Choose free or premium.");
  integer(d.passingScore, "module.passingScore", 0, 100);
  const questionIds = new Set();
  for (const [index, rawQuestion] of list(
    d.questions,
    "module.questions",
    1,
    50,
  ).entries()) {
    const path = `questions[${index}]`;
    const q = object(rawQuestion, path, [
      "questionId",
      "type",
      "presentation",
      "assessment",
      "feedback",
    ]);
    uuid(q.questionId, `${path}.questionId`);
    const key = (q.questionId as string).toLowerCase();
    if (questionIds.has(key)) fail(path, "Duplicate question identity.");
    questionIds.add(key);
    const p = object(q.presentation, `${path}.presentation`, [
      "prompt",
      "instructions",
      "interaction",
      "hints",
      "media",
    ]);
    localized(p.prompt, `${path}.prompt`);
    localized(p.instructions, `${path}.instructions`);
    const hintIds = new Set();
    for (const hint of list(p.hints, `${path}.hints`, 0, 3)) {
      const h = object(hint, `${path}.hint`, ["id", "text"]);
      text(h.id, `${path}.hint.id`, 100);
      localized(h.text, `${path}.hint.text`);
      if (hintIds.has(h.id)) fail(path, "Duplicate hint identity.");
      hintIds.add(h.id);
    }
    const media = list(p.media, `${path}.media`, 0, 8);
    for (const m of media) {
      if ((m as ObjectValue)?.kind === "image") {
        const image = object(m, `${path}.image`, ["kind", "assetId", "alt"]);
        uuid(image.assetId, `${path}.image.assetId`);
        localized(image.alt, `${path}.image.alt`);
      } else audio(m, `${path}.audio`, true);
    }
    if (q.type === "multiple_choice" || q.type === "listening_choice") {
      const interaction = object(p.interaction, path, [
        "options",
        "shuffleOptions",
      ]);
      bool(interaction.shuffleOptions, `${path}.shuffleOptions`);
      const options = list(interaction.options, `${path}.options`, 2, 6).map(
        (v, i) => {
          const o = object(v, `${path}.options[${i}]`, ["id", "text"]);
          text(o.id, path, 100);
          text(o.text, path, 500);
          return o;
        },
      );
      if (new Set(options.map((o) => o.id)).size !== options.length)
        fail(path, "Option IDs must be unique.");
      if (
        new Set(
          options.map((o) => (o.text as string).trim().toLocaleLowerCase("fr")),
        ).size !== options.length
      )
        fail(`${path}.options`, "Use distinct option labels.");
      const a = object(q.assessment, `${path}.assessment`, [
        "gradingStrategy",
        "gradingVersion",
        "maxScore",
        "correctOptionId",
      ]);
      literal(a.gradingStrategy, "single_option", path);
      if (!options.some((o) => o.id === a.correctOptionId))
        fail(`${path}.correctOptionId`, "Select an option from this question.");
      if (
        q.type === "listening_choice" &&
        (media[0] as ObjectValue)?.kind !== "audio"
      )
        fail(
          `${path}.media`,
          "Listening requires audio as the first media item.",
        );
    } else if (q.type === "typed_recall") {
      const interaction = object(p.interaction, path, [
        "inputLanguage",
        "maxLength",
        "characterPalette",
      ]);
      literal(interaction.inputLanguage, "fr-FR", path);
      integer(interaction.maxLength, `${path}.maxLength`, 1, 500);
      list(
        interaction.characterPalette,
        `${path}.characterPalette`,
        0,
        40,
      ).forEach((c) => text(c, path, 8));
      const a = object(q.assessment, `${path}.assessment`, [
        "gradingStrategy",
        "gradingVersion",
        "maxScore",
        "normalizationPolicy",
        "acceptedAnswers",
      ]);
      literal(a.gradingStrategy, "accepted_text", path);
      literal(a.normalizationPolicy, "fr-basic-v1", path);
      list(a.acceptedAnswers, `${path}.acceptedAnswers`, 1, 20).forEach((v) => {
        text(v, `${path}.acceptedAnswers`, Number(interaction.maxLength));
        if (!v.replace(/[.,!?\s]/g, "").length)
          fail(
            `${path}.acceptedAnswers`,
            "An accepted answer must contain more than punctuation.",
          );
      });
    } else if (q.type === "sentence_builder") {
      const interaction = object(p.interaction, path, [
        "tokens",
        "shuffleTokens",
        "allowTokenReturn",
      ]);
      bool(interaction.shuffleTokens, path);
      literal(interaction.allowTokenReturn, true, path);
      const ids = list(interaction.tokens, `${path}.tokens`, 2, 20).map((v) => {
        const token = object(v, `${path}.tokens`, ["id", "text"]);
        text(token.id, path, 100);
        text(token.text, path, 100);
        return token.id as string;
      });
      if (new Set(ids).size !== ids.length)
        fail(path, "Token IDs must be unique, even for repeated words.");
      const a = object(q.assessment, `${path}.assessment`, [
        "gradingStrategy",
        "gradingVersion",
        "maxScore",
        "acceptedSequences",
      ]);
      literal(a.gradingStrategy, "ordered_tokens", path);
      for (const sequence of list(
        a.acceptedSequences,
        `${path}.acceptedSequences`,
        1,
        20,
      )) {
        const values = list(sequence, `${path}.sequence`, 1, 20);
        if (
          values.some((id) => !ids.includes(id as string)) ||
          new Set(values).size !== values.length
        )
          fail(`${path}.sequence`, "Use unique IDs from this token bank.");
      }
    } else fail(`${path}.type`, "Unsupported question type.");
    const a = q.assessment as ObjectValue;
    literal(a.gradingVersion, 1, path);
    literal(a.maxScore, 1, path);
    feedback(q.feedback, `${path}.feedback`);
    for (const value of [p, q.assessment, q.feedback])
      if (new TextEncoder().encode(JSON.stringify(value)).length > 65536)
        fail(path, "Question content is too large.");
  }
  return raw as AuthoringDocument;
}
export function validateDraftWrite(raw: unknown): DraftWrite {
  const v = object(raw, "request", [
    "mutationId",
    "moduleId",
    "baseRevisionId",
    "expectedVersion",
    "document",
  ]);
  uuid(v.mutationId, "mutationId");
  if (v.moduleId === null) {
    literal(v.baseRevisionId, null, "baseRevisionId");
    literal(v.expectedVersion, 0, "expectedVersion");
  } else {
    uuid(v.moduleId, "moduleId");
    uuid(v.baseRevisionId, "baseRevisionId");
    integer(v.expectedVersion, "expectedVersion", 1, 2147483646);
  }
  validateDocument(v.document);
  return raw as DraftWrite;
}
export function validatePublishWrite(raw: unknown): PublishWrite {
  const v = object(raw, "request", [
    "mutationId",
    "moduleId",
    "revisionId",
    "expectedVersion",
  ]);
  for (const key of ["mutationId", "moduleId", "revisionId"]) uuid(v[key], key);
  integer(v.expectedVersion, "expectedVersion", 1, 2147483646);
  return raw as PublishWrite;
}
