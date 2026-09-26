import "server-only";
import { notFound } from "next/navigation";
import { requireStaffPage } from "./auth";
import { isUuid } from "@/lib/gamification/submission";
import type { AdminPreviewQuestion } from "@/types/admin-preview";
import type { PrivateGradingKey, StudentExercise } from "@/types/gamification";

/** Cookie-authenticated reads retain the existing admin SELECT RLS policies. */
export async function loadAdminCourse(id: string) {
  const { client } = await requireStaffPage("admin");
  if (!isUuid(id)) notFound();
  const [course, modules] = await Promise.all([
    client
      .from("courses")
      .select(
        "id,title,description,level,is_published,content_text,content_image_url,content_audio_url,content_video_url",
      )
      .eq("id", id)
      .maybeSingle(),
    client
      .from("quizzes")
      .select("id,title,description,is_published,learning_runtime")
      .eq("course_id", id)
      .order("created_at"),
  ]);
  if (course.error || modules.error)
    throw new Error("Unable to load course content.");
  if (!course.data) notFound();
  return { course: course.data, modules: modules.data ?? [] };
}

function answerKey(
  exercise: StudentExercise,
  key: PrivateGradingKey,
): string[] {
  if (
    (key.type === "multiple_choice" || key.type === "listening_choice") &&
    (exercise.type === "multiple_choice" ||
      exercise.type === "listening_choice")
  ) {
    return [
      exercise.presentation.interaction.options.find(
        (option) => option.id === key.assessment.correctOptionId,
      )?.text ?? "Missing correct option",
    ];
  }
  if (key.type === "typed_recall") return [...key.assessment.acceptedAnswers];
  if (key.type === "sentence_builder" && exercise.type === "sentence_builder") {
    return key.assessment.acceptedSequences.map((sequence) =>
      sequence
        .map(
          (id) =>
            exercise.presentation.interaction.tokens.find(
              (token) => token.id === id,
            )?.text ?? "[Missing token]",
        )
        .join(" "),
    );
  }
  throw new Error("Question type and grading key do not match.");
}

export async function loadAdminQuiz(id: string, revisionId?: string) {
  const { client } = await requireStaffPage("admin");
  if (!isUuid(id) || (revisionId !== undefined && !isUuid(revisionId)))
    notFound();
  const { data: quiz, error } = await client
    .from("quizzes")
    .select("id,course_id,title,description,is_published,learning_runtime")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Unable to load this quiz.");
  if (!quiz) notFound();
  const { data: revisions, error: revisionsError } = await client
    .from("quiz_revisions")
    .select(
      "id,revision,status,title,description,objective,proficiency,access_tier,edit_version",
    )
    .eq("quiz_id", id)
    .order("revision", { ascending: false });
  if (revisionsError) throw new Error("Unable to load module revisions.");
  // Moderation opens the live revision first, with drafts and history selectable.
  const selected = revisionId
    ? revisions?.find((r) => r.id === revisionId)
    : (revisions?.find((r) => r.status === "published") ?? revisions?.[0]);
  if (revisionId && !selected) notFound();
  let questions: AdminPreviewQuestion[] = [];
  if (selected) {
    const { data: items, error: itemsError } = await client
      .from("quiz_revision_items")
      .select("question_id,question_revision_id,position")
      .eq("quiz_revision_id", selected.id)
      .order("position");
    if (itemsError) throw new Error("Unable to load module questions.");
    const ids = (items ?? []).map((item) => item.question_revision_id);
    if (ids.length) {
      const [content, grading] = await Promise.all([
        client
          .from("quiz_question_revisions")
          .select(
            "id,question_id,content_revision,schema_version,type,target_language,instruction_language,proficiency,difficulty,skill_ids,tags,reward_class,presentation",
          )
          .in("id", ids),
        client
          .from("quiz_question_keys")
          .select("question_revision_id,type,assessment,feedback")
          .in("question_revision_id", ids),
      ]);
      if (content.error || grading.error)
        throw new Error("Unable to load question presentation.");
      questions = (items ?? []).map((item) => {
        const q = content.data?.find((q) => q.id === item.question_revision_id);
        const key = grading.data?.find(
          (k) => k.question_revision_id === item.question_revision_id,
        );
        if (!q || !key)
          throw new Error("This revision has incomplete question content.");
        const exercise = {
          questionId: q.question_id,
          questionRevisionId: q.id,
          contentRevision: q.content_revision,
          schemaVersion: q.schema_version,
          type: q.type,
          targetLanguage: q.target_language,
          instructionLanguage: q.instruction_language,
          proficiency: q.proficiency,
          difficulty: q.difficulty,
          skillIds: q.skill_ids,
          tags: q.tags,
          rewardClass: q.reward_class,
          presentation: q.presentation,
        } as StudentExercise;
        return {
          exercise,
          answerKey: answerKey(exercise, key as PrivateGradingKey),
          feedback: key.feedback,
        };
      });
    }
    // Refuse a mixed snapshot if a teacher replaced draft items during our reads.
    const { data: current, error: currentError } = await client
      .from("quiz_revisions")
      .select("edit_version,status")
      .eq("id", selected.id)
      .single();
    if (
      currentError ||
      current.edit_version !== selected.edit_version ||
      current.status !== selected.status
    )
      throw new Error(
        "This revision changed while loading. Refresh to view the latest content.",
      );
  } else if (quiz.learning_runtime === "legacy") {
    const { data: rows, error: legacyError } = await client
      .from("quiz_questions")
      .select("id,question,explanation,quiz_answers(id,answer,is_correct)")
      .eq("quiz_id", id)
      .order("created_at");
    if (legacyError) throw new Error("Unable to load legacy quiz questions.");
    questions = (rows ?? []).map((q) => {
      const correct = q.quiz_answers
        .filter((a) => a.is_correct)
        .map((a) => a.answer);
      return {
        exercise: {
          questionId: q.id,
          questionRevisionId: q.id,
          contentRevision: 1,
          schemaVersion: 1,
          type: "multiple_choice",
          targetLanguage: "fr-FR",
          instructionLanguage: "en",
          proficiency: "A1",
          difficulty: "easy",
          skillIds: [],
          tags: [],
          rewardClass: "standard",
          presentation: {
            prompt: { en: q.question },
            instructions: { en: "Inspect the available choices." },
            interaction: {
              options: q.quiz_answers.map((a) => ({
                id: a.id,
                text: a.answer,
              })),
              shuffleOptions: false,
            },
            hints: [],
            media: [],
          },
        } as AdminPreviewQuestion["exercise"],
        answerKey: correct,
        feedback: {
          correctAnswerDisplay: correct.join(" / "),
          explanation: { en: q.explanation ?? "" },
        },
      };
    });
  }
  return {
    quiz,
    revisions: revisions ?? [],
    selected: selected ?? null,
    questions,
  };
}
