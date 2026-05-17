import { createAdminClient } from "./server";

export type NotificationType =
  | "login"
  | "quiz_complete"
  | "course_complete"
  | "signup";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Inserts a notification row using the service-role client (bypasses RLS).
 * Safe to call from any server-side Route Handler or Server Action.
 * Errors are logged but never thrown — callers should not depend on this succeeding.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      type: params.type,
      title: params.title,
      message: params.message,
      user_id: params.userId ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) console.error("[createNotification] insert error:", error);
  } catch (err) {
    console.error("[createNotification] unexpected error:", err);
  }
}
