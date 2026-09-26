import type { ExerciseFeedback } from "./gamification";
import type { ExerciseView } from "./exercise-presentation";

/** Authorized staff presentation; never returned from student delivery APIs. */
export interface AdminPreviewQuestion {
  exercise: ExerciseView & { questionRevisionId: string };
  answerKey: string[];
  feedback: ExerciseFeedback;
}
