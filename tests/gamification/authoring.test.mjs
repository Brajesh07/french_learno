import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url), { NextRequest } = require('next/server');
const out = fs.mkdtempSync(path.join(os.tmpdir(),'lla-authoring-tests-'));
after(()=>fs.rmSync(out,{recursive:true,force:true}));
const replacements = {
 "'next/server'": JSON.stringify(pathToFileURL(require.resolve('next/server')).href),
 "'@/lib/supabase/auth-helpers'": "'./mock.mjs'", "'@/lib/supabase/server'": "'./mock.mjs'",
 "'@/lib/gamification/authoring'": "'./authoring.mjs'", "'./authoring'": "'./authoring.mjs'",
 "'@/lib/gamification/authoring-http'": "'./http.mjs'", "'./submission'": "'./submission.mjs'",
 "'@/lib/gamification/authoring-server'": "'./mock.mjs'",
};
function compile(file,target) {
 let source=fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
 for(const [from,to] of Object.entries(replacements)) source=source.replaceAll(from,to).replaceAll(JSON.stringify(from.slice(1,-1)),to);
 fs.writeFileSync(path.join(out,target),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 return pathToFileURL(path.join(out,target)).href;
}
compile('src/lib/gamification/submission.ts','submission.mjs');
const validator=await import(compile('src/lib/gamification/authoring.ts','authoring.mjs'));
compile('src/lib/gamification/authoring-http.ts','http.mjs');
fs.writeFileSync(path.join(out,'mock.mjs'),`
export const state={authorized:true,calls:[],error:null,snapshot:null,adminCalls:0};
export async function requireApprovedTeacher(){return state.authorized?{userId:'teacher',client:{},error:null}:{error:new Response('{}',{status:403})};}
export async function createAdminClient(){state.adminCalls++;return {rpc:async(name,args)=>{state.calls.push({name,args});return {data:{moduleId:'saved'},error:state.error};}};}
export async function loadTeacherRevision(){return state.snapshot;}
`);
const { state } = await import(pathToFileURL(path.join(out,'mock.mjs')).href);
const { POST: save } = await import(compile('src/app/api/teacher/modules/route.ts','save.mjs'));
const { POST: publish } = await import(compile('src/app/api/teacher/modules/[id]/publish/route.ts','publish.mjs'));
const moduleId='31000000-0000-4000-8000-000000000001',revisionId='41000000-0000-4000-8000-000000000001';
function document() {
 const common={prompt:{en:'Choose a greeting'},instructions:{en:'Answer in French'},hints:[],media:[]};
 const feedback={correctAnswerDisplay:'Bonjour',explanation:{en:'Bonjour means hello.'}};
 return {schemaVersion:1,courseId:'21000000-0000-4000-8000-000000000001',title:'First words',description:'',objective:'Greet a friend',kind:'lesson',proficiency:'A1',accessTier:'free',passingScore:70,questions:[
 {questionId:crypto.randomUUID(),type:'multiple_choice',presentation:{...common,interaction:{options:[{id:'a',text:'Bonjour'},{id:'b',text:'Merci'}],shuffleOptions:true}},assessment:{gradingStrategy:'single_option',gradingVersion:1,maxScore:1,correctOptionId:'a'},feedback},
 {questionId:crypto.randomUUID(),type:'typed_recall',presentation:{...common,interaction:{inputLanguage:'fr-FR',maxLength:80,characterPalette:['é']}},assessment:{gradingStrategy:'accepted_text',gradingVersion:1,maxScore:1,normalizationPolicy:'fr-basic-v1',acceptedAnswers:['café']},feedback},
 {questionId:crypto.randomUUID(),type:'sentence_builder',presentation:{...common,interaction:{tokens:[{id:'a',text:'Je'},{id:'b',text:'suis'}],shuffleTokens:true,allowTokenReturn:true}},assessment:{gradingStrategy:'ordered_tokens',gradingVersion:1,maxScore:1,acceptedSequences:[['a','b']]},feedback},
 {questionId:crypto.randomUUID(),type:'listening_choice',presentation:{...common,interaction:{options:[{id:'a',text:'Bonjour'},{id:'b',text:'Merci'}],shuffleOptions:true},media:[{kind:'audio',source:'tts',text:'Bonjour',locale:'fr-FR',rate:0.78,transcript:{text:'Bonjour',reveal:'on_request'}}]},assessment:{gradingStrategy:'single_option',gradingVersion:1,maxScore:1,correctOptionId:'a'},feedback},
 ]};
}
const payload=()=>({mutationId:crypto.randomUUID(),moduleId:null,baseRevisionId:null,expectedVersion:0,document:document()});
const request=(body=payload(),headers={})=>new NextRequest('http://localhost:3000/api/teacher/modules',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const reset=()=>Object.assign(state,{authorized:true,calls:[],error:null,snapshot:null,adminCalls:0});
test('four authoring documents validate without mixing private keys into presentation',()=>{
 const d=document();assert.equal(validator.validateDocument(d),d);
 assert.ok(!JSON.stringify(d.questions.map(q=>q.presentation)).includes('assessment'));
 assert.equal(validator.validateDraftWrite(payload()).expectedVersion,0);
});
test('validator rejects incorrect keys, ambiguous options, invalid sequences, audio, unknown fields and duplicate question IDs',()=>{
 const mutations=[
 d=>d.questions[0].assessment.correctOptionId='foreign',d=>d.questions[0].presentation.interaction.options[1].id='a',
 d=>d.questions[0].presentation.interaction.options[1].text='bonjour',d=>d.questions[0].presentation.assessment={correct:true},
 d=>d.questions[1].assessment.acceptedAnswers=['...'],d=>d.questions[1].assessment.acceptedAnswers=[],
 d=>d.questions[2].assessment.acceptedSequences=[['a','a']],d=>d.questions[2].assessment.acceptedSequences=[['foreign']],
 d=>d.questions[3].presentation.media=[],d=>d.questions[3].presentation.media[0].rate=2,
 d=>d.questions[0].feedback.explanation={en:'OK',assessment:{secret:1}},d=>d.questions[0].xp=999,
 d=>d.questions[1].questionId=d.questions[0].questionId,d=>d.questions=[],d=>d.questions[0].presentation.hints=[{id:'a',text:{en:''}}],
 ];
 for(const mutate of mutations){const d=document();mutate(d);assert.throws(()=>validator.validateDocument(d),validator.AuthoringError);}
});
test('save rejects unauthorized users, account changes, CSRF and bad documents before privileged writes',async()=>{
 reset();state.authorized=false;assert.equal((await save(request())).status,403);assert.equal(state.adminCalls,0);
 reset();assert.equal((await save(request(payload(),{'X-Learning-User':'other'}))).status,403);
 assert.equal((await save(request(payload(),{Origin:'https://attacker.test'}))).status,403);
 assert.equal((await save(request(payload(),{'Content-Type':'text/plain'}))).status,415);
 assert.equal((await save(request('{broken'))).status,400);
 assert.equal((await save(request({...payload(),teacherId:'victim'}))).status,400);
 assert.equal(state.adminCalls,0);
});
test('save bounds streamed bodies and derives teacher identity from verified cookies',async()=>{
 reset();assert.equal((await save(request(JSON.stringify({data:'x'.repeat(1048577)})))).status,413);assert.equal(state.adminCalls,0);
 const input=payload(),r=await save(request(input));assert.equal(r.status,200);
 assert.deepEqual(state.calls,[{name:'write_teacher_revision',args:{p_teacher_id:'teacher',p_action:'save',p_request:input}}]);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('publish validates the persisted draft and its version before committing',async()=>{
 reset();const body={mutationId:crypto.randomUUID(),moduleId,revisionId,expectedVersion:2},params={params:Promise.resolve({id:moduleId})};
 assert.equal((await publish(request(body),params)).status,404);
 state.snapshot={editVersion:1,document:document()};assert.equal((await publish(request(body),params)).status,409);
 state.snapshot={editVersion:2,document:document()};state.snapshot.document.questions[0].assessment.correctOptionId='foreign';assert.equal((await publish(request(body),params)).status,400);
 assert.equal(state.adminCalls,0);
 state.snapshot={editVersion:2,document:document()};assert.equal((await publish(request(body),params)).status,200);
 assert.equal(state.calls[0].args.p_action,'publish');
});
test('database conflicts are actionable and internal errors do not leak grading data',async()=>{
 for(const [error,status] of [[{code:'40001'},409],[{code:'42501'},403],[{code:'P0001',message:'private assessment'},503],[{code:'22023',message:'PUBLISH_COURSE_FIRST'},400]]){
  reset();state.error=error;const r=await save(request());assert.equal(r.status,status);assert.ok(!(await r.text()).includes('private assessment'));
 }
});
