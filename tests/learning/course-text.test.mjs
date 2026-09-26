import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lla-course-text-'));
after(() => fs.rmSync(dir, {recursive:true,force:true}));
const source = fs.readFileSync(new URL('../../src/components/learning/CourseText.tsx', import.meta.url), 'utf8');
let code = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
for (const name of ['react','react/jsx-runtime']) code = code.replaceAll(JSON.stringify(name),JSON.stringify(pathToFileURL(require.resolve(name)).href));
const file = path.join(dir,'text.mjs'); fs.writeFileSync(file,code);
const { CourseText } = await import(pathToFileURL(file).href);
const render = text => renderToStaticMarkup(createElement(CourseText,{text}));
test('course reader renders the existing teacher editor formatting and lists', () => {
 const html = render('# Greetings\n**Bonjour** and *Bonsoir*, _salut_, __merci__, `French`.\n\n- Hello\n- Goodbye\n3. Listen\n4. Practise');
 for(const fragment of ['<strong>Bonjour</strong>','<em>Bonsoir</em>','<u>salut</u>','<u>merci</u>','<code','<h3','<ul','<ol start="3"','<li>Hello</li>']) assert.ok(html.includes(fragment),fragment);
});
test('teacher content is escaped even inside formatting; scripts and images cannot execute', () => {
 const html=render('**<img src=x onerror=alert(1)>**\n<script>alert(1)</script>\n`<svg onload=alert(1)>`');
 assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script')); assert.ok(!html.includes('<svg'));
 assert.ok(html.includes('&lt;img')); assert.ok(html.includes('&lt;script&gt;'));
});
