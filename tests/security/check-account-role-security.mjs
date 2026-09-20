import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Fixed local container: never targets a linked/hosted Supabase database.
// Remove the migration's COMMIT so fixtures and schema changes share a rollback.
const migration = readFileSync(new URL('../../supabase/migrations/008_account_role_security.sql', import.meta.url), 'utf8');
if (!/^begin;$/m.test(migration) || (migration.match(/^commit;$/gm) ?? []).length !== 1) {
  throw new Error('Expected one transaction in migration 008; refusing to run.');
}
const checks = readFileSync(new URL('./account-role-security.sql', import.meta.url), 'utf8');
const result = spawnSync('docker', [
  'exec', '-i', 'supabase_db_french_learno',
  'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1',
], {
  input: migration.replace(/^commit;$/m, '') + '\n' + checks,
  encoding: 'utf8',
});
if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
console.log(result.stdout.trim().split('\n').at(-1));
