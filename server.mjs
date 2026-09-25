#!/usr/bin/env node
// A Level dashboard — local server. No dependencies, binds to localhost only.
//   node server.mjs        then open http://localhost:4732
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { readFile, writeFile, rename, mkdir, chmod } from 'node:fs/promises';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { readDoc, writeDoc, backend } from './lib/store.mjs';
import { ask, claudeConfigured, claudeModel } from './lib/claude.mjs';
import { assignmentsFromICS } from './lib/integrations.mjs';
import { classroomMail, gmailConfigured } from './lib/gmail.mjs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { paths, seededOnFirstRun } from './lib/paths.mjs';
import { seedState, SCHEMA } from './lib/seed.mjs';
import { upgrade } from './lib/upgrade.mjs';
import { notionSearch, classroomWork, goodnotesScan, integrationStatus } from './lib/integrations.mjs';
import { todayPayload, summarize, applyOps, getAttempt, OP_TYPES } from './lib/companion.mjs';
import { createMcpServer } from './lib/mcp.mjs';
import { inlineModules } from './lib/inline.mjs';

// ROOT is the checkout, and only ever serves code: app.html, login.html, icons.
// Everything the dashboard reads or writes lives under paths.dir instead.
const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA = paths.data;
const BACKUP = paths.backup;
const CONFIG = paths.config;
const WB_DIR = paths.whiteboards;
const PORT = Number(process.env.PORT) || 4732;
// Localhost by default. HOST=lan opens it to your own network so an iPad or
// phone on the same Wi-Fi can reach it — see the warning printed on startup.
const LAN = process.env.HOST === 'lan';
// A host (Render, Fly, Railway) reaches the process from outside the container,
// so binding to loopback there makes it unreachable — detect and bind wide.
const HOSTED = Boolean(process.env.RENDER || process.env.PORT);
const BIND = (LAN || HOSTED) ? '0.0.0.0' : '127.0.0.1';

/* ------------------------------------------------------------------ storage */

async function loadState() {
  const stored = await readDoc('state', DATA);
  if (!stored) {
    const fresh = seedState();
    await saveState(fresh);
    return fresh;
  }
  if (upgrade(stored, seedState(), SCHEMA)) await saveState(stored);
  return stored;
}

// Every save bumps `rev`, so a page holding an older copy can be told it is
// stale instead of silently overwriting what the companion app just wrote.
const saveState = (state) => {
  state.rev = (Number(state.rev) || 0) + 1;
  return writeDoc('state', DATA, state);
};

/* Writes queue behind one another. The dashboard tab, the companion app and
   the MCP connector can all change the state at once; each read-modify-write
   runs to completion before the next one reads. */
let stateChain = Promise.resolve();
function withState(fn) {
  const run = stateChain.then(async () => fn(await loadState()));
  stateChain = run.catch(() => {});
  return run;
}

// Marked work's explanations and corrections: one document each, never inside
// the state. Postgres rows when hosted, files under the data directory locally.
const markFile = (id) => join(paths.marks, id.replace(/[^\w-]/g, '') + '.json');
const markStore = {
  read: (id) => readDoc(id, markFile(id)),
  write: (id, doc) => writeDoc(id, markFile(id), doc),
};

/* ------------------------------------------------------------------- auth
   Local use needs none. The moment DASHBOARD_PASSWORD is set — which it must be
   once this is on the open internet — everything behind /api and the app itself
   requires a signed cookie. */
const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
// The companion app's key. It unlocks /api/app/* as a Bearer token and the MCP
// connector as part of its URL — nothing else. Unset, both are switched off.
const APP_TOKEN = process.env.APP_TOKEN || '';
const SIGNING_KEY = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const authRequired = () => Boolean(PASSWORD);

const sign = (v) => v + '.' + createHmac('sha256', SIGNING_KEY).update(v).digest('hex');
function validCookie(raw) {
  const token = /(?:^|;\s*)sd_session=([^;]+)/.exec(raw || '')?.[1];
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const body = token.slice(0, i);
  const want = sign(body).slice(i + 1);
  const got = token.slice(i + 1);
  if (want.length !== got.length) return false;
  if (!timingSafeEqual(Buffer.from(want), Buffer.from(got))) return false;
  return Number(body) > Date.now();          // body is the expiry
}

/* Without this a short password is worthless: the whole keyspace of a 4-digit
   PIN is 10,000 guesses, which is seconds over HTTP. Failures lock the caller
   out for a doubling interval; a success clears the record. */
const attempts = new Map();
const LOCK_AFTER = 5, LOCK_BASE_MS = 30000, LOCK_MAX_MS = 15 * 60000;

function clientKey(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim()
    || req.socket.remoteAddress || 'unknown';
}

function lockedFor(key) {
  const rec = attempts.get(key);
  if (!rec || !rec.until) return 0;
  const left = rec.until - Date.now();
  if (left <= 0) { rec.until = 0; return 0; }
  return Math.ceil(left / 1000);
}

function noteFailure(key) {
  const rec = attempts.get(key) || { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= LOCK_AFTER) {
    const over = rec.count - LOCK_AFTER;
    rec.until = Date.now() + Math.min(LOCK_BASE_MS * 2 ** over, LOCK_MAX_MS);
  }
  attempts.set(key, rec);
  if (attempts.size > 5000) attempts.clear();      // crude bound; this is one user
}

function equalish(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) return false;   // length leak is acceptable here
  return timingSafeEqual(x, y);
}

async function loadConfig() {
  let file = {};
  if (existsSync(CONFIG)) {
    try { file = JSON.parse(await readFile(CONFIG, 'utf8')); }
    catch (e) { console.error('config.json is not valid JSON:', e.message); }
  }
  // environment wins — that is how Render and friends hand over secrets
  const env = {
    notion: { token: process.env.NOTION_TOKEN || file.notion?.token || '' },
    classroom: {
      client_id: process.env.CLASSROOM_CLIENT_ID || file.classroom?.client_id || '',
      client_secret: process.env.CLASSROOM_CLIENT_SECRET || file.classroom?.client_secret || '',
      refresh_token: process.env.CLASSROOM_REFRESH_TOKEN || file.classroom?.refresh_token || '',
      icalUrls: (process.env.CLASSROOM_ICAL_URLS || '').split(/[\s,]+/).filter(Boolean)
        .concat(file.classroom?.icalUrls || []).filter(Boolean),
    },
    gmail: {
      client_id: process.env.GMAIL_CLIENT_ID || file.gmail?.client_id || '',
      client_secret: process.env.GMAIL_CLIENT_SECRET || file.gmail?.client_secret || '',
      refresh_token: process.env.GMAIL_REFRESH_TOKEN || file.gmail?.refresh_token || '',
    },
    goodnotes: { folder: process.env.GOODNOTES_FOLDER || file.goodnotes?.folder || '' },
  };
  return env;
}


/* ------------------------------------------------------- config endpoints
   Secrets go one way only: the browser can WRITE a token but only ever reads
   back a masked hint, so an open dashboard tab never exposes the real value. */
const CONFIG_SHAPE = {
  notion: ['token'],
  classroom: ['client_id', 'client_secret', 'refresh_token', 'icalUrls'],
  gmail: ['client_id', 'client_secret', 'refresh_token'],
  goodnotes: ['folder'],
};
const SECRET = new Set(['token', 'client_secret', 'refresh_token']);

function maskConfig(cfg) {
  const out = {};
  for (const [sec, keys] of Object.entries(CONFIG_SHAPE)) {
    out[sec] = {};
    for (const k of keys) {
      const v = String(cfg?.[sec]?.[k] || '');
      const raw = cfg?.[sec]?.[k];
      if (Array.isArray(raw)) { out[sec][k] = raw; continue; }
      out[sec][k] = SECRET.has(k)
        ? { secret: true, set: Boolean(v), hint: v ? v.slice(0, 4) + '…' + v.slice(-4) : '' }
        : v;
    }
  }
  return out;
}

async function writeConfig(patch) {
  const cfg = await loadConfig();
  for (const [sec, keys] of Object.entries(CONFIG_SHAPE)) {
    if (!patch[sec]) continue;
    cfg[sec] ||= {};
    for (const k of keys) {
      if (typeof patch[sec][k] !== 'string') continue;
      cfg[sec][k] = k === 'icalUrls'
        ? patch[sec][k].split(/[\s,]+/).map((x) => x.trim()).filter(Boolean)
        : patch[sec][k].trim();
    }
  }
  const tmp = CONFIG + '.tmp';
  await writeFile(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  await rename(tmp, CONFIG);
  await chmod(CONFIG, 0o600).catch(() => {});
  return maskConfig(cfg);
}

/* ------------------------------------------------------------- widget feed
   A small, read-only projection for desktop widgets: what is due, what is on,
   and the next fortnight. Deliberately not the whole state — a widget token is
   weaker than a password, so it sees only what a glance needs. */
function widgetPayload(S) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = iso(new Date());
  const between = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const colour = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
  const subj = (id) => S.subjects.find((x) => x.id === id);
  const meta = (id) => ({ name: id === 'free' ? 'Free' : (subj(id)?.name || '?'),
    short: subj(id)?.short || '', colour: colour[(subj(id)?.slot || 1) - 1] });

  const holidayOn = (d) => (S.calendar?.holidays || []).find((h) => d >= h.start && d <= h.end) || null;
  const termOn = (d) => (S.calendar?.terms || []).find((t) => d >= t.start && d <= t.end) || null;

  // Week A / week B, counted from the week containing weekAStart.
  const monday = (k) => { const x = new Date(k + 'T00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const weekOf = (k) => {
    const n = Math.round((monday(k) - monday(S.profile?.weekAStart || S.profile?.termStart || today)) / (7 * 864e5));
    return ((n % 2) + 2) % 2 === 0 ? 'A' : 'B';
  };
  const dayPlan = (dayKey, k) => (S.timetable?.[weekOf(k)]?.[dayKey]) || [];

  const homework = S.homework.filter((h) => !h.done && h.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8)
    .map((h) => ({ title: h.title, due: h.due, days: between(today, h.due), ...meta(h.subjectId) }));

  // A whole calendar month, as a Monday-first grid. `lead` is how many blank
  // cells precede the 1st, so the widget does not have to work out the offset.
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const first = new Date(y, mo, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(y, mo + 1, 0).getDate();

  const monthDays = [];
  for (let d = 1; d <= count; d++) {
    const date = new Date(y, mo, d);
    const key = iso(date);
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const hol = holidayOn(key);
    const weekend = [0, 6].includes(date.getDay());
    const lessons = hol ? [] : dayPlan(dayKey, key);
    monthDays.push({
      iso: key, dom: d, today: key === today, weekend,
      holiday: hol ? hol.label : null,
      // a school day is in term, on a weekday, and not a holiday
      school: Boolean(termOn(key)) && !weekend && !hol,
      lessons: lessons.length,
      week: weekOf(key),
      due: S.homework.filter((h) => h.due === key && !h.done).length,
      exam: (S.milestones || []).some((m) => m.date === key)
        || S.papers.some((x) => x.date === key),
      examLabel: ((S.milestones || []).find((m) => m.date === key) || {}).label || null,
    });
  }

  // Today's periods in full, so the widget can show a live progress bar without
  // asking the server again every minute.
  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
  const holToday = holidayOn(today);
  const todayLessons = holToday ? [] : dayPlan(todayKey, today).slice()
    .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    .map((l) => ({ period: l.period || '', start: l.start || '', end: l.end || '',
                   room: l.room || '', ...meta(l.subjectId),
                   ...(l.title ? { name: l.title, short: l.title.slice(0, 4) } : {}) }));

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const from = iso(weekStart);
  const mins = S.sessions.filter((x) => x.date >= from).reduce((a, x) => a + (Number(x.minutes) || 0), 0);
  const term = termOn(today);

  return {
    generated: new Date().toISOString(), today,
    term: term ? { name: term.name, week: Math.floor(between(term.start, today) / 7) + 1 } : null,
    holiday: holidayOn(today)?.label || null,
    hours: { logged: +(mins / 60).toFixed(1), target: S.settings?.weeklyTargetHours || 20 },
    overdue: homework.filter((h) => h.days < 0).length,
    homework,
    week: weekOf(today),
    todayLessons,
    periods: (S.settings?.periods || []).map((x) => ({ id: x.id, start: x.start, end: x.end, label: x.label || null })),
    month: {
      label: first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      lead, days: monthDays,
    },
  };
}

/* ---------------------------------------------------------- companion app
   The three things the app can do, shared by REST and MCP. */
async function appToday({ date, time, detail = 'full' } = {}) {
  const payload = todayPayload(await loadState(), { date, time });
  return detail === 'summary' ? summarize(payload) : payload;
}
function appApply({ ops, date, time } = {}) {
  return withState(async (S) => {
    const out = await applyOps(S, ops, { date, time, store: markStore });
    if (out.changed) await saveState(S);
    return { ...out, rev: S.rev || 0 };
  });
}
async function appAttempt({ id, hash } = {}) {
  return getAttempt(await loadState(), { id, hash }, markStore);
}

const mcp = createMcpServer({
  name: 'a-level-dashboard',
  version: '1.0.0',
  instructions: 'One student\'s A Level dashboard (Year 12: Maths, Further Maths, Physics, '
    + 'Computer Science, German). get_today reads the day — timetable, what to do in each free '
    + 'period, the to-do list, upcoming tests, unfixed mistakes and skill level. apply_changes '
    + 'writes: to-dos, study-period choices, tests, and marked work. Every change needs a unique id; '
    + 'resending the same id is harmless.',
  tools: [
    {
      name: 'get_today',
      title: 'Today on the A Level dashboard',
      description: 'Today\'s school day: lessons (week A/B rota), each free period with up to three '
        + 'suggested study options and why, to-dos ranked by priority and due date, upcoming tests, '
        + 'unfixed mistakes from marked work, weak topics and skill level per subject. detail="summary" '
        + '(the default) is short and readable; detail="full" adds every topic id, the recent marked '
        + 'work and per-topic mastery, which is what you need before calling apply_changes.',
      inputSchema: { type: 'object', properties: {
        date: { type: 'string', description: 'YYYY-MM-DD in the student\'s local time; default today' },
        time: { type: 'string', description: 'HH:MM local time, to mark which lesson is on now' },
        detail: { type: 'string', enum: ['summary', 'full'] },
      } },
      annotations: { readOnlyHint: true },
      handler: (a) => appToday({ detail: 'summary', ...a }),
    },
    {
      name: 'apply_changes',
      title: 'Change the A Level dashboard',
      description: 'Apply up to 50 changes. Each op is {id: unique string, type, ...fields}. Types: '
        + 'task.add {task:{title, subjectId?, due?: YYYY-MM-DD, priority?: high|normal|low, notes?}}; '
        + 'task.update {taskId, patch}; task.done {taskId, done}; task.delete {taskId}; '
        + 'study.choose {date, key, option} (key and option from get_today studyPeriods); '
        + 'study.done {date, key, minutes?, confidence?: 0-5}; '
        + 'test.add {test:{title, date, subjectId, kind?: unit|test|mock|exam, topicIds?}}; '
        + 'test.update {testId, patch}; test.delete {testId}; test.result {testId, mark, total}; '
        + 'work.save {attachment:{title, subjectId, topicIds, homeworkId?, kind, driveId?, driveUrl?, hash?}, '
        + 'marking?:{questions:[{q, topicId, marks, maxMarks, errorType?: careless|method|knowledge|timing, '
        + 'explanation, correction}], summary, nextSteps}}; attempt.update {attemptId, patch?, questions?}; '
        + 'mistake.resolve {attemptId, q, how: self|checked}; attempt.note {attemptId, q?, text}; '
        + 'attempt.delete {attemptId}. Returns one result per op.',
      inputSchema: { type: 'object', required: ['ops'], properties: {
        ops: { type: 'array', maxItems: 50, items: { type: 'object', required: ['id', 'type'],
          properties: { id: { type: 'string' }, type: { type: 'string', enum: OP_TYPES } } } },
        date: { type: 'string', description: 'YYYY-MM-DD local; the day the changes belong to' },
        time: { type: 'string', description: 'HH:MM local' },
      } },
      annotations: { readOnlyHint: false },
      handler: (a) => appApply(a),
    },
    {
      name: 'get_attempt',
      title: 'One piece of marked work',
      description: 'The full marking of one attempt: every question with marks, error type, why it was '
        + 'wrong and the correct working, plus the summary, next steps and follow-up notes. Pass the '
        + 'attempt id from get_today (detail="full"), or the image hash.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, hash: { type: 'string' } } },
      annotations: { readOnlyHint: true },
      handler: (a) => appAttempt(a),
    },
  ],
});

/* -------------------------------------------------------------------- http */

const send = (res, code, body, type = 'application/json') => {
  const payload = type === 'application/json' ? JSON.stringify(body) : body;
  res.writeHead(code, {
    'Content-Type': type + (type.startsWith('text') || type.endsWith('json') ? '; charset=utf-8' : ''),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
};

const readBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (c) => {
    raw += c;
    if (raw.length > 12e6) { reject(new Error('body too large')); req.destroy(); }
  });
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  req.on('error', reject);
});

const MIME = { '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    /* ---- sign in ---- */
    if (path === '/api/login' && req.method === 'POST') {
      const key = clientKey(req);
      const wait = lockedFor(key);
      if (wait) {
        res.setHeader('Retry-After', String(wait));
        return send(res, 429, { error: `too many attempts — wait ${wait}s`, retryAfter: wait });
      }
      const { password } = await readBody(req);
      if (!authRequired() || !equalish(password || '', PASSWORD)) {
        noteFailure(key);
        return send(res, 401, { error: 'wrong password' });
      }
      attempts.delete(key);
      const expiry = String(Date.now() + 30 * 864e5);
      res.setHeader('Set-Cookie',
        `sd_session=${sign(expiry)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}` +
        (process.env.RENDER || process.env.NODE_ENV === 'production' ? '; Secure' : ''));
      return send(res, 200, { ok: true });
    }
    if (path === '/api/session') {
      return send(res, 200, { required: authRequired(), signedIn: !authRequired() || validCookie(req.headers.cookie) });
    }
    // /icons is public so Safari can fetch them before sign-in; /api/widget
    // carries its own token and is checked below — putting it behind the session
    // gate made it unreachable for the desktop widgets it exists for.
    // /mcp/<token> carries its token in the URL, the way claude.ai custom
    // connectors are configured, and checks it itself below.
    const publicPath = path.startsWith('/icons/') || path === '/api/widget' || path.startsWith('/mcp/');
    // OAuth discovery probes from MCP clients: this server has no OAuth, and a
    // clean 404 says so (the static handler would answer 403 to a dot-path).
    if (path.startsWith('/.well-known/')) return send(res, 404, { error: 'not found' });
    const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1] || '';
    const appKey = Boolean(APP_TOKEN) && path.startsWith('/api/app/') && equalish(bearer, APP_TOKEN);
    if (authRequired() && !publicPath && !appKey && !validCookie(req.headers.cookie)) {
      if (path.startsWith('/api/')) return send(res, 401, { error: 'sign in' });
      if (path === '/' || path.endsWith('.html') || path === '/companion') {
        return send(res, 200, await readFile(join(ROOT, 'login.html')), 'text/html');
      }
    }

    /* ---- state ---- */
    if (path === '/api/state' && req.method === 'GET') {
      return send(res, 200, await loadState());
    }
    if (path === '/api/state/rev') {
      return send(res, 200, { rev: (await loadState()).rev || 0 });
    }
    if (path === '/api/state' && req.method === 'PUT') {
      const next = await readBody(req);
      if (!next || typeof next !== 'object' || !Array.isArray(next.subjects)) {
        return send(res, 400, { error: 'that does not look like a dashboard state' });
      }
      return withState(async (cur) => {
        // A page that loaded before the companion app's last change must merge
        // first. A page too old to send `rev` at all is let through, as before.
        if (next.rev !== undefined && Number(next.rev) !== Number(cur.rev || 0)) {
          return send(res, 409, { error: 'stale', rev: cur.rev || 0 });
        }
        await saveState(next);
        return send(res, 200, { ok: true, savedAt: new Date().toISOString(), rev: next.rev });
      });
    }

    /* ---- the companion app (REST; the MCP connector below is the same) ---- */
    if (path === '/api/app/today' && req.method === 'GET') {
      return send(res, 200, await appToday(Object.fromEntries(url.searchParams)));
    }
    if (path === '/api/app/ops' && req.method === 'POST') {
      return send(res, 200, await appApply(await readBody(req)));
    }
    if (path === '/api/app/attempt' && req.method === 'GET') {
      return send(res, 200, await appAttempt(Object.fromEntries(url.searchParams)));
    }
    const mcpPath = path.match(/^\/mcp\/([^/]+)\/?$/);
    if (mcpPath) {
      if (!APP_TOKEN || !equalish(decodeURIComponent(mcpPath[1]), APP_TOKEN)) {
        return send(res, 404, { error: 'not found' });
      }
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return send(res, 405, { error: 'POST JSON-RPC here; there is no event stream' });
      }
      let body;
      try { body = await readBody(req); }
      catch { return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
      const out = await mcp(body);
      if (!out) { res.writeHead(202); return res.end(); }
      return send(res, 200, out);
    }

    /* ---- whiteboards (one file each, so data.json stays small) ---- */
    const wb = path.match(/^\/api\/whiteboard\/([A-Za-z0-9_-]{1,64})$/);
    if (wb) {
      const file = join(WB_DIR, wb[1] + '.json');
      if (!normalize(file).startsWith(WB_DIR)) return send(res, 400, { error: 'bad id' });
      if (req.method === 'GET') {
        if (!existsSync(file)) return send(res, 200, { id: wb[1], strokes: [] });
        return send(res, 200, JSON.parse(await readFile(file, 'utf8')));
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        await mkdir(WB_DIR, { recursive: true });
        await writeFile(file, JSON.stringify(body), 'utf8');
        return send(res, 200, { ok: true });
      }
    }

    /* ---- integrations ---- */
    if (path === '/api/config' && req.method === 'GET') {
      return send(res, 200, maskConfig(await loadConfig()));
    }
    if (path === '/api/config' && req.method === 'PUT') {
      return send(res, 200, await writeConfig(await readBody(req)));
    }
    if (path === '/api/claude' && req.method === 'POST') {
      const { prompt, maxTokens, refresh } = await readBody(req);
      return send(res, 200, await ask(prompt, {
        maxTokens: Math.min(Number(maxTokens) || 2000, 8000),
        refresh: Boolean(refresh), root: paths.dir,
      }));
    }
    /* ---- widgets: read-only, token-gated, no session ---- */
    if (path === '/api/widget') {
      const token = process.env.WIDGET_TOKEN || '';
      if (!token || url.searchParams.get('token') !== token) {
        return send(res, 401, { error: 'bad or missing widget token' });
      }
      return send(res, 200, widgetPayload(await loadState()));
    }
    if (path === '/api/ics' && req.method === 'POST') {
      const { text, name } = await readBody(req);
      if (typeof text !== 'string' || !text.includes('BEGIN:VCALENDAR')) {
        return send(res, 400, { error: 'that does not look like a calendar file' });
      }
      return send(res, 200, assignmentsFromICS(text, name || 'Classroom'));
    }
    if (path === '/api/gmail') {
      const cfg = await loadConfig();
      const days = Math.min(Number(url.searchParams.get('days')) || 30, 90);
      return send(res, 200, await classroomMail(cfg, { days, root: paths.dir }));
    }
    if (path === '/api/claude/status') {
      return send(res, 200, { configured: claudeConfigured(), model: claudeModel() });
    }
    if (path === '/api/integrations') {
      return send(res, 200, integrationStatus(await loadConfig()));
    }
    if (path === '/api/notion') {
      return send(res, 200, await notionSearch(await loadConfig(), url.searchParams.get('q') || ''));
    }
    if (path === '/api/classroom') {
      return send(res, 200, await classroomWork(await loadConfig()));
    }
    if (path === '/api/goodnotes') {
      const [cfg, state] = [await loadConfig(), await loadState()];
      return send(res, 200, await goodnotesScan(cfg, state.subjects));
    }

    /* ---- static ----
       Only the front end's own assets, and only by known extension. This used to
       serve anything under the checkout, which included data.json back when the
       data lived here. Dot-segments are refused outright so .git and .cache
       cannot be walked. */
    const rel = path === '/' ? '/app.html' : path === '/companion' ? '/companion.html' : path;
    if (rel.split('/').some((seg) => seg.startsWith('.'))) return send(res, 403, { error: 'nope' });
    const ext = rel.slice(rel.lastIndexOf('.'));
    if (!MIME[ext]) return send(res, 404, { error: 'not found' });
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT + '/')) return send(res, 403, { error: 'nope' });
    // the dashboard page carries the shared planner, pasted in where it says @inline
    if (rel === '/app.html') return send(res, 200, inlineModules(await readFile(file, 'utf8'), ROOT), 'text/html');
    if (existsSync(file)) return send(res, 200, await readFile(file), MIME[ext]);
    return send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(req.method, path, '->', e.message);
    return send(res, 500, { error: e.message });
  }
});

server.listen(PORT, BIND, () => {
  console.log('');
  console.log('  A Level dashboard running');
  console.log('  →  http://localhost:' + PORT);
  if (HOSTED) {
    console.log('  mode:   hosted — bound to 0.0.0.0');
  } else if (LAN) {
    for (const [name, addrs] of Object.entries(networkInterfaces())) {
      for (const a of addrs || []) {
        if (a.family === 'IPv4' && !a.internal) {
          console.log(`  →  http://${a.address}:${PORT}   (${name} — use this on your iPad/phone)`);
        }
      }
    }
    console.log('');
    console.log('  ⚠  Open to your whole network. Anyone on this Wi-Fi can read and');
    console.log('     edit your data. Fine at home; do not run this on school Wi-Fi.');
  }
  console.log('');
  console.log('  store:  ' + backend() + (backend() === 'file' ? ' (' + DATA + ')' : ''));
  console.log('  auth:   ' + (authRequired() ? 'password required' : 'open (local only — set DASHBOARD_PASSWORD before hosting)'));
  console.log('  app:    ' + (APP_TOKEN ? 'companion key set — /companion, /api/app/*, /mcp/<key>' : 'no APP_TOKEN — companion only with the password'));
  console.log('  stop:   Ctrl-C');
  console.log('');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — it may already be running at http://localhost:${PORT}`);
    console.error(`Otherwise start it on another port:  PORT=4733 node server.mjs`);
    process.exit(1);
  }
  throw e;
});
