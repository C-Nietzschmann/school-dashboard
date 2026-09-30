// Your own Assignment Arrow: the terminal, fair marking and the lesson exercises (arrow/lab.js, arrow/lessons-plus.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
ctx.window = ctx;
const load = (f) => vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx);
vm.createContext(ctx);
for (const f of ['../arrow/site/interpreter.js', '../arrow/site/lessons.js', '../arrow/site/tests.js', '../arrow/site/bank.js', '../arrow/lessons-plus.js', '../arrow/lab.js']) load(f);
// results come back as plain values: arrays made inside the vm context are not deepEqual to ours
const plain = (v) => JSON.parse(JSON.stringify(v));
const Lab = ctx.ArrowLab;
const run = (src, opts) => ctx.PseudoRun(src, opts);

test('marking: values must be right, words need only be close, prompts are not marked', () => {
  const want = 'Enter a number of seconds: \n1 hour(s) 2 minute(s) 5 second(s)';
  assert.deepEqual(plain(Lab.sameOutput(want, want)), { ok: true, loose: false });
  for (const got of [
    'Enter a number of seconds: \n1 hour(s) 2 minute(s) 5 secound(s)',       // a spelling slip
    'How many seconds?\n1 hours 2 minutes 5 seconds',                           // other wording, plurals
    '1 hour(s) 2 minute(s) 5 second(s)',                                        // no prompt at all
    'Seconds: \n1 Hour(s) 2 Minute(s) 5 Second(s)',                             // capitals
  ]) assert.equal(Lab.sameOutput(got, want).ok, true, got);
  for (const got of [
    'Enter a number of seconds: \n1 hour(s) 2 minute(s) 6 second(s)',       // a wrong value
    'Enter a number of seconds: \n1 hour(s) 2 minute(s)',                       // a value missing
    'Enter a number of seconds: \n1 hour(s) 2 minute(s) 5 second(s)\nextra',    // an extra line
    null,                                                                       // it did not run
  ]) assert.equal(Lab.sameOutput(got, want).ok, false, String(got));
  assert.equal(Lab.sameOutput('Found: FALSE', 'Found: TRUE').ok, false, 'TRUE and FALSE are values');
  assert.equal(Lab.sameOutput('Parcel refused - to heavy', 'Parcel refused - too heavy').ok, true);
  assert.equal(Lab.sameOutput('Invalid weight', 'Charge: 3.5').ok, false);
  assert.equal(Lab.sameOutput('Charge: 3.50', 'Charge: 3.5').ok, true, '3.50 and 3.5 are the same value');
  assert.equal(Lab.sameOutput('3 pound 45 pense', '3 pounds 45 pence').ok, true, 'a spelling slip');
  assert.equal(Lab.sameOutput('3 pound 45 p', '3 pounds 45 pence').ok, false, 'an abbreviation is not a spelling slip');
  assert.equal(Lab.sameOutput('Too heavy', 'Parcel refused - too heavy').ok, false, 'every word must be there');
  // meaning is never forgiven: different words that happen to be close, and NOT
  for (const [got, want] of [['Valid', 'Invalid'], ['Invalid', 'Valid'], ['5 is odd', '5 is even'], ['Record 5 found', 'Record 5 not found'],
    ['Record 5 not found', 'Record 5 found'], ['Pass', 'Fail'], ['Weekday', 'Weekend']]) assert.equal(Lab.sameOutput(got, want).ok, false, `${got} / ${want}`);
});

test("the school's own marking.js gives the same answers, and no two hidden cases of a question pass for each other", () => {
  const school = {};
  vm.runInNewContext(readFileSync(new URL('../arrow/site/marking.js', import.meta.url), 'utf8'), { window: school, globalThis: school });
  const pairs = [['Enter a number of seconds: \n1 hour(s) 2 minute(s) 5 secound(s)', 'Enter a number of seconds: \n1 hour(s) 2 minute(s) 5 second(s)'],
    ['Valid', 'Invalid'], ['5 is odd', '5 is even'], ['Record 5 found', 'Record 5 not found'], ['Charge: 3.50', 'Charge: 3.5'], ['3 pound 45 p', '3 pounds 45 pence']];
  for (const [got, want] of pairs) assert.equal(school.ArrowMarking.sameOutput(got, want).ok, Lab.sameOutput(got, want).ok, `${got} / ${want}`);
  for (const [id, spec] of Object.entries(ctx.TESTS)) {
    const base = [...(ctx.QUESTIONS_ALEVEL || []), ...(ctx.QUESTIONS_IGCSE || []), ...(ctx.QUESTIONS_EXTRA || [])].find((q) => q.id === id)?.run || {};
    const setup = (t) => JSON.stringify([t.setup ?? base.setup ?? '', t.harness ?? base.harness ?? '']);
    spec.tests.forEach((a, i) => spec.tests.forEach((b, j) => {
      if (j > i && a.out !== b.out && setup(a) === setup(b)) assert.equal(Lab.sameOutput(a.out, b.out).ok || Lab.sameOutput(b.out, a.out).ok, false, `${id} cases ${i + 1} and ${j + 1}`);
    }));
  }
});

test("lesson examples: run as they are, with OUTPUT added, after the ones above, or completed by you", () => {
  const attempt = (src) => Lab.runInteractive(run, src, [], { level: 'a2' });
  const plans = plain(Lab.tryPlans([
    'DECLARE X : INTEGER\nX <- 2\nOUTPUT X',                  // runs
    'LENGTH("Computer")    // 8\nLEFT("Computer", 4)',       // expressions: OUTPUT in front
    'OUTPUT X * 10',                                          // builds on the first
    'Count <- Count + 1',                                     // a fragment
    'IF <condition> THEN\n    OUTPUT "x"\nENDIF',            // a template
    null,                                                     // the check's own code
  ], attempt));
  assert.deepEqual(plans.map((p) => p && p.mode), ['run', 'wrapped', 'after', 'fragment', null, null]);
  assert.equal(plans[1].src, 'OUTPUT LENGTH("Computer")    // 8\nOUTPUT LEFT("Computer", 4)');
  assert.equal(plans[2].setup, 'DECLARE X : INTEGER\nX <- 2\nOUTPUT X');
  // across the real lessons, most examples can now be tried
  let tried = 0, all = 0;
  for (const L of ctx.LESSONS_ALEVEL) {
    const srcs = L.blocks.filter((b) => b.t === 'code').map((b) => b.src);
    all += srcs.length;
    tried += Lab.tryPlans(srcs, attempt).filter((p) => p && p.mode !== 'fragment').length;
  }
  assert.ok(tried / all > 0.7, `${tried} of ${all} examples run`);
});

test("marking: Assignment Arrow's own test cases pass with a misspelt answer", () => {
  const spec = ctx.TESTS.Q02;
  const answer = 'DECLARE S : INTEGER\nOUTPUT "How many secounds?"\nINPUT S\nOUTPUT DIV(S, 3600), " hour(s) ", DIV(MOD(S, 3600), 60), " minuts ", MOD(S, 60), " secounds"';
  for (const t of spec.tests) {
    const r = run(answer, { inputs: t.inputs.split('\n'), level: 'as' });
    assert.equal(r.ok, true);
    assert.equal(r.output.join('\n') === t.out, false, 'not the same text');
    assert.equal(Lab.sameOutput(r.output.join('\n'), t.out).ok, true, t.inputs);
  }
});

test('the terminal: waits for each INPUT, then carries on; answers sit on their prompt line', () => {
  const src = 'DECLARE A : INTEGER\nDECLARE B : INTEGER\nOUTPUT "First: "\nINPUT A\nOUTPUT "Second: "\nINPUT B\nOUTPUT "Sum ", A + B';
  let r = Lab.runInteractive(run, src, [], { level: 'as' });
  assert.deepEqual(plain([r.state, r.output]), ['input', ['First: ']]);
  r = Lab.runInteractive(run, src, ['4'], { level: 'as' });
  assert.deepEqual(plain([r.state, r.output]), ['input', ['First: ', 'Second: ']]);
  r = Lab.runInteractive(run, src, ['4', '5'], { level: 'as' });
  assert.deepEqual(plain([r.state, r.output]), ['done', ['First: ', 'Second: ', 'Sum 9']]);
  assert.deepEqual(plain(Lab.transcript(r.output, ['4', '5'], [1, 2]).map((l) => [l.text, l.answer ?? null])),
    [['First: ', '4'], ['Second: ', '5'], ['Sum 9', null]]);
  // no prompt before an INPUT: the answer gets its own line
  const t = plain(Lab.transcript(['Hello'], ['7'], [0]));
  assert.deepEqual(t.map((l) => [l.text, l.answer ?? null]), [['', '7'], ['Hello', null]]);
  // a mistake stops it with the line
  r = Lab.runInteractive(run, 'DECLARE X : INTEGER\nX <- "a"', [], { level: 'as' });
  assert.equal(r.state, 'error');
  // RANDOM stays the same while you type (the program is run again each time)
  const rnd = 'DECLARE N : INTEGER\nOUTPUT INT(RAND(1000))\nINPUT N\nOUTPUT INT(RAND(1000))';
  const a = Lab.runInteractive(run, rnd, [], { seed: 42, level: 'as' }), b = Lab.runInteractive(run, rnd, ['1'], { seed: 42, level: 'as' });
  assert.equal(a.output[0], b.output[0]);
});

test('exercises: fill, predict, write and quick checks', () => {
  const fill = { code: 'X {{<-|=}} 1\n{{OUTPUT}} X' };
  assert.deepEqual(plain(Lab.checkFill(fill, ['←', 'output'])), { ok: true, each: [true, true] });
  assert.deepEqual(plain(Lab.checkFill(fill, ['<', 'OUTPUT'])), { ok: false, each: [false, true] });
  assert.equal(Lab.filled(fill.code, ['<-', 'OUTPUT']), 'X <- 1\nOUTPUT X');
  const pr = { code: 'OUTPUT 1 + 1\nOUTPUT "Hi"' };
  assert.equal(Lab.checkPredict(pr, ' 2 \n hi', run).ok, true);
  assert.equal(Lab.checkPredict(pr, '11\nHi', run).ok, false);
  const w = { model: 'DECLARE N : INTEGER\nINPUT N\nOUTPUT "Double: ", N * 2', tests: [{ inputs: ['3'] }, { inputs: ['10'] }], require: [{ re: 'INPUT', t: 'INPUT' }] };
  assert.equal(Lab.checkWrite(w, 'DECLARE N : INTEGER\nOUTPUT "Number? "\nINPUT N\nOUTPUT "Dubble: ", N + N', run).ok, true);
  const wrong = Lab.checkWrite(w, 'DECLARE N : INTEGER\nINPUT N\nOUTPUT N * 3', run);
  assert.deepEqual(plain(wrong.cases.map((c) => c.ok)), [false, false]);
  assert.equal(Lab.checkMcq({ answer: 2 }, '2').ok, true);
});

test('every lesson exercise works: predictions run, gaps fill in to working code, model answers pass', () => {
  const plus = ctx.LESSONS_PLUS;
  const lessons = ctx.LESSONS_ALEVEL;
  assert.deepEqual(plain(Object.keys(plus)), plain(lessons.map((l) => l.id)), 'one set per A Level lesson');
  let n = 0;
  for (const L of lessons) {
    const list = Lab.lessonExercises(L, plus);
    assert.ok(list.length >= 4, `${L.id} has its exercises and its check`);
    assert.equal(list[list.length - 1].type, 'check');
    assert.deepEqual(plain(list.map((x) => x.id)), plain(list.map((_, i) => `${L.id}.${i + 1}`)));
    for (const ex of list) {
      n++;
      const where = `${ex.id} (${ex.type})`;
      if (ex.type === 'predict') {
        const r = run(ex.code, { inputs: (ex.inputs || []).slice(), files: ex.files, level: 'a2' });
        assert.ok(r.ok && r.output.length, `${where}: ${r.error?.msg}`);
        assert.equal(Lab.checkPredict(ex, r.output.join('\n'), run).ok, true, where);
      } else if (ex.type === 'fill') {
        const answers = Lab.blanks(ex.code).map((alts) => alts[0]);
        assert.ok(answers.length >= 2, `${where}: has gaps`);
        assert.equal(Lab.checkFill(ex, answers).ok, true, where);
        if (ex.run !== false) {
          const src = Lab.filled(ex.code, answers);
          const r = Lab.runInteractive(run, src, ['0', '5'], { files: ex.files, level: 'a2' });
          assert.ok(r.state === 'done' && r.output.length, `${where}: ${r.error?.msg}`);
        }
      } else if (ex.type === 'write') {
        const r = Lab.checkWrite(ex, ex.model, run);
        assert.ok(r.cases.every((c) => c.want && c.ok), `${where}: model runs and passes`);
        assert.ok(r.reqs.every((x) => x.ok), `${where}: model meets its own requirements`);
        if (ex.starter) assert.equal(Lab.checkWrite(ex, ex.starter, run).ok, false, `${where}: the starter alone is not an answer`);
      } else if (ex.type === 'mcq') {
        assert.ok(ex.answer >= 0 && ex.answer < ex.options.length, where);
        if (ex.code) assert.ok(run(ex.code, { level: 'a2' }).ok, where);
      }
      if (ex.type !== 'check') for (const k of ['q', 'why', 'code', 'model']) if (ex[k]) assert.ok(/^[\x00-\x7f]*$/.test(ex[k]), `${where}: ${k} is ASCII`);
    }
  }
  assert.ok(n >= 55, `${n} exercises`);
});
