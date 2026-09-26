import type { AnswerSubmission, ExerciseType } from '@/types/gamification';

export const SUBMISSION_BYTES = 16384;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value);
export class SubmissionInputError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SubmissionInputError(400, 'Invalid submission.');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).length !== allowed.length || allowed.some(k => !(k in value))) throw new SubmissionInputError(400, 'Unexpected or missing submission fields.');
}
const identifier = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 100;
export function parseSubmission(raw: unknown, sessionId: string): AnswerSubmission {
  const v = object(raw);
  keys(v, ['schemaVersion', 'sessionId', 'sessionQuestionId', 'idempotencyKey', 'type', 'response', 'assistance']);
  if (v.schemaVersion !== 1 || !isUuid(sessionId) || !isUuid(v.sessionId) || v.sessionId.toLowerCase() !== sessionId.toLowerCase()
    || !isUuid(v.sessionQuestionId) || !isUuid(v.idempotencyKey)) throw new SubmissionInputError(400, 'Invalid session or submission identifiers.');
  const type = v.type as ExerciseType;
  const response = object(v.response), assistance = object(v.assistance);
  keys(assistance, ['hintIds', 'transcriptShown']);
  if (!Array.isArray(assistance.hintIds) || assistance.hintIds.length > 3 || !assistance.hintIds.every(identifier)
    || new Set(assistance.hintIds).size !== assistance.hintIds.length || typeof assistance.transcriptShown !== 'boolean'
    || (assistance.transcriptShown && type !== 'listening_choice')) throw new SubmissionInputError(400, 'Invalid assistance metadata.');
  if (type === 'multiple_choice' || type === 'listening_choice') {
    keys(response, ['optionId']);
    if (!identifier(response.optionId)) throw new SubmissionInputError(400, 'Choose an answer option.');
  } else if (type === 'typed_recall') {
    keys(response, ['text']);
    if (typeof response.text !== 'string' || !response.text.trim() || response.text.length > 500) throw new SubmissionInputError(400, 'Enter an answer of at most 500 characters.');
  } else if (type === 'sentence_builder') {
    keys(response, ['tokenIds']);
    if (!Array.isArray(response.tokenIds) || response.tokenIds.length < 1 || response.tokenIds.length > 20
      || !response.tokenIds.every(identifier) || new Set(response.tokenIds).size !== response.tokenIds.length) throw new SubmissionInputError(400, 'Invalid sentence tokens.');
  } else throw new SubmissionInputError(400, 'Unsupported exercise type.');
  return { ...v, sessionId: sessionId.toLowerCase(), sessionQuestionId: v.sessionQuestionId.toLowerCase(), idempotencyKey: v.idempotencyKey.toLowerCase() } as AnswerSubmission;
}
/** Bound bytes while reading; Content-Length is not trusted. */
export async function readSubmission(request: Request, sessionId: string): Promise<AnswerSubmission> {
  if (!request.body) throw new SubmissionInputError(400, 'A submission is required.');
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > SUBMISSION_BYTES) { await reader.cancel(); throw new SubmissionInputError(413, 'Submission is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new SubmissionInputError(400, 'Invalid JSON.'); }
  return parseSubmission(raw, sessionId);
}
export function submissionFailure(error: { code?: string; message?: string }): { status: number; error: string; code: string } {
  if (error.code === '42501') return { status: 403, error: 'Student or content access is no longer available.', code: 'ACCESS_DENIED' };
  if (error.code === 'P0002') return { status: 404, error: 'Session or question not found.', code: 'NOT_FOUND' };
  if (error.code === '22023' || error.code === '22P02') return { status: 400, error: 'Invalid answer submission.', code: 'INVALID_SUBMISSION' };
  if (error.code === '40001' || error.code === '40P01') return { status: 409, error: 'A concurrent change occurred. Retry with the same idempotency key.', code: 'RETRY_TRANSACTION' };
  if (error.code === 'P0003') {
    const messages: Record<string, string> = {
      IDEMPOTENCY_CONFLICT: 'This retry key was already used for a different submission.',
      ALREADY_ANSWERED: 'This question already has a first-attempt result.',
      SESSION_CLOSED: 'This session is no longer accepting answers.',
      OUT_OF_ORDER: 'Answer the current question before continuing.',
      HEARTS_EMPTY: 'Your hearts are empty. Continue in a review session to recover hearts.',
    };
    const code = error.message ?? '';
    return { status: 409, error: messages[code] ?? 'The session changed. Reload before continuing.', code: messages[code] ? code : 'SESSION_CONFLICT' };
  }
  // Never echo database details or private grading data to clients/logs.
  return { status: 503, error: 'Your answer could not be saved. Retry with the same idempotency key.', code: 'SUBMISSION_UNAVAILABLE' };
}
