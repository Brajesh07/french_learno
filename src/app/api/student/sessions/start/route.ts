import { NextRequest } from "next/server";
import {
  deliveryJson,
  deliveryFailure,
  readStartRequest,
  studentClient,
} from "@/lib/gamification/delivery";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const input = await readStartRequest(request);
    const client = await studentClient(request);
    // Cookie identity + one transaction: entitlement, revision pin, randomized
    // display order, and all session questions. The private key never leaves SQL.
    const { data, error } = await client.rpc("start_learning_session", {
      p_request: input,
    });
    if (error) throw error;
    if (!data) throw new Error("Missing session");
    return deliveryJson(data);
  } catch (error) {
    return deliveryFailure(error);
  }
}
