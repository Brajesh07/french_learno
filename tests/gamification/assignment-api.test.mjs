import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import ts from 'typescript';
const require=createRequire(import.meta.url),{NextRequest}=require('next/server');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'lla-assignment-api-'));after(()=>fs.rmSync(out,{recursive:true,force:true}));
const replacements={'next/server':pathToFileURL(require.resolve('next/server')).href,'@/lib/supabase/auth-helpers':'./mock.mjs','@/lib/supabase/server':'./mock.mjs','@/lib/gamification/submission':'./submission.mjs','@/lib/staff/http':'./http.mjs'};
function compile(file,target){let s=fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');for(const [a,b] of Object.entries(replacements))s=s.replaceAll(JSON.stringify(a),JSON.stringify(b)).replaceAll("'"+a+"'",JSON.stringify(b));fs.writeFileSync(path.join(out,target),ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);return pathToFileURL(path.join(out,target)).href;}
fs.writeFileSync(path.join(out,'mock.mjs'),`export const state={allowed:true,calls:[],error:null}; export async function requireAdmin(){return state.allowed?{error:null}:{error:new Response('{}',{status:403})};} export async function createClient(){return {rpc:async(name,args)=>{state.calls.push({name,args});return {data:{assignment:null,teachers:[]},error:state.error};}};}`);
compile('src/lib/gamification/submission.ts','submission.mjs');compile('src/lib/staff/http.ts','http.mjs');
const {GET,PUT}=await import(compile('src/app/api/admin/student/[uid]/assignment/route.ts','route.mjs'));
const {state}=await import(pathToFileURL(path.join(out,'mock.mjs')).href);
const uid='11000000-0000-4000-8000-000000000001',teacherId='11000000-0000-4000-8000-000000000003';
const context={params:Promise.resolve({uid})};const input=()=>({teacherId,expectedAssignmentId:null});
const request=(body=input(),headers={})=>new NextRequest('http://localhost:3000/api/admin/student/'+uid+'/assignment',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',...headers},body:JSON.stringify(body)});
const reset=()=>Object.assign(state,{allowed:true,calls:[],error:null});
test('assignment endpoints require admin and reject forged identities and cross-site writes',async()=>{
 reset();state.allowed=false;assert.equal((await GET(request(),context)).status,403);assert.equal((await PUT(request(),context)).status,403);assert.equal(state.calls.length,0);
 state.allowed=true;
 for(const body of [{...input(),studentId:uid},{teacherId},{...input(),teacherId:'bad'},{...input(),expectedAssignmentId:'bad'}])assert.equal((await PUT(request(body),context)).status,400);
 assert.equal((await PUT(request(input(),{Origin:'https://other.example'}),context)).status,403);
 assert.equal((await PUT(request(input(),{'Content-Type':'text/plain'}),context)).status,415);
 assert.equal(state.calls.length,0);
});
test('assign, unassign and conflict responses preserve the expected assignment identity',async()=>{
 reset();assert.equal((await GET(request(),context)).status,200);assert.equal(state.calls[0].name,'get_admin_student_assignment');
 const response=await PUT(request(),context);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(state.calls.at(-1),{name:'assign_student_teacher',args:{p_student_id:uid,p_teacher_id:teacherId,p_expected_assignment_id:null}});
 assert.equal((await PUT(request({teacherId:null,expectedAssignmentId:uid}),context)).status,200);
 assert.equal(state.calls.at(-1).args.p_teacher_id,null);
 state.error={code:'40001',message:'ASSIGNMENT_CHANGED'};assert.equal((await PUT(request(),context)).status,409);
 state.error={code:'42501',message:'private details'};const denied=await PUT(request(),context);assert.equal(denied.status,403);assert.ok(!(await denied.text()).includes('private details'));
});
