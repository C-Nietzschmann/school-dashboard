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
import { createPlanner } from './plan.mjs';

// Same palette as the dashboard and the widgets, by subject slot.
const COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
export const ERROR_TYPES = ['careless', 'method', 'knowledge', 'timing'];
const KINDS = ['answers', 'notes', 'worksheet', 'test'];
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
    room: l.room || '', subjectId: l.subjectId, free: l.subjectId === 'free',
    name: l.title || (l.subjectId === 'free' ? 'Free period' : subj(l.subjectId)?.name || '?'),
    colour: l.subjectId === 'free' ? null : colour(l.subjectId), double: Boolean(l.double),
    state: nowMins >= P.toMins(l.end) ? 'past' : nowMins >= P.toMins(l.start) ? 'now' : 'later',
  }));

  const attachCount = {};
  for (const a of (S.attachments || [])) if (a.homeworkId) attachCount[a.homeworkId] = (attachCount[a.homeworkId] || 0) + 1;
  const task = (h) => ({ id: h.id, title: h.title, subjectId: h.subjectId || '', due: h.due || null,
    priority: h.priority || 'normal', notes: h.notes || '', done: Boolean(h.done), doneAt: h.doneAt || null,
    source: h.source || '', attachments: attachCount[h.id] || 0, score: +P.taskScore(h, today).toFixed(2) });

  const attempts = (S.attempts || []).slice().sort((a, b) => (b.created || b.date).localeCompare(a.created || a.date));
  const markedHashes = {};
  for (const a of attempts) if (a.hash && !markedHashes[a.hash]) markedHashes[a.hash] = a.id;

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
    mistakes: P.openMistakes(),
    mastery: {
      subjects: m.subjects,
      topics: Object.fromEntries(Object.entries(m.topics)
        .filter(([, v]) => v.evidence > 0 || v.score !== 25)
        .map(([k, v]) => [k, { score: v.score, evidence: v.evidence, level: v.level, trend: v.trend }])),
    },
    weak: P.weakSpots(8).map((w) => ({ topicId: w.topic?.id || null, name: w.name, subjectId: w.subjectId, marks: w.marks })),
    markedHashes,
  };
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
    level: Object.fromEntries(Object.entries(p.mastery.subjects).map(([sid, v]) => [subject(sid), {
      score: v.score, strongest: v.strongest.map(topic), weakest: v.weakest.map(topic), advice: v.advice }])),
    weakTopics: p.weak.map((w) => `${w.name} (${subject(w.subjectId)}): ${w.marks} marks lost`),
  };
}

// The full marking of one attempt — explanations and corrections live in their
// own document, not in the state, so the dashboard's JSON stays small.
export async function getAttempt(S, { id, hash } = {}, store) {
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

/* ----------------------------------------------------------------- writing */

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
    return {};
  },

  /* ---- free periods ---- */
  'study.choose'(S, op) {
    if (!isISO(op.date) || !op.key) throw new Error('study.choose needs date and key');
    const day = (S.dayPlans[op.date] ||= {});
    if (!op.option) { delete day[op.key]; return {}; }
    const o = op.option;
    day[op.key] = {
      option: { id: str(o.id, 80), kind: str(o.kind, 20), title: str(o.title), why: str(o.why, 300),
        subjectId: o.subjectId || null, topicId: o.topicId || null, taskId: o.taskId || null,
        testId: o.testId || null, mins: num(o.mins, 0, 600) },
      done: false, chosenAt: new Date().toISOString(),
    };
    return {};
  },
  'study.done'(S, op, ctx) {
    const entry = S.dayPlans[op.date]?.[op.key];
    if (!entry) throw new Error('choose an option for that period first');
    if (entry.done) return { sessionId: entry.sessionId };
    const o = entry.option;
    const minutes = num(op.minutes, 1, 600) ?? o.mins ?? 45;
    entry.done = true;
    entry.doneAt = new Date().toISOString();
    if (o.subjectId) {
      const id = uid('s');
      S.sessions.push({ id, subjectId: o.subjectId, topicId: o.topicId || null, date: op.date,
        minutes, confidenceAfter: num(op.confidence, 0, 5), note: o.title, source: 'app' });
      entry.sessionId = id;
    }
    const conf = num(op.confidence, 0, 5);
    const t = o.topicId && S.topics.find((x) => x.id === o.topicId);
    if (t && conf !== null) rate(t, Math.round(conf), op.date);
    if (o.taskId && op.taskDone) OPS['task.done'](S, { taskId: o.taskId, done: true }, ctx);
    return { sessionId: entry.sessionId || null };
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

  /* ---- work: an upload, reviewed by you, optionally marked by Claude ---- */
  async 'work.save'(S, op, ctx) {
    const a = op.attachment || {};
    const subjectId = S.subjects.some((s) => s.id === a.subjectId) ? a.subjectId : '';
    const topicIds = (Array.isArray(a.topicIds) ? a.topicIds : [a.topicId])
      .filter((x) => S.topics.some((t) => t.id === x));
    const homeworkId = S.homework.some((h) => h.id === a.homeworkId) ? a.homeworkId : null;
    const attachment = {
      id: str(a.id, 40) || uid('f'), created: new Date().toISOString(), date: ctx.today,
      title: str(a.title) || 'Untitled work', kind: KINDS.includes(a.kind) ? a.kind : 'answers',
      subjectId, topicId: topicIds[0] || null, topicIds, homeworkId,
      driveId: str(a.driveId, 120) || null, driveUrl: /^https:\/\//.test(a.driveUrl || '') ? str(a.driveUrl, 400) : null,
      folder: str(a.folder, 300), mime: str(a.mime, 60), pages: num(a.pages, 0, 200) || 1,
      hash: /^[a-f0-9]{16,64}$/.test(a.hash || '') ? a.hash : null,
    };
    if (S.attachments.some((x) => x.id === attachment.id)) return { attachmentId: attachment.id };
    S.attachments.push(attachment);

    const mk = op.marking;
    if (!mk || !Array.isArray(mk.questions) || !mk.questions.length) return { attachmentId: attachment.id };

    const questions = mk.questions.slice(0, 80).map((q) => cleanQuestion(q, S, attachment.topicId));
    const attempt = {
      id: uid('a'), date: ctx.today, created: attachment.created, attachmentId: attachment.id,
      title: attachment.title, kind: attachment.kind, subjectId, topicId: attachment.topicId, topicIds,
      homeworkId, hash: attachment.hash, driveUrl: attachment.driveUrl,
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
    q.resolved = op.how === 'checked' ? 'checked' : 'self';
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
  for (const k of ['homework', 'sessions', 'papers', 'attachments', 'attempts', 'tests', 'appOps']) {
    if (!Array.isArray(S[k])) S[k] = [];
  }
  if (!S.dayPlans || typeof S.dayPlans !== 'object') S.dayPlans = {};

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
  // keep two weeks of study-period choices; older days are history, not plans
  const cutoff = P.addDays(ctx.today, -14);
  for (const d of Object.keys(S.dayPlans)) if (d < cutoff) { delete S.dayPlans[d]; changed = true; }
  return { results, changed };
}
