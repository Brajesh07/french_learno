import { NextRequest } from "next/server";
import {
  deliveryJson,
  deliveryFailure,
  studentClient,
} from "@/lib/gamification/delivery";
import { isUuid, SubmissionInputError } from "@/lib/gamification/submission";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    if (!isUuid(sessionId))
      throw new SubmissionInputError(400, "Invalid session identifier.");
    const client = await studentClient(request);
    const { data, error } = await client.rpc("get_learning_session", {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return deliveryJson(data);
  } catch (error) {
    return deliveryFailure(error);
  }
}
