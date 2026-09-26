import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/staff/auth";
import { isUuid } from "@/lib/gamification/submission";
import { loadTeacherRevision } from "@/lib/gamification/authoring-server";
import { RichModuleEditor } from "@/components/teacher/RichModuleEditor";
import LegacyQuizEdit from "./LegacyQuizEdit";
export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { client, user } = await requireStaffPage("teacher");
  const { data: quiz, error } = await client
    .from("quizzes")
    .select("id")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load this module.");
  if (!quiz) notFound();
  const initial = await loadTeacherRevision(client, user.id, id);
  if (!initial) return <LegacyQuizEdit />;
  const { data: courses, error: ce } = await client
    .from("courses")
    .select("id,title,is_published")
    .eq("created_by", user.id)
    .order("title");
  if (ce) throw new Error("Unable to load your courses.");
  return (
    <RichModuleEditor
      key={`${initial.revisionId}:${initial.editVersion}`}
      userId={user.id}
      courses={courses ?? []}
      initial={initial}
    />
  );
}
