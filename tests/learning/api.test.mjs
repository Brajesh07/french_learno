import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { compile, output, progressUrl, cleanup } from './compile.mjs';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const { emptyProgress } = await import(progressUrl);
after(cleanup);
const mockPath = path.join(output, 'supabase-mock.mjs');
fs.writeFileSync(mockPath, `
export const db = { actor: null, role: 'student', active: true, unavailable: false, rows: new Map(), writes: [], race: false };
export async function createClient() {
 return {
  auth: {getUser: async()=>({data:{user:db.actor?{id:db.actor}:null},error:null})},
  from(table) {
   let operation='read',values,filters={};
   const query={
    select(){return query},eq(key,value){filters[key]=value;return query},
    update(value){operation='update';values=value;return query},
    insert(value){operation='insert';values=value;return query},
    async maybeSingle(){
     if(table==='profiles')return {data:{role:db.role,is_active:db.active},error:null};
     if(db.unavailable)return {data:null,error:{code:'42P01'}};
     const id=operation==='insert'?values.user_id:filters.user_id;
     if(operation==='read')return {data:db.rows.get(id)||null,error:null};
     db.writes.push({id,operation,filters,values});
     if(id!==db.actor)return {data:null,error:{code:'42501'}};
     if(operation==='insert'&&db.rows.has(id))return {data:null,error:{code:'23505'}};
     const old=db.rows.get(id);
     if(db.race&&old){old.revision++;db.race=false;}
     if(operation==='update'&&old?.revision!==filters.revision)return {data:null,error:null};
     const data={...old,...values,user_id:id};db.rows.set(id,data);return {data,error:null};
    }
   };return query;
  }
 };
}
`);
const { db } = await import(pathToFileURL(mockPath).href);
compile('src/lib/learning/progress-server.ts', 'progress-server.mjs', {
  "import 'server-only';": '', "'./progress'": "'./progress.mjs'", "'./model'": "'./model.mjs'",
});
const routeUrl = compile('src/app/api/student/learning-progress/route.ts', 'route.mjs', {
  "'next/server'": JSON.stringify(pathToFileURL(require.resolve('next/server')).href),
  "'@/lib/supabase/server'": "'./supabase-mock.mjs'",
  "'@/lib/learning/progress'": "'./progress.mjs'",
  "'@/lib/learning/progress-server'": "'./progress-server.mjs'",
});
const { GET, PUT } = await import(routeUrl);
const actor = '11111111-1111-4111-8111-111111111111';
const reset = () => Object.assign(db, { actor, role: 'student', active: true, unavailable: false, rows: new Map(), writes: [], race: false });
const write = () => ({ ...emptyProgress(), selectedLanguage: 'fr-FR', mutationId: crypto.randomUUID() });
const request = (body, headers = {}) => new NextRequest('http://localhost:3000/api/student/learning-progress', {
  method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', 'X-Learning-User': actor, ...headers }, body: JSON.stringify(body),
});

test('unauthenticated and non-student requests cannot access progress', async () => {
  reset(); db.actor = null; assert.equal((await GET()).status, 401);
  assert.equal((await PUT(request(write()))).status, 401);
  db.actor = actor; db.role = 'admin'; assert.equal((await GET()).status, 403);
  db.role = 'student'; db.active = false; assert.equal((await GET()).status, 403);
  assert.equal(db.writes.length, 0);
});
test('new student GET returns unselected state without creating a row', async () => {
  reset(); const response = await GET();
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual((await response.json()).progress, emptyProgress());
  assert.equal(db.writes.length, 0);
});
test('selection is saved under session identity, and retry is idempotent', async () => {
  reset(); const payload = write();
  assert.equal((await PUT(request(payload))).status, 200);
  assert.equal(db.rows.get(actor).selected_language, 'fr-FR');
  assert.equal((await PUT(request(payload))).status, 200);
  assert.equal(db.writes.length, 1); assert.equal(db.rows.get(actor).revision, 1);
  assert.equal((await (await GET()).json()).progress.selectedLanguage, 'fr-FR');
});
test('forged account fields, changed sessions and cross-origin writes are rejected', async () => {
  reset(); assert.equal((await PUT(request({ ...write(), user_id: 'victim' }))).status, 400);
  assert.equal((await PUT(request(write(), { 'X-Learning-User': 'another-account' }))).status, 401);
  assert.equal((await PUT(request(write(), { Origin: 'https://untrusted.example' }))).status, 403);
  assert.equal(db.writes.length, 0);
});
test('stale revisions and an update race cannot overwrite saved progress', async () => {
  reset(); await PUT(request(write()));
  assert.equal((await PUT(request(write()))).status, 409);
  db.race = true;
  assert.equal((await PUT(request({ ...write(), revision: 1 }))).status, 409);
  assert.equal(db.rows.get(actor).revision, 2);
});
test('missing storage and corrupt saved data fail closed rather than resetting', async () => {
  reset(); db.unavailable = true;
  assert.equal((await GET()).status, 503); assert.equal((await PUT(request(write()))).status, 503);
  db.unavailable = false; db.rows.set(actor, { selected_language: 'fr-FR', revision: 1, state: {} });
  assert.equal((await GET()).status, 503); assert.equal(db.writes.length, 0);
});
