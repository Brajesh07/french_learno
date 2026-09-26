import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const migration = readFileSync(new URL('../../supabase/migrations/013_rich_teacher_authoring.sql', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('./submission.sql', import.meta.url), 'utf8').split('insert into public.learning_sessions')[0];
const checks = readFileSync(new URL('./authoring.sql', import.meta.url), 'utf8');
try {
 const applied = execFileSync('docker', ['exec', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-c', "select to_regprocedure('public.write_teacher_revision(uuid,text,jsonb)') is not null"], { encoding: 'utf8' }).trim() === 't';
 const sql = (applied ? 'begin;\n' : migration.trimEnd().slice(0, -'commit;'.length)) + '\n' + fixture + '\n' + checks + '\nrollback;\n';
 console.log(execFileSync('docker', ['exec', '-i', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
} catch (e) { console.error(e.stderr?.toString() || e.message); process.exitCode = 1; }
