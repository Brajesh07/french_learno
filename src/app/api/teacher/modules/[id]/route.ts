import { NextRequest } from "next/server";
import { requireApprovedTeacher } from "@/lib/supabase/auth-helpers";
import { loadTeacherRevision } from "@/lib/gamification/authoring-server";
import {
  authoringJson,
  authoringFailure,
} from "@/lib/gamification/authoring-http";
import { isUuid } from "@/lib/gamification/submission";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireApprovedTeacher();
    if (auth.error) return auth.error;
    if (
      request.headers.get("x-learning-user") &&
      request.headers.get("x-learning-user") !== auth.userId
    )
      return authoringJson({ error: "Your account changed. Reload." }, 403);
    const { id } = await params;
    if (!isUuid(id))
      return authoringJson({ error: "Invalid module identifier." }, 400);
    const snapshot = await loadTeacherRevision(auth.client, auth.userId, id);
    return snapshot
      ? authoringJson(snapshot)
      : authoringJson({ error: "Module not found." }, 404);
  } catch (error) {
    return authoringFailure(error);
  }
}
