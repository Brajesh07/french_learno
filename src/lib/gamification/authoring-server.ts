import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthoringDocument, EditorSnapshot } from "./authoring";
/** Ownership is explicit even though the cookie client also enforces staff RLS. */
export async function loadTeacherRevision(
  client: SupabaseClient,
  teacherId: string,
  moduleId: string,
  revisionId?: string,
): Promise<EditorSnapshot | null> {
  const { data: quiz, error: qe } = await client
    .from("quizzes")
    .select("id,course_id")
    .eq("id", moduleId)
    .eq("created_by", teacherId)
    .maybeSingle();
  if (qe) throw qe;
  if (!quiz) return null;
  let query = client.from("quiz_revisions").select("*").eq("quiz_id", moduleId);
  if (revisionId) query = query.eq("id", revisionId);
  const { data: revisions, error: re } = await query
    .order("revision", { ascending: false })
    .limit(1);
  if (re) throw re;
  const r = revisions?.[0];
  if (!r) return null;
  const { data: items, error: ie } = await client
    .from("quiz_revision_items")
    .select("question_id,question_revision_id,position")
    .eq("quiz_revision_id", r.id)
    .order("position");
  if (ie) throw ie;
  const ids = (items ?? []).map((i) => i.question_revision_id);
  const [{ data: questions, error: qre }, { data: keys, error: ke }] =
    ids.length
      ? await Promise.all([
          client
            .from("quiz_question_revisions")
            .select("id,type,presentation")
            .in("id", ids),
          client
            .from("quiz_question_keys")
            .select("question_revision_id,assessment,feedback")
            .in("question_revision_id", ids),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
  if (qre || ke) throw qre || ke;
  // Check version again: multiple PostgREST reads must not manufacture a mixed
  // draft snapshot if a save replaces module items while this load is in flight.
  const { data: current, error: ce } = await client
    .from("quiz_revisions")
    .select("edit_version,status")
    .eq("id", r.id)
    .single();
  if (ce) throw ce;
  if (current.edit_version !== r.edit_version || current.status !== r.status)
    throw { code: "40001", message: "STALE_REVISION" };
  const document = {
    schemaVersion: 1,
    courseId: quiz.course_id,
    title: r.title,
    description: r.description ?? "",
    objective: r.objective,
    kind: r.kind,
    proficiency: r.proficiency,
    accessTier: r.access_tier,
    passingScore: r.passing_score,
    questions: (items ?? []).map((i) => {
      const q = questions?.find((q) => q.id === i.question_revision_id),
        k = keys?.find(
          (k) => k.question_revision_id === i.question_revision_id,
        );
      if (!q || !k) throw new Error("Incomplete authoring snapshot");
      return {
        questionId: i.question_id,
        type: q.type,
        presentation: q.presentation,
        assessment: k.assessment,
        feedback: k.feedback,
      };
    }),
  } as AuthoringDocument;
  return {
    moduleId,
    revisionId: r.id,
    editVersion: r.edit_version,
    status: r.status,
    document,
  };
}
