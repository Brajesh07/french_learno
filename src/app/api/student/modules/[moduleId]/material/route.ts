import {
  deliveryJson,
  deliveryFailure,
  studentClient,
} from "@/lib/gamification/delivery";
import { isUuid, SubmissionInputError } from "@/lib/gamification/submission";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    if (!isUuid(moduleId))
      throw new SubmissionInputError(400, "Invalid module identifier.");
    const client = await studentClient(request);
    const { data, error } = await client.rpc("get_learning_material", {
      p_module_id: moduleId,
    });
    if (error) throw error;
    return deliveryJson(data);
  } catch (error) {
    return deliveryFailure(error);
  }
}
