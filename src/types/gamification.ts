/**
 * Gamification contract v1. JSON uses camelCase; SQL columns use snake_case.
 * These types are compile-time contracts, NOT runtime validation. Validate all
 * untrusted input in the upcoming authoring/submission APIs before persistence.
 */
export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;
export type TargetLanguage = "fr-FR";
export type InstructionLanguage = "en";
export type LocalizedText = { en: string };
export type Proficiency = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Difficulty = "easy" | "medium" | "hard";
export type ExerciseType =
  | "multiple_choice"
  | "typed_recall"
  | "sentence_builder"
  | "listening_choice";
export type SessionMode = "lesson" | "daily" | "review" | "words" | "listening";
export type PublicationStatus = "draft" | "published" | "archived";
export type AccessTier = "free" | "premium";
export type RewardClass = "standard" | "builder";
export type RewardPolicyVersion = "foundations-v1";
export type GradingVersion = 1;
export type SchemaVersion = 1;
export type NonEmpty<T> = readonly [T, ...T[]];
export type AtLeastTwo<T> = readonly [T, T, ...T[]];

export interface Hint {
  id: string;
  text: LocalizedText;
}
export interface Option {
  id: string;
  text: string;
}
export interface Token {
  id: string;
  text: string;
}
export interface TtsSource {
  source: "tts";
  text: string;
  locale: TargetLanguage;
  /** Inclusive range 0.5–1.5, validated at the write boundary. */
  rate: number;
}
export interface AssetAudioSource {
  source: "asset";
  assetId: UUID;
  locale: TargetLanguage;
  fallback?: TtsSource;
}
export type AudioSource = TtsSource | AssetAudioSource;
export type AudioMedia = AudioSource & {
  kind: "audio";
  transcript: { text: string; reveal: "on_request" };
};
export interface ImageMedia {
  kind: "image";
  assetId: UUID;
  alt: LocalizedText;
}
export type PresentationMedia = ImageMedia | AudioMedia;
export interface ChoiceInteraction {
  options: AtLeastTwo<Option>;
  shuffleOptions: boolean;
}
export interface RecallInteraction {
  inputLanguage: TargetLanguage;
  maxLength: number;
  characterPalette: readonly string[];
}
export interface BuilderInteraction {
  tokens: AtLeastTwo<Token>;
  shuffleTokens: boolean;
  allowTokenReturn: true;
}
export interface Presentation<
  I,
  M extends readonly PresentationMedia[] = readonly PresentationMedia[],
> {
  prompt: LocalizedText;
  instructions: LocalizedText;
  interaction: I;
  hints: readonly Hint[];
  media: M;
}
export interface SingleOptionAssessment {
  gradingStrategy: "single_option";
  gradingVersion: GradingVersion;
  correctOptionId: string;
  maxScore: 1;
}
export interface AcceptedTextAssessment {
  gradingStrategy: "accepted_text";
  gradingVersion: GradingVersion;
  acceptedAnswers: NonEmpty<string>;
  /** NFC, French case folding, apostrophe/whitespace normalization; accents retained. */
  normalizationPolicy: "fr-basic-v1";
  maxScore: 1;
}
export interface OrderedTokensAssessment {
  gradingStrategy: "ordered_tokens";
  gradingVersion: GradingVersion;
  acceptedSequences: NonEmpty<NonEmpty<string>>;
  maxScore: 1;
}
/** Private until an authorized submission; not part of student presentation. */
export interface ExerciseFeedback {
  correctAnswerDisplay: string;
  explanation: LocalizedText;
  pronunciation?: {
    ipa: string;
    respelling: LocalizedText;
    audio?: AudioSource;
  };
  example?: { target: string; translation: LocalizedText };
  cultureNote?: LocalizedText;
}
export interface ExerciseMetadata {
  questionId: UUID;
  questionRevisionId: UUID;
  contentRevision: number;
  schemaVersion: SchemaVersion;
  targetLanguage: TargetLanguage;
  instructionLanguage: InstructionLanguage;
  proficiency: Proficiency;
  difficulty: Difficulty;
  skillIds: readonly string[];
  tags: readonly string[];
  rewardClass: RewardClass;
}
export interface MultipleChoiceExercise extends ExerciseMetadata {
  type: "multiple_choice";
  presentation: Presentation<ChoiceInteraction>;
}
export interface TypedRecallExercise extends ExerciseMetadata {
  type: "typed_recall";
  presentation: Presentation<RecallInteraction>;
}
export interface SentenceBuilderExercise extends ExerciseMetadata {
  type: "sentence_builder";
  presentation: Presentation<BuilderInteraction>;
}
export interface ListeningChoiceExercise extends ExerciseMetadata {
  type: "listening_choice";
  /** Audio is required at position zero; other media may follow. */
  presentation: Presentation<
    ChoiceInteraction,
    readonly [AudioMedia, ...PresentationMedia[]]
  >;
}
/** Safe shape for future authorized delivery; does not itself authorize access. */
export type StudentExercise =
  | MultipleChoiceExercise
  | TypedRecallExercise
  | SentenceBuilderExercise
  | ListeningChoiceExercise;
export type AuthoringExercise =
  | (MultipleChoiceExercise & {
      assessment: SingleOptionAssessment;
      feedback: ExerciseFeedback;
    })
  | (TypedRecallExercise & {
      assessment: AcceptedTextAssessment;
      feedback: ExerciseFeedback;
    })
  | (SentenceBuilderExercise & {
      assessment: OrderedTokensAssessment;
      feedback: ExerciseFeedback;
    })
  | (ListeningChoiceExercise & {
      assessment: SingleOptionAssessment;
      feedback: ExerciseFeedback;
    });
/** Never build student DTOs by spreading AuthoringExercise; explicitly whitelist fields. */
export type PrivateGradingKey =
  | {
      type: "multiple_choice" | "listening_choice";
      assessment: SingleOptionAssessment;
      feedback: ExerciseFeedback;
    }
  | {
      type: "typed_recall";
      assessment: AcceptedTextAssessment;
      feedback: ExerciseFeedback;
    }
  | {
      type: "sentence_builder";
      assessment: OrderedTokensAssessment;
      feedback: ExerciseFeedback;
    };

export interface Assistance {
  hintIds: readonly string[];
  transcriptShown: boolean;
}
export type ExerciseResponse =
  | { type: "multiple_choice"; response: { optionId: string } }
  | { type: "typed_recall"; response: { text: string } }
  | { type: "sentence_builder"; response: { tokenIds: NonEmpty<string> } }
  | { type: "listening_choice"; response: { optionId: string } };
/** No userId, correctness, XP, heart count or answer key in a submission. */
export type AnswerSubmission = ExerciseResponse & {
  schemaVersion: SchemaVersion;
  sessionId: UUID;
  sessionQuestionId: UUID;
  idempotencyKey: UUID;
  assistance: Assistance;
};
export interface ConfirmedAnswer {
  responseId: UUID;
  sessionQuestionId: UUID;
  isCorrect: boolean;
  score: 0 | 1;
  feedback: ExerciseFeedback;
  reward: { xp: number; coins: number; heartsDelta: -1 | 0 | 1 };
  totals: { xp: number; coins: number; hearts: number; revision: number };
  session: {
    completed: boolean;
    correct: number;
    answered: number;
    total: number;
    passed: boolean | null;
  };
  rewardBreakdown: {
    answerXp: number;
    completionXp: number;
    completionCoins: number;
  };
}
export interface ModuleRevision {
  id: UUID;
  quizId: UUID;
  revision: number;
  schemaVersion: SchemaVersion;
  status: PublicationStatus;
  kind: "lesson" | "quiz";
  title: string;
  description: string | null;
  objective: string;
  targetLanguage: TargetLanguage;
  instructionLanguage: InstructionLanguage;
  proficiency: Proficiency;
  accessTier: AccessTier;
  passingScore: number;
  scoringPolicy: "first_attempt_equal_v1";
  rewardPolicyVersion: RewardPolicyVersion;
  publishedAt: ISODateTime | null;
}
export interface ModuleRevisionItem {
  moduleRevisionId: UUID;
  questionId: UUID;
  questionRevisionId: UUID;
  position: number;
}
export interface LearningSession {
  id: UUID;
  mode: SessionMode;
  quizRevisionId: UUID | null;
  status: "active" | "completed" | "abandoned";
  questionCount: number;
  activityDate: ISODate;
  timeZone: string;
  rewardPolicyVersion: RewardPolicyVersion;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
}
export interface SessionQuestion {
  id: UUID;
  sessionId: UUID;
  questionRevisionId: UUID;
  type: ExerciseType;
  position: number;
  /** Server-pinned opaque ID order; never the private correct sequence. */
  displayOrder: readonly string[];
  reviewEligible: boolean;
}
export interface LearningAsset {
  id: UUID;
  ownerId: UUID;
  kind: "audio" | "image";
  bucketId: "gamification-assets";
  storagePath: string;
  mimeType: string;
  byteSize: number;
  durationMs: number | null;
  status: "pending" | "ready" | "failed";
  createdAt: ISODateTime;
}
export interface ReviewState {
  questionId: UUID;
  stage: 0 | 1 | 2 | 3 | 4;
  misses: number;
  dueDate: ISODate;
  lastReviewedAt: ISODateTime | null;
  lastQuestionRevisionId: UUID;
}

/** Shared publish-time limits; future runtime validators must enforce these. */
export const GAMIFICATION_V1_LIMITS = {
  questionsPerModule: { min: 1, max: 50 },
  optionsPerChoice: { min: 2, max: 6 },
  tokensPerSentence: { min: 2, max: 20 },
  acceptedTextAnswers: { min: 1, max: 20 },
  acceptedSequences: { min: 1, max: 20 },
  promptLength: 2000,
  answerLength: 500,
  hintsPerQuestion: 3,
  presentationBytes: 65536,
  privateKeyBytes: 65536,
  responseBytes: 16384,
} as const;
export const LEGACY_EXERCISE_TYPES = {
  mcq: "multiple_choice",
  multiple_choice: "multiple_choice",
  translation: "typed_recall",
  typed_recall: "typed_recall",
  sentence_builder: "sentence_builder",
  listening: "listening_choice",
  listening_choice: "listening_choice",
} as const satisfies Record<string, ExerciseType>;

/** moduleId identifies quizzes.id; the server resolves and pins its live revision. */
export type StartSessionRequest = (
  | { moduleId: UUID; courseId?: never }
  | { courseId: UUID; moduleId?: never }
) & {
  mode: SessionMode;
  idempotencyKey: UUID;
};
export interface DeliveredQuestion {
  id: UUID;
  position: number;
  displayOrder: readonly string[];
  exercise: StudentExercise;
}
export interface StartedSession {
  id: UUID;
  title: string;
  mode: SessionMode;
  status: LearningSession["status"];
  timeZone: string;
  questions: DeliveredQuestion[];
  receipts: ConfirmedAnswer[];
  totals: ConfirmedAnswer["totals"];
}
/** Course-level theory. Private assessment/feedback never belong in this DTO. */
export interface CourseMaterial {
  moduleId: string;
  revisionId: string;
  title: string;
  objective: string;
  description: string | null;
  courseId: string;
  courseTitle: string;
  courseDescription: string | null;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
}

export interface AvailableModule {
  id: UUID;
  revisionId: UUID;
  courseId: UUID;
  courseTitle: string;
  title: string;
  objective: string;
  proficiency: Proficiency;
  accessTier: AccessTier;
  locked: boolean;
  completed: boolean;
  questionCount: number;
  dueReviews: number;
  types: ExerciseType[];
}
export interface LearningCatalogue {
  assignment: { id: string; teacherId: string; teacherName: string } | null;
  modules: AvailableModule[];
  totals: ConfirmedAnswer["totals"];
  activeSessions: { id: UUID; mode: SessionMode; createdAt: ISODateTime }[];
  completedSessions: number;
  days: ISODate[];
  timeZone: string;
}
