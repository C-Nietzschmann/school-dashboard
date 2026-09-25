/* Paste shared modules into a page that has no module loader.

   app.html is one classic <script>, served as-is locally and compiled into a
   single-file artifact for claude.ai. Neither can `import`, so a line
       /* @inline lib/plan.mjs *\/
   is replaced by that file's source with its `export` keywords removed. A
   module inlined this way must declare nothing at top level but the names it
   exports, and must not import anything itself.                              */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MARKER = /\/\* @inline (lib\/[\w.-]+\.mjs) \*\//g;

export function inlineModules(html, root) {
  return html.replace(MARKER, (_, rel) =>
    readFileSync(join(root, rel), 'utf8').replace(/^export /gm, ''));
}
