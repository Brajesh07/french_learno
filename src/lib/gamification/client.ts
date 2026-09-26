import type { ConfirmedAnswer } from "@/types/gamification";
export class LearningRequestError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code?: string,
  ) {
    super(message);
  }
}
export async function learningRequest<T>(
  path: string,
  userId: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/student/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Learning-User": userId,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new LearningRequestError(
      "Connection interrupted. Retry to check whether your request was saved.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new LearningRequestError(
      "The server response was interrupted. Please retry.",
    );
  }
  if (!response.ok)
    throw new LearningRequestError(
      data.error || "Learning is temporarily unavailable.",
      response.status,
      data.code,
    );
  return data as T;
}
/** Retry receipts can be older than totals from another tab or question. */
export function newestTotals(
  current: ConfirmedAnswer["totals"],
  incoming: ConfirmedAnswer["totals"],
) {
  return incoming.revision >= current.revision ? incoming : current;
}
