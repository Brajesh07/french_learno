// Opt-in integration test for the local Supabase + running Next development server.
// Run: node --env-file=.env.local tests/staff/workflows.mjs
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Local database only');
const base = 'http://localhost:3000';
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = Date.now(), password = 'Local-Staff-Test-September20!';
const users = [], courses = [], emails = [];
const failures = [];
let completed = false;
async function check(label, fn) { try { await fn(); console.log('PASS ' + label); } catch (e) { failures.push(e); console.error('FAIL ' + label + ': ' + e.message); } }
async function account(label, role) {
  const email = `lla-${label}-${suffix}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(error);
  users.push(data.user.id); emails.push(email);
  assert.ifError((await admin.from('profiles').insert({ id: data.user.id, name: label, username: `lla_${label}_${suffix}`, email, role })).error);
  return { id: data.user.id, email };
}
async function clientFor(email) {
  const jar = new Map();
  const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(c => jar.set(c.name, c.value)) } });
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
  const headers = { Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join('; '), Origin: base, 'Content-Type': 'application/json' };
  return { client, request: (path, method = 'GET', body) => fetch(base + path, { method, headers, redirect: 'manual', ...(body ? { body: JSON.stringify(body) } : {}) }) };
}
async function signup(label) {
  const email = `lla-${label}-${suffix}@example.test`; emails.push(email);
  const r = await fetch(base + '/api/auth/teacher-signup', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: label, username: `lla_${label}_${suffix}`, email, password, bio: 'Temporary workflow check', expertise: 'French A1', role: 'admin', verification_status: 'approved' }) });
  assert.equal(r.status, 201, await r.clone().text()); assert.equal((await r.json()).destination, '/teacher/pending');
  const p = await admin.from('profiles').select('id,role').eq('email', email).single(); assert.ifError(p.error); users.push(p.data.id);
  assert.equal(p.data.role, 'teacher');
  const tp = await admin.from('teacher_profiles').select('verification_status').eq('id', p.data.id).single(); assert.equal(tp.data.verification_status, 'pending');
  return { id: p.data.id, email };
}
try {
  const staff = await account('admincheck', 'admin'), student = await account('studentcheck', 'student');
  const teacher = await signup('teachercheck'), other = await signup('otherteacher');
  console.log('PASS teacher signup ignores submitted role and approval status');
  const a = await clientFor(staff.email), t = await clientFor(teacher.email), o = await clientFor(other.email), s = await clientFor(student.email);
  const course = { title: 'Temporary French course', level: 'A1', description: 'Integration test', content: { text: 'Bonjour' }, isPublished: false };
  await check('pending teacher cannot author or enter workspace', async () => {
    assert.equal((await t.request('/api/teacher/courses', 'POST', course)).status, 403);
    const r = await t.request('/teacher/courses'); assert.equal(r.status, 307); assert.ok(r.headers.get('location').endsWith('/teacher/pending'));
  });
  await check('student and teacher cannot approve applications', async () => {
    for (const c of [s, t]) assert.equal((await c.request(`/api/admin/teachers/${teacher.id}`, 'PATCH', { decision: 'approved', expected: 'pending' })).status, 403);
    assert.ok((await t.client.rpc('review_teacher', { p_teacher_id: teacher.id, p_expected: 'pending', p_decision: 'approved' })).error);
  });
  await check('admin approval and audit commit together', async () => {
    for (const person of [teacher, other]) { const r = await a.request(`/api/admin/teachers/${person.id}`, 'PATCH', { decision: 'approved', expected: 'pending' }); assert.equal(r.status, 200, await r.text()); }
    const log = await admin.from('admin_audit_log').select('action').eq('target_id', teacher.id); assert.ifError(log.error); assert.deepEqual(log.data.map(x => x.action), ['teacher_approved']);
    assert.equal((await a.request(`/api/admin/teachers/${teacher.id}`, 'PATCH', { decision: 'rejected', expected: 'pending' })).status, 409);
  });
  let courseId, quizId;
  await check('approved teacher creates and edits owned course', async () => {
    const r = await t.request('/api/teacher/courses', 'POST', course); assert.equal(r.status, 201, await r.clone().text()); courseId = (await r.json()).courseId; courses.push(courseId);
    assert.equal((await t.request(`/api/teacher/courses/${courseId}`, 'PATCH', { ...course, title: 'Updated French course', isPublished: true })).status, 200);
    const owner = await admin.from('courses').select('created_by,title').eq('id', courseId).single(); assert.equal(owner.data.created_by, teacher.id); assert.equal(owner.data.title, 'Updated French course');
  });
  const quiz = { title: 'Temporary quiz', course_id: courseId, passing_score: 70, is_published: true, questions: [{ question: 'Hello in French?', points: 1, answers: [{ answer: 'Bonjour', is_correct: true }, { answer: 'Merci', is_correct: false }] }] };
  await check('quiz creation/edit are transactional and teacher-owned', async () => {
    const r = await t.request('/api/teacher/quizzes', 'POST', quiz); assert.equal(r.status, 201, await r.clone().text()); quizId = (await r.json()).data.quizId;
    const edit = await t.request(`/api/teacher/quizzes/${quizId}`, 'PATCH', { ...quiz, title: 'Updated quiz' }); assert.equal(edit.status, 200, await edit.text());
    const bad = await t.request(`/api/teacher/quizzes/${quizId}`, 'PATCH', { ...quiz, title: 'Must roll back', questions: [{ question: 'Bad', answers: [{ answer: 'A', is_correct: false }, { answer: 'B', is_correct: false }] }] }); assert.equal(bad.status, 400);
    const stored = await t.request(`/api/teacher/quizzes/${quizId}`); const result = await stored.json(); assert.equal(result.title, 'Updated quiz'); assert.equal(result.questions.length, 1);
  });
  await check('another teacher cannot read/edit owned authoring data or attach quizzes', async () => {
    assert.equal((await o.request(`/api/teacher/courses/${courseId}`)).status, 404);
    assert.equal((await o.request(`/api/teacher/courses/${courseId}`, 'PATCH', course)).status, 404);
    assert.equal((await o.request(`/api/teacher/quizzes/${quizId}`)).status, 404);
    assert.equal((await o.request('/api/teacher/quizzes', 'POST', quiz)).status, 403);
    const list = await o.request('/api/teacher/courses'); assert.ok(!(await list.json()).data.some(x => x.id === courseId));
  });
  await check('admin authoring denied in old APIs and direct database access', async () => {
    for (const kind of ['courses', 'quizzes']) assert.equal((await a.request(`/api/admin/${kind}`, 'POST', course)).status, 403);
    for (const [kind, id] of [['courses', courseId], ['quizzes', quizId]]) {
      for (const method of ['PATCH', 'DELETE']) assert.equal((await a.request(`/api/admin/${kind}/${id}`, method, course)).status, 403);
    }
    assert.ok((await a.client.from('courses').insert({ title: 'Forbidden', level: 'A1' })).error);
    assert.ok((await a.client.rpc('save_teacher_course', { p_id: null, p_data: course })).error);
    assert.equal((await a.request('/api/admin/courses')).status, 200);
  });
  await check('rejection removes existing-session access and unpublishes content', async () => {
    assert.equal((await a.request(`/api/admin/teachers/${teacher.id}`, 'PATCH', { decision: 'rejected', expected: 'approved' })).status, 200);
    assert.equal((await t.request(`/api/teacher/courses/${courseId}`, 'PATCH', course)).status, 403);
    const result = await admin.from('courses').select('is_published').eq('id', courseId).single(); assert.equal(result.data.is_published, false);
    const q = await admin.from('quizzes').select('is_published').eq('id', quizId).single(); assert.equal(q.data.is_published, false);
  });
  completed = true;
  if (process.env.KEEP_STAFF_FIXTURES === '1' && !failures.length) {
    // Explicit opt-in for browser QA; credentials are synthetic, local-only.
    writeFileSync('/private/tmp/lla-staff-fixtures.json', JSON.stringify({ users, courses, emails, password, staff, teacher, other, student }), { mode: 0o600 });
    console.log('Local browser fixtures saved; cleanup required after browser QA.');
  }
} finally {
  if (!completed || process.env.KEEP_STAFF_FIXTURES !== '1' || failures.length) {
    for (const id of courses) await admin.from('courses').delete().eq('id', id);
    for (const id of users) { await admin.from('quizzes').delete().eq('created_by', id); await admin.from('courses').delete().eq('created_by', id); await admin.auth.admin.deleteUser(id); }
    for (const email of emails) await admin.from('teacher_signup_limits').delete().eq('bucket', createHash('sha256').update(email).digest('hex'));
  }
}
if (failures.length) process.exitCode = 1;
