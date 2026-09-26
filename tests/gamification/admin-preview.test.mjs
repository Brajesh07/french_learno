import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { document } from './preview-fixture.mjs';
const require=createRequire(import.meta.url), {NextRequest}=require('next/server');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'lla-admin-preview-'));
after(()=>fs.rmSync(out,{recursive:true,force:true}));
const replace={
 'server-only':'./empty.mjs','next/navigation':'./mock.mjs', './auth':'./mock.mjs',
 '@/lib/supabase/auth-helpers':'./mock.mjs','@/lib/supabase/server':'./mock.mjs',
 '@/lib/gamification/submission':'./submission.mjs','next/server':pathToFileURL(require.resolve('next/server')).href,
};
function compile(file,target){
 let source=fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
 for(const [from,to] of Object.entries(replace)) source=source.replaceAll(JSON.stringify(from),JSON.stringify(to)).replaceAll("'"+from+"'",JSON.stringify(to));
 fs.writeFileSync(path.join(out,target),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 return pathToFileURL(path.join(out,target)).href;
}
fs.writeFileSync(path.join(out,'empty.mjs'),'');
fs.writeFileSync(path.join(out,'mock.mjs'),`
export const state={allowed:true,tables:{},reads:[],adminCalls:0,signs:[],stale:false,signError:null};
export function notFound(){throw Error('NOT_FOUND');}
class Query {
 constructor(table){this.table=table;this.filters=[];state.reads.push(this);}
 select(fields){this.fields=fields;return this;}
 eq(key,value){this.filters.push(row=>row[key]===value);return this;}
 in(key,values){this.filters.push(row=>values.includes(row[key]));return this;}
 order(key,options={}){this.sort=[key,options.ascending!==false];return this;}
 maybeSingle(){this.one=true;return this;}
 single(){this.one=true;return this;}
 then(resolve,reject){
  let rows=(state.tables[this.table]||[]).filter(row=>this.filters.every(f=>f(row)));
  if(this.sort){const [key,ascending]=this.sort;rows=rows.toSorted((a,b)=>(a[key]>b[key]?1:a[key]<b[key]?-1:0)*(ascending?1:-1));}
  let data=this.one?rows[0]||null:rows;
  if(state.stale&&this.table==='quiz_revisions'&&this.fields==='edit_version,status')data={...data,edit_version:99};
  return Promise.resolve({data,error:null}).then(resolve,reject);
 }
}
const client={from:table=>new Query(table), storage:{from:bucket=>({createSignedUrl:async(file,seconds)=>{
 state.signs.push({bucket,file,seconds});return {data:{signedUrl:'https://storage.example.test/signed'},error:state.signError};
}})}};
export async function requireStaffPage(role){if(role!=='admin'||!state.allowed)throw Error('DENIED');return {client};}
export async function requireAdmin(){return state.allowed?{error:null,userId:'admin'}:{error:new Response('{}',{status:403})};}
export async function createAdminClient(){state.adminCalls++;return client;}
`);
compile('src/lib/gamification/submission.ts','submission.mjs');
const {state}=await import(pathToFileURL(path.join(out,'mock.mjs')).href);
const {loadAdminCourse,loadAdminQuiz}=await import(compile('src/lib/staff/content-read.ts','read.mjs'));
const {GET}=await import(compile('src/app/api/admin/learning-assets/[id]/route.ts','asset.mjs'));
const quizId='31000000-0000-4000-8000-000000000001', published='41000000-0000-4000-8000-000000000001', draft='41000000-0000-4000-8000-000000000002';
function reset(){
 const d=document();
 Object.assign(state,{allowed:true,reads:[],adminCalls:0,signs:[],stale:false,signError:null,tables:{
 courses:[{id:d.courseId,title:'French',content_text:'**Bonjour**'}],
 quizzes:[{id:quizId,course_id:d.courseId,title:'French',learning_runtime:'gamified',is_published:true}],
 quiz_revisions:[{id:published,quiz_id:quizId,revision:1,status:'published',edit_version:1},{id:draft,quiz_id:quizId,revision:2,status:'draft',edit_version:2}],
 quiz_revision_items:[published,draft].flatMap(id=>d.questions.map((q,i)=>({quiz_revision_id:id,question_id:q.questionId,question_revision_id:q.questionId,position:i+1}))),
 quiz_question_revisions:d.questions.map(q=>({id:q.questionId,question_id:q.questionId,type:q.type,presentation:q.presentation,schema_version:1,content_revision:1})),
 quiz_question_keys:d.questions.map(q=>({question_revision_id:q.questionId,type:q.type,assessment:q.assessment,feedback:q.feedback})),
 learning_assets:[{id:quizId,bucket_id:'gamification-assets',storage_path:'teacher/audio.mp3',status:'ready'}],
 }});return d;
}
test('admin detail loaders gate all content reads and reject invalid/foreign identifiers',async()=>{
 reset();state.allowed=false;
 await assert.rejects(loadAdminCourse(quizId),/DENIED/);await assert.rejects(loadAdminQuiz(quizId),/DENIED/);
 assert.equal(state.reads.length,0);state.allowed=true;
 await assert.rejects(loadAdminCourse('invalid'),/NOT_FOUND/);
 await assert.rejects(loadAdminQuiz(quizId,crypto.randomUUID()),/NOT_FOUND/);
 await assert.rejects(loadAdminQuiz(crypto.randomUUID()),/NOT_FOUND/);
});
test('admin loads course media and its modules, and previews four types without creating sessions',async()=>{
 const doc=reset();const course=await loadAdminCourse(doc.courseId);
 assert.equal(course.course.content_text,'**Bonjour**');assert.equal(course.modules.length,1);
 const result=await loadAdminQuiz(quizId);
 assert.equal(result.selected.id,published);
 assert.deepEqual(result.questions.map(q=>q.exercise.type),['multiple_choice','typed_recall','sentence_builder','listening_choice']);
 assert.deepEqual(result.questions.map(q=>q.answerKey),[['Bonjour'],['café'],['Je suis'],['Bonjour']]);
 assert.equal(result.questions[3].exercise.presentation.media[0].source,'tts');
 assert.equal((await loadAdminQuiz(quizId,draft)).selected.id,draft);
 assert.ok(state.reads.every(q=>!q.table.startsWith('learning_')));
 assert.equal(state.adminCalls,0); // Existing cookie RLS, no service bypass for content.
});
test('admin draft reads reject a mixed revision snapshot and retain incomplete legacy questions',async()=>{
 reset();state.stale=true;await assert.rejects(loadAdminQuiz(quizId,draft),/changed while loading/);
 reset();state.tables.quiz_revisions=[];state.tables.quizzes[0].learning_runtime='legacy';
 state.tables.quiz_questions=[{id:'q1',quiz_id:quizId,question:'Hello?',explanation:'Legacy explanation',quiz_answers:[{id:'a',answer:'Bonjour',is_correct:true}]},{id:'q2',quiz_id:quizId,question:'Unfinished',quiz_answers:[]}];
 const result=await loadAdminQuiz(quizId);
 assert.equal(result.questions.length,2);assert.deepEqual(result.questions[0].answerKey,['Bonjour']);
 assert.deepEqual(result.questions[1].answerKey,[]);
});
test('private media signing runs only after active-admin authorization and uses short-lived no-store delivery',async()=>{
 reset();const req=new NextRequest('http://localhost:3000/api/admin/learning-assets/'+quizId), params={params:Promise.resolve({id:quizId})};
 state.allowed=false;assert.equal((await GET(req,params)).status,403);assert.equal(state.adminCalls,0);
 state.allowed=true;assert.equal((await GET(req,{params:Promise.resolve({id:'bad'})})).status,400);assert.equal(state.adminCalls,0);
 const response=await GET(req,params);
 assert.equal(response.status,307);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(state.signs,[{bucket:'gamification-assets',file:'teacher/audio.mp3',seconds:60}]);
 state.tables.learning_assets[0].status='blocked';assert.equal((await GET(req,params)).status,404);
 state.tables.learning_assets[0].status='ready';state.tables.learning_assets[0].bucket_id='other';assert.equal((await GET(req,params)).status,404);
 state.tables.learning_assets[0].bucket_id='gamification-assets';state.signError={message:'private secret'};
 const error=await GET(req,params);assert.equal(error.status,503);assert.ok(!(await error.text()).includes('private secret'));
});
test('admin preview and shared question display cannot import the student runtime or submission transport',()=>{
 for(const file of ['src/components/staff/AdminQuizPreview.tsx','src/components/learning/ExercisePresentation.tsx']){
  const text=fs.readFileSync(new URL('../../'+file,import.meta.url),'utf8');
  assert.ok(!/learningRequest|useTrustedLearning|TrustedLesson|ModulePreview|fetch\(|\/api\/student\//.test(text),file);
 }
 const admin=fs.readFileSync(new URL('../../src/components/staff/AdminQuizPreview.tsx',import.meta.url),'utf8');
 assert.ok(!/onSubmit=|Check answer|Save|Publish|XP|hearts/.test(admin));
});
