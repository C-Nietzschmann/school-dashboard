// node --test   (no dependencies: node's own runner and assert)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPlanner } from '../lib/plan.mjs';
import { applyOps, todayPayload, weekPayload, summarize, getAttempt, uploadsList, readQueue, archiveStale, loadAppToken, rotateAppToken } from '../lib/companion.mjs';
import { createMcpServer } from '../lib/mcp.mjs';
import { upgrade } from '../lib/upgrade.mjs';
import { inlineModules } from '../lib/inline.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const MONDAY = '2026-09-28';

// The example data, with a real day: two free periods, a few topics under way.
function fixture() {
  const S = JSON.parse(readFileSync(new URL('../data.example.json', import.meta.url), 'utf8'));
  Object.assign(S, { attachments: [], attempts: [], tests: [], dayPlans: {}, appOps: [], rev: 0 });
  S.timetable.A.mon = [
    { id: 'a', subjectId: 'maths', period: '1', start: '08:30', end: '09:30' },
    { id: 'b', subjectId: 'free', period: '2', start: '09:30', end: '10:30' },
    { id: 'c', subjectId: 'physics', period: '3', start: '10:50', end: '11:50' },
    { id: 'd', subjectId: 'free', period: '4', start: '11:50', end: '12:50' },
  ];
  for (const t of S.topics) {
    if (['t001', 't002', 't003'].includes(t.id)) Object.assign(t, { started: true, finished: true, confidence: 3, lastStudied: '2026-09-01' });
    if (['t006', 't071'].includes(t.id)) Object.assign(t, { started: true, finished: false });
  }
  return S;
}
const memStore = () => { const m = new Map(); return { m, read: async (id) => m.get(id) ?? null, write: async (id, d) => { m.set(id, structuredClone(d)); }, remove: async (id) => { m.delete(id); } }; };
const at = (S, time = '08:00') => createPlanner(() => S, () => new Date(2026, 8, 28, ...time.split(':').map(Number)));

test('the rota: 28 Sep 2026 is week A, and a double free merges into one slot', () => {
  const S = fixture();
  const P = at(S);
  assert.equal(P.weekOf(MONDAY), 'A');
  assert.equal(P.weekOf('2026-10-05'), 'B');
  S.timetable.A.mon.push({ id: 'e', subjectId: 'free', period: '5', start: '12:50', end: '13:50' });
  const free = P.lessonsOn(MONDAY).filter((l) => l.subjectId === 'free');
  assert.equal(free.length, 2);
  assert.equal(free[1].end, '13:50');
});

test('study options: up to three per free period, no repeats across periods or within one', () => {
  const S = fixture();
  const sp = at(S).studyOptions(MONDAY);
  assert.equal(sp.length, 2);
  for (const s of sp) {
    assert.ok(s.options.length >= 1 && s.options.length <= 3);
    const topics = s.options.map((o) => o.topicId).filter(Boolean);
    assert.equal(new Set(topics).size, topics.length, 'a topic appears once per slot');
  }
  const first = new Set(sp[0].options.map((o) => o.id));
  assert.ok(sp[1].options.every((o) => !first.has(o.id)), 'the second period offers different things');
});

test('a test in the next fortnight pulls its topics to the top, weakest first', () => {
  const S = fixture();
  S.tests.push({ id: 'x', title: 'P1 unit test', subjectId: 'maths', date: '2026-09-30', topicIds: ['t004', 't006'], result: null });
  const top = at(S).studyOptions(MONDAY)[0].options[0];
  assert.equal(top.kind, 'test');
  assert.match(top.why, /P1 unit test in 2 days/);
  S.tests[0].date = '2026-11-30';                                 // too far off to matter yet
  assert.notEqual(at(S).studyOptions(MONDAY)[0].options[0].kind, 'test');
});

test('a chosen option stays put and is not offered in the other period', async () => {
  const S = fixture();
  const sp = at(S).studyOptions(MONDAY);
  const pick = sp[1].options[0];
  await applyOps(S, [{ id: 'c1', type: 'study.choose', date: MONDAY, key: sp[1].key, option: pick }], { date: MONDAY });
  const again = at(S).studyOptions(MONDAY);
  assert.equal(again[1].chosen.id, pick.id);
  assert.ok(again[0].options.every((o) => o.id !== pick.id));
});

test('to-dos rank by priority times urgency', () => {
  const P = at(fixture());
  const high = P.taskScore({ priority: 'high', due: '2026-10-03' }, MONDAY);
  const lowOverdue = P.taskScore({ priority: 'low', due: '2026-09-25' }, MONDAY);
  const normalTomorrow = P.taskScore({ priority: 'normal', due: '2026-09-29' }, MONDAY);
  assert.ok(normalTomorrow > high && high > lowOverdue);
});

test('ops are idempotent and report errors one by one', async () => {
  const S = fixture();
  const ops = [
    { id: 'o1', type: 'task.add', task: { id: 'h1', title: 'Worksheet 3', subjectId: 'physics', priority: 'high', due: '2026-09-29' } },
    { id: 'o2', type: 'nope' },
    { id: 'o3', type: 'task.done', taskId: 'missing' },
    { type: 'task.add', task: { title: 'no id' } },
  ];
  const r1 = await applyOps(S, ops, { date: MONDAY });
  assert.deepEqual(r1.results.map((r) => r.ok), [true, false, false, false]);
  assert.equal(r1.results[0].id, 'o1');
  const n = S.homework.length;
  const r2 = await applyOps(S, ops.slice(0, 1), { date: MONDAY });
  assert.equal(r2.results[0].duplicate, true);
  assert.equal(S.homework.length, n, 'resending does not add it twice');
  assert.equal(S.homework.find((h) => h.id === 'h1').priority, 'high');
});

test('work.save: marking lands in attempts, the words in their own document, and moves the topic', async () => {
  const S = fixture();
  const store = memStore();
  const { results: [r] } = await applyOps(S, [{
    id: 'w1', type: 'work.save',
    attachment: { title: 'Ex 2A', subjectId: 'maths', topicIds: ['t002'], kind: 'answers', hash: 'ab'.repeat(16), driveUrl: 'https://drive.google.com/x' },
    marking: { questions: [
      { q: '1', topicId: 't002', marks: 3, maxMarks: 3 },
      { q: '2a', topicId: 't002', marks: 1, maxMarks: 4, errorType: 'method', explanation: 'why', correction: 'how' },
      { q: '2b', topicId: 'not-a-topic', marks: 0, maxMarks: 2, errorType: 'weird' },
    ], summary: 'ok' },
  }], { date: MONDAY, store });
  assert.ok(r.ok);
  assert.equal(r.score, 4); assert.equal(r.max, 9);
  const a = S.attempts[0];
  assert.equal(a.questions[2].topicId, 't002', 'an unknown topic falls back to the work\'s topic');
  assert.equal(a.questions[2].type, 'method', 'an unknown error type becomes method');
  assert.ok(!('explanation' in a.questions[1]), 'the state keeps numbers, not words');
  assert.equal(store.m.get('mark-' + a.id).questions[1].explanation, 'why');
  const t = S.topics.find((x) => x.id === 't002');
  assert.equal(t.confidence, 1, '4/9 caps confidence at 1');
  assert.equal(t.lastStudied, MONDAY);
  const P = at(S);
  assert.equal(P.lostMarks().byTopic.t002, 5, 'lost marks feed the Analysis tab');
  assert.equal(P.openMistakes().length, 2);
  const full = await getAttempt(S, { hash: 'ab'.repeat(16) }, store);
  assert.equal(full.questions[1].correction, 'how');
  assert.equal(todayPayload(S, { date: MONDAY }).markedHashes['ab'.repeat(16)], a.id);
});

test('fixing mistakes and correcting the marks both raise your level', async () => {
  const S = fixture();
  const store = memStore();
  await applyOps(S, [{ id: 'w', type: 'work.save', attachment: { title: 'x', subjectId: 'maths', topicIds: ['t004'] },
    marking: { questions: [{ q: '1', topicId: 't004', marks: 0, maxMarks: 4, errorType: 'knowledge' }] } }], { date: MONDAY, store });
  const P = at(S);
  const before = P.mastery(MONDAY).topics.t004.score;
  const id = S.attempts[0].id;
  await applyOps(S, [{ id: 'f', type: 'mistake.resolve', attemptId: id, q: '1', how: 'checked' }], { date: MONDAY, store });
  const fixed = P.mastery(MONDAY).topics.t004.score;
  assert.ok(fixed > before);
  assert.equal(P.openMistakes().length, 0);
  await applyOps(S, [{ id: 'u', type: 'attempt.update', attemptId: id, questions: [{ q: '1', marks: 4 }] }], { date: MONDAY, store });
  assert.equal(S.attempts[0].score, 4);
  assert.ok(P.mastery(MONDAY).topics.t004.score > fixed);
  assert.equal(P.mastery(MONDAY).subjects.maths.dominant, null, 'no lost marks left, so no error pattern');
});

test('archiving an old mistake clears the queue without crediting a fix', async () => {
  const S = fixture();
  const store = memStore();
  await applyOps(S, [{ id: 'w', type: 'work.save', attachment: { title: 'x', subjectId: 'maths', topicIds: ['t004'] },
    marking: { questions: [{ q: '1', topicId: 't004', marks: 0, maxMarks: 4, errorType: 'knowledge' }] } }], { date: MONDAY, store });
  const P = at(S);
  const before = P.mastery(MONDAY).topics.t004.score;
  await applyOps(S, [{ id: 'f', type: 'mistake.resolve', attemptId: S.attempts[0].id, q: '1', how: 'archived' }], { date: MONDAY, store });
  assert.equal(P.openMistakes().length, 0);
  assert.equal(P.mastery(MONDAY).topics.t004.score, before);
});

test('unfixed mistakes get a week of reminders, then archive after 14 days', async () => {
  const S = fixture();
  await applyOps(S, [{ id: 'w', type: 'work.save', attachment: { title: 'x', subjectId: 'maths', topicIds: ['t004'] },
    marking: { questions: [{ q: '1', topicId: 't004', marks: 0, maxMarks: 2 }] } }], { date: MONDAY, store: memStore() });
  assert.equal(todayPayload(S, { date: '2026-10-05' }).mistakes[0].daysLeft, 7, 'reminders start a week before');
  assert.equal(archiveStale(S, { date: '2026-10-11' }), 0);
  assert.equal(archiveStale(S, { date: '2026-10-12' }), 1);
  assert.equal(S.attempts[0].questions[0].resolved, 'archived');
  assert.equal(todayPayload(S, { date: '2026-10-12' }).mistakes.length, 0);
});

test('a test result becomes a paper, which moves the grade projection', async () => {
  const S = fixture();
  const papers = S.papers.length;
  await applyOps(S, [
    { id: 't1', type: 'test.add', test: { id: 'x', title: 'P1 test', subjectId: 'maths', date: '2026-09-25', topicIds: ['t001', 'bogus'] } },
    { id: 't2', type: 'test.result', testId: 'x', mark: 30, total: 40 },
  ], { date: MONDAY });
  assert.deepEqual(S.tests[0].topicIds, ['t001']);
  assert.equal(S.tests[0].result, 75);
  assert.equal(S.papers.length, papers + 1);
  assert.equal(S.papers.at(-1).testId, 'x');
});

test('a question pack arrives with its own to-do, and goes when either is deleted', async () => {
  const S = fixture();
  const pack = { title: 'Quadratics', subjectId: 'maths', difficulty: 'hard', due: '2026-10-02', priority: 'high',
    questions: [
      { n: '1', text: 'Solve x² − 5x + 6 = 0.', marks: 3, topicId: 't002', markScheme: 'M1 factorise, A1 x=2, A1 x=3' },
      { text: 'Complete the square for x² + 4x + 1.', marks: 2, topicId: 'nope', markScheme: 'B2 (x+2)² − 3' },
    ] };
  const { results } = await applyOps(S, [{ id: 'p1', type: 'pack.add', pack }], { date: MONDAY });
  const { packId, taskId } = results[0];
  assert.ok(results[0].ok && packId && taskId);
  const task = S.homework.find((h) => h.id === taskId);
  assert.equal(task.packId, packId);
  assert.equal(task.priority, 'high');
  assert.equal(S.packs[0].questions[1].n, '2');
  assert.equal(S.packs[0].questions[1].topicId, null);          // an invented topic id is dropped
  assert.deepEqual(S.packs[0].topicIds, ['t002']);

  // resending the same op id does nothing
  await applyOps(S, [{ id: 'p1', type: 'pack.add', pack }], { date: MONDAY });
  assert.equal(S.packs.length, 1);

  // open: the app gets the questions; done: only the line
  let p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.equal(p.packs[0].questions.length, 2);
  assert.equal(p.packs[0].marks, 5);
  assert.equal(p.tasks.find((t) => t.id === taskId).packId, packId);
  await applyOps(S, [{ id: 'd1', type: 'task.done', taskId }], { date: MONDAY });
  p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.equal(p.packs[0].questions, undefined);

  const bad = await applyOps(S, [
    { id: 'b1', type: 'pack.add', pack: { ...pack, subjectId: 'latin' } },
    { id: 'b2', type: 'pack.add', pack: { ...pack, questions: [] } },
    { id: 'b3', type: 'pack.add', pack: { ...pack, questions: [{ marks: 2 }] } },
  ], { date: MONDAY });
  assert.deepEqual(bad.results.map((r) => r.ok), [false, false, false]);
  assert.equal(S.packs.length, 1);
  assert.equal(S.homework.filter((h) => h.packId).length, 1);   // a rejected pack leaves no stray to-do

  // pack.delete keeps a finished to-do; task.delete takes an open pack with it
  await applyOps(S, [{ id: 'x1', type: 'pack.delete', packId }], { date: MONDAY });
  assert.equal(S.packs.length, 0);
  assert.ok(S.homework.some((h) => h.id === taskId));
  const again = await applyOps(S, [{ id: 'p2', type: 'pack.add', pack }], { date: MONDAY });
  await applyOps(S, [{ id: 'x2', type: 'task.delete', taskId: again.results[0].taskId }], { date: MONDAY });
  assert.equal(S.packs.length, 0);
});

test('uploads: newest first, filtered by subject, topic and kind', () => {
  const S = fixture();
  S.attachments = [
    { id: 'f1', created: '2026-09-20T10:00:00Z', title: 'Notes', kind: 'notes', subjectId: 'maths', topicIds: ['t002'], driveId: 'd1' },
    { id: 'f2', created: '2026-09-25T10:00:00Z', title: 'Answers', kind: 'answers', subjectId: 'maths', topicIds: ['t003'], driveId: 'd2' },
    { id: 'f3', created: '2026-09-24T10:00:00Z', title: 'Waves', kind: 'notes', subjectId: 'physics', topicIds: [], driveId: 'd3' },
  ];
  assert.deepEqual(uploadsList(S).map((u) => u.id), ['f2', 'f3', 'f1']);
  assert.deepEqual(uploadsList(S, { subjectId: 'maths' }).map((u) => u.id), ['f2', 'f1']);
  assert.deepEqual(uploadsList(S, { topicId: 't002' }).map((u) => u.driveId), ['d1']);
  assert.deepEqual(uploadsList(S, { kind: 'notes', limit: 1 }).map((u) => u.id), ['f3']);
});

test('today payload and its chat summary', () => {
  const S = fixture();
  const p = todayPayload(S, { date: MONDAY, time: '10:00' });
  assert.equal(p.week, 'A');
  assert.equal(p.lessons.find((l) => l.start === '09:30').state, 'now');
  assert.equal(p.studyPeriods.length, 2);
  assert.ok(p.topics.length > 100);
  const s = summarize(p);
  assert.ok(Array.isArray(s.lessons) && typeof s.lessons[0] === 'string');
  assert.ok(!('topics' in s));
});

test('MCP: handshake, listing, calls, errors', async () => {
  const handle = createMcpServer({ name: 't', version: '1', instructions: 'x', tools: [
    { name: 'ok', description: 'd', inputSchema: { type: 'object' }, handler: async (a) => ({ echo: a.v }) },
    { name: 'bad', description: 'd', inputSchema: { type: 'object' }, handler: async () => { throw new Error('boom'); } },
  ] });
  const init = await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
  assert.equal(init.result.protocolVersion, '2025-03-26');
  assert.equal((await handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })).result.protocolVersion, '2025-06-18');
  assert.equal(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.deepEqual((await handle({ jsonrpc: '2.0', id: 3, method: 'tools/list' })).result.tools.map((t) => t.name), ['ok', 'bad']);
  const call = await handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'ok', arguments: { v: 7 } } });
  assert.deepEqual(call.result.structuredContent, { echo: 7 });
  const fail = await handle({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'bad' } });
  assert.equal(fail.result.isError, true);
  assert.equal((await handle({ jsonrpc: '2.0', id: 6, method: 'nope' })).error.code, -32601);
  assert.equal((await handle([{ jsonrpc: '2.0', id: 7, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/x' }])).length, 1);
});

test('upgrade adds the new fields only where they are missing', () => {
  const S = fixture();
  delete S.attempts; delete S.dayPlans; delete S.rev;
  S.homework[0].priority = 'high';
  delete S.homework[1].priority;
  S.tests = [{ id: 'keep' }];
  upgrade(S, { ...S, generic: true }, 999);
  assert.deepEqual(S.attempts, []);
  assert.deepEqual(S.worksheets, []);
  assert.deepEqual(S.dayPlans, {});
  assert.deepEqual(S.extraSlots, {});
  assert.deepEqual([S.readQueue, S.readLog], [[], []]);
  assert.equal(S.rev, 0);
  assert.equal(S.homework[0].priority, 'high');
  assert.equal(S.homework[1].priority, 'normal');
  assert.deepEqual(S.tests, [{ id: 'keep' }]);
});

test('the dashboard page gets the planner pasted in and still parses', () => {
  const html = inlineModules(readFileSync(ROOT + 'app.html', 'utf8'), ROOT);
  assert.ok(!html.includes('/* @inline'));
  assert.ok(html.includes('function createPlanner('));
  const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.doesNotThrow(() => new Function(js));
});

test('the companion page still parses', () => {
  const html = inlineModules(readFileSync(ROOT + 'companion.html', 'utf8'), ROOT);
  const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.doesNotThrow(() => new Function(js));
});

test('the companion key: made once and kept, the environment wins, rotation replaces it', async () => {
  const store = memStore();
  const a = await loadAppToken({ env: {}, store });
  assert.match(a.token, /^[0-9a-f]{48}$/);
  assert.equal(a.fromEnv, false);
  assert.equal((await loadAppToken({ env: {}, store })).token, a.token, 'the same key after a restart');
  const b = await rotateAppToken({ env: {}, store });
  assert.notEqual(b.token, a.token);
  assert.equal((await loadAppToken({ env: {}, store })).token, b.token);
  assert.deepEqual(await loadAppToken({ env: { APP_TOKEN: 'mine' }, store }), { token: 'mine', fromEnv: true });
  await assert.rejects(rotateAppToken({ env: { APP_TOKEN: 'mine' }, store }), /APP_TOKEN/);
});

test('a tutorial next to a study period is not study time, and is not merged into it', () => {
  const S = fixture();
  S.timetable.A.mon = [
    { id: 't', subjectId: 'free', period: '1', start: '08:45', end: '09:05', title: 'KS5 Tutorial' },
    { id: 's', subjectId: 'free', period: '2', start: '09:05', end: '10:50', title: 'Study period' },
    { id: 'p', subjectId: 'free', period: '3', start: '11:00', end: '11:45', title: 'PE' },
  ];
  const P = at(S);
  const lessons = P.lessonsOn(MONDAY);
  assert.equal(lessons.length, 3, 'different titles stay separate slots');
  assert.deepEqual(lessons.filter(P.isStudySlot).map((l) => l.start), ['09:05']);
  assert.deepEqual(P.studyOptions(MONDAY).map((s) => s.key), ['09:05']);
});

test('planning ahead: choose for a later day, then the log shows what was done', async () => {
  const S = fixture();
  S.timetable.A.wed = [{ id: 'w', subjectId: 'free', period: '1', start: '10:00', end: '11:00' }];
  const wk = weekPayload(S, { from: MONDAY, days: 7, date: MONDAY });
  const wed = wk.days.find((d) => d.date === '2026-09-30');
  assert.equal(wed.studyPeriods.length, 1);
  assert.ok(wk.days.find((d) => d.date === '2026-10-03').weekend);
  const pick = wed.studyPeriods[0].options[0];
  await applyOps(S, [{ id: 'p1', type: 'study.choose', date: '2026-09-30', key: '10:00', option: pick }], { date: MONDAY });
  assert.equal(weekPayload(S, { from: MONDAY, days: 7, date: MONDAY }).days[2].studyPeriods[0].chosen.id, pick.id);
  // Wednesday comes: it gets done, with a rating and a note
  await applyOps(S, [{ id: 'p2', type: 'study.done', date: '2026-09-30', key: '10:00', minutes: 50, confidence: 4, note: 'q1-8' }],
    { date: '2026-09-30' });
  const log = weekPayload(S, { from: '2026-09-28', date: '2026-10-01' }).log;
  assert.equal(log.length, 1);
  assert.deepEqual([log[0].done, log[0].minutes, log[0].confidence, log[0].note, log[0].start], [true, 50, 4, 'q1-8', '10:00']);
  const sessions = S.sessions.length;
  await applyOps(S, [{ id: 'p3', type: 'study.undo', date: '2026-09-30', key: '10:00' }], { date: '2026-09-30' });
  assert.equal(S.sessions.length, sessions - (pick.subjectId ? 1 : 0), 'undo removes the logged session');
  assert.equal(weekPayload(S, { from: '2026-09-28', date: '2026-10-01' }).log[0].done, false);
});

test('your own plan for a study period is kept as written', async () => {
  const S = fixture();
  const sp = at(S).studyOptions(MONDAY)[0];
  const own = { id: 'custom:x', kind: 'custom', title: 'Physics past paper Jan 2024', why: 'your own plan', subjectId: 'physics', mins: 60 };
  await applyOps(S, [{ id: 'c1', type: 'study.choose', date: MONDAY, key: sp.key, option: own },
    { id: 'c2', type: 'study.done', date: MONDAY, key: sp.key }], { date: MONDAY });
  const log = weekPayload(S, { date: MONDAY }).log;
  assert.equal(log[0].option.title, 'Physics past paper Jan 2024');
  assert.equal(log[0].minutes, 60);
  assert.equal(S.sessions.at(-1).subjectId, 'physics');
});

test('a worksheet added by name gets its questions from the first marking', async () => {
  const S = fixture();
  const store = memStore();
  await applyOps(S, [{ id: 'a', type: 'worksheet.add', worksheet: { id: 'wp', title: 'Booklet', subjectId: 'maths', pending: true, questionCount: 3 }, questions: [] }], { date: MONDAY, store });
  assert.deepEqual([S.worksheets[0].pending, S.worksheets[0].questionCount], [true, 3]);
  await applyOps(S, [{ id: 'm', type: 'work.save', attachment: { title: 'Answers', kind: 'answers', worksheetId: 'wp' },
    marking: { questions: [{ q: '1', marks: 2, maxMarks: 2 }, { q: '2a', marks: 1, maxMarks: 3 }, { q: '2b', marks: 0, maxMarks: 1 }, { q: '3', marks: 4, maxMarks: 4 }] } }], { date: MONDAY, store });
  const w = S.worksheets[0];
  assert.equal(w.pending, undefined);
  assert.deepEqual([w.questionCount, w.maxMarks], [4, 10]);
  assert.equal(store.m.get('ws-wp').questions[1].q, '2a');
  const p = todayPayload(S, { date: MONDAY }).worksheets[0];
  assert.deepEqual([p.done, p.left], [4, 0]);
});

test('a worksheet shows how much is done and left; a planned period takes more tasks', async () => {
  const S = fixture();
  const store = memStore();
  const qs = ['1', '2', '3', '4'].map((q) => ({ q, text: 'x', maxMarks: 1 }));
  await applyOps(S, [{ id: 'a', type: 'worksheet.add', worksheet: { id: 'w4', title: 'Four', subjectId: 'maths' }, questions: qs }], { date: MONDAY, store });
  const key = at(S).studyOptions(MONDAY)[0].key;
  await applyOps(S, [
    { id: 'p1', type: 'study.choose', date: MONDAY, key, option: { id: 'ws:w4', kind: 'worksheet', title: 'Worksheet: Four', worksheetId: 'w4' } },
    { id: 'p2', type: 'study.choose', date: MONDAY, key, add: true, item: 'i1', option: { id: 'custom:x', kind: 'custom', title: 'Flashcards' } },
  ], { date: MONDAY, store });
  assert.equal(S.dayPlans[MONDAY][key].more.length, 1, 'a planned (not yet done) period takes another task');
  const w = () => todayPayload(S, { date: MONDAY }).worksheets.find((x) => x.id === 'w4');
  assert.deepEqual([w().done, w().left], [0, 4]);
  await applyOps(S, [{ id: 'm', type: 'work.save', attachment: { title: 'Answers', kind: 'answers', worksheetId: 'w4' },
    marking: { questions: [{ q: '1', marks: 1, maxMarks: 1 }, { q: '2', marks: 0, maxMarks: 1 }] } }], { date: MONDAY, store });
  assert.deepEqual([w().done, w().left], [2, 2], 'marked answers count as done');
  await applyOps(S, [{ id: 'u', type: 'worksheet.update', worksheetId: 'w4', patch: { doneCount: 3 } }], { date: MONDAY, store });
  assert.deepEqual([w().done, w().left], [3, 1], 'what you logged counts too');
  await applyOps(S, [{ id: 'u2', type: 'worksheet.update', worksheetId: 'w4', patch: { doneCount: 9 } }], { date: MONDAY, store });
  assert.deepEqual([w().done, w().left], [4, 0]);
});

test('a worksheet: saved with its questions, offered in study periods, answered, then shown with its answers', async () => {
  const S = fixture();
  const store = memStore();
  const ws = { id: 'w1', title: 'Forces sheet 2', subjectId: 'physics', topicIds: ['t071'], pages: 3,
    folderId: 'F1', folderUrl: 'https://drive.google.com/drive/folders/F1', fileId: 'D1', fileUrl: 'https://drive.google.com/file/d/D1/view' };
  const add = { id: 'w-op', type: 'worksheet.add', worksheet: ws, summary: 'Newton',
    questions: [{ q: '1', text: 'Resolve the forces', maxMarks: 3, topicId: 't071' }, { q: '2', text: 'Find a', maxMarks: 2 }] };
  const r = await applyOps(S, [add, { ...add, id: 'w-op2' }], { date: MONDAY, store });
  assert.equal(r.results[0].worksheetId, 'w1');
  assert.equal(S.worksheets.length, 1, 'the same worksheet id is saved once');
  assert.deepEqual([S.worksheets[0].questionCount, S.worksheets[0].maxMarks, S.worksheets[0].folderId], [2, 5, 'F1']);
  assert.equal(store.m.get('ws-w1').questions[1].topicId, 't071', 'a question without a topic takes the sheet\'s');

  // it turns up as something to do in a study period, and can be planned there
  const opt = at(S).studyOptions(MONDAY).flatMap((s) => s.options).find((o) => o.worksheetId === 'w1');
  assert.equal(opt.kind, 'worksheet');
  assert.match(opt.title, /Worksheet: Forces sheet 2/);
  const key = at(S).studyOptions(MONDAY)[0].key;
  await applyOps(S, [{ id: 'w-plan', type: 'study.choose', date: MONDAY, key, option: opt }], { date: MONDAY, store });
  let p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.deepEqual(p.worksheets[0].planned, [{ date: MONDAY, key, done: false }]);
  assert.equal(summarize(p).worksheetsToDo[0].title, 'Forces sheet 2');

  // the answers, marked against it, belong to it
  await applyOps(S, [{ id: 'w-ans', type: 'work.save',
    attachment: { id: 'f9', title: 'Answers', kind: 'answers', worksheetId: 'w1', correctionsUrl: 'https://docs.google.com/document/d/C1/edit' },
    marking: { questions: [{ q: '1', marks: 3, maxMarks: 3 }, { q: '2', marks: 0, maxMarks: 2, errorType: 'method', explanation: 'x', correction: 'y' }] } }],
  { date: MONDAY, store });
  const att = S.attempts[0];
  assert.deepEqual([att.worksheetId, att.subjectId, att.topicIds[0], att.score, att.max], ['w1', 'physics', 't071', 3, 5]);
  assert.match(att.correctionsUrl, /C1/);
  p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.deepEqual(p.worksheets[0].attempts.map((a) => a.id), [att.id]);
  assert.equal(summarize(p).worksheetsToDo.length, 0);
  assert.ok(!at(S).studyOptions(MONDAY).flatMap((s) => s.options).some((o) => o.worksheetId === 'w1' && o.id !== opt.id),
    'an answered worksheet is not suggested again');

  const full = await getAttempt(S, { worksheetId: 'w1' }, store);
  assert.equal(full.found, true);
  assert.deepEqual(full.questions.map((q) => q.text), ['Resolve the forces', 'Find a']);
  assert.deepEqual(full.attempts.map((a) => a.score), [3]);
  assert.equal((await getAttempt(S, { worksheetId: 'nope' }, store)).found, false);

  // questions read later (in a chat, say) replace the saved ones
  await applyOps(S, [{ id: 'w-q', type: 'worksheet.update', worksheetId: 'w1', questions: [{ q: '1', text: 'a', maxMarks: 4 }, { q: '2', text: 'b', maxMarks: 2 }, { q: '3', text: 'c', maxMarks: 2 }] }], { date: MONDAY, store });
  assert.deepEqual([S.worksheets[0].questionCount, S.worksheets[0].maxMarks, store.m.get('ws-w1').questions.length], [3, 8, 3]);

  // renamed, then deleted: the marked answers stay in the history
  await applyOps(S, [{ id: 'w-up', type: 'worksheet.update', worksheetId: 'w1', patch: { title: 'Forces 2', topicIds: ['t071', 'zzz'] } }], { date: MONDAY, store });
  assert.deepEqual([S.worksheets[0].title, S.worksheets[0].topicIds], ['Forces 2', ['t071']]);
  await applyOps(S, [{ id: 'w-del', type: 'worksheet.delete', worksheetId: 'w1' }], { date: MONDAY, store });
  assert.equal(S.worksheets.length, 0);
  assert.equal(S.attempts.length, 1);
  assert.equal(S.attempts[0].worksheetId, undefined);
  assert.equal(S.dayPlans[MONDAY][key], undefined, 'the planned period is free again');
});

test('study sessions on a weekend get options, can be planned and logged, and removed', async () => {
  const S = fixture();
  const SAT = '2026-10-03';
  assert.deepEqual(weekPayload(S, { from: MONDAY, days: 7, date: MONDAY }).days.find((d) => d.date === SAT).studyPeriods, []);
  const r = await applyOps(S, [
    { id: 's1', type: 'study.slot.add', date: SAT, start: '10:00', minutes: 90 },
    { id: 's2', type: 'study.slot.add', date: SAT, start: '09:61' },
  ], { date: MONDAY });
  assert.equal(r.results[0].key, 'x10:00');
  assert.equal(r.results[1].ok, false);
  const sat = weekPayload(S, { from: MONDAY, days: 7, date: MONDAY }).days.find((d) => d.date === SAT);
  assert.equal(sat.weekend, true);
  assert.equal(sat.studyPeriods.length, 1);
  const sp = sat.studyPeriods[0];
  assert.deepEqual([sp.key, sp.start, sp.end, sp.mins, sp.extra], ['x10:00', '10:00', '11:30', 90, true]);
  assert.ok(sp.options.length >= 1);
  await applyOps(S, [{ id: 's3', type: 'study.choose', date: SAT, key: sp.key, option: sp.options[0] },
    { id: 's4', type: 'study.done', date: SAT, key: sp.key, confidence: 3 }], { date: SAT });
  const log = weekPayload(S, { date: SAT }).log;
  assert.deepEqual([log[0].date, log[0].start, log[0].end, log[0].minutes], [SAT, '10:00', '11:30', 90]);
  // a session on a school day sits next to the timetable's periods, in time order
  await applyOps(S, [{ id: 's5', type: 'study.slot.add', date: MONDAY, start: '16:30', minutes: 45 }], { date: MONDAY });
  assert.deepEqual(at(S).studyOptions(MONDAY).map((s) => s.key), ['09:30', '11:50', 'x16:30']);
  const before = S.sessions.length;
  await applyOps(S, [{ id: 's6', type: 'study.slot.remove', date: SAT, key: 'x10:00' }], { date: SAT });
  assert.equal(S.extraSlots[SAT], undefined);
  assert.equal(S.dayPlans[SAT]?.['x10:00'], undefined);
  assert.equal(S.sessions.length, before - (sp.options[0].subjectId ? 1 : 0));
});

test('a study period takes more tasks once one is done, each logged as its own session', async () => {
  const S = fixture();
  const sp = at(S, '10:00').studyOptions(MONDAY)[0];
  const [first, second] = sp.options.filter((o) => o.subjectId);
  const before = S.sessions.length;
  const out = await applyOps(S, [
    { id: 'm1', type: 'study.choose', date: MONDAY, key: sp.key, option: first },
    { id: 'm2', type: 'study.done', date: MONDAY, key: sp.key, minutes: 30 },
    { id: 'm3', type: 'study.choose', date: MONDAY, key: sp.key, add: true, item: 'i1', option: { ...second, mins: 30 } },
    { id: 'm4', type: 'study.choose', date: MONDAY, key: sp.key, add: true, item: 'i1', option: second },   // same item: once
    { id: 'm5', type: 'study.done', date: MONDAY, key: sp.key, item: 'i1', minutes: 25, confidence: 4 },
  ], { date: MONDAY });
  assert.ok(out.results.every((r) => r.ok));
  assert.equal(out.results[2].item, 'i1');
  assert.equal(S.sessions.length, before + 2);
  const now = at(S, '10:00').studyOptions(MONDAY)[0];
  assert.deepEqual(now.more.map((m) => [m.id, m.option.id, m.done, m.minutes, m.confidence]), [['i1', second.id, true, 25, 4]]);
  assert.equal(weekPayload(S, { date: MONDAY }).log.filter((e) => e.date === MONDAY).length, 2);
  // a further task needs a first one
  const bad = await applyOps(S, [{ id: 'm6', type: 'study.choose', date: MONDAY, key: '11:50', add: true, option: second }], { date: MONDAY });
  assert.equal(bad.results[0].ok, false);
  // undoing the extra takes only its session back
  await applyOps(S, [{ id: 'm7', type: 'study.undo', date: MONDAY, key: sp.key, item: 'i1' }], { date: MONDAY });
  assert.equal(S.sessions.length, before + 1);
  // clearing the first pick keeps the extra: it becomes the period's pick
  await applyOps(S, [{ id: 'm8', type: 'study.choose', date: MONDAY, key: sp.key, option: null }], { date: MONDAY });
  assert.equal(S.sessions.length, before);
  assert.deepEqual([S.dayPlans[MONDAY][sp.key].option.id, S.dayPlans[MONDAY][sp.key].more], [second.id, undefined]);
  // and a further task can be taken out again
  await applyOps(S, [{ id: 'm9', type: 'study.choose', date: MONDAY, key: sp.key, add: true, item: 'i2', option: first },
    { id: 'm10', type: 'study.done', date: MONDAY, key: sp.key, item: 'i2' },
    { id: 'm11', type: 'study.choose', date: MONDAY, key: sp.key, item: 'i2', option: null }], { date: MONDAY });
  assert.deepEqual([S.dayPlans[MONDAY][sp.key].more, S.sessions.length], [[], before]);
});

test('notes are kept as notes, with what Claude read in them, and count as studying the topic', async () => {
  const S = fixture();
  const t = S.topics.find((x) => x.id === 't004');
  t.lastStudied = null;
  await applyOps(S, [{ id: 'n1', type: 'work.save',
    attachment: { id: 'nf1', title: 'Quadratics notes', kind: 'notes', subjectId: 'maths', topicIds: ['t004'], driveUrl: 'https://drive.google.com/file/d/N/view' },
    notes: { summary: 'Completing the square', keyPoints: ['vertex form', '', 'discriminant'] } }], { date: MONDAY });
  assert.equal(S.attempts.length, 0, 'notes are not marked');
  assert.equal(t.lastStudied, MONDAY);
  const p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.equal(p.notes.length, 1);
  assert.deepEqual([p.notes[0].title, p.notes[0].summary, p.notes[0].keyPoints], ['Quadratics notes', 'Completing the square', ['vertex form', 'discriminant']]);
  await applyOps(S, [{ id: 'n2', type: 'attachment.delete', attachmentId: 'nf1' }], { date: MONDAY });
  assert.equal(todayPayload(S, { date: MONDAY, time: '08:00' }).notes.length, 0);
});

test('a notebook uploaded again longer updates the same notes entry', async () => {
  const S = fixture();
  const store = memStore();
  const sig = (c) => c.repeat(64);
  await applyOps(S, [{ id: 'nb1', type: 'work.save',
    attachment: { id: 'nb', title: 'CS chapter 3', kind: 'notes', subjectId: 'cs', topicIds: [], driveId: 'D1', folderId: 'F9', ownCopy: true,
      driveUrl: 'https://drive.google.com/file/d/D1/view' },
    notes: { summary: 'Networks', keyPoints: ['LAN vs WAN'], fileName: 'CS chapter 3.pdf', pageCount: 12, readPages: 12,
      firstSig: sig('1'), pageSigs: Array.from({ length: 12 }, () => sig('2')).concat(['nothex']) } }], { date: MONDAY, store });
  let n = todayPayload(S, { date: MONDAY, time: '08:00' }).notes[0];
  assert.deepEqual([n.fileName, n.pageCount, n.firstSig, n.folderId, n.ownCopy, n.versions], ['CS chapter 3.pdf', 12, sig('1'), 'F9', true, 1]);
  const got = await getAttempt(S, { noteId: 'nb' }, store);
  assert.equal(got.found, true);
  assert.equal(got.pageSigs.length, 13);
  assert.equal(got.pageSigs[12], null, 'a malformed signature is kept as a gap');

  const tid = S.topics.find((t) => t.subjectId === 'cs').id;
  S.topics.find((t) => t.id === tid).lastStudied = null;
  await applyOps(S, [{ id: 'nb2', type: 'notes.update', attachmentId: 'nb',
    patch: { summary: 'Networks and protocols', keyPoints: ['LAN vs WAN', 'TCP/IP layers'], topicIds: [tid, 'zzz'], pageCount: 15,
      readPages: 15, driveId: 'D2', driveUrl: 'https://drive.google.com/file/d/D2/view' },
    pageSigs: Array.from({ length: 15 }, () => sig('3')) }], { date: '2026-09-30', store });
  assert.equal(S.attachments.filter((a) => a.kind === 'notes').length, 1, 'no second entry');
  n = todayPayload(S, { date: '2026-09-30', time: '08:00' }).notes[0];
  assert.deepEqual([n.summary, n.keyPoints.length, n.pageCount, n.driveId, n.versions, n.updated, n.topicIds],
    ['Networks and protocols', 2, 15, 'D2', 2, '2026-09-30', [tid]]);
  assert.equal(S.topics.find((t) => t.id === tid).lastStudied, '2026-09-30');
  assert.equal((await getAttempt(S, { noteId: 'nb' }, store)).pageSigs.length, 15);
  const bad = await applyOps(S, [{ id: 'nb3', type: 'notes.update', attachmentId: 'missing', patch: {} }], { date: MONDAY, store });
  assert.equal(bad.results[0].ok, false);
});

test('reading in the background: queued with its pages, shown to Claude as pictures, finished — or failed and tried again', async () => {
  const S = fixture();
  const store = memStore();
  const req = (id, extra = {}) => ({ id, kind: 'notes', title: 'CS chapter 3', subjectId: 'cs', targetId: 'nb', date: MONDAY,
    files: [{ driveId: 'D1', name: 'CS chapter 3.pdf', mime: 'application/pdf' }], pages: '12–15', ask: 'Read the new pages.', ...extra });
  const jpeg = Buffer.from('fake jpeg bytes').toString('base64');
  let out = await applyOps(S, [
    { id: 'q1', type: 'read.request', request: req('r1') },
    { id: 'q2', type: 'read.request', request: req('r2', { ask: '' }) },
    { id: 'q3', type: 'read.request', request: req('r3', { kind: 'photo' }) },
    { id: 'q4', type: 'read.request', request: { id: 'rc', kind: 'check', title: 'Setup check', ask: 'Say hello.' } },
  ], { date: MONDAY, store });
  assert.deepEqual(out.results.map((r) => r.ok), [true, false, false, true], 'instructions and a known kind are needed');

  // pages arrive one per call; a bad one is refused
  out = await applyOps(S, [
    ...[0, 1, 2, 3, 4].map((n) => ({ id: 'p' + n, type: 'read.page', requestId: 'r1', n, label: `p. ${11 + n}`, mime: 'image/jpeg', data: jpeg })),
    { id: 'px', type: 'read.page', requestId: 'r1', n: 5, mime: 'image/gif', data: jpeg },
    { id: 'py', type: 'read.page', requestId: 'r1', n: 5, mime: 'image/jpeg', data: 'not base64!' },
    { id: 'pz', type: 'read.page', requestId: 'nope', n: 0, mime: 'image/jpeg', data: jpeg },
  ], { date: MONDAY, store });
  assert.deepEqual(out.results.map((r) => r.ok), [true, true, true, true, true, false, false, false]);
  assert.equal(store.m.get('rp-r1-4').label, 'p. 15');
  assert.equal(JSON.stringify(S).includes(jpeg), false, 'pictures never go into the state');

  let p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.deepEqual(p.reading.queue.map((r) => [r.id, r.kind, r.pageCount, r.date]), [['r1', 'notes', 5, MONDAY], ['rc', 'check', 0, MONDAY]]);
  assert.equal(p.reading.queue[0].ask, undefined, 'the app does not need the instructions back');
  assert.deepEqual(summarize(p).waitingToBeRead.map((r) => [r.id, r.pages]), [['r1', 5], ['rc', 0]]);

  // what Claude sees: the instructions, then the pages as images, four at a time
  let c = await readQueue(S, {}, store);
  let head = JSON.parse(c[0].text);
  assert.deepEqual([head.waiting, head.request.id, head.request.ask, head.next], [2, 'r1', 'Read the new pages.', { requestId: 'r1', from: 4 }]);
  assert.deepEqual(c.filter((b) => b.type === 'image').map((b) => [b.data, b.mimeType]), Array(4).fill([jpeg, 'image/jpeg']));
  assert.match(c[1].text, /p\. 11/);
  c = await readQueue(S, head.next, store);
  head = JSON.parse(c[0].text);
  assert.equal(c.filter((b) => b.type === 'image').length, 1);
  assert.equal(head.next, null);
  assert.match(head.then, /read\.done/);
  head = JSON.parse((await readQueue(S, { requestId: 'rc' }, store))[0].text);
  assert.match(head.pictures, /no pictures/);
  assert.equal(JSON.parse((await readQueue(S, { requestId: 'gone' }, store))[0].text).request, null);

  // queued again (the app retrying): still one request, its pages kept
  await applyOps(S, [{ id: 'q5', type: 'read.request', request: req('r1') }], { date: MONDAY, store });
  assert.deepEqual(S.readQueue.map((r) => [r.id, r.pageCount]), [['rc', 0], ['r1', 5]]);

  out = await applyOps(S, [{ id: 'd1', type: 'read.done', requestId: 'rc', result: 'Both connectors work.' },
    { id: 'd2', type: 'read.done', requestId: 'r1', error: 'Page 13 is blank.' },
    { id: 'd3', type: 'read.done', requestId: 'r1' }], { date: MONDAY, store });
  assert.deepEqual(out.results.map((r) => [r.ok, Boolean(r.already)]), [[true, false], [true, false], [true, true]]);
  p = todayPayload(S, { date: MONDAY, time: '08:00' });
  assert.equal(p.reading.queue.length, 0);
  assert.deepEqual(p.reading.log.map((l) => [l.id, l.ok, l.error, l.result, l.retry]),
    [['r1', false, 'Page 13 is blank.', null, true], ['rc', true, null, 'Both connectors work.', false]]);
  assert.equal(store.m.has('rp-r1-0'), true, 'a failed request keeps its pages to try again');

  // try again: back in the queue with its pages; read: the pages are gone
  await applyOps(S, [{ id: 'q6', type: 'read.retry', requestId: 'r1' }], { date: MONDAY, store });
  assert.deepEqual([S.readQueue.map((r) => [r.id, r.pageCount]), S.readLog.map((r) => r.id)], [[['r1', 5]], ['rc']]);
  await applyOps(S, [{ id: 'd4', type: 'read.done', requestId: 'r1', result: 'Saved 3 key points.' }], { date: MONDAY, store });
  assert.equal([...store.m.keys()].filter((k) => k.startsWith('rp-')).length, 0);
  const bad = await applyOps(S, [{ id: 'q7', type: 'read.retry', requestId: 'r1' }], { date: MONDAY, store });
  assert.equal(bad.results[0].ok, false, 'a request that was read cannot be tried again');

  // cancelled: gone, pages too
  await applyOps(S, [{ id: 'q8', type: 'read.request', request: req('r9') },
    { id: 'q9', type: 'read.page', requestId: 'r9', n: 0, mime: 'image/png', data: jpeg },
    { id: 'q10', type: 'read.cancel', requestId: 'r9' }], { date: MONDAY, store });
  assert.equal(S.readQueue.length, 0);
  assert.equal(store.m.has('rp-r9-0'), false);
});

test('uploads count: in class marks the topics taught, at home logs study time once', async () => {
  const S = fixture();
  const store = memStore();
  const tid = S.topics.find((t) => t.subjectId === 'cs').id;
  Object.assign(S.topics.find((t) => t.id === tid), { taught: false, started: false });
  const before = S.sessions.length;
  const save = (id, a, study) => ({ id, type: 'work.save', study, attachment: { id: 'f' + id, title: 'Networks', kind: 'notes', subjectId: 'cs', topicIds: [tid], ...a },
    notes: { summary: '', keyPoints: [] } });
  await applyOps(S, [save('c1', { where: 'class' }, { minutes: 40 })], { date: MONDAY, store });
  let t = S.topics.find((x) => x.id === tid);
  assert.deepEqual([t.taught, t.started, t.lastStudied, S.sessions.length], [true, true, MONDAY, before], 'class: taught, no study time');
  await applyOps(S, [save('h1', { where: 'home' }, { minutes: 33 }), save('h1', { where: 'home' }, { minutes: 33 }),
    save('h2', { where: 'home' }, { minutes: 2 }), save('h3', { where: 'home' })], { date: MONDAY, store });
  const logged = S.sessions.slice(before);
  assert.deepEqual(logged.map((x) => [x.subjectId, x.topicId, x.minutes, x.source, x.attachmentId]),
    [['cs', tid, 33, 'upload', 'fh1'], ['cs', tid, 5, 'upload', 'fh2']], 'resent op logs nothing; minutes clamp to 5; no minutes, no session');
  const out = await applyOps(S, [{ id: 'u1', type: 'notes.update', attachmentId: 'fh3', patch: { where: 'home', minutes: 25, summary: 'More' } }], { date: MONDAY, store });
  assert.equal(out.results[0].minutes, 25);
  assert.equal(S.sessions.at(-1).attachmentId, 'fh3');
  assert.deepEqual(S.attachments.find((a) => a.id === 'fh3').sessionIds.length, 1);
});
