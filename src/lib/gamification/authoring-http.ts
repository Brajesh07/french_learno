import { NextRequest, NextResponse } from "next/server";
import { AuthoringError } from "./authoring";
export const authoringJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
export class AuthoringHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readAuthoringRequest(
  request: NextRequest,
): Promise<unknown> {
  if (
    (request.headers.get("origin") &&
      request.headers.get("origin") !== request.nextUrl.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AuthoringHttpError(403, "Cross-origin request denied.");
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AuthoringHttpError(415, "Expected JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthoringHttpError(400, "A document is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1048576) {
        await reader.cancel();
        throw new AuthoringHttpError(
          413,
          "Module exceeds the 1 MiB upload limit.",
        );
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
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AuthoringHttpError(400, "Invalid JSON document.");
  }
}
export function authoringFailure(error: unknown) {
  if (error instanceof AuthoringError)
    return authoringJson({ error: error.message, path: error.path }, 400);
  if (error instanceof AuthoringHttpError)
    return authoringJson({ error: error.message }, error.status);
  const db = error as { code?: string; message?: string };
  if (db?.code === "42501")
    return authoringJson(
      { error: "Approved teacher ownership is required." },
      403,
    );
  if (db?.code === "P0002")
    return authoringJson({ error: "Module not found." }, 404);
  if (db?.code === "40001")
    return authoringJson(
      {
        error:
          "This revision changed. Reload the saved draft before editing again.",
        code: "REVISION_CONFLICT",
      },
      409,
    );
  if (db?.code === "40P01")
    return authoringJson(
      {
        error: "A concurrent change occurred. Retry the same request.",
        code: "RETRY_TRANSACTION",
      },
      503,
    );
  const messages: Record<string, string> = {
    PUBLISH_COURSE_FIRST:
      "Publish the parent course before publishing this module.",
    COURSE_IMMUTABLE: "An existing module cannot move to another course.",
    ASSET_UNAVAILABLE:
      "A referenced asset is not ready or is not owned by you.",
  };
  if (db?.code === "22023")
    return authoringJson(
      {
        error:
          messages[db.message ?? ""] ??
          "Check the module fields and try again.",
      },
      400,
    );
  return authoringJson(
    {
      error: "The module could not be saved. Retry the same request.",
      code: "AUTHORING_UNAVAILABLE",
    },
    503,
  );
}
