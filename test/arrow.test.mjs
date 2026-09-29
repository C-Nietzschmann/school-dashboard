// Your private Assignment Arrow copy → the dashboard (arrow/bridge.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createPlanner } from '../lib/plan.mjs';
import { applyOps, todayPayload } from '../lib/companion.mjs';

const ctx = {};
vm.runInNewContext(readFileSync(new URL('../arrow/bridge.js', import.meta.url), 'utf8'), ctx);
// results come back as plain values: arrays made inside the vm context are not deepEqual to ours
const B = Object.fromEntries(Object.entries(ctx.ArrowBridge).map(([k, v]) =>
  [k, typeof v === 'function' ? (...a) => JSON.parse(JSON.stringify(v(...a))) : v]));
const MONDAY = '2026-09-28';

const QS = [
  { id: 'Q01', level: 'as', topic: 'Variables', title: 'Declaring for a fitness tracker', marks: 4 },
  { id: 'Q02', level: 'as', topic: 'Arrays', title: 'Totals of an array', marks: 5 },
  { id: 'Q03', level: 'as', topic: 'Arrays', title: 'Largest value', marks: 3 },
  { id: 'Q40', level: 'a2', topic: 'OOP', title: 'A class with a getter', marks: 6 },
  { id: 'I01', level: 'igcse', topic: 'Arrays', title: 'IGCSE array', marks: 2 },
];

test('each chapter of your course is a worksheet, with its questions', () => {
  const as = B.chapters(QS, 'as');
  assert.deepEqual(as.map((s) => [s.id, s.title, s.questions.map((q) => q.q)]),
    [['aa-variables', 'Assignment Arrow · Variables', ['Q01']], ['aa-arrays', 'Assignment Arrow · Arrays', ['Q02', 'Q03']]]);
  assert.deepEqual(B.chapters(QS, 'a2').map((s) => s.id), ['aa-variables', 'aa-arrays', 'aa-oop']);
  assert.deepEqual(B.chapters(QS, 'igcse').map((s) => s.questions.map((q) => q.q)), [['I01']]);
  assert.equal(B.topicName('Iteration'), 'Constructs');
  assert.equal(B.topicName('Syntax drill'), 'Programming basics');
  assert.deepEqual((B.doneCounts(as, ['Q02', 'Q03', 'Q99'])), [{ id: 'aa-variables', n: 0 }, { id: 'aa-arrays', n: 2 }]);
});

test('minutes: from your first tap to the mark; an exam burst shares its time', () => {
  const t0 = Date.parse('2026-09-28T17:00:00');
  const items = B.minutesFor([
    { at: t0 + 12 * 60e3, start: t0 },
    { at: t0 + 30 * 60e3, start: t0 + 29.8 * 60e3 },                   // quick one: at least a minute
    { at: t0 + 80 * 60e3, start: t0 + 50 * 60e3 },                     // exam: 30 min, three marks at once
    { at: t0 + 80 * 60e3 + 1000, start: t0 + 80 * 60e3 + 1000 },
    { at: t0 + 80 * 60e3 + 2000, start: t0 + 80 * 60e3 + 2000 },
  ]);
  assert.deepEqual(items.map((i) => i.minutes), [12, 1, 10, 10, 10]);
});

test('where the time goes: the period on now, the session from before, or a new one', () => {
  const periods = [{ key: '08:55', time: '08:55–10:50', chosen: null }, { key: '14:05', time: '14:05–15:00', chosen: 'Worksheet: X' }];
  assert.deepEqual((B.pickPeriod(periods, '09:30', null, '09:02')), { key: '08:55', chosen: null, own: false });
  assert.deepEqual((B.pickPeriod(periods, '15:08', null, '14:30')), { key: '14:05', chosen: 'Worksheet: X', own: false });
  assert.deepEqual((B.pickPeriod(periods, '17:40', null, '17:03')), { key: 'x17:00', chosen: null, own: true, start: '17:00', minutes: 45 });
  assert.equal(B.pickPeriod(periods, '18:20', 'x17:00', '18:10').key, 'x17:00');
  // on the dashboard's own site the periods come as the app payload: start, end and the chosen option
  const sitePeriods = [{ key: '14:05', start: '14:05', end: '15:00', chosen: { title: 'Worksheet: X' } }, { key: 'x17:00', start: '17:00', end: '18:00', chosen: null }];
  assert.deepEqual((B.pickPeriod(sitePeriods, '14:30', null, '14:10')), { key: '14:05', chosen: 'Worksheet: X', own: false });
  assert.deepEqual((B.pickPeriod(sitePeriods, '17:20', null, '17:01')), { key: 'x17:00', chosen: null, own: false });
});

test('one entry per chapter per period, growing as you finish more', () => {
  const sheets = B.chapters(QS, 'as');
  const topics = { Arrays: 't174', 'Programming basics': 't177' };
  const target = { key: '08:55', chosen: null, own: false };
  let r = B.buildOps({ date: MONDAY, target, sheets, topics, logs: {}, stamp: 's1',
    items: [{ qid: 'Q02', marks: 5, max: 5, minutes: 10 }, { qid: 'Q03', marks: 1, max: 3, minutes: 8 }, { qid: 'Q01', marks: 4, max: 4, minutes: 5 }] });
  assert.deepEqual(r.ops.map((o) => [o.type, o.item || '', o.option?.title || '', o.minutes || '']), [
    ['study.choose', '', 'Worksheet: Assignment Arrow · Arrays', ''],       // the period had nothing: Arrays becomes its task
    ['study.done', '', '', 18],
    ['study.choose', 'aa-variables', 'Worksheet: Assignment Arrow · Variables', ''],
    ['study.done', 'aa-variables', '', 5],
  ]);
  assert.deepEqual([r.ops[1].note, r.ops[1].confidence, r.ops[0].option.topicId, r.ops[0].option.worksheetId], ['2 questions · 6/8 marks', 4, 't174', 'aa-arrays']);
  // another Arrays question later: the same entry, logged again with the totals
  const again = B.buildOps({ date: MONDAY, target: { ...target, chosen: 'Worksheet: Assignment Arrow · Arrays' }, sheets, topics, logs: r.logs, stamp: 's2',
    items: [{ qid: 'Q03', marks: 3, max: 3, minutes: 6 }] });
  assert.deepEqual(again.ops.map((o) => [o.type, o.id.split('-').pop(), o.minutes || '']), [['study.undo', 'u1', ''], ['study.done', 'd1', 24]]);
  assert.equal(again.ops[1].note, '3 questions · 9/11 marks');
  // you planned this chapter into the period yourself: it is ticked off, not added again
  const planned = B.buildOps({ date: MONDAY, target: { key: '14:05', chosen: 'Worksheet: Assignment Arrow · Arrays', own: false }, sheets, topics, logs: {}, stamp: 's3',
    items: [{ qid: 'Q02', marks: 5, max: 5, minutes: 20 }] });
  assert.deepEqual(planned.ops.map((o) => [o.type, o.item || 'main']), [['study.done', 'main']]);
  // a session of its own is made (or stretched) first
  const own = B.buildOps({ date: MONDAY, target: { key: 'x17:00', chosen: null, own: true, start: '17:00', minutes: 45 }, sheets, topics, logs: {}, stamp: 's4',
    items: [{ qid: 'Q01', marks: 4, max: 4, minutes: 30 }] });
  assert.deepEqual(own.ops.map((o) => o.type), ['study.slot.add', 'study.choose', 'study.done']);
});

test('on the dashboard: chapter worksheets, study logged once per chapter, one suggestion at a time', async () => {
  const S = JSON.parse(readFileSync(new URL('../data.example.json', import.meta.url), 'utf8'));
  Object.assign(S, { attachments: [], attempts: [], tests: [], worksheets: [], dayPlans: {}, appOps: [], rev: 0 });
  const m = new Map();
  const store = { read: async (id) => m.get(id) ?? null, write: async (id, d) => { m.set(id, structuredClone(d)); }, remove: async (id) => { m.delete(id); } };
  const sheets = B.chapters(QS, 'as');
  const before = S.sessions.length;
  await applyOps(S, sheets.map((s) => ({ id: 'add-' + s.id, type: 'worksheet.add', questions: s.questions,
    worksheet: { id: s.id, title: s.title, subjectId: 'cs', source: 'arrow' } })), { date: MONDAY, store });
  assert.deepEqual(S.worksheets.map((w) => [w.id, w.source, w.questionCount]), [['aa-variables', 'arrow', 1], ['aa-arrays', 'arrow', 2]]);

  const target = B.pickPeriod([], '17:40', null, '17:03');
  let { ops, logs } = B.buildOps({ date: MONDAY, target, sheets, topics: {}, logs: {}, stamp: 'a',
    items: [{ qid: 'Q02', marks: 5, max: 5, minutes: 10 }, { qid: 'Q01', marks: 2, max: 4, minutes: 5 }] });
  ops.push({ id: 'dc', type: 'worksheet.update', worksheetId: 'aa-arrays', patch: { doneCount: 1 } });
  let out = await applyOps(S, ops, { date: MONDAY, store });
  assert.ok(out.results.every((r) => r.ok), JSON.stringify(out.results));
  ({ ops } = B.buildOps({ date: MONDAY, target: { ...target, chosen: 'Worksheet: Assignment Arrow · Arrays' }, sheets, topics: {}, logs, stamp: 'b',
    items: [{ qid: 'Q03', marks: 3, max: 3, minutes: 7 }] }));
  out = await applyOps(S, ops, { date: MONDAY, store });
  assert.ok(out.results.every((r) => r.ok), JSON.stringify(out.results));

  const e = S.dayPlans[MONDAY]['x17:00'];
  assert.deepEqual([e.option.worksheetId, e.done, e.minutes, e.more.map((x) => [x.option.worksheetId, x.minutes])],
    ['aa-arrays', true, 17, [['aa-variables', 5]]]);
  assert.equal(S.sessions.length, before + 2, 'one study session per chapter, not per question');
  const p = todayPayload(S, { date: MONDAY });
  assert.deepEqual((({ done, left }) => [done, left])(p.worksheets.find((w) => w.id === 'aa-arrays')), [1, 1]);

  // two copies each report what they know: a smaller count never lowers what is there
  await applyOps(S, [{ id: 'dl1', type: 'worksheet.update', worksheetId: 'aa-arrays', patch: { doneAtLeast: 2 } },
    { id: 'dl2', type: 'worksheet.update', worksheetId: 'aa-arrays', patch: { doneAtLeast: 1 } }], { date: MONDAY, store });
  assert.equal(S.worksheets.find((w) => w.id === 'aa-arrays').doneCount, 2);

  // suggestions: one Assignment Arrow chapter at most, the one you are in the middle of
  const P = createPlanner(() => S, () => new Date(2026, 8, 28, 8, 0));
  const ws = P.studyOptions(MONDAY).flatMap((s) => s.options.filter((o) => o.id !== s.chosen?.id))   // what is suggested, not what is chosen
    .filter((o) => o.worksheetId?.startsWith('aa-'));
  assert.ok(new Set(ws.map((o) => o.worksheetId)).size <= 1);
});
