import { redirect } from "next/navigation";
export default async function CreateQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  redirect(
    "/teacher/quizzes/new" +
      (courseId ? `?courseId=${encodeURIComponent(courseId)}` : ""),
  );
}
