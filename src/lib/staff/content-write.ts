import { NextRequest } from 'next/server';
import { requireApprovedTeacher } from '@/lib/supabase/auth-helpers';
import { checkWrite, readBody, reply, databaseFailure } from './http';
export async function writeTeacherContent(request: NextRequest, kind: 'course' | 'quiz', id: string | null) {
  const invalid = checkWrite(request); if (invalid) return invalid;
  const auth = await requireApprovedTeacher(); if (auth.error) return auth.error;
  try {
    const body = await readBody(request);
    if (typeof body.title !== 'string' || !body.title.trim()) return reply({ error: 'A title is required.' }, 400);
    if (kind === 'course' && body.content && typeof body.content === 'object') {
      for (const [key, value] of Object.entries(body.content)) {
        if (['imageUrl', 'audioUrl', 'videoUrl'].includes(key) && value) {
          if (typeof value !== 'string' || !['http:', 'https:'].includes(new URL(value).protocol)) return reply({ error: 'Media URLs must use HTTP or HTTPS.' }, 400);
        }
      }
    }
    const { data, error } = await auth.client.rpc(kind === 'course' ? 'save_teacher_course' : 'save_teacher_quiz', { p_id: id, p_data: body });
    if (error) return databaseFailure(error);
    return reply({ success: true, courseId: kind === 'course' ? data : undefined, data: kind === 'quiz' ? { quizId: data } : undefined }, id ? 200 : 201);
  } catch { return reply({ error: 'Invalid content. Check your fields and try again.' }, 400); }
}
