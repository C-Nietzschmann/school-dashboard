/* The companion app's side of the server: what it reads, and the changes it
   is allowed to make.

   The dashboard stays the one place the data lives. The companion (companion.html,
   on your phone or iPad, usually inside Claude) never holds the state — it asks
   for a daily projection (`todayPayload`) and sends back small, named changes
   (`applyOps`). Both reach this file two ways, with the same result:
     - REST:  GET /api/app/today, POST /api/app/ops, GET /api/app/attempt
     - MCP:   the connector at /mcp/<APP_TOKEN> (see lib/mcp.mjs), which is how
              an artifact inside Claude — which has no network of its own —
              reaches the dashboard, and how Claude chat can too.

   Every op carries an id and is applied at most once, so an app that lost its
   connection mid-send can simply send the same ops again.                    */
import { randomBytes } from 'node:crypto';
import { createPlanner } from './plan.mjs';
import { createRoute } from './route.mjs';

// Same palette as the dashboard and the widgets, by subject slot.
const COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
export const ERROR_TYPES = ['careless', 'method', 'knowledge', 'timing'];
const KINDS = ['answers', 'notes', 'worksheet', 'test'];
const READ_KINDS = ['notes', 'worksheet', 'mark', 'check'];
const MAX_READ_PAGES = 40;       // pages kept for Claude per request
const MAX_WAITING = 30;          // requests waiting at once
const READ_BATCH = 4;            // pictures in one read_queue answer
const PRIORITIES = ['high', 'normal', 'low'];
const OPS_KEPT = 300;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;
const isISO = (v) => typeof v === 'string' && ISO.test(v);
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// The day the phone thinks it is. Render runs in UTC; your "today" is local.
function clock(date, time) {
  const d = new Date();
  if (isISO(date)) {
    const [y, m, dd] = date.split('-').map(Number);
    const [h, mi] = HM.test(time || '') ? time.split(':').map(Number) : [d.getHours(), d.getMinutes()];
    return new Date(y, m - 1, dd, h, mi);
  }
  return d;
}

export function planner(S, { date, time } = {}) {
  const at = clock(date, time);
  return { P: createPlanner(() => S, () => at), at };
}

// Mistakes left unfixed for ARCHIVE_AFTER days leave the fix queue: archived,
// kept as data, no credit for a fix. The Today cards warn for the week before.
export function archiveStale(S, { date } = {}) {
  const { P } = planner(S, { date });
  let n = 0;
  for (const m of P.openMistakes()) {
    if (m.daysLeft > 0) continue;
    const q = S.attempts.find((a) => a.id === m.attemptId)?.questions.find((x) => String(x.q) === String(m.q));
    if (q) { q.resolved = 'archived'; q.resolvedAt = P.todayISO(); n++; }
  }
  return n;
}

/* --------------------------------------------------------------------- key
   The companion's key opens /api/app/* and forms the connector URL. You should
   not have to invent one: the dashboard makes it on first start and keeps it in
   its own small document (a Postgres row when hosted, a file in the data
   directory locally) — never in the state, so /api/state cannot leak it. An
   APP_TOKEN environment variable, if you set one, wins over the stored key. */
const KEY_DOC = 'app-token';
const freshKey = () => randomBytes(24).toString('hex');

export async function loadAppToken({ env = process.env, store } = {}) {
  if (env.APP_TOKEN) return { token: env.APP_TOKEN, fromEnv: true };
  const saved = await store?.read(KEY_DOC).catch(() => null);
  if (saved?.token) return { token: saved.token, fromEnv: false };
  const token = freshKey();
  await store?.write(KEY_DOC, { token, created: new Date().toISOString() });
  return { token, fromEnv: false };
}

// A new key. The old connector URL stops working at once.
export async function rotateAppToken({ env = process.env, store } = {}) {
  if (env.APP_TOKEN) throw new Error('The key is set by APP_TOKEN in the environment. Change it there.');
  const token = freshKey();
  await store.write(KEY_DOC, { token, created: new Date().toISOString() });
  return { token, fromEnv: false };
}

/* ----------------------------------------------------------------- reading */

export function todayPayload(S, { date, time } = {}) {
  const { P, at } = planner(S, { date, time });
  const today = P.todayISO();
  const nowMins = at.getHours() * 60 + at.getMinutes();
  const subj = (id) => P.subjectById(id);
  const colour = (id) => COLOURS[((subj(id)?.slot || 1) - 1) % COLOURS.length];
  const term = P.termOn(today);
  const hol = P.holidayOn(today);
  const m = P.mastery(today);

  const lessons = P.lessonsOn(today).map((l) => ({
    key: l.start || l.period, period: l.period || '', start: l.start || '', end: l.end || '',
    room: l.room || '', subjectId: l.subjectId, free: l.subjectId === 'free', study: P.isStudySlot(l),
    name: l.title || (l.subjectId === 'free' ? 'Free period' : subj(l.subjectId)?.name || '?'),
    colour: l.subjectId === 'free' ? null : colour(l.subjectId), double: Boolean(l.double),
    state: nowMins >= P.toMins(l.end) ? 'past' : nowMins >= P.toMins(l.start) ? 'now' : 'later',
  }));

  const attachCount = {};
  for (const a of (S.attachments || [])) if (a.homeworkId) attachCount[a.homeworkId] = (attachCount[a.homeworkId] || 0) + 1;
  const task = (h) => ({ id: h.id, title: h.title, subjectId: h.subjectId || '', due: h.due || null,
    priority: h.priority || 'normal', notes: h.notes || '', done: Boolean(h.done), doneAt: h.doneAt || null,
    source: h.source || '', attachments: attachCount[h.id] || 0, packId: h.packId || null,
    score: +P.taskScore(h, today).toFixed(2) });

  // An open pack ships its questions (the app shows them and marking needs the
  // mark scheme); a finished one is only a line in the history.
  const openTasks = new Set(S.homework.filter((h) => !h.done).map((h) => h.id));
  const pack = (k) => ({ id: k.id, created: k.created, title: k.title, subjectId: k.subjectId, topicIds: k.topicIds,
    difficulty: k.difficulty, minutes: k.minutes, source: k.source, taskId: k.taskId, count: k.questions.length,
    marks: k.questions.reduce((a, q) => a + q.marks, 0),
    ...(openTasks.has(k.taskId) ? { questions: k.questions } : {}) });

  const attempts = (S.attempts || []).slice().sort((a, b) => (b.created || b.date).localeCompare(a.created || a.date));
  const markedHashes = {};
  for (const a of attempts) if (a.hash && !markedHashes[a.hash]) markedHashes[a.hash] = a.id;

  // A worksheet carries its answers (newest first) and the study periods it is planned into.
  const planned = {};
  for (const [d, slots] of Object.entries(S.dayPlans || {})) {
    for (const [key, e] of Object.entries(slots || {})) {
      for (const x of [e, ...(e?.more || [])]) {
        const wid = x?.option?.worksheetId;
        if (wid) (planned[wid] ||= []).push({ date: d, key, done: Boolean(x.done) });
      }
    }
  }
  const worksheetHashes = {};
  const worksheets = (S.worksheets || []).slice()
    .sort((a, b) => (b.created || b.date || '').localeCompare(a.created || a.date || '')).slice(0, 150)
    .map((w) => {
      if (w.hash && !worksheetHashes[w.hash]) worksheetHashes[w.hash] = w.id;
      const mine = attempts.filter((a) => a.worksheetId === w.id);
      // how much of the sheet is done: questions answered in marked work, or
      // the count you gave when logging a session on it, whichever is more
      const answered = new Set(mine.flatMap((a) => a.questions.map((q) => String(q.q).toLowerCase().replace(/[^a-z0-9]/g, ''))));
      const total = w.questionCount || 0;
      const done = Math.max(answered.size, w.doneCount || 0);
      return { ...w, done: total ? Math.min(total, done) : done, left: total ? Math.max(0, total - done) : null,
        attempts: mine.map((a) => ({ id: a.id, date: a.date, score: a.score, max: a.max })),
        planned: (planned[w.id] || []).sort((a, b) => (a.date + a.key).localeCompare(b.date + b.key)) };
    });

  return {
    generated: new Date().toISOString(), date: today, time: P.hhmm(at), rev: S.rev || 0,
    week: P.weekOf(today),
    term: term ? { name: term.name, week: Math.floor(P.daysBetween(term.start, today) / 7) + 1 } : null,
    holiday: hol ? hol.label : null,
    lessons,
    studyPeriods: P.studyOptions(today, { nowMins }),
    tasks: S.homework.filter((h) => !h.done).map(task).sort((a, b) => b.score - a.score),
    done: S.homework.filter((h) => h.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 8).map(task),
    tests: (S.tests || []).filter((t) => !t.date || t.date >= P.addDays(today, -45))
      .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    subjects: S.subjects.map((s) => ({ id: s.id, name: s.name, short: s.short || '', colour: colour(s.id), active: s.active !== false })),
    topics: S.topics.map((t) => ({ id: t.id, subjectId: t.subjectId, unit: t.unit, name: t.name, year: t.year,
      confidence: t.confidence, started: Boolean(t.started), finished: Boolean(t.finished), lastStudied: t.lastStudied || null })),
    attempts: attempts.slice(0, 80),
    packs: (S.packs || []).map(pack),
    worksheets,
    notes: (S.attachments || []).filter((a) => a.kind === 'notes')
      .sort((a, b) => (b.created || b.date || '').localeCompare(a.created || a.date || '')).slice(0, 150)
      .map((a) => ({ id: a.id, title: a.title, date: a.date, subjectId: a.subjectId, topicIds: a.topicIds || [],
        driveId: a.driveId || null, driveUrl: a.driveUrl, folder: a.folder, folderId: a.folderId || null, ownCopy: Boolean(a.ownCopy),
        summary: a.summary || '', keyPoints: a.keyPoints || [], fileName: a.fileName || '', pageCount: a.pageCount || a.pages || 0,
        readPages: a.readPages || 0, firstSig: a.firstSig || null, updated: a.updated || null, versions: a.versions || 1 })),
    mistakes: P.openMistakes(),
    mastery: {
      subjects: m.subjects,
      topics: Object.fromEntries(Object.entries(m.topics)
        .filter(([, v]) => v.evidence > 0 || v.score !== 25)
        .map(([k, v]) => [k, { score: v.score, evidence: v.evidence, level: v.level, trend: v.trend }])),
    },
    weak: P.weakSpots(8).map((w) => ({ topicId: w.topic?.id || null, name: w.name, subjectId: w.subjectId, marks: w.marks })),
    markedHashes,
    worksheetHashes,
    reading: { queue: (S.readQueue || []).map(({ ask, ...r }) => r), log: (S.readLog || []).slice(0, 12).map(({ request, ...l }) => ({ ...l, retry: Boolean(request) })) },
    route: routePayload(S, today),
  };
}

/* ------------------------------------------------------------------ route
   The university plan's day: what to do on it, and whether you are on track.
   Null when there is no plan yet. The plan itself is yours and lives in the
   state; lib/route.mjs only reads it. */
export function routePayload(S, date) {
  const R = createRoute(() => S);
  const P = R.plan();
  if (!P) return null;
  const pr = R.progress(date), c = R.checklist(date), ph = P.phases[pr.stage.index];
  const text = new Map(R.items().map((it) => [it.id, it.kind === 'course' ? `Work on: ${it.text}` : it.text]));
  return {
    name: P.name || 'Your route', station: ph.station, when: ph.when || '', why: ph.why || '', example: Boolean(P._example),
    mode: c.mode, budget: c.budget, totalMinutes: c.totalMinutes, examLabel: c.examLabel,
    checklist: c.items.map((x) => ({ ...x, done: false })),
    doneToday: Object.entries(S.routeDone || {}).filter(([id, v]) => v === date && text.has(id)).map(([id]) => ({ id, text: text.get(id) })),
    stage: { done: pr.stage.done, total: pr.stage.total, pct: pr.stage.pct, timePct: pr.stage.timePct,
      verdict: pr.stage.verdict, behindBy: pr.stage.behindBy },
    plan: pr.plan,
    projects: pr.projects.map(({ id, name, mini, pct, status, next }) => ({ id, name, mini, pct, status, next })),
    deadlines: R.deadlines(date, 4),
    opts: R.opts(),
  };
}

// Everything, for Claude chat and the route skills.
export function routeFull(S, date) {
  const R = createRoute(() => S);
  if (!R.plan()) return { plan: null, hint: 'No route plan yet. Import one with apply_changes route.import.' };
  return { plan: S.route, done: S.routeDone || {}, opts: R.opts(), progress: R.progress(date),
    checklist: R.checklist(date), deadlines: R.deadlines(date, 10), validation: R.validate() };
}

// The next days' study periods, to plan ahead, and what you did in past ones.
export function weekPayload(S, { from, days = 14, date, time, logDays = 60 } = {}) {
  const { P } = planner(S, { date, time });
  const start = isISO(from) ? from : P.todayISO();
  const n = Math.min(28, Math.max(1, Number(days) || 14));
  return { from: start, today: P.todayISO(), days: P.studyWeek(start, n),
    log: P.studyLog(Math.min(400, Number(logDays) || 60), P.todayISO()) };
}

// The same day, short enough for Claude chat to read in one go: names instead
// of ids, and no topic catalogue.
export function summarize(p) {
  const subject = (id) => p.subjects.find((s) => s.id === id)?.name || (id ? id : 'General');
  const topic = (id) => p.topics.find((t) => t.id === id)?.name || id;
  return {
    date: p.date, time: p.time, week: p.week, term: p.term, holiday: p.holiday,
    lessons: p.lessons.map((l) => `${l.start}–${l.end} ${l.name}${l.room ? ' (' + l.room + ')' : ''}${l.state === 'now' ? ' ← now' : ''}`),
    studyPeriods: p.studyPeriods.map((s) => ({
      key: s.key, time: `${s.start}–${s.end}`, chosen: s.chosen?.title || null, done: s.done,
      options: s.options.map((o) => ({ id: o.id, kind: o.kind, title: o.title, why: o.why, subject: subject(o.subjectId) })),
    })),
    tasks: p.tasks.map((t) => ({ id: t.id, title: t.title, subject: subject(t.subjectId), due: t.due, priority: t.priority })),
    tests: p.tests.filter((t) => t.result == null).map((t) => ({ id: t.id, title: t.title, date: t.date,
      subject: subject(t.subjectId), topics: (t.topicIds || []).map(topic) })),
    unfixedMistakes: p.mistakes.slice(0, 12).map((m) => ({ attemptId: m.attemptId, q: m.q, topic: topic(m.topicId),
      subject: subject(m.subjectId), marksLost: m.marksLost, type: m.type, from: m.title })),
    worksheetsToDo: (p.worksheets || []).filter((w) => !w.attempts.length).slice(0, 12).map((w) => ({
      id: w.id, title: w.title, subject: subject(w.subjectId), topics: (w.topicIds || []).map(topic),
      questions: w.questionCount, planned: w.planned.filter((x) => !x.done).map((x) => `${x.date} ${x.key}`) })),
    level: Object.fromEntries(Object.entries(p.mastery.subjects).map(([sid, v]) => [subject(sid), {
      score: v.score, strongest: v.strongest.map(topic), weakest: v.weakest.map(topic), advice: v.advice }])),
    weakTopics: p.weak.map((w) => `${w.name} (${subject(w.subjectId)}): ${w.marks} marks lost`),
    waitingToBeRead: (p.reading?.queue || []).map((r) => ({ id: r.id, kind: r.kind, title: r.title,
      since: r.created, pages: r.pageCount, how: 'call read_queue to see the pages and what to save' })),
    route: p.route ? {
      station: p.route.station, verdict: p.route.stage.verdict, mode: p.route.mode,
      today: p.route.checklist.map((x) => `${x.text} (${x.minutes} min${x.id ? ', id ' + x.id : ''})`),
      nextDeadline: p.route.deadlines[0] ? `${p.route.deadlines[0].label}: ${p.route.deadlines[0].date}, in ${p.route.deadlines[0].daysLeft} days` : null,
    } : null,
  };
}

// The full marking of one attempt — explanations and corrections live in their
// own document, not in the state, so the dashboard's JSON stays small. Asked for
// a worksheet instead, it gives the worksheet's questions and its answers.
export async function getAttempt(S, { id, hash, worksheetId, noteId } = {}, store) {
  // a notebook's page signatures, to tell which pages of a re-upload are new
  if (noteId) {
    const n = (S.attachments || []).find((x) => x.id === noteId && x.kind === 'notes');
    if (!n) return { found: false };
    const doc = store ? await store.read('note-' + n.id).catch(() => null) : null;
    return { found: true, note: n, pageSigs: doc?.pageSigs || [] };
  }
  if (worksheetId) {
    const w = (S.worksheets || []).find((x) => x.id === worksheetId);
    if (!w) return { found: false };
    const doc = store ? await store.read('ws-' + w.id).catch(() => null) : null;
    return { found: true, worksheet: w, questions: doc?.questions || [], summary: doc?.summary || '',
      attempts: (S.attempts || []).filter((a) => a.worksheetId === w.id)
        .map((a) => ({ id: a.id, date: a.date, score: a.score, max: a.max })) };
  }
  const a = (S.attempts || []).find((x) => (id && x.id === id) || (hash && x.hash === hash));
  if (!a) return { found: false };
  const doc = store ? await store.read('mark-' + a.id).catch(() => null) : null;
  if (!doc) return { found: true, attempt: a, questions: a.questions, summary: '', nextSteps: [], notes: [] };
  // the compact copy is the source of truth for marks and resolution; the doc adds the words
  const byQ = new Map((doc.questions || []).map((q) => [String(q.q), q]));
  return {
    found: true, attempt: a,
    questions: a.questions.map((q) => ({ ...byQ.get(String(q.q)), ...q })),
    summary: doc.summary || '', nextSteps: doc.nextSteps || [], notes: doc.notes || [],
    detected: doc.detected || null,
  };
}

// What you have uploaded, newest first. The files themselves are in Google Drive;
// this gives Claude the ids to fetch them through the Drive connector.
export function uploadsList(S, { subjectId, topicId, kind, limit } = {}) {
  return (S.attachments || [])
    .filter((a) => (!subjectId || a.subjectId === subjectId)
      && (!topicId || (a.topicIds || [a.topicId]).includes(topicId))
      && (!kind || a.kind === kind))
    .sort((a, b) => (b.created || b.date || '').localeCompare(a.created || a.date || ''))
    .slice(0, num(limit, 1, 100) ?? 20)
    .map((a) => ({ id: a.id, date: a.date, title: a.title, kind: a.kind, subjectId: a.subjectId,
      topicIds: a.topicIds || [], driveId: a.driveId, driveUrl: a.driveUrl, folder: a.folder || '',
      mime: a.mime || '', pages: a.pages || 1, attemptId: a.attemptId || null }));
}

/* What Claude reads when the app could not show it the pictures: the oldest
   waiting request (or the one asked for), its instructions, and a few of its
   pages as images — call again with `from` for the rest. Returns MCP content. */
export async function readQueue(S, { requestId, from, limit } = {}, store) {
  const queue = S.readQueue || [];
  const r = requestId ? queue.find((x) => x.id === requestId) : queue[0];
  const text = (o) => ({ type: 'text', text: JSON.stringify(o, null, 1) });
  if (!r) {
    return [text({ waiting: queue.length, request: null,
      message: requestId ? 'That request is not waiting any more — it was read or cancelled.' : 'Nothing is waiting to be read.' })];
  }
  const total = r.pageCount || 0;
  const start = Math.min(total, num(from, 0, MAX_READ_PAGES) ?? 0);
  const end = Math.min(total, start + (num(limit, 1, 6) ?? READ_BATCH));
  const pics = [];
  for (let n = start; n < end; n++) {
    const d = await store?.read(pageDoc(r.id, n)).catch(() => null);
    if (d?.data) pics.push(text(`${r.title} — ${d.label || r.labels?.[n] || 'page ' + (n + 1)}:`), { type: 'image', data: d.data, mimeType: d.mime || 'image/jpeg' });
  }
  const { pageCount, labels, ...req } = r;
  return [text({
    waiting: queue.length,
    request: req,
    pictures: total ? `${end - start ? `pages ${start + 1}-${end}` : 'no pages'} of the ${total} sent (${(r.labels || []).filter(Boolean).join(', ')})`
      : 'no pictures were sent for this one — if you can use Google Drive, read the file by its driveId instead',
    next: end < total ? { requestId: r.id, from: end } : null,
    then: end < total ? 'Call read_queue with next for the remaining pages before saving.'
      : 'Do what ask says, then send its op together with {"type": "read.done", "requestId": "' + r.id + '"} (each op with its own id) in one apply_changes call, passing date from the request. Then call read_queue again for the next request.',
  }), ...pics];
}

/* ----------------------------------------------------------------- writing */

const DIFFICULTIES = ['warm-up', 'exam', 'hard', 'stretch'];

// Rating a topic from the app does exactly what rating it on the dashboard does.
function rate(t, conf, date) {
  t.confidence = conf;
  t.lastStudied = date;
  t.studyCount = (t.studyCount || 0) + 1;
  t.taught = true;
}

// Marked work moves a topic's confidence, and therefore its place in the
// revision queue: a strong result earns a step up, a weak one caps it low so
// the topic comes back round within days.
function confidenceAfter(conf, accuracy) {
  if (accuracy >= 0.9) return Math.min(5, conf + 1);
  if (accuracy >= 0.7) return Math.min(conf, 3);
  if (accuracy >= 0.5) return Math.min(conf, 2);
  return Math.min(conf, 1);
}

function cleanQuestion(q, S, fallbackTopic) {
  const max = num(q.maxMarks ?? q.max, 0, 100) ?? 1;
  const correct = Boolean(q.correct);
  let marks = num(q.marks, 0, max);
  if (marks === null) marks = correct ? max : 0;
  const lost = +(max - marks).toFixed(2);
  const topicId = S.topics.some((t) => t.id === q.topicId) ? q.topicId : fallbackTopic || null;
  const type = lost > 0 ? (ERROR_TYPES.includes(q.errorType ?? q.type) ? (q.errorType ?? q.type) : 'method') : null;
  // the marks decide: full marks is correct, anything dropped is a mistake
  return { q: str(String(q.q ?? ''), 20) || '?', topicId, correct: lost === 0,
    marks, max, marksLost: lost, type };
}

// A page's signature: an 8×8 grid of how much ink each part of the page holds,
// one hex digit a cell. Two uploads of the same notebook compare page by page.
const SIG = /^[0-9a-f]{64}$/;
const sigsOf = (v) => (Array.isArray(v) ? v.slice(0, 300).map((x) => (SIG.test(x || '') ? x : null)) : []);
const pointsOf = (v, max) => (Array.isArray(v) ? v : []).slice(0, max).map((x) => str(x, 200)).filter(Boolean);
// Making or extending notes on a topic is studying it.
function studiedToday(S, topicIds, today) {
  for (const tid of topicIds || []) {
    const t = S.topics.find((x) => x.id === tid);
    if (!t) continue;
    if (!t.lastStudied || t.lastStudied < today) t.lastStudied = today;
    if (!t.started) t.started = true;
  }
}

// Work you upload counts: done in class, its topics were taught; done at home,
// it is study time — a session like a logged study period (Claude guesses the
// minutes from the pages when you don't say).
// A study-period pick, as stored: only the fields the app and planner read.
function cleanOption(o) {
  return { id: str(o.id, 80), kind: str(o.kind, 20), title: str(o.title), why: str(o.why, 300),
    subjectId: o.subjectId || null, topicId: o.topicId || null, taskId: o.taskId || null,
    testId: o.testId || null, worksheetId: str(o.worksheetId, 40) || null, mins: num(o.mins, 0, 600) };
}
// One task in a study period done: logged as a study session, and its topic rated.
function finishStudy(S, target, op, ctx) {
  if (target.done) return { sessionId: target.sessionId || null };
  const o = target.option;
  const minutes = num(op.minutes, 1, 600) ?? o.mins ?? 45;
  const conf = num(op.confidence, 0, 5);
  Object.assign(target, { done: true, doneAt: new Date().toISOString(), minutes, confidence: conf });
  if (op.note !== undefined) target.note = str(op.note, 300);
  if (o.subjectId) {
    const id = uid('s');
    S.sessions.push({ id, subjectId: o.subjectId, topicId: o.topicId || null, date: op.date,
      minutes, confidenceAfter: conf, note: o.title, source: 'app' });
    target.sessionId = id;
  }
  const t = o.topicId && S.topics.find((x) => x.id === o.topicId);
  if (t && conf !== null) rate(t, Math.round(conf), op.date);
  if (o.taskId && op.taskDone) OPS['task.done'](S, { taskId: o.taskId, done: true }, ctx);
  return { sessionId: target.sessionId || null };
}
function undoStudy(S, target) {
  if (!target?.done) return;
  if (target.sessionId) S.sessions = S.sessions.filter((s) => s.id !== target.sessionId);
  for (const k of ['doneAt', 'sessionId', 'minutes', 'confidence']) delete target[k];
  target.done = false;
}

const WHERE = ['class', 'home'];
function logUploadStudy(S, a, { where, minutes }, ctx) {
  if (!WHERE.includes(where)) return null;
  a.where = where;
  studiedToday(S, a.topicIds, ctx.today);
  if (where === 'class') {
    for (const tid of a.topicIds || []) {
      const t = S.topics.find((x) => x.id === tid);
      if (t) { t.taught = true; t.started = true; }
    }
    return null;
  }
  const m = num(minutes, 5, 600);
  if (!m || !a.subjectId) return null;
  const id = uid('s');
  S.sessions.push({ id, subjectId: a.subjectId, topicId: a.topicIds?.[0] || null, date: ctx.today, minutes: Math.round(m),
    note: a.title, source: 'upload', attachmentId: a.id });
  a.sessionIds = [...(a.sessionIds || []), id];
  return { sessionId: id, minutes: Math.round(m) };
}

// A worksheet's questions as read from the sheet, cleaned.
const sheetQuestions = (S, list, topicIds) => (Array.isArray(list) ? list : []).slice(0, 80).map((q, i) => ({
  q: str(String(q?.q ?? i + 1), 20) || String(i + 1), text: str(q?.text, 600),
  maxMarks: num(q?.maxMarks ?? q?.max, 0, 100) ?? 1,
  topicId: S.topics.some((t) => t.id === q?.topicId) ? q.topicId : topicIds[0] || null,
}));

// Where a worksheet lives in Drive: its own folder, and the file of its pages.
const safeId = (v, p) => (/^[\w-]{1,40}$/.test(v || '') ? v : uid(p));
const https = (v) => (/^https:\/\//.test(v || '') ? str(v, 400) : null);
function driveFields(w, into = {}) {
  if (w.folderId !== undefined) into.folderId = str(w.folderId, 120) || null;
  if (w.folderUrl !== undefined) into.folderUrl = https(w.folderUrl);
  if (w.fileId !== undefined) into.fileId = str(w.fileId, 120) || null;
  if (w.fileUrl !== undefined) into.fileUrl = https(w.fileUrl);
  if (w.folder !== undefined) into.folder = str(w.folder, 300);
  return into;
}

// A page waiting to be read lives in its own document, never in the state.
const pageDoc = (rid, n) => `rp-${rid}-${n}`;
function dropPages(r, ctx) {
  for (let n = 0; n < (r?.pageCount || 0); n++) ctx.store?.remove?.(pageDoc(r.id, n));
}

function scoreOf(questions) {
  return {
    score: +questions.reduce((a, q) => a + q.marks, 0).toFixed(2),
    max: +questions.reduce((a, q) => a + q.max, 0).toFixed(2),
  };
}

const OPS = {
  /* ---- to-dos: homework items, plus a priority ---- */
  'task.add'(S, op, ctx) {
    const t = op.task || {};
    const title = str(t.title);
    if (!title) throw new Error('a task needs a title');
    const id = str(t.id, 40) || uid('h');
    if (S.homework.some((h) => h.id === id)) return { taskId: id };
    S.homework.push({
      id, subjectId: S.subjects.some((s) => s.id === t.subjectId) ? t.subjectId : '',
      title, due: isISO(t.due) ? t.due : null, notes: str(t.notes, 500), done: false, doneAt: null,
      priority: PRIORITIES.includes(t.priority) ? t.priority : 'normal', source: 'app', created: ctx.today,
    });
    return { taskId: id };
  },
  'task.update'(S, op) {
    const h = S.homework.find((x) => x.id === op.taskId);
    if (!h) throw new Error('no such task');
    const p = op.patch || {};
    if (p.title !== undefined && str(p.title)) h.title = str(p.title);
    if (p.subjectId !== undefined) h.subjectId = S.subjects.some((s) => s.id === p.subjectId) ? p.subjectId : '';
    if (p.due !== undefined) h.due = isISO(p.due) ? p.due : null;
    if (p.priority !== undefined && PRIORITIES.includes(p.priority)) h.priority = p.priority;
    if (p.notes !== undefined) h.notes = str(p.notes, 500);
    return { taskId: h.id };
  },
  'task.done'(S, op, ctx) {
    const h = S.homework.find((x) => x.id === op.taskId);
    if (!h) throw new Error('no such task');
    h.done = op.done !== false;
    h.doneAt = h.done ? ctx.today : null;
    return { taskId: h.id };
  },
  'task.delete'(S, op) {
    S.homework = S.homework.filter((h) => h.id !== op.taskId);
    S.packs = S.packs.filter((k) => k.taskId !== op.taskId);   // a pack lives and dies with its to-do
    return {};
  },

  /* ---- question packs: written by Claude in chat, worked on paper, marked here ----
     ponytail: packs live in the state document; move their bodies to pack-<id>
     documents (the mark-<id> pattern) if the state grows past a few MB. */
  'pack.add'(S, op, ctx) {
    const p = op.pack || {};
    const title = str(p.title, 120);
    if (!title) throw new Error('a pack needs a title');
    if (!S.subjects.some((s) => s.id === p.subjectId)) throw new Error('unknown subjectId');
    const raw = Array.isArray(p.questions) ? p.questions : [];
    if (!raw.length || raw.length > 30) throw new Error('a pack needs 1–30 questions');
    const realTopic = (id) => S.topics.some((t) => t.id === id && t.subjectId === p.subjectId);
    const questions = raw.map((q, i) => {
      const text = str(q.text, 3000);
      if (!text) throw new Error(`question ${i + 1} has no text`);
      return { n: str(String(q.n ?? i + 1), 10), text, marks: Math.round(num(q.marks, 1, 30) ?? 1),
        topicId: realTopic(q.topicId) ? q.topicId : null, markScheme: str(q.markScheme, 3000) };
    });
    const id = str(p.id, 40) || uid('q');
    if (S.packs.some((k) => k.id === id)) return { packId: id };
    const topicIds = [...new Set([...(Array.isArray(p.topicIds) ? p.topicIds : []), ...questions.map((q) => q.topicId)])]
      .filter(realTopic);
    const { taskId } = OPS['task.add'](S, { task: { title: `Question pack: ${title}`, subjectId: p.subjectId,
      due: p.due, priority: p.priority, notes: `${questions.length} questions · ${questions.reduce((a, q) => a + q.marks, 0)} marks` } }, ctx);
    S.homework.find((h) => h.id === taskId).packId = id;
    S.packs.push({ id, created: new Date().toISOString(), title, subjectId: p.subjectId, topicIds,
      difficulty: DIFFICULTIES.includes(p.difficulty) ? p.difficulty : 'exam', minutes: num(p.minutes, 5, 240),
      source: str(p.source, 40), taskId, questions });
    return { packId: id, taskId };
  },
  'pack.delete'(S, op) {
    const k = S.packs.find((x) => x.id === op.packId);
    if (!k) return {};
    S.packs = S.packs.filter((x) => x.id !== k.id);
    S.homework = S.homework.filter((h) => h.id !== k.taskId || h.done);   // a finished to-do stays in your history
    return {};
  },

  /* ---- the university route: your plan, and which of its boxes you have ticked ---- */
  'route.tick'(S, op, ctx) {
    const R = createRoute(() => S);
    if (!R.plan()) throw new Error('there is no route plan yet — import one first');
    const id = str(op.itemId, 60);
    if (!R.items().some((it) => it.id === id)) throw new Error(`no route item ${id}`);
    S.routeDone ||= {};
    if (op.done === false) delete S.routeDone[id];
    else S.routeDone[id] = ctx.today;
    return { itemId: id, done: op.done !== false };
  },
  'route.opts'(S, op) {
    S.routeOpts = { uk: S.routeOpts?.uk !== false, mit: S.routeOpts?.mit !== false };
    for (const k of ['uk', 'mit']) if (typeof op[k] === 'boolean') S.routeOpts[k] = op[k];
    return { opts: S.routeOpts };
  },
  'route.import'(S, op, ctx) {
    const plan = op.plan;
    if (!plan || typeof plan !== 'object' || !Array.isArray(plan.phases) || !plan.phases.length) {
      throw new Error('a route plan needs a list of phases');
    }
    if (JSON.stringify(plan).length > 400_000) throw new Error('that plan is too large (400 KB at most)');
    const R = createRoute(() => ({ route: plan }));
    const v = R.validate();
    if (v.duplicates.length) throw new Error(`the plan uses these ids twice: ${v.duplicates.join(', ')}`);
    if (v.badPhaseRefs.length) throw new Error(`these items point at stages that do not exist: ${v.badPhaseRefs.map((b) => b.id).join(', ')}`);
    S.route = plan;
    S.routeDone ||= {};
    const known = new Set(R.items().map((it) => it.id));
    // done: a list of ids, or the old planner's export {keepUK, keepMIT, items:[{id, done}]}
    const d = op.done;
    const doneIds = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items.filter((x) => x?.done).map((x) => x.id) : [];
    let merged = 0;
    // imported ticks were done some time before today — `true`, not today's date,
    // so they do not show up as "done today"
    for (const id of doneIds) if (known.has(id) && !S.routeDone[id]) { S.routeDone[id] = true; merged++; }
    const o = op.opts || (typeof d?.keepUK === 'boolean' ? { uk: d.keepUK, mit: d.keepMIT } : null);
    if (o) OPS['route.opts'](S, o);
    return { items: known.size, done: merged, warnings: v.warnings };
  },
  'route.task.add'(S, op) {
    const R = createRoute(() => S);
    if (!R.plan()) throw new Error('there is no route plan yet — import one first');
    const ph = S.route.phases.find((p) => p.id === op.phaseId);
    if (!ph) throw new Error('unknown phaseId');
    const t = op.task || {};
    const text = str(t.text, 400);
    if (!text) throw new Error('a task needs text');
    const id = str(t.id, 40) || uid('rt');
    if (R.items().some((it) => it.id === id)) throw new Error(`the id ${id} is already used in the plan`);
    (ph.tasks ||= []).push({ id, text, note: str(t.note, 800) || null,
      tags: (Array.isArray(t.tags) ? t.tags : []).filter((x) => typeof x === 'string' && x).map((x) => x.slice(0, 20)).slice(0, 6),
      critical: Boolean(t.critical), cost: str(t.cost, 60) || null });
    return { taskId: id };
  },

  // Edit one task or course of the plan in place; its tick stays.
  'route.item.update'(S, op) {
    if (!createRoute(() => S).plan()) throw new Error('there is no route plan yet — import one first');
    const id = str(op.itemId, 60), p = op.patch || {};
    const task = S.route.phases.flatMap((ph) => ph.tasks || []).find((t) => t.id === id);
    const course = !task && (S.route.courses || []).find((c) => c.id === id);
    if (!task && !course) throw new Error(`no task or course ${id} in the plan`);
    const has = (k) => p[k] !== undefined;
    if (task) {
      if (has('text')) { const t = str(p.text, 400); if (!t) throw new Error('a task needs text'); task.text = t; }
      if (has('note')) task.note = str(p.note, 800) || null;
      if (has('tags')) task.tags = (Array.isArray(p.tags) ? p.tags : []).filter((x) => typeof x === 'string' && x).map((x) => x.slice(0, 20)).slice(0, 6);
      if (has('critical')) task.critical = Boolean(p.critical);
      if (has('cost')) task.cost = str(p.cost, 60) || null;
      return { itemId: id, task };
    }
    if (has('name')) { const n = str(p.name, 200); if (!n) throw new Error('a course needs a name'); course.name = n; }
    for (const k of ['feeds', 'when']) if (has(k)) course[k] = str(p[k], 200);
    if (has('core')) course.core = Boolean(p.core);
    return { itemId: id, course };
  },

  /* ---- free periods ----
     A period holds its pick, and once that is done, more tasks done in the same
     period (`more`). Each is logged as its own study session. */
  'study.choose'(S, op) {
    if (!isISO(op.date) || !op.key) throw new Error('study.choose needs date and key');
    const day = (S.dayPlans[op.date] ||= {});
    const entry = day[op.key];
    if (op.item && !op.option) {                 // take one extra task back out
      const x = entry?.more?.find((m) => m.id === op.item);
      if (x) { undoStudy(S, x); entry.more = entry.more.filter((m) => m !== x); }
      return {};
    }
    if (op.add) {
      if (!entry?.option) throw new Error('choose the first task for that period first');
      if (!op.option) throw new Error('study.choose add needs an option');
      const id = str(op.item, 40) || uid('i');
      entry.more ||= [];
      if (!entry.more.some((m) => m.id === id)) {
        if (entry.more.length >= 12) throw new Error('that period already has 12 tasks');
        entry.more.push({ id, option: cleanOption(op.option), done: false, chosenAt: new Date().toISOString() });
      }
      return { item: id };
    }
    if (!op.option) {
      // the extras stay: the first of them becomes the period's pick
      const [first, ...rest] = entry?.more || [];
      if (first) { const { id, ...x } = first; day[op.key] = { ...x, ...(rest.length ? { more: rest } : {}) }; if (entry.done) undoStudy(S, entry); }
      else { if (entry?.done) undoStudy(S, entry); delete day[op.key]; }
      return {};
    }
    day[op.key] = { option: cleanOption(op.option), done: false, chosenAt: new Date().toISOString(),
      ...(entry?.more?.length ? { more: entry.more } : {}) };
    if (entry?.done) undoStudy(S, entry);
    return {};
  },
  'study.done'(S, op, ctx) {
    const entry = S.dayPlans[op.date]?.[op.key];
    if (!entry) throw new Error('choose an option for that period first');
    const target = op.item ? entry.more?.find((m) => m.id === op.item) : entry;
    if (!target) throw new Error('no such task in that period');
    return finishStudy(S, target, op, ctx);
  },

  // Ticked by mistake: the task goes back to planned, and its logged session goes.
  'study.undo'(S, op) {
    const entry = S.dayPlans[op.date]?.[op.key];
    const target = op.item ? entry?.more?.find((m) => m.id === op.item) : entry;
    if (target) undoStudy(S, target);
    return {};
  },

  /* ---- tests and unit tests: they pull study periods towards their topics ---- */
  'test.add'(S, op) {
    const t = op.test || {};
    const title = str(t.title);
    if (!title || !isISO(t.date)) throw new Error('a test needs a title and a date');
    const id = str(t.id, 40) || uid('t');
    if (S.tests.some((x) => x.id === id)) return { testId: id };
    S.tests.push({ id, title, date: t.date,
      subjectId: S.subjects.some((s) => s.id === t.subjectId) ? t.subjectId : '',
      kind: ['unit', 'test', 'mock', 'exam'].includes(t.kind) ? t.kind : 'test',
      topicIds: (Array.isArray(t.topicIds) ? t.topicIds : []).filter((x) => S.topics.some((tp) => tp.id === x)).slice(0, 60),
      notes: str(t.notes, 500), result: null });
    return { testId: id };
  },
  'test.update'(S, op) {
    const t = S.tests.find((x) => x.id === op.testId);
    if (!t) throw new Error('no such test');
    const p = op.patch || {};
    if (p.title !== undefined && str(p.title)) t.title = str(p.title);
    if (p.date !== undefined && isISO(p.date)) t.date = p.date;
    if (p.subjectId !== undefined) t.subjectId = S.subjects.some((s) => s.id === p.subjectId) ? p.subjectId : '';
    if (p.kind !== undefined) t.kind = p.kind;
    if (Array.isArray(p.topicIds)) t.topicIds = p.topicIds.filter((x) => S.topics.some((tp) => tp.id === x)).slice(0, 60);
    if (p.notes !== undefined) t.notes = str(p.notes, 500);
    return { testId: t.id };
  },
  'test.delete'(S, op) {
    S.tests = S.tests.filter((t) => t.id !== op.testId);
    return {};
  },
  // A result is a real score, so it also lands on the Papers tab and moves the
  // grade projection, exactly as if you had typed it there.
  'test.result'(S, op) {
    const t = S.tests.find((x) => x.id === op.testId);
    if (!t) throw new Error('no such test');
    const total = num(op.total, 1, 1000), mark = num(op.mark, 0, 1000);
    if (total === null || mark === null || mark > total) throw new Error('a result needs mark ≤ total');
    t.mark = mark; t.total = total; t.result = Math.round(mark / total * 100);
    if (t.subjectId) {
      const paper = S.papers.find((p) => p.testId === t.id);
      if (paper) Object.assign(paper, { mark, total, date: t.date, name: t.title });
      else S.papers.push({ id: uid('p'), subjectId: t.subjectId, name: t.title, mark, total, date: t.date, testId: t.id, source: 'app' });
    }
    return { result: t.result };
  },

  /* ---- worksheets: the questions saved now, your answers marked later ----
     The questions as Claude read them go in their own document (ws-<id>), so
     answers can be marked against them without sending the sheet again. */
  async 'worksheet.add'(S, op, ctx) {
    const w = op.worksheet || {};
    const id = safeId(w.id, 'w');
    if (S.worksheets.some((x) => x.id === id)) return { worksheetId: id };
    const topicIds = (Array.isArray(w.topicIds) ? w.topicIds : []).filter((x) => S.topics.some((t) => t.id === x)).slice(0, 8);
    const questions = sheetQuestions(S, op.questions, topicIds);
    S.worksheets.push({
      id, title: str(w.title) || 'Worksheet', created: new Date().toISOString(), date: ctx.today,
      subjectId: S.subjects.some((s) => s.id === w.subjectId) ? w.subjectId : '', topicIds,
      pages: num(w.pages, 0, 200) || 1, hash: /^[a-f0-9]{16,64}$/.test(w.hash || '') ? w.hash : null,
      questionCount: questions.length || num(w.questionCount, 0, 200) || 0, maxMarks: +questions.reduce((a, q) => a + q.maxMarks, 0).toFixed(2),
      ...driveFields({ folderId: null, folderUrl: null, fileId: null, fileUrl: null, folder: '', ...w }),
      // pending: added by name to plan it; the booklet comes later, with the answers
      ...(w.pending && !questions.length ? { pending: true } : {}),
    });
    await ctx.store?.write('ws-' + id, { id, questions, summary: str(op.summary, 1500) });
    return { worksheetId: id };
  },
  // Questions can come later: a sheet saved without being read, read afterwards (in a chat, say).
  async 'worksheet.update'(S, op, ctx) {
    const w = S.worksheets.find((x) => x.id === op.worksheetId);
    if (!w) throw new Error('no such worksheet');
    const p = op.patch || {};
    if (p.title !== undefined && str(p.title)) w.title = str(p.title);
    if (p.subjectId !== undefined) w.subjectId = S.subjects.some((s) => s.id === p.subjectId) ? p.subjectId : '';
    if (Array.isArray(p.topicIds)) w.topicIds = p.topicIds.filter((x) => S.topics.some((t) => t.id === x)).slice(0, 8);
    driveFields(p, w);
    if (p.doneCount !== undefined) w.doneCount = num(p.doneCount, 0, w.questionCount || 500) ?? 0;
    if (Array.isArray(op.questions)) {
      const questions = sheetQuestions(S, op.questions, w.topicIds);
      Object.assign(w, { questionCount: questions.length, maxMarks: +questions.reduce((a, q) => a + q.maxMarks, 0).toFixed(2) });
      await ctx.store?.write('ws-' + w.id, { id: w.id, questions, summary: str(op.summary, 1500) });
    }
    return { worksheetId: w.id };
  },
  // The worksheet goes; answers already marked stay in your history, and
  // periods planned for it that are still ahead are freed up.
  'worksheet.delete'(S, op, ctx) {
    const w = S.worksheets.find((x) => x.id === op.worksheetId);
    if (!w) return {};
    S.worksheets = S.worksheets.filter((x) => x.id !== w.id);
    for (const a of [...S.attempts, ...S.attachments]) if (a.worksheetId === w.id) delete a.worksheetId;
    for (const [d, slots] of Object.entries(S.dayPlans)) {
      if (d < ctx.today) continue;
      for (const [k, e] of Object.entries(slots || {})) {
        if (e?.more) e.more = e.more.filter((m) => m.option?.worksheetId !== w.id || m.done);
        if (e?.option?.worksheetId === w.id && !e.done) OPS['study.choose'](S, { date: d, key: k, option: null });
      }
    }
    return {};
  },

  /* ---- work: an upload, reviewed by you, optionally marked by Claude ---- */
  async 'work.save'(S, op, ctx) {
    const a = op.attachment || {};
    // answers to a saved worksheet belong to it, and take its subject and topics when not given
    const ws = a.worksheetId ? S.worksheets.find((x) => x.id === a.worksheetId) : null;
    const subjectId = S.subjects.some((s) => s.id === a.subjectId) ? a.subjectId : ws?.subjectId || '';
    let topicIds = (Array.isArray(a.topicIds) ? a.topicIds : [a.topicId])
      .filter((x) => S.topics.some((t) => t.id === x));
    if (!topicIds.length && ws) topicIds = [...ws.topicIds];
    const homeworkId = S.homework.some((h) => h.id === a.homeworkId) ? a.homeworkId : null;
    const attachment = {
      id: str(a.id, 40) || uid('f'), created: new Date().toISOString(), date: ctx.today,
      title: str(a.title) || 'Untitled work', kind: KINDS.includes(a.kind) ? a.kind : 'answers',
      subjectId, topicId: topicIds[0] || null, topicIds, homeworkId,
      driveId: str(a.driveId, 120) || null, driveUrl: https(a.driveUrl),
      folder: str(a.folder, 300), mime: str(a.mime, 60), pages: num(a.pages, 0, 200) || 1,
      hash: /^[a-f0-9]{16,64}$/.test(a.hash || '') ? a.hash : null,
      ...(ws ? { worksheetId: ws.id } : {}),
      ...(https(a.correctionsUrl) ? { correctionsUrl: https(a.correctionsUrl) } : {}),
      ...(str(a.folderId, 120) ? { folderId: str(a.folderId, 120) } : {}),
      ...(a.ownCopy ? { ownCopy: true } : {}),
    };
    if (S.attachments.some((x) => x.id === attachment.id)) return { attachmentId: attachment.id };
    // notes keep what Claude read in them, short, so they can be found and revised
    // from, and enough about the file to recognise it when it comes back longer
    if (attachment.kind === 'notes' && op.notes) {
      const n = op.notes;
      attachment.summary = str(n.summary, 800);
      attachment.keyPoints = pointsOf(n.keyPoints, 20);
      if (str(n.fileName, 200)) attachment.fileName = str(n.fileName, 200);
      if (num(n.pageCount, 1, 2000)) attachment.pageCount = num(n.pageCount, 1, 2000);
      if (num(n.readPages, 0, 2000) !== null) attachment.readPages = num(n.readPages, 0, 2000);
      if (SIG.test(n.firstSig || '')) attachment.firstSig = n.firstSig;
      if (Array.isArray(n.pageSigs) && n.pageSigs.length) await ctx.store?.write('note-' + attachment.id, { id: attachment.id, pageSigs: sigsOf(n.pageSigs) });
    }
    S.attachments.push(attachment);
    if (attachment.kind === 'notes') studiedToday(S, topicIds, ctx.today);
    // a worksheet added without its booklet learns its questions from the first marking
    if (ws?.pending && Array.isArray(op.marking?.questions) && op.marking.questions.length) {
      const qs = sheetQuestions(S, op.marking.questions, ws.topicIds);
      Object.assign(ws, { questionCount: Math.max(ws.questionCount || 0, qs.length), maxMarks: +qs.reduce((a, q) => a + q.maxMarks, 0).toFixed(2) });
      delete ws.pending;
      await ctx.store?.write('ws-' + ws.id, { id: ws.id, questions: qs, summary: '' });
    }
    logUploadStudy(S, attachment, { where: a.where, minutes: op.study?.minutes }, ctx);

    const mk = op.marking;
    if (!mk || !Array.isArray(mk.questions) || !mk.questions.length) return { attachmentId: attachment.id };

    const questions = mk.questions.slice(0, 80).map((q) => cleanQuestion(q, S, attachment.topicId));
    const attempt = {
      id: uid('a'), date: ctx.today, created: attachment.created, attachmentId: attachment.id,
      title: attachment.title, kind: attachment.kind, subjectId, topicId: attachment.topicId, topicIds,
      homeworkId, hash: attachment.hash, driveUrl: attachment.driveUrl,
      ...(ws ? { worksheetId: ws.id } : {}),
      ...(attachment.correctionsUrl ? { correctionsUrl: attachment.correctionsUrl } : {}),
      tier: ['quick', 'default', 'complex'].includes(mk.tier) ? mk.tier : null,
      ...scoreOf(questions), questions,
    };
    S.attempts.push(attempt);
    attachment.attemptId = attempt.id;

    // the words: explanations and corrections, one document per attempt
    await ctx.store?.write('mark-' + attempt.id, {
      id: attempt.id, hash: attempt.hash,
      questions: mk.questions.slice(0, 80).map((q, i) => ({ q: questions[i].q,
        explanation: str(q.explanation, 1500), correction: str(q.correction, 2500) })),
      summary: str(mk.summary, 1500), nextSteps: (mk.nextSteps || []).slice(0, 8).map((x) => str(x, 300)),
      detected: mk.detected || null, notes: [],
    });

    // feed the revision queue: every topic this touched moves
    const per = {};
    for (const q of questions) {
      if (!q.topicId) continue;
      const r = (per[q.topicId] ||= { got: 0, max: 0 });
      r.got += q.marks; r.max += q.max;
    }
    for (const [tid, r] of Object.entries(per)) {
      const t = S.topics.find((x) => x.id === tid);
      if (!t || !r.max) continue;
      t.confidence = confidenceAfter(Number(t.confidence) || 0, r.got / r.max);
      t.lastStudied = ctx.today;
      t.studyCount = (t.studyCount || 0) + 1;
      if (!t.started) t.started = true;
    }
    return { attachmentId: attachment.id, attemptId: attempt.id, score: attempt.score, max: attempt.max };
  },

  // "Claude marked this wrong" — or a topic it misread. Marks and topics are
  // yours to correct; the level model reads the corrected numbers.
  'attempt.update'(S, op) {
    const a = S.attempts.find((x) => x.id === op.attemptId);
    if (!a) throw new Error('no such attempt');
    const p = op.patch || {};
    if (p.title !== undefined && str(p.title)) a.title = str(p.title);
    if (p.subjectId !== undefined && S.subjects.some((s) => s.id === p.subjectId)) a.subjectId = p.subjectId;
    if (p.topicId !== undefined && S.topics.some((t) => t.id === p.topicId)) a.topicId = p.topicId;
    for (const u of (Array.isArray(op.questions) ? op.questions : [])) {
      const q = a.questions.find((x) => String(x.q) === String(u.q));
      if (!q) continue;
      const next = cleanQuestion({ ...q, ...u, maxMarks: u.max ?? u.maxMarks ?? q.max,
        marks: u.marks ?? (u.correct === true ? (u.max ?? q.max) : u.correct === false ? 0 : q.marks),
        errorType: u.errorType ?? q.type }, S, a.topicId);
      Object.assign(q, next, { edited: true });
    }
    Object.assign(a, scoreOf(a.questions));
    return { score: a.score, max: a.max };
  },
  'mistake.resolve'(S, op, ctx) {
    const a = S.attempts.find((x) => x.id === op.attemptId);
    const q = a?.questions.find((x) => String(x.q) === String(op.q));
    if (!q) throw new Error('no such question');
    if (op.how === null || op.how === false) { delete q.resolved; delete q.resolvedAt; return {}; }
    // archived: older work logged as data only, out of the fix queue with no credit for a fix
    q.resolved = ['checked', 'archived'].includes(op.how) ? op.how : 'self';
    q.resolvedAt = ctx.today;
    return {};
  },
  async 'attempt.note'(S, op, ctx) {
    const a = S.attempts.find((x) => x.id === op.attemptId);
    if (!a) throw new Error('no such attempt');
    const text = str(op.text, 6000);
    if (!text) throw new Error('empty note');
    const id = 'mark-' + a.id;
    const doc = (await ctx.store?.read(id).catch(() => null)) || { id: a.id, questions: [], notes: [] };
    (doc.notes ||= []).push({ q: op.q != null ? String(op.q) : null, text, kind: str(op.kind, 20) || 'note', at: new Date().toISOString() });
    doc.notes = doc.notes.slice(-40);
    await ctx.store?.write(id, doc);
    return {};
  },
  'attempt.delete'(S, op) {
    const a = S.attempts.find((x) => x.id === op.attemptId);
    if (!a) return {};
    S.attempts = S.attempts.filter((x) => x.id !== a.id);
    for (const f of S.attachments) if (f.attemptId === a.id) delete f.attemptId;
    return {};
  },
  // More of the same notebook: the notes entry is brought up to date instead of
  // a second one being made. Its page signatures are replaced with the new file's.
  async 'notes.update'(S, op, ctx) {
    const a = S.attachments.find((x) => x.id === op.attachmentId && x.kind === 'notes');
    if (!a) throw new Error('no such notes');
    const p = op.patch || {};
    if (p.title !== undefined && str(p.title)) a.title = str(p.title);
    if (p.subjectId !== undefined && S.subjects.some((s) => s.id === p.subjectId)) a.subjectId = p.subjectId;
    if (Array.isArray(p.topicIds)) {
      a.topicIds = p.topicIds.filter((x) => S.topics.some((t) => t.id === x)).slice(0, 12);
      a.topicId = a.topicIds[0] || null;
    }
    if (p.summary !== undefined) a.summary = str(p.summary, 800);
    if (Array.isArray(p.keyPoints)) a.keyPoints = pointsOf(p.keyPoints, 20);
    if (num(p.pageCount, 1, 2000)) a.pageCount = a.pages = num(p.pageCount, 1, 2000);
    if (num(p.readPages, 0, 2000) !== null) a.readPages = num(p.readPages, 0, 2000);
    if (SIG.test(p.firstSig || '')) a.firstSig = p.firstSig;
    if (p.fileName !== undefined && str(p.fileName, 200)) a.fileName = str(p.fileName, 200);
    if (p.driveId !== undefined) a.driveId = str(p.driveId, 120) || null;
    if (p.driveUrl !== undefined) a.driveUrl = https(p.driveUrl);
    if (p.folder !== undefined) a.folder = str(p.folder, 300);
    if (p.folderId !== undefined) a.folderId = str(p.folderId, 120) || null;
    if (p.mime !== undefined) a.mime = str(p.mime, 60);
    if (p.ownCopy !== undefined) a.ownCopy = Boolean(p.ownCopy);
    a.updated = ctx.today;
    a.versions = (a.versions || 1) + 1;
    if (Array.isArray(op.pageSigs) && op.pageSigs.length) await ctx.store?.write('note-' + a.id, { id: a.id, pageSigs: sigsOf(op.pageSigs) });
    studiedToday(S, a.topicIds, ctx.today);
    const logged = logUploadStudy(S, a, { where: p.where, minutes: p.minutes }, ctx);
    return { attachmentId: a.id, versions: a.versions, ...(logged || {}) };
  },

  /* ---- reading in the background ----
     Where Claude can't see pictures (an artifact in iPad Safari), the app files
     the work in Drive and queues it here. A Claude session the app starts (a
     routine on the student's own plan) reads the queue, reads each file from
     Drive, sends what the request's `ask` says, and then read.done. */
  'read.request'(S, op, ctx) {
    const r = op.request || {};
    const kind = READ_KINDS.includes(r.kind) ? r.kind : null;
    if (!kind) throw new Error(`kind must be one of ${READ_KINDS.join(', ')}`);
    const ask = str(r.ask, 12000);
    if (!ask) throw new Error('a reading request needs its instructions (ask)');
    const files = (Array.isArray(r.files) ? r.files : []).slice(0, 10)
      .map((f) => ({ driveId: str(f?.driveId, 120), name: str(f?.name, 200), mime: str(f?.mime, 80) })).filter((f) => f.driveId);
    const id = safeId(r.id, 'r');
    const had = S.readQueue.find((x) => x.id === id);
    S.readQueue = S.readQueue.filter((x) => x.id !== id);
    S.readLog = S.readLog.filter((x) => x.id !== id);
    // asked again (the app retrying): the pages already sent are kept
    S.readQueue.push({ id, kind, title: str(r.title) || 'Untitled', subjectId: str(r.subjectId, 40) || null,
      targetId: str(r.targetId, 60) || null, date: isISO(r.date) ? r.date : ctx.today, files, pages: str(r.pages, 200),
      pageCount: had?.pageCount || 0, labels: had?.labels || [], ask, created: had?.created || new Date().toISOString() });
    while (S.readQueue.length > MAX_WAITING) dropPages(S.readQueue.shift(), ctx);
    return { requestId: id };
  },
  // One page of a request, as a picture: sent one per call, kept only until it is read.
  async 'read.page'(S, op, ctx) {
    const r = S.readQueue.find((x) => x.id === op.requestId);
    if (!r) throw new Error('that reading request is not waiting');
    const n = Number.isInteger(op.n) && op.n >= 0 && op.n < MAX_READ_PAGES ? op.n : null;
    if (n === null) throw new Error(`a page number is 0-${MAX_READ_PAGES - 1}`);
    const mime = ['image/jpeg', 'image/png', 'image/webp'].includes(op.mime) ? op.mime : null;
    const data = typeof op.data === 'string' ? op.data.replace(/\s+/g, '') : '';
    if (!mime || !data || data.length > 6e6 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      throw new Error('a page is a JPEG, PNG or WebP picture, base64, at most about 4 MB');
    }
    if (!ctx.store) throw new Error('pages cannot be kept here');
    const label = str(op.label, 40) || `page ${n + 1}`;
    await ctx.store.write(pageDoc(r.id, n), { mime, data, label });
    r.pageCount = Math.max(r.pageCount || 0, n + 1);
    r.labels = Array.from({ length: r.pageCount }, (_, i) => (i === n ? label : r.labels?.[i] || null));
    return { requestId: r.id, n };
  },
  'read.done'(S, op, ctx) {
    const r = S.readQueue.find((x) => x.id === op.requestId);
    if (!r) return { already: true };
    S.readQueue = S.readQueue.filter((x) => x !== r);
    const error = str(op.error, 400);
    // a failed request is kept whole (its pages too), so the app can offer to try it again
    if (!error) dropPages(r, ctx);
    S.readLog.unshift({ id: r.id, kind: r.kind, title: r.title, subjectId: r.subjectId, targetId: r.targetId,
      at: new Date().toISOString(), ok: !error, error: error || null, result: str(op.result, 400) || null,
      ...(error ? { request: r } : {}) });
    for (const old of S.readLog.slice(20)) if (old.request) dropPages(old.request, ctx);
    S.readLog = S.readLog.slice(0, 20);
    return {};
  },
  'read.retry'(S, op) {
    const l = S.readLog.find((x) => x.id === op.requestId && x.request);
    if (!l) throw new Error('that request cannot be tried again');
    S.readLog = S.readLog.filter((x) => x !== l);
    S.readQueue = S.readQueue.filter((x) => x.id !== l.id);
    S.readQueue.push({ ...l.request, pageCount: l.request.pageCount || 0, created: new Date().toISOString() });
    return { requestId: l.id };
  },
  'read.cancel'(S, op, ctx) {
    const r = S.readQueue.find((x) => x.id === op.requestId);
    if (r) dropPages(r, ctx);
    S.readQueue = S.readQueue.filter((x) => x.id !== op.requestId);
    const l = S.readLog.find((x) => x.id === op.requestId);
    if (l?.request) dropPages(l.request, ctx);
    S.readLog = S.readLog.filter((x) => x.id !== op.requestId);
    return {};
  },

  // Forget an upload (notes, a filed page). The file in Drive is yours and stays.
  'attachment.delete'(S, op) {
    S.attachments = S.attachments.filter((x) => x.id !== op.attachmentId);
    return {};
  },

  /* ---- study sessions you add yourself: weekends, holidays, evenings ---- */
  'study.slot.add'(S, op) {
    if (!isISO(op.date) || !HM.test(op.start || '')) throw new Error('a study session needs a date and a start time');
    const [h, m] = op.start.split(':').map(Number);
    if (h > 23 || m > 59) throw new Error('that is not a time');
    const mins = num(op.minutes, 10, 480) ?? 60;
    const endM = Math.min(24 * 60 - 1, h * 60 + m + mins);
    const end = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    const key = 'x' + op.start;
    const list = (S.extraSlots[op.date] ||= []);
    const had = list.find((x) => x.key === key);
    if (had) { had.end = end; return { key }; }
    list.push({ id: key, key, start: op.start, end, title: str(op.title, 60) || 'Study session' });
    list.sort((a, b) => a.start.localeCompare(b.start));
    return { key };
  },
  'study.slot.remove'(S, op) {
    const list = S.extraSlots[op.date];
    if (!list) return {};
    S.extraSlots[op.date] = list.filter((x) => x.key !== op.key);
    if (!S.extraSlots[op.date].length) delete S.extraSlots[op.date];
    const entry = S.dayPlans[op.date]?.[op.key];
    for (const x of [entry, ...(entry?.more || [])]) undoStudy(S, x);
    if (entry) delete S.dayPlans[op.date][op.key];
    return {};
  },
};

export const OP_TYPES = Object.keys(OPS);

/* Apply a batch. Each op is independent: one bad op is reported and skipped,
   the rest still land. Ops already applied (same id) are acknowledged again
   without being re-run. */
export async function applyOps(S, ops, { date, time, store } = {}) {
  if (!Array.isArray(ops)) throw new Error('ops must be a list');
  if (ops.length > 50) throw new Error('at most 50 ops at a time');
  const { P } = planner(S, { date, time });
  const ctx = { today: P.todayISO(), store };
  for (const k of ['homework', 'sessions', 'papers', 'attachments', 'attempts', 'tests', 'worksheets', 'packs', 'appOps',
    'readQueue', 'readLog']) {
    if (!Array.isArray(S[k])) S[k] = [];
  }
  if (!S.dayPlans || typeof S.dayPlans !== 'object') S.dayPlans = {};
  if (!S.extraSlots || typeof S.extraSlots !== 'object' || Array.isArray(S.extraSlots)) S.extraSlots = {};

  const results = [];
  let changed = false;
  for (const op of ops) {
    const id = str(op?.id, 80);
    if (!id) { results.push({ ok: false, error: 'every op needs an id' }); continue; }
    if (S.appOps.includes(id)) { results.push({ id, ok: true, duplicate: true }); continue; }
    const fn = OPS[op.type];
    if (!fn) { results.push({ id, ok: false, error: `unknown op type ${op.type}` }); continue; }
    try {
      const out = await fn(S, op, ctx);
      S.appOps.push(id);
      changed = true;
      results.push({ ...out, id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: e.message });
    }
  }
  if (S.appOps.length > OPS_KEPT) S.appOps = S.appOps.slice(-OPS_KEPT);
  // study-period picks are your study log too, so keep a school year of them
  const cutoff = P.addDays(ctx.today, -400);
  for (const d of Object.keys(S.dayPlans)) if (d < cutoff) { delete S.dayPlans[d]; changed = true; }
  for (const d of Object.keys(S.extraSlots)) if (d < cutoff) { delete S.extraSlots[d]; changed = true; }
  return { results, changed };
}
