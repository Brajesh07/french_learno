import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
const project = path.resolve(import.meta.dirname, '../..');
const read = p => fs.readFileSync(path.join(project, p), 'utf8');

test('student CSS cannot select admin content or replace global Tailwind tokens', () => {
  const root = postcss.parse(read('src/components/learning/student-learning.css'));
  root.walkRules(rule => {
    for (const selector of rule.selectors) assert.ok(selector.startsWith('.lla-student'), selector);
  });
  root.walkAtRules(rule => assert.ok(!['import', 'theme', 'tailwind'].includes(rule.name)));
  root.walkDecls(declaration => {
    if (declaration.prop.startsWith('--')) assert.ok(declaration.prop.startsWith('--lla-'));
  });
});
test('student portals inherit the scoped theme and game state has no localStorage wrapper', () => {
  for (const file of ['dialog', 'sheet', 'tooltip']) {
    const source = read(`src/components/ui/learning/${file}.tsx`);
    assert.ok(source.includes('useStudentPortal()'));
    assert.ok(source.includes('container={container}'));
  }
  for (const file of ['src/components/learning/StudentLearningApp.tsx', 'src/hooks/useLearningProgress.ts']) {
    assert.ok(!read(file).includes('localStorage'));
  }
  const page = read('src/app/temp/dashboard/page.tsx');
  assert.ok(page.includes('requireStudentPage({ includeName: true })'));
  assert.ok(!page.includes('createAdminClient'));
});
