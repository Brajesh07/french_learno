import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid, SubmissionInputError, submissionFailure } from "./submission";
import type { StartSessionRequest } from "@/types/gamification";
export const deliveryJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
export function parseStartRequest(value: unknown): StartSessionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new SubmissionInputError(400, "Invalid session request.");
  const v = value as Record<string, unknown>;
  const allowed = ["moduleId", "courseId", "mode", "idempotencyKey"];
  if (
    Object.keys(v).some((k) => !allowed.includes(k)) ||
    "moduleId" in v === "courseId" in v ||
    !isUuid(v.moduleId ?? v.courseId) ||
    !isUuid(v.idempotencyKey) ||
    !["lesson", "review", "daily", "words", "listening"].includes(
      v.mode as string,
    )
  ) {
    throw new SubmissionInputError(
      400,
      "Provide one moduleId or courseId, a mode, and an idempotencyKey.",
    );
  }
  return {
    ...v,
    idempotencyKey: v.idempotencyKey.toLowerCase(),
    ...("moduleId" in v
      ? { moduleId: (v.moduleId as string).toLowerCase() }
      : { courseId: (v.courseId as string).toLowerCase() }),
  } as StartSessionRequest;
}
export async function readStartRequest(request: NextRequest) {
  if (
    (request.headers.get("origin") &&
      request.headers.get("origin") !== request.nextUrl.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new SubmissionInputError(
      403,
      "Cross-origin requests are not allowed.",
    );
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new SubmissionInputError(415, "Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new SubmissionInputError(400, "A session request is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        throw new SubmissionInputError(413, "Session request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new SubmissionInputError(400, "Invalid JSON.");
  }
  return parseStartRequest(raw);
}
export async function studentClient(request?: Request) {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new SubmissionInputError(401, "Please sign in again.");
  if (
    request?.headers.get("x-learning-user") &&
    request.headers.get("x-learning-user") !== user.id
  )
    throw new SubmissionInputError(
      403,
      "Your signed-in account changed. Reload to continue.",
    );
  // Every RPC independently checks active student role and password-reset state.
  return client;
}
export function deliveryFailure(error: unknown) {
  if (error instanceof SubmissionInputError)
    return deliveryJson({ error: error.message }, error.status);
  const failure = submissionFailure(
    error && typeof error === "object" ? error : {},
  );
  return deliveryJson(
    {
      error:
        failure.status === 503
          ? "Learning content is temporarily unavailable. Please retry."
          : failure.error,
      code: failure.code,
    },
    failure.status,
  );
}
