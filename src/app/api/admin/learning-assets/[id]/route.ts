import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/gamification/submission";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export const dynamic = "force-dynamic";

/** Moderation-only media delivery. No student session or teacher ownership required. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      for (const [key, value] of Object.entries(headers))
        auth.error.headers.set(key, value);
      return auth.error;
    }
    const { id } = await params;
    if (!isUuid(id))
      return NextResponse.json(
        { error: "Invalid asset." },
        { status: 400, headers },
      );
    // A service client is created only after the active-admin gate succeeds.
    const admin = await createAdminClient();
    const { data: asset, error } = await admin
      .from("learning_assets")
      .select("bucket_id,storage_path")
      .eq("id", id)
      .eq("status", "ready")
      .maybeSingle();
    if (error) throw error;
    if (!asset || asset.bucket_id !== "gamification-assets")
      return NextResponse.json(
        { error: "Asset unavailable." },
        { status: 404, headers },
      );
    const { data, error: signingError } = await admin.storage
      .from(asset.bucket_id)
      .createSignedUrl(asset.storage_path, 60);
    if (signingError || !data) throw new Error("Signing failed");
    return NextResponse.redirect(data.signedUrl, { status: 307, headers });
  } catch {
    return NextResponse.json(
      { error: "Unable to load this media." },
      { status: 503, headers },
    );
  }
}
