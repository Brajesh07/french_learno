// Local fixtures and migration execute in one rolled-back transaction.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const migration = readFileSync(new URL('../../supabase/migrations/012_learning_session_delivery.sql', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('./submission.sql', import.meta.url), 'utf8').split('insert into public.learning_sessions')[0];
const checks = readFileSync(new URL('./delivery.sql', import.meta.url), 'utf8');
const applied = execFileSync('docker', ['exec', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-c', "select to_regprocedure('public.start_learning_session(jsonb)') is not null"], { encoding: 'utf8' }).trim() === 't';
const sql = (applied ? 'begin;\n' : migration.trimEnd().slice(0, -'commit;'.length)) + '\n' + fixture + '\n' + checks + '\nrollback;\n';
try {
  console.log(execFileSync('docker', ['exec', '-i', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
} catch (error) { console.error(error.stderr?.toString() || error.message); process.exitCode = 1; }
