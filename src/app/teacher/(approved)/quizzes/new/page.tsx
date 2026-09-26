import { requireStaffPage } from "@/lib/staff/auth";
import { RichModuleEditor } from "@/components/teacher/RichModuleEditor";
export default async function NewModulePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { client, user } = await requireStaffPage("teacher");
  const { data: courses, error } = await client
    .from("courses")
    .select("id,title,is_published")
    .eq("created_by", user.id)
    .order("title");
  if (error) throw new Error("Unable to load your courses.");
  const { courseId } = await searchParams;
  return (
    <RichModuleEditor
      userId={user.id}
      courses={courses ?? []}
      courseId={courses?.some((c) => c.id === courseId) ? courseId : undefined}
    />
  );
}
