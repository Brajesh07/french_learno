import type {
  Option,
  Presentation,
  SentenceBuilderExercise,
  TypedRecallExercise,
} from "./gamification";

/** Display contract also accepts incomplete legacy MCQs for staff inspection.
 * New authoring and trusted student delivery retain their stricter contracts. */
export type ExerciseView =
  | {
      type: "multiple_choice" | "listening_choice";
      presentation: Presentation<{
        options: readonly Option[];
        shuffleOptions: boolean;
      }>;
    }
  | Pick<TypedRecallExercise, "type" | "presentation">
  | Pick<SentenceBuilderExercise, "type" | "presentation">;
