import { NextRequest } from "next/server";
import { requireApprovedTeacher } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { validateDraftWrite } from "@/lib/gamification/authoring";
import {
  authoringJson,
  authoringFailure,
  readAuthoringRequest,
} from "@/lib/gamification/authoring-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApprovedTeacher();
    if (auth.error) return auth.error;
    if (
      request.headers.get("x-learning-user") &&
      request.headers.get("x-learning-user") !== auth.userId
    )
      return authoringJson(
        { error: "Your account changed. Reload before saving." },
        403,
      );
    const input = validateDraftWrite(await readAuthoringRequest(request));
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("write_teacher_revision", {
      p_teacher_id: auth.userId,
      p_action: "save",
      p_request: input,
    });
    if (error) throw error;
    return authoringJson(data);
  } catch (error) {
    return authoringFailure(error);
  }
}
