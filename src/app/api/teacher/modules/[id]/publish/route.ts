import { NextRequest } from "next/server";
import { requireApprovedTeacher } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import {
  validateDocument,
  validatePublishWrite,
} from "@/lib/gamification/authoring";
import { loadTeacherRevision } from "@/lib/gamification/authoring-server";
import {
  authoringJson,
  authoringFailure,
  readAuthoringRequest,
} from "@/lib/gamification/authoring-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
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
      return authoringJson(
        { error: "Your account changed. Reload before publishing." },
        403,
      );
    const input = validatePublishWrite(await readAuthoringRequest(request));
    if ((await params).id !== input.moduleId)
      return authoringJson(
        { error: "Module identity does not match the URL." },
        400,
      );
    const snapshot = await loadTeacherRevision(
      auth.client,
      auth.userId,
      input.moduleId,
      input.revisionId,
    );
    if (!snapshot) return authoringJson({ error: "Module not found." }, 404);
    if (snapshot.editVersion !== input.expectedVersion)
      return authoringJson(
        {
          error: "This revision changed. Reload before publishing.",
          code: "REVISION_CONFLICT",
        },
        409,
      );
    // Validate persisted data, not a browser assertion that validation passed.
    validateDocument(snapshot.document);
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("write_teacher_revision", {
      p_teacher_id: auth.userId,
      p_action: "publish",
      p_request: input,
    });
    if (error) throw error;
    return authoringJson(data);
  } catch (error) {
    return authoringFailure(error);
  }
}
