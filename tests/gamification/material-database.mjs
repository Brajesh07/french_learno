// Exercise real access policies without retaining migration or fixture writes.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const migration = read('../../supabase/migrations/014_learning_course_material.sql');
const fixture = read('./submission.sql').split('insert into public.learning_sessions')[0];
const applied = execFileSync('docker', ['exec', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-c', "select to_regprocedure('public.get_learning_material(uuid)') is not null"], {encoding:'utf8'}).trim() === 't';
const sql = (applied ? 'begin;\n' : migration.trimEnd().slice(0, -'commit;'.length)) + fixture + read('./material.sql') + '\nrollback;';
try {
  console.log(execFileSync('docker', ['exec','-i','supabase_db_french_learno','psql','-U','postgres','-d','postgres','-X','-q','-v','ON_ERROR_STOP=1'], {input:sql,encoding:'utf8',maxBuffer:2*1024*1024}));
} catch (error) { console.error(error.stderr?.toString() || error.message); process.exitCode = 1; }
