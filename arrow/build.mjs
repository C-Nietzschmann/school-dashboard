/* Builds your private copy of Assignment Arrow: the school's site as it is,
   plus arrow/bridge.js, which logs the questions you finish to your A Level
   dashboard. Assignment Arrow itself is never changed.

     node arrow/build.mjs <assignment-arrow checkout> <out dir> [this copy's artifact link]

   Given its own link, the copy puts it on each chapter's worksheet, and the
   companion's "Open Assignment Arrow" goes straight to it. The link lives only
   in the built copy, never in this repository.

   Use a fresh checkout of its main branch — that is what the school's site
   serves. Publish <out dir>/index.html with the other files next to it. */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [src, out, url] = process.argv.slice(2);
if (url && !/^https:\/\/claude\.ai\/[\w/-]+$/.test(url)) throw new Error('the link should be the artifact\'s https://claude.ai/... address');
if (!src || !out) {
  console.error('usage: node arrow/build.mjs <assignment-arrow checkout> <out dir>');
  process.exit(1);
}
const SCRIPTS = ['interpreter.js', 'lessons.js', 'lessons-igcse.js', 'bank.js', 'bank-igcse.js', 'bank-extra.js', 'library.js', 'tests.js'];

let html = readFileSync(join(src, 'index.html'), 'utf8');
// the bridge wraps this one function; without it nothing would be logged
if (!/function recordResult\s*\(/.test(html)) throw new Error('index.html has no recordResult(): Assignment Arrow changed how it saves marks — update arrow/bridge.js');
html = html.replace(/<title>[^<]*<\/title>/, '<title>My Assignment Arrow</title>');
html = html.trimEnd() + '\n\n<!-- your A Level dashboard: logs each question you finish (arrow/bridge.js) -->\n'
  + (url ? `<script>window.ARROW_URL = ${JSON.stringify(url)};</script>\n` : '') + '<script src="bridge.js"></script>\n';

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html);
for (const f of SCRIPTS) copyFileSync(join(src, f), join(out, f));
copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bridge.js'), join(out, 'bridge.js'));
console.log(`built ${out}: index.html + ${SCRIPTS.length} scripts + bridge.js`);
