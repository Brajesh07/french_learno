import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Exercise first installation, interrupted installation, and repeated installation
// in one rollback-only transaction. Never change real assignments or migration history.
const migration = readFileSync(new URL('../../supabase/migrations/015_student_teacher_assignments.sql', import.meta.url), 'utf8')
  .replace(/^begin;$/m, '')
  .replace(/^commit;$/m, '');
const sql = `begin;
${migration}
create temporary table original_grader as
select oid, pg_get_functiondef(oid) as definition from pg_proc
where oid = to_regprocedure('public.submit_learning_answer_v1(uuid,jsonb)');
${migration}
-- Interrupted installation: original grader renamed, wrapper not created yet.
drop function public.submit_learning_answer(uuid,jsonb);
${migration}
-- Simulate the pre-015 grader names to exercise the first-install rename branch.
drop function public.submit_learning_answer(uuid,jsonb);
alter function public.submit_learning_answer_v1(uuid,jsonb) rename to submit_learning_answer;
${migration}
${migration}
do $$
begin
 if not exists(select 1 from original_grader where
   oid = to_regprocedure('public.submit_learning_answer_v1(uuid,jsonb)')
   and definition = pg_get_functiondef(oid)) then
  raise exception 'Replay replaced the original grading implementation';
 end if;
 if has_function_privilege('authenticated', 'public.submit_learning_answer_v1(uuid,jsonb)', 'EXECUTE')
   or has_function_privilege('anon', 'public.submit_learning_answer_v1(uuid,jsonb)', 'EXECUTE')
   or has_function_privilege('service_role', 'public.submit_learning_answer_v1(uuid,jsonb)', 'EXECUTE') then
  raise exception 'Private grader execution became public';
 end if;
 if not has_function_privilege('authenticated', 'public.submit_learning_answer(uuid,jsonb)', 'EXECUTE') then
  raise exception 'Public submission wrapper is unavailable';
 end if;
 if (select count(*) from pg_policies where schemaname='public' and
     ((tablename='courses' and policyname='Students read assigned courses') or
      (tablename='quizzes' and policyname='Students read assigned quizzes'))) <> 2 then
  raise exception 'Assignment policies were not restored';
 end if;
 raise notice 'PASS migration 015: repeated, interrupted and initial grader installation; implementation and privileges preserved';
end $$;
rollback;`;
try {
  console.log(execFileSync('docker', ['exec', '-i', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], {
    input: sql, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
  }));
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
}
