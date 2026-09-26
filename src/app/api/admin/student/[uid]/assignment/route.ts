import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/gamification/submission";
import { checkWrite, readBody, reply, databaseFailure } from "@/lib/staff/http";
type Context = { params: Promise<{ uid: string }> };
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: Context) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { uid } = await params;
  if (!isUuid(uid)) return reply({ error: "Invalid student." }, 400);
  const client = await createClient();
  const { data, error } = await client.rpc("get_admin_student_assignment", {
    p_student_id: uid,
  });
  return error ? databaseFailure(error) : reply(data);
}
export async function PUT(request: NextRequest, { params }: Context) {
  const invalid = checkWrite(request);
  if (invalid) return invalid;
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  try {
    const { uid } = await params,
      body = await readBody(request, 2048);
    if (
      !isUuid(uid) ||
      Object.keys(body).some(
        (key) => !["teacherId", "expectedAssignmentId"].includes(key),
      ) ||
      !(body.teacherId === null || isUuid(body.teacherId)) ||
      !(body.expectedAssignmentId === null || isUuid(body.expectedAssignmentId))
    )
      return reply({ error: "Invalid assignment." }, 400);
    const client = await createClient();
    const { data, error } = await client.rpc("assign_student_teacher", {
      p_student_id: uid,
      p_teacher_id: body.teacherId,
      p_expected_assignment_id: body.expectedAssignmentId,
    });
    return error ? databaseFailure(error) : reply(data);
  } catch {
    return reply(
      { error: "Unable to update this assignment. Refresh and try again." },
      400,
    );
  }
}
