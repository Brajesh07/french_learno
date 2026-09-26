import { NextRequest, NextResponse } from "next/server";
import { requireApprovedTeacher } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/gamification/submission";
import {
  authoringJson,
  authoringFailure,
} from "@/lib/gamification/authoring-http";
export const dynamic = "force-dynamic";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireApprovedTeacher();
    if (auth.error) return auth.error;
    const { id } = await params;
    if (!isUuid(id)) return authoringJson({ error: "Invalid asset." }, 400);
    const { data: asset, error } = await auth.client
      .from("learning_assets")
      .select("bucket_id,storage_path")
      .eq("id", id)
      .eq("owner_id", auth.userId)
      .eq("status", "ready")
      .maybeSingle();
    if (error) throw error;
    if (!asset) return authoringJson({ error: "Asset unavailable." }, 404);
    const admin = await createAdminClient();
    const { data, error: signingError } = await admin.storage
      .from(asset.bucket_id)
      .createSignedUrl(asset.storage_path, 60);
    if (signingError || !data) throw new Error("Signing failed");
    return NextResponse.redirect(data.signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  } catch (error) {
    return authoringFailure(error);
  }
}
