// Local Supabase only. Applies 011 and fixtures in ONE rolled-back transaction.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const migration = readFileSync(new URL('../../supabase/migrations/011_secure_gamification_submission.sql', import.meta.url), 'utf8');
const checks = readFileSync(new URL('./submission.sql', import.meta.url), 'utf8');
if (!migration.trimEnd().endsWith('commit;')) throw Error('Unexpected migration format');
const applied = execFileSync('docker', ['exec', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-c', "select to_regprocedure('public.submit_learning_answer(uuid,jsonb)') is not null"], { encoding: 'utf8' }).trim() === 't';
const sql = (applied ? 'begin;\n' : migration.trimEnd().slice(0, -'commit;'.length)) + '\n' + checks + '\nrollback;\n';
try {
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_french_learno', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  console.log(output);
} catch (error) { console.error(error.stderr?.toString() || error.message); process.exitCode = 1; }
