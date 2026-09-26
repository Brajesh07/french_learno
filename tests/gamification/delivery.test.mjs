import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'lla-delivery-tests-'));
after(() => fs.rmSync(output, { recursive: true, force: true }));
function compile(file, target, replacements = {}) {
  let source = fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) {
    source = source.replaceAll(from, to);
    if (from.startsWith("'")) source = source.replaceAll(JSON.stringify(from.slice(1, -1)), to);
  }
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  fs.writeFileSync(path.join(output, target), result.outputText);
  return pathToFileURL(path.join(output, target)).href;
}
fs.writeFileSync(path.join(output, 'mock.mjs'), `
export const state = {user: true, rpcError: null, calls: [], result: {id:'session', questions:[], receipts:[]}};
export async function createClient() { return {
 auth: { getUser: async () => ({data:{user:state.user?{id:'actor'}:null},error:null}) },
 async rpc(name,args) {state.calls.push({name,args});return {data:state.rpcError?null:state.result,error:state.rpcError};}
}; }
`);
const replacements = {
  "'next/server'": JSON.stringify(pathToFileURL(require.resolve('next/server')).href),
  "'@/lib/supabase/server'": "'./mock.mjs'",
  "'@/lib/gamification/submission'": "'./submission.mjs'",
  "'@/lib/gamification/delivery'": "'./delivery.mjs'",
  "'./submission'": "'./submission.mjs'",
};
compile('src/lib/gamification/submission.ts', 'submission.mjs');
const delivery = await import(compile('src/lib/gamification/delivery.ts', 'delivery.mjs', replacements));
const { state } = await import(pathToFileURL(path.join(output, 'mock.mjs')).href);
const { POST } = await import(compile('src/app/api/student/sessions/start/route.ts', 'start.mjs', replacements));
const { GET: getSession } = await import(compile('src/app/api/student/sessions/[sessionId]/route.ts', 'session.mjs', replacements));
const { GET: getModules } = await import(compile('src/app/api/student/modules/route.ts', 'modules.mjs', replacements));
const { GET: getMaterial } = await import(compile('src/app/api/student/modules/[moduleId]/material/route.ts', 'material.mjs', replacements));
const client = await import(compile('src/lib/gamification/client.ts', 'client.mjs'));
const id = '31000000-0000-4000-8000-000000000001';
const body = () => ({ moduleId:id, mode:'lesson', idempotencyKey:crypto.randomUUID() });
const req = (payload = body(), headers = {}) => new NextRequest('http://localhost:3000/api/student/sessions/start', {
 method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...headers},body:typeof payload==='string'?payload:JSON.stringify(payload),
});
const reset = () => Object.assign(state,{user:true,rpcError:null,calls:[],result:{id:'session',questions:[],receipts:[]}});
test('start route accepts module or course identity, never arbitrary question IDs/rewards', async () => {
 reset();
 for(const payload of [{...body(),xp:999}, {...body(),questionIds:[id]}, {...body(),userId:id}, {...body(),courseId:id}, {mode:'lesson',idempotencyKey:id}, {...body(),mode:'invented'}, {...body(),moduleId:null}, {...body(),idempotencyKey:'bad'}]) {
  assert.equal((await POST(req(payload))).status,400);
 }
 assert.equal(state.calls.length,0);
 const input=body(),r=await POST(req(input));assert.equal(r.status,200);
 assert.deepEqual(state.calls,[{name:'start_learning_session',args:{p_request:input}}]);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 const course={courseId:id,mode:'lesson',idempotencyKey:crypto.randomUUID()};
 assert.deepEqual(delivery.parseStartRequest(course),course);
});
test('start route rejects cross-origin requests, malformed or oversized JSON, and account changes', async () => {
 reset();assert.equal((await POST(req(body(),{Origin:'https://attacker.example'}))).status,403);
 assert.equal((await POST(req(body(),{'Sec-Fetch-Site':'cross-site'}))).status,403);
 assert.equal((await POST(req(body(),{'Content-Type':'text/plain'}))).status,415);
 assert.equal((await POST(req('{bad'))).status,400);
 assert.equal((await POST(req(JSON.stringify({...body(),padding:'x'.repeat(2100)})))).status,413);
 assert.equal((await POST(req(body(),{'X-Learning-User':'another-account'}))).status,403);
 state.user=false;assert.equal((await POST(req())).status,401);assert.equal(state.calls.length,0);
});
test('database access failures are safe, explicit, and do not expose private details', async () => {
 for(const [db,status] of [[{code:'42501'},403],[{code:'P0002'},404],[{code:'40P01'},409],[{code:'P0001',message:'assessment secret'},503]]) {
  reset();state.rpcError=db;const r=await POST(req());assert.equal(r.status,status);assert.ok(!(await r.text()).includes('assessment secret'));
 }
});
test('resume and catalogue use cookie-authenticated RPCs and reject invalid IDs', async () => {
 reset();const request=new NextRequest('http://localhost:3000/api/student/modules');
 assert.equal((await getSession(request,{params:Promise.resolve({sessionId:'invalid'})})).status,400);
 assert.equal(state.calls.length,0);
 assert.equal((await getSession(request,{params:Promise.resolve({sessionId:id})})).status,200);
 assert.deepEqual(state.calls.at(-1),{name:'get_learning_session',args:{p_session_id:id}});
 assert.equal((await getModules(request)).status,200);assert.equal(state.calls.at(-1).name,'get_learning_catalogue');
});
test('older retry receipts never decrease trusted totals', () => {
 const current={xp:100,coins:10,hearts:3,revision:8};
 assert.deepEqual(client.newestTotals(current,{xp:10,coins:0,hearts:5,revision:2}),current);
 const incoming={xp:110,coins:10,hearts:4,revision:9};
 assert.deepEqual(client.newestTotals(current,incoming),incoming);
});
test('client transport preserves submission identity, surfaces errors, and sends no local rewards', async () => {
 const original=globalThis.fetch,calls=[];
 const payload={schemaVersion:1,sessionId:id,sessionQuestionId:id,idempotencyKey:crypto.randomUUID(),type:'typed_recall',response:{text:'café'},assistance:{hintIds:[],transcriptShown:false}};
 try {
  globalThis.fetch=async (url,options)=>{calls.push({url,options});if(calls.length===1)throw Error('lost response');return new Response(JSON.stringify({responseId:'receipt'}),{status:200});};
  await assert.rejects(client.learningRequest('sessions/'+id+'/submit','actor',payload),/Connection interrupted/);
  assert.deepEqual(await client.learningRequest('sessions/'+id+'/submit','actor',payload),{responseId:'receipt'});
  assert.equal(calls[0].options.body,calls[1].options.body);
  assert.equal(calls[0].options.headers['X-Learning-User'],'actor');
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Hearts empty',code:'HEARTS_EMPTY'}),{status:409});
  await assert.rejects(client.learningRequest('sessions/'+id+'/submit','actor',payload),e=>e.status===409&&e.code==='HEARTS_EMPTY');
 } finally {globalThis.fetch=original;}
});

test('material route requires sign-in and stable account identity, and checks module IDs', async () => {
 reset();
 const request = new NextRequest('http://localhost:3000/api/student/modules/'+id+'/material');
 const params = {params: Promise.resolve({moduleId:id})};
 assert.equal((await getMaterial(request,{params:Promise.resolve({moduleId:'invalid'})})).status,400);
 state.user=false;
 assert.equal((await getMaterial(request,params)).status,401);
 state.user=true;
 assert.equal((await getMaterial(new NextRequest(request.url,{headers:{'X-Learning-User':'different'}}),params)).status,403);
 assert.equal(state.calls.length,0);
 state.result={moduleId:id,text:'**Bonjour**'};
 const result=await getMaterial(request,params);
 assert.equal(result.status,200);
 assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.equal(result.headers.get('vary'),'Cookie');
 assert.deepEqual(await result.json(),state.result);
 assert.deepEqual(state.calls,[{name:'get_learning_material',args:{p_module_id:id}}]);
 for (const [code,status] of [['42501',403],['P0002',404]]) {
  state.rpcError={code,message:'private assessment details'};
  const denied=await getMaterial(request,params);
  assert.equal(denied.status,status);
  assert.ok(!(await denied.text()).includes('private assessment details'));
 }
});
