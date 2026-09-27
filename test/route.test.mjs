// node --test — the route engine on an invented plan (no personal data in the repo)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRoute } from '../lib/route.mjs';
import { applyOps, todayPayload, summarize, routeFull } from '../lib/companion.mjs';
import { upgrade } from '../lib/upgrade.mjs';

const PLAN = {
  name: 'Route to Somewhere',
  phases: [
    { id: 'p1', station: 'One', when: 'Sep 2026', start: '2026-09-01', end: '2026-09-30', why: 'Start', tasks: [
      { id: 'a1', text: 'Critical admin', tags: ['uni'], critical: true },
      { id: 'a2', text: 'UK only', tags: ['uk'] },
      { id: 'a3', text: 'Portfolio task', tags: ['port'] },
    ] },
    { id: 'p2', station: 'Two', when: 'Oct 2026', end: '2026-10-31', why: 'Middle', tasks: [
      { id: 'b1', text: 'Critical two', tags: ['uni'], critical: true },
      { id: 'b2', text: 'Grades', tags: ['grades'] },
      { id: 'b3', text: 'Admin', tags: ['uni'] },
      { id: 'b4', text: 'Earning reminder', tags: ['earn'] },
    ] },
    { id: 'p3', station: 'Three', when: 'Nov 2026', end: '2026-11-30', why: 'End', tasks: [{ id: 'c1', text: 'Later', tags: ['uni'] }] },
  ],
  courses: [
    { id: 'k1', phase: 'p1', core: true, name: 'Course A', url: 'https://example.org/a', cert: 'free' },
    { id: 'k2', phase: 'p3', core: false, name: 'Course B', url: 'https://example.org/b', cert: 'paid' },
  ],
  earn: [{ name: 'Track', steps: [{ id: 'n1', phase: 'p1', text: 'First' }, { id: 'n2', phase: 'p2', text: 'Second' }] }],
  projects: [
    { name: 'Flagship', mini: false, start: 'p1', steps: [{ id: 'f1', text: 'Step 1', phase: null }, { id: 'f2', text: 'Step 2', phase: null }] },
    { name: 'Later project', mini: false, start: 'p3', steps: [{ id: 'l1', text: 'L1', phase: null }] },
    { name: 'Mini', mini: true, start: null, steps: [{ id: 'm1', text: 'M1', phase: 'p2' }] },
  ],
  deadlines: [{ date: '2026-10-20', label: 'UK thing', tag: 'uk' }, { date: '2026-10-25', label: 'Main', tag: 'uni' }],
  unis: [{ name: 'Main Uni', keep: 'uni', items: ['Maths A', 'Physics A'] }, { name: 'UK Uni', keep: 'uk', items: ['UK req'] }],
  exam_windows: [{ from: '2026-11-10', to: '2026-11-20', label: 'Mocks' }],
};

const make = (extra = {}) => {
  const S = { route: structuredClone(PLAN), routeDone: {}, routeOpts: { uk: true, mit: true }, tests: [], ...extra };
  return { S, R: createRoute(() => S, () => new Date(2026, 8, 20)) };
};
const ids = (list) => list.items.map((x) => x.id);

test('derived ids, and duplicate ids are caught', () => {
  const { S, R } = make();
  const P = R.plan();
  assert.equal(P.earn[0].id, 'earn-0');
  assert.equal(P.projects[2].id, 'proj-2');
  assert.deepEqual(P.unis[0].items.map((i) => i.id), ['uni-0-0', 'uni-0-1']);
  assert.equal(P.examWindows[0].label, 'Mocks');                 // v1's exam_windows is read too
  assert.equal(S.route.earn[0].id, undefined);                   // the stored plan is never touched
  assert.deepEqual(R.validate(), { ok: true, duplicates: [], badPhaseRefs: [], warnings: [] });
  S.route.phases[2].tasks.push({ id: 'f1', text: 'clash', tags: [] });
  assert.deepEqual(R.validate().duplicates, ['f1']);
});

test('stages, and dropping the UK applications hides their items', () => {
  const { S, R } = make();
  assert.equal(R.stageIndex('2026-09-15'), 0);
  assert.equal(R.stageIndex('2026-10-05'), 1);
  assert.equal(R.stageIndex('2027-03-01'), 2);                   // past the end: the last stage
  assert.equal(R.phaseStart(1), '2026-10-01');
  assert.equal(R.isActive(['uk']), true);
  S.routeOpts.uk = false;
  assert.equal(R.isActive(['uk']), false);
  assert.equal(R.isActive(['uk', 'grades']), true);              // serves another goal too
  assert.ok(!ids(R.checklist('2026-09-21')).includes('a2'));
  assert.deepEqual(R.deadlines('2026-10-01').map((d) => d.label), ['Main']);
  assert.equal(R.deadlines('2026-10-01')[0].daysLeft, 24);
});

test('progress: no ticks means unknown, never "behind"', () => {
  const { R } = make();
  const p = R.progress('2026-09-25');
  assert.equal(p.hasData, false);
  assert.equal(p.stage.verdict, 'unknown');
  assert.equal(p.plan.total, 16);                                // 13 stage items + 3 flagship steps
  assert.deepEqual(p.projects.map((x) => x.status), ['not-started', 'later', 'later']);
});

test('progress: on track, ahead and behind', () => {
  const { S, R } = make();
  Object.assign(S.routeDone, { a1: '2026-09-02', a3: '2026-09-05', k1: '2026-09-10', n1: '2026-09-12' });
  let p = R.progress('2026-09-20');                              // 4/5 done, 67% of the stage gone
  assert.equal(p.stage.pct, 80);
  assert.equal(p.stage.timePct, 67);
  assert.equal(p.stage.verdict, 'on-track');
  assert.equal(R.progress('2026-09-05').stage.verdict, 'ahead');
  p = R.progress('2026-10-25');                                  // nothing of stage two done, 81% gone
  assert.equal(p.stage.verdict, 'behind');
  assert.equal(p.stage.behindBy, 5);
  // a stage with nothing left active in it (only UK work, UK dropped) is not "behind"
  S.route.phases[0].tasks = [{ id: 'u1', text: 'UK only', tags: ['uk'] }];
  S.route.courses = []; S.route.earn = [];
  S.routeOpts.uk = false;
  S.routeDone.b1 = '2026-09-02';                                   // a tick that still exists, so there is data
  assert.deepEqual([R.progress('2026-09-25').stage.verdict, R.progress('2026-09-25').stage.behindBy], ['on-track', 0]);
  delete S.routeDone.b1;
  S.route = structuredClone(PLAN); S.routeOpts.uk = true;
  S.routeDone.f1 = '2026-09-20';
  const flagship = R.progress('2026-09-25').projects[0];
  assert.deepEqual([flagship.status, flagship.pct, flagship.next.id], ['in-progress', 50, 'f2']);
});

test('checklist: critical first, then projects on Mondays, courses on Tuesdays, a mix at weekends', () => {
  const { R } = make();
  const mon = R.checklist('2026-09-21');
  assert.deepEqual(ids(mon), ['a1', 'a3', 'a2']);
  assert.deepEqual(mon.items.map((x) => x.reason), ['critical', 'project day', 'quick admin']);
  assert.equal(mon.totalMinutes, 75);
  const tue = R.checklist('2026-09-22');
  assert.deepEqual(ids(tue), ['a1', 'k1', 'a2']);
  assert.equal(tue.items[1].text, 'Work on: Course A');
  const sat = R.checklist('2026-09-26');
  assert.equal(sat.mode, 'weekend');
  assert.equal(sat.budget, 150);
  assert.deepEqual(ids(sat), ['a1', 'a3', 'k1', 'n1', 'a2']);
  assert.equal(new Set(ids(sat)).size, ids(sat).length);
});

test('checklist: overdue before current, and a flagship offers only its next step', () => {
  const { S, R } = make();
  S.routeDone.a1 = '2026-09-02';
  const day = R.checklist('2026-10-05');                         // a Monday in stage two
  assert.deepEqual(ids(day), ['b1', 'a3', 'a2']);
  assert.equal(day.items[2].reason, 'overdue from One');
  const all = R.checklist('2026-10-05', { minutes: 600 });
  assert.ok(ids(all).includes('f1') && !ids(all).includes('f2'));
  assert.ok(ids(all).includes('n1') && !ids(all).includes('n2')); // earning, in order too
  S.routeDone.f1 = '2026-10-01';
  assert.ok(R.checklist('2026-10-05', { minutes: 600 }).items.some((x) => x.id === 'f2'));
});

test('checklist: exams mean grades only — from the plan or from a test on the dashboard', () => {
  const { S, R } = make();
  let day = R.checklist('2026-11-12');
  assert.equal(day.mode, 'exam');
  assert.equal(day.examLabel, 'Mocks');
  assert.deepEqual(ids(day), ['b2', 'a1']);
  S.routeDone.b2 = '2026-10-10';
  day = R.checklist('2026-11-12');
  assert.deepEqual([day.items[0].id, day.items[0].kind, day.items[0].minutes], [null, 'revision', 60]);
  S.tests = [{ title: 'Physics unit', date: '2026-09-25', kind: 'unit' }];
  assert.equal(R.checklist('2026-09-18').examLabel, 'Physics unit');
  S.tests = [{ title: 'Class quiz', date: '2026-09-25', kind: 'test' }];
  assert.equal(R.checklist('2026-09-18').mode, 'school');          // a quick class test pauses nothing
});

test('checklist: a school holiday gets the weekend budget', () => {
  const { R } = make({ calendar: { holidays: [{ start: '2026-09-21', end: '2026-09-25', label: 'Break' }] } });
  const day = R.checklist('2026-09-22');
  assert.equal(day.mode, 'holiday');
  assert.equal(day.budget, 150);
});

test('no plan: everything answers null or empty', () => {
  const R = createRoute(() => ({ route: null }));
  assert.equal(R.plan(), null);
  assert.equal(R.progress(), null);
  assert.equal(R.checklist(), null);
  assert.deepEqual(R.deadlines(), []);
  assert.equal(R.validate().ok, false);
});

/* ---- through the companion's ops and payload (the dashboard's example data as the base) ---- */
const base = () => JSON.parse(readFileSync(new URL('../data.example.json', import.meta.url), 'utf8'));

test('route.import: a plan with clashing ids is refused; the old planner export brings its ticks', async () => {
  const S = base();
  const clash = structuredClone(PLAN);
  clash.phases[1].tasks.push({ id: 'a1', text: 'again', tags: [] });
  let out = await applyOps(S, [{ id: 'i1', type: 'route.import', plan: clash }], { date: '2026-09-20' });
  assert.match(out.results[0].error, /twice: a1/);
  assert.ok(S.route._example);                                   // untouched
  out = await applyOps(S, [{ id: 'i2', type: 'route.import', plan: PLAN,
    done: { keepUK: false, keepMIT: true, items: [{ id: 'a1', done: true }, { id: 'zz', done: true }, { id: 'a3', done: false }] } }], { date: '2026-09-20' });
  assert.deepEqual([out.results[0].ok, out.results[0].done], [true, 1]);
  assert.deepEqual(S.routeDone, { a1: true });                   // imported: done, but not today
  assert.deepEqual(S.routeOpts, { uk: false, mit: true });
});

test('route.tick, route.opts and route.task.add, idempotent by op id', async () => {
  const S = { ...base(), route: structuredClone(PLAN), routeDone: {} };
  await applyOps(S, [{ id: 't1', type: 'route.tick', itemId: 'k1' }], { date: '2026-09-21' });
  assert.equal(S.routeDone.k1, '2026-09-21');
  await applyOps(S, [{ id: 't1', type: 'route.tick', itemId: 'k1', done: false }], { date: '2026-09-21' });
  assert.equal(S.routeDone.k1, '2026-09-21');                     // same op id: not applied again
  await applyOps(S, [{ id: 't2', type: 'route.tick', itemId: 'k1', done: false }], { date: '2026-09-21' });
  assert.equal(S.routeDone.k1, undefined);
  const bad = await applyOps(S, [{ id: 't3', type: 'route.tick', itemId: 'nope' }]);
  assert.equal(bad.results[0].ok, false);
  await applyOps(S, [{ id: 'o1', type: 'route.opts', mit: false, uk: 'yes' }]);
  assert.deepEqual(S.routeOpts, { uk: true, mit: false });
  const add = await applyOps(S, [
    { id: 'n1', type: 'route.task.add', phaseId: 'p2', task: { id: 'b9', text: 'New thing', tags: ['port'] } },
    { id: 'n2', type: 'route.task.add', phaseId: 'p2', task: { id: 'f1', text: 'Clash' } },
  ]);
  assert.deepEqual(add.results.map((r) => r.ok), [true, false]);
  assert.equal(S.route.phases[1].tasks.at(-1).id, 'b9');
});

test('the companion payload carries today\'s route, and the chat summary a short version', () => {
  const S = { ...base(), route: structuredClone(PLAN), routeDone: { a1: '2026-09-21' } };
  const p = todayPayload(S, { date: '2026-09-21', time: '08:00' });
  assert.equal(p.route.station, 'One');
  assert.deepEqual(p.route.checklist.map((x) => x.id), ['a3', 'a2']);   // k1 would take the day past 75 min
  assert.deepEqual(p.route.doneToday, [{ id: 'a1', text: 'Critical admin' }]);
  assert.equal(p.route.stage.verdict, 'behind');                 // 1 of 5 done, 70% of the stage gone
  assert.equal(p.route.deadlines[0].label, 'UK thing');
  const s = summarize(p);
  assert.equal(s.route.station, 'One');
  assert.match(s.route.today[0], /Portfolio task \(45 min, id a3\)/);
  assert.equal(todayPayload({ ...base(), route: null }, { date: '2026-09-21' }).route, null);
  assert.equal(routeFull(S, '2026-09-21').validation.ok, true);
});

test('upgrade: the old seeded route becomes the example; an imported plan survives a schema bump', () => {
  const seed = { route: { _example: true, phases: [{ id: 'p1', end: '2027-01-01', tasks: [] }] }, topics: [], subjects: [],
    timetable: { A: {}, B: {} }, settings: {}, profile: {}, calendar: {}, milestones: [], unis: [], igcse: [], generic: true };
  const old = { schema: 1, route: { thesis: 'x', reqs: [], boosters: [], phases: [] }, topics: [], subjects: [] };
  upgrade(old, seed, 99);
  assert.equal(old.route._example, true);
  const mine = { schema: 1, route: structuredClone(PLAN), routeDone: { a1: '2026-09-02' }, topics: [], subjects: [] };
  upgrade(mine, seed, 99);
  assert.equal(mine.route.name, 'Route to Somewhere');
  assert.deepEqual(mine.routeDone, { a1: '2026-09-02' });
});
