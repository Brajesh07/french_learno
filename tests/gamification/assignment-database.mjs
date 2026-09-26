import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const applied=execFileSync('docker',['exec','supabase_db_french_learno','psql','-U','postgres','-d','postgres','-X','-At','-c',"select to_regprocedure('public.assign_student_teacher(uuid,uuid,uuid)') is not null"],{encoding:'utf8'}).trim()==='t';
const migration=read('../../supabase/migrations/015_student_teacher_assignments.sql');
const sql=(applied?'begin;\n':migration.trimEnd().slice(0,-'commit;'.length))+read('./submission.sql').split('insert into public.learning_sessions')[0]+read('./assignments.sql')+'\nrollback;';
try{console.log(execFileSync('docker',['exec','-i','supabase_db_french_learno','psql','-U','postgres','-d','postgres','-X','-q','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',maxBuffer:2*1024*1024}));}
catch(error){console.error(error.stderr?.toString()||error.message);process.exitCode=1;}
