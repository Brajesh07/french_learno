import { NextRequest, NextResponse } from 'next/server';
export const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export function checkWrite(request: NextRequest) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'Cross-origin request denied.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Expected JSON.' }, 415);
  return null;
}
export async function readBody(request: NextRequest, max = 262144) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > max) throw new Error('Request is too large.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
  return value as Record<string, unknown>;
}
export function databaseFailure(error: { code?: string; message: string }) {
  if (error.code === '42501') return reply({ error: 'You do not have access to this content.' }, 403);
  if (error.code === 'P0002') return reply({ error: 'Record not found.' }, 404);
  if (error.code === '40001') return reply({ error: 'This record changed. Refresh and try again.' }, 409);
  if (error.code === '22023') return reply({ error: error.message }, 400);
  if (error.code?.startsWith('22')) return reply({ error: 'Invalid content fields.' }, 400);
  return reply({ error: 'The request could not be saved. Please try again.' }, 503);
}
