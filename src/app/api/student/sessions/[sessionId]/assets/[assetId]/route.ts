import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deliveryFailure, studentClient } from "@/lib/gamification/delivery";
import { isUuid, SubmissionInputError } from "@/lib/gamification/submission";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; assetId: string }> },
) {
  try {
    const { sessionId, assetId } = await params;
    if (!isUuid(sessionId) || !isUuid(assetId))
      throw new SubmissionInputError(400, "Invalid media identifier.");
    const client = await studentClient(request);
    const { data: asset, error } = await client.rpc(
      "get_learning_session_asset",
      { p_session_id: sessionId, p_asset_id: assetId },
    );
    if (error) throw error;
    if (!asset || asset.bucket !== "gamification-assets")
      throw new Error("Missing media");
    // Service access is only used AFTER cookie-authenticated asset authorization.
    const admin = await createAdminClient();
    const { data, error: storageError } = await admin.storage
      .from(asset.bucket)
      .createSignedUrl(asset.path, 60);
    if (storageError || !data) throw new Error("Media unavailable");
    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  } catch (error) {
    return deliveryFailure(error);
  }
}
