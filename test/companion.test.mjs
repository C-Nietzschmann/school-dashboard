// node --test   (no dependencies: node's own runner and assert)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPlanner } from '../lib/plan.mjs';
import { applyOps, todayPayload, summarize, getAttempt, loadAppToken, rotateAppToken } from '../lib/companion.mjs';
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
const memStore = () => { const m = new Map(); return { m, read: async (id) => m.get(id) ?? null, write: async (id, d) => { m.set(id, structuredClone(d)); } }; };
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
  assert.deepEqual(S.dayPlans, {});
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
