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
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'lla-submit-tests-'));
after(() => fs.rmSync(output, { recursive: true, force: true }));
function compile(file, target, replacements = {}) {
  let source = fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  fs.writeFileSync(path.join(output, target), result.outputText);
  return pathToFileURL(path.join(output, target)).href;
}
fs.writeFileSync(path.join(output, 'mock.mjs'), `
export const state = {user: true, role: 'student', active: true, mustChange: false, profileError: false, rpcError: null, calls: []};
export async function createClient() { return {
 auth: { getUser: async () => ({data:{user:state.user?{id:'actor'}:null},error:null}) },
 from() {const q={select(){return q},eq(){return q},async maybeSingle(){return {data:{role:state.role,is_active:state.active,must_change_password:state.mustChange},error:state.profileError?{}:null};}};return q;},
 async rpc(name,args) {state.calls.push({name,args});return {data:state.rpcError?null:{responseId:'confirmed',reward:{xp:10}},error:state.rpcError};}
}; }
`);
const helper = await import(compile('src/lib/gamification/submission.ts', 'submission.mjs'));
const { state } = await import(pathToFileURL(path.join(output, 'mock.mjs')).href);
const { POST } = await import(compile('src/app/api/student/sessions/[sessionId]/submit/route.ts', 'route.mjs', {
  "'next/server'": JSON.stringify(pathToFileURL(require.resolve('next/server')).href),
  "'@/lib/supabase/server'": "'./mock.mjs'",
  "'@/lib/gamification/submission'": "'./submission.mjs'",
}));
const session = '71000000-0000-4000-8000-000000000001';
const params = { params: Promise.resolve({ sessionId: session }) };
const body = () => ({schemaVersion:1,sessionId:session,sessionQuestionId:'81000000-0000-4000-8000-000000000001',idempotencyKey:crypto.randomUUID(),type:'multiple_choice',response:{optionId:'a'},assistance:{hintIds:[],transcriptShown:false}});
const request = (payload = body(), headers = {}) => new NextRequest(`http://localhost:3000/api/student/sessions/${session}/submit`, {
 method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...headers},body:typeof payload==='string'?payload:JSON.stringify(payload),
});
const reset = () => Object.assign(state,{user:true,role:'student',active:true,mustChange:false,profileError:false,rpcError:null,calls:[]});
test('route verifies active student credentials before RPC', async () => {
  for (const values of [{user:false},{role:'admin'},{role:'teacher'},{active:false},{mustChange:true}]) {
    reset();Object.assign(state,values);const r=await POST(request(),params);
    assert.equal(r.status,values.user===false?401:403);assert.equal(state.calls.length,0);
  }
  reset();state.profileError=true;assert.equal((await POST(request(),params)).status,503);
});
test('CSRF, JSON, schema, identity and injected grading fields fail closed', async () => {
 reset();assert.equal((await POST(request(body(),{Origin:'https://attacker.test'}),params)).status,403);
 assert.equal((await POST(request(body(),{'Content-Type':'text/plain'}),params)).status,415);
 for(const payload of ['{bad', {...body(),xp:999}, {...body(),isCorrect:true}, {...body(),userId:'victim'}, {...body(),sessionId:crypto.randomUUID()}, {...body(),schemaVersion:2}, {...body(),response:{optionId:'a',isCorrect:true}}]) {
  assert.equal((await POST(request(payload),params)).status,400);
 }
 assert.equal(state.calls.length,0);
});
test('request is byte-bounded even without a Content-Length header', async () => {
 reset();assert.equal((await POST(request(JSON.stringify({...body(),padding:'x'.repeat(20000)})),params)).status,413);
 assert.equal(state.calls.length,0);
});
test('all four response shapes validate; duplicate tokens and unknown types do not', () => {
 for(const [type,response] of [['multiple_choice',{optionId:'a'}],['listening_choice',{optionId:'a'}],['typed_recall',{text:'café'}],['sentence_builder',{tokenIds:['x','y']}]]) {
  assert.equal(helper.parseSubmission({...body(),type,response},session).type,type);
 }
 assert.throws(()=>helper.parseSubmission({...body(),type:'sentence_builder',response:{tokenIds:['x','x']}},session));
 assert.throws(()=>helper.parseSubmission({...body(),type:'match_pairs'},session));
});
test('route forwards only the validated submission to one cookie-authenticated RPC', async () => {
 reset();const input=body(),r=await POST(request(input),params);
 assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(state.calls,[{name:'submit_learning_answer',args:{p_session_id:session,p_submission:input}}]);
 assert.deepEqual(await r.json(),{responseId:'confirmed',reward:{xp:10}});
});
test('known conflicts map clearly and private database details never escape', async () => {
 for(const [error,status,code] of [
  [{code:'P0003',message:'IDEMPOTENCY_CONFLICT'},409,'IDEMPOTENCY_CONFLICT'],
  [{code:'P0003',message:'HEARTS_EMPTY'},409,'HEARTS_EMPTY'],
  [{code:'42501'},403,'ACCESS_DENIED'],[{code:'P0002'},404,'NOT_FOUND'],
  [{code:'40P01'},409,'RETRY_TRANSACTION'],
  [{code:'P0001',message:'secret answer / private SQL details'},503,'SUBMISSION_UNAVAILABLE'],
 ]) { reset();state.rpcError=error;const r=await POST(request(),params);assert.equal(r.status,status);const v=await r.json();assert.equal(v.code,code);assert.ok(!JSON.stringify(v).includes('secret')); }
});
