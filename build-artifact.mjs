#!/usr/bin/env node
// Generates artifact.html (the hosted, cross-device copy) from app.html, so the
// local app stays the single source of truth for markup, styles and views.
//   node build-artifact.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { seedState, SCHEMA } from './lib/seed.mjs';

let h = await readFile('app.html', 'utf8');

/* 1. strip the document skeleton — the artifact host supplies it */
h = h.replace(/^[\s\S]*?<title>/, '<title>')
     .replace(/<\/head>\s*<body>/, '')
     .replace(/<\/body>\s*<\/html>\s*$/, '');

/* 2. inline the seed — there is no server to hand it over */
const seed = JSON.stringify(seedState());
const upgradeSrc = (await readFile('lib/upgrade.mjs', 'utf8')).replace('export function', 'function');
h = h.replace('/* ==================================================================== state */',
`/* ==================================================================== state */
const SEED = () => JSON.parse(${JSON.stringify(seed)});
const SCHEMA = ${SCHEMA};
${upgradeSrc}
`);

/* 3. swap the storage layer: local HTTP -> the artifact's own database */
const oldStore = h.slice(h.indexOf('/* ============================================================ persistence */'),
                         h.indexOf('function mutate(fn)'));
h = h.replace(oldStore, `/* ============================================================ persistence
   One document holds the dashboard; each whiteboard gets its own. The page
   renders from local storage first so it is never blank while the database
   connects, then reconciles once it does. */
let DOC = null, DB = null;          // saveTimer is declared with the rest of the state
const LS = 'alevel-dashboard-v1';

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; }
}
function writeLocal() {
  try { localStorage.setItem(LS, JSON.stringify(S)); } catch {}
}

// db snapshots are FROZEN. Upgrading one in place silently does nothing in
// non-strict mode, which is exactly how stale data survived every republish.
// Always work on a clone.
function migrate(state) {
  const copy = JSON.parse(JSON.stringify(state));
  upgrade(copy, SEED(), SCHEMA);
  return copy;
}

function bootState() {                       // synchronous: something to draw at once
  S = migrate(readLocal() || SEED());
}

async function connect() {                   // asynchronous: the shared copy
  const db = window.claude?.use ? await claude.use('db').catch(() => null) : null;
  if (!db) { setSync('offline', 'this device only'); return; }
  DB = db; DOC = db.doc('state/main');
  try {
    const snap = await DOC.get();
    if (snap.exists && snap.data().state) {
      S = migrate(snap.data().state);   // clones before upgrading
      writeLocal(); renderAll();
      await DOC.set({ state: S, updatedAt: new Date().toISOString() });   // persist the backfill
    }
    else { await DOC.set({ state: S, updatedAt: new Date().toISOString() }); }
    setSync('ok', 'synced');
  } catch (e) { setSync('offline', e.code || 'not synced'); return; }

  // pick up edits made on your other devices
  DOC.onSnapshot((snap) => {
    if (!snap.exists || snap.metadata.hasPendingWrites) return;
    const remote = snap.data().state;
    if (!remote) return;
    const next = migrate(remote);
    if (JSON.stringify(next) === JSON.stringify(S)) return;
    if (document.activeElement?.matches('input, select, textarea')) return;  // don't yank a form
    S = next; writeLocal(); renderAll();
  }, (e) => setSync('offline', e.code));
}

function setSync(state, label) {
  const el = $('#syncPill'); if (!el) return;
  el.textContent = label;
  el.className = 'pill' + (state === 'ok' ? '' : ' sync-off');
}

function save() {
  writeLocal();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const bar = $('#savebar');
    if (!DOC) { bar.textContent = 'saved on this device'; bar.classList.add('on');
                setTimeout(() => bar.classList.remove('on'), 1100); return; }
    try {
      const body = JSON.stringify(S);
      if (body.length > 220000) { bar.textContent = 'data getting large — trim old sessions'; }
      else bar.textContent = 'saved';
      await DOC.set({ state: S, updatedAt: new Date().toISOString() });
      bar.classList.add('on'); setTimeout(() => bar.classList.remove('on'), 1100);
    } catch (e) {
      bar.textContent = 'could not sync (' + (e.code || 'error') + ')';
      bar.classList.add('on'); setTimeout(() => bar.classList.remove('on'), 2600);
    }
  }, 500);
}

`);

/* 4. whiteboards -> database documents */
h = h.replace(/async function loadBoard\(\)[\s\S]*?\n}\nfunction saveBoard\(\)[\s\S]*?\n}/,
`async function loadBoard() {
  wb.strokes = [];
  if (DB) {
    try { const s = await DB.doc('boards/' + wb.id).get(); wb.strokes = (s.exists && s.data().strokes) || []; }
    catch { /* board not readable — start it empty */ }
  } else {
    try { wb.strokes = JSON.parse(localStorage.getItem('board-' + wb.id) || '[]'); } catch {}
  }
  redraw();
}
function saveBoard() {
  try { localStorage.setItem('board-' + wb.id, JSON.stringify(wb.strokes)); } catch {}
  if (DB) DB.doc('boards/' + wb.id).set({ strokes: wb.strokes, updatedAt: new Date().toISOString() })
    .catch(() => {});
}`);

/* 5. the Files tab describes the Mac companion instead of calling its API */
const fStart = h.indexOf('views.files = () => `');
const fEnd = h.indexOf('/* ============================================================ rendering */');
h = h.slice(0, fStart) + `views.files = () => \`
  <div class="card" style="margin-bottom:16px">
    <h2>Notes &amp; files</h2>
    <div class="hint">What can and can't reach this page, honestly.</div>
    <div class="grid g2" style="margin-top:14px">
      <div>
        <h3 style="font-size:13.5px;margin-bottom:6px">Notion</h3>
        <p style="color:var(--text-secondary);font-size:13.5px;margin:0 0 10px">
          Link a page per topic — paste the URL into a topic's notes on the Revision tab
          and it travels with you. Live Notion search runs in the Mac app, which holds the key.</p>
        <h3 style="font-size:13.5px;margin-bottom:6px">Google Classroom</h3>
        <p style="color:var(--text-secondary);font-size:13.5px;margin:0">
          Waiting on your school account. Until then, add assignments on the Homework tab —
          they sync to every device from here.</p>
      </div>
      <div>
        <h3 style="font-size:13.5px;margin-bottom:6px">GoodNotes</h3>
        <p style="color:var(--text-secondary);font-size:13.5px;margin:0 0 10px">
          GoodNotes has no API, and a hosted page can't read your iPad's files. The Mac app
          scans your auto-backup folder instead — that one stays on the Mac by necessity, not
          by choice.</p>
        <h3 style="font-size:13.5px;margin-bottom:6px">The Mac companion</h3>
        <p style="color:var(--text-secondary);font-size:13.5px;margin:0">
          <code>~/Documents/school-dashboard</code> — run <code>node server.mjs</code> for the
          file-reading side. This page is the one you carry.</p>
      </div>
    </div>
  </div>\`;

` + h.slice(fEnd);

/* 6. boot: draw immediately, connect after. Matched loosely so an edit to the
      local boot line cannot silently leave `load()` in the artifact. */
const bootRe = /load\(\)\.then\([\s\S]*?\n\}\);/;
if (!bootRe.test(h)) throw new Error('boot block not found in app.html — the artifact would ship broken');
h = h.replace(bootRe, `bootState();
switchView('today');
startAlerts();
connect();`);

h = h.replace("  if (e.key === 'Enter' && e.target.matches('#nQ')) pullNotion();\n", '');
h = h.replace("  if (v === 'files') { loadIntegrationStatus(); loadConfigUI(); }", '');
h = h.replace(`  if (t.dataset.savecfg) return saveConfig(t.dataset.savecfg, t);
  if (t.id === 'nGo') return pullNotion();
  if (t.id === 'cGo') return pullClassroom();
  if (t.id === 'gGo') return pullGoodnotes();`, '');

/* 7. a sync indicator in the header + its styles */
h = h.replace('<button class="btn ghost sm" id="themeBtn" title="Toggle theme">◐</button>',
  '<span class="pill" id="syncPill">connecting…</span>\n      <button class="btn ghost sm" id="themeBtn" title="Toggle theme">◐</button>');
h = h.replace('.savebar{position:fixed;',
  '.sync-off{opacity:.62}\n.savebar{position:fixed;');

/* 8. drop the dead integration helpers */
const iStart = h.indexOf('/* ========================================================== integrations */');
// stop at the coaching block, not at boot — coaching sits between the two and
// must survive (it did not, once)
const iEnd = h.indexOf('/* ============================================================== coaching');
if (iStart < 0 || iEnd < 0 || iEnd < iStart) throw new Error('integration-strip markers moved — refusing to build');
h = h.slice(0, iStart) + h.slice(iEnd);

/* 9. Coaching now lives in app.html and detects its own transport, so there is
      nothing to inject — the artifact gets it for free. */

await writeFile('artifact.html', h);
console.log('artifact.html written:', h.length, 'bytes');
