import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export const project = path.resolve(import.meta.dirname, '../..');
export const output = fs.mkdtempSync(path.join(os.tmpdir(), 'lla-learning-tests-'));
export function compile(relativePath, filename, replacements = {}) {
  let source = fs.readFileSync(path.join(project, relativePath), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  fs.writeFileSync(path.join(output, filename), outputText);
  return pathToFileURL(path.join(output, filename)).href;
}
export const modelUrl = compile('src/lib/learning/model.ts', 'model.mjs');
export const progressUrl = compile('src/lib/learning/progress.ts', 'progress.mjs', { "'./model'": "'./model.mjs'" });
export const syncUrl = compile('src/lib/learning/progress-sync.ts', 'progress-sync.mjs');
export function cleanup() { fs.rmSync(output, { recursive: true, force: true }); }
