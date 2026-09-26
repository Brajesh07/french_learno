import {
  deliveryJson,
  deliveryFailure,
  studentClient,
} from "@/lib/gamification/delivery";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const client = await studentClient(request);
    const { data, error } = await client.rpc("get_learning_catalogue");
    if (error) throw error;
    return deliveryJson(data);
  } catch (error) {
    return deliveryFailure(error);
  }
}
