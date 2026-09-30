/* Assignment Arrow, the way you asked for it — for your own copies only.

   Loaded into your private copy of Assignment Arrow (arrow/build.mjs), next to
   arrow/bridge.js; the school's site never gets it. Assignment Arrow's own
   files stay as they are: this changes three things from outside.

   - Running a program is a terminal. Its output appears, and when it reaches
     INPUT it stops and asks you, in the terminal, then carries on. (The
     program is simply run again from the start with the answers typed so
     far, so a RANDOM value stays the same while you type.)
   - Marking is fair about words. The hidden test cases still decide, but a
     line of output passes when its values are right and its words are close:
     a spelling slip ("secounds"), other wording in a prompt or no prompt at
     all no longer costs the marks. Numbers and TRUE/FALSE must still match.
   - Lessons are something you do. Every example has Try it (edit it, run it),
     each lesson has "Your turn" exercises (arrow/lessons-plus.js) that are
     checked as you go, and the check at the end gets a box for your answer.
     What you did is saved here and reported to your dashboard by the bridge. */
(function (root) {
  'use strict';

  /* ------------------------------------------------ the pure part (tested) */
  const lev = (a, b) => {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  };
  // a prompt: "Enter a number of seconds: ", "How many?" — its wording is never marked
  const isPrompt = (line) => /[:?]$/.test(line.trim()) || /^(please\s+)?(enter|input|type|give)\b/i.test(line.trim());
  const VALUES = /^(true|false)$/i;
  const tokens = (line) => {
    const nums = [], words = [], values = [];
    for (const t of String(line).match(/-?\d+(?:\.\d+)?|[A-Za-z]+/g) || []) {
      if (/\d/.test(t)) nums.push(Number(t));
      else if (VALUES.test(t)) values.push(t.toUpperCase());
      else if (t.length > 1 || /^[aI]$/.test(t)) words.push(t.toLowerCase().replace(/(?<=\w{3})s$/, ''));
    }
    return { nums, words, values };
  };
  const closeWord = (a, b) => lev(a, b) <= (Math.max(a.length, b.length) <= 4 ? 1 : 2);
  /* Does the program's output match what the model answer printed? Exactly, or
     with the values right and the words close. { ok, loose } */
  function sameOutput(got, want) {
    if (got === want) return { ok: true, loose: false };
    if (got == null) return { ok: false, loose: false };
    const lines = (s) => String(s).split('\n').map((l) => l.trim()).filter((l) => l && !isPrompt(l));
    const g = lines(got), w = lines(want);
    if (g.length !== w.length) return { ok: false, loose: false };
    for (let i = 0; i < w.length; i++) {
      const a = tokens(g[i]), b = tokens(w[i]);
      if (a.nums.length !== b.nums.length || a.nums.some((x, k) => Math.abs(x - b.nums[k]) > 1e-9)) return { ok: false, loose: false };
      if (a.values.join() !== b.values.join()) return { ok: false, loose: false };
      if (b.words.length) {
        const hit = b.words.filter((x) => a.words.some((y) => closeWord(x, y))).length;
        // with its numbers right, a line's words are only labels ("3 pound 45 p"): half will do
        if (hit / b.words.length < (b.nums.length || b.values.length ? 0.5 : 0.75)) return { ok: false, loose: false };
      }
    }
    return { ok: true, loose: true };
  }

  // the same run every time for one terminal session: RANDOM repeats while you type
  function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const NEEDS_INPUT = /asked for input but there is none left/i;
  /* One step of a terminal: run with the answers typed so far. It finished,
     it is waiting for the next INPUT, or it stopped with an error. */
  function runInteractive(run, src, inputs, opts = {}) {
    const real = Math.random;
    if (opts.seed != null) Math.random = seeded(opts.seed);
    let r;
    try { r = run(src, { inputs: inputs.slice(), files: opts.files, offset: opts.offset || 0, level: opts.level }); }
    finally { Math.random = real; }
    if (r.ok) return { state: 'done', output: r.output, warnings: r.warnings || [] };
    if (NEEDS_INPUT.test(r.error?.msg || '')) return { state: 'input', output: r.output, warnings: r.warnings || [] };
    return { state: 'error', output: r.output, warnings: r.warnings || [], error: r.error };
  }
  /* The terminal's lines: the output, with each answer you typed where it was
     asked for — on the prompt's own line when there is one. */
  function transcript(output, inputs, asks) {
    const lines = [];
    const put = (i) => {
      const last = lines[lines.length - 1];
      if (last && !last.input && isPrompt(last.text) && last.text === output[asks[i] - 1] && !last.answered) { last.answer = inputs[i]; last.answered = true; }
      else lines.push({ text: '', answer: inputs[i], answered: true, input: true });
    };
    for (let k = 0; k <= output.length; k++) {
      for (let i = 0; i < inputs.length; i++) if (asks[i] === k) put(i);
      if (k < output.length) lines.push({ text: String(output[k]) });
    }
    return lines;
  }

  /* ---- exercises ---- */
  const norm = (s) => String(s ?? '').replace(/\u2190/g, '<-').replace(/\s+/g, ' ').trim().toLowerCase();
  // fill: each gap takes one of its answers ("<-" and "←" are the same)
  function checkFill(ex, typed) {
    const gaps = blanks(ex.code);
    const each = gaps.map((alts, i) => alts.some((a) => norm(a) === norm(typed[i])));
    return { ok: each.every(Boolean), each };
  }
  const blanks = (code) => [...String(code).matchAll(/\{\{([^}]*)\}\}/g)].map((m) => m[1].split('|'));
  const filled = (code, answers) => { let i = 0; return String(code).replace(/\{\{([^}]*)\}\}/g, (_, alts) => answers?.[i++] ?? alts.split('|')[0]); };
  // predict: what you wrote against what the code really prints
  function checkPredict(ex, typed, run) {
    const r = run(ex.code, { inputs: (ex.inputs || []).slice(), files: ex.files, level: ex.level || 'a2' });
    const want = r.ok ? r.output.join('\n') : null;
    const clean = (s) => String(s ?? '').split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean).join('\n').toLowerCase();
    return { ok: want != null && clean(typed) === clean(want), want };
  }
  // write: your code against the model answer on each set of inputs
  function checkWrite(ex, code, run) {
    const cases = (ex.tests || [{ inputs: [] }]).map((t) => {
      const setup = ex.setup ? ex.setup + '\n' : '';
      const offset = setup ? setup.split('\n').length - 1 : 0;
      const harness = ex.harness ? '\n' + ex.harness : '';
      const opts = () => ({ inputs: (t.inputs || []).slice(), files: t.files || ex.files, level: ex.level || 'a2' });
      const m = run(setup + ex.model + harness, opts());
      const y = run(setup + code + harness, { ...opts(), offset });
      const want = m.ok ? m.output.join('\n') : null, got = y.ok ? y.output.join('\n') : null;
      return { inputs: t.inputs || [], want, got, ran: y.ok, error: y.error, ...sameOutput(got, want) };
    });
    const src = String(code).replace(/\/\/[^\n]*/g, '').replace(/\u2190/g, '<-').toUpperCase();
    const reqs = (ex.require || []).map((r) => ({ t: r.t, ok: new RegExp(r.re).test(src) }));
    return { ok: cases.every((c) => c.ok) && reqs.every((r) => r.ok), cases, reqs };
  }
  const checkMcq = (ex, pick) => ({ ok: Number(pick) === ex.answer });

  /* A lesson's exercises, numbered as the dashboard shows them: its "Your
     turn" ones first, then the check it always ended with. */
  function lessonExercises(L, plus) {
    const list = (plus?.[L.id] || []).map((ex, i) => ({ ...ex, id: `${L.id}.${i + 1}` }));
    const check = (L.blocks || []).find((b) => b.t === 'check');
    if (check) list.push({ type: 'check', id: `${L.id}.${list.length + 1}`, q: check.q, check });
    return list;
  }
  /* How each of a lesson's examples can be tried: as it is; with OUTPUT in
     front of lines that are only expressions ("LENGTH(Word) // 8"); after the
     examples above it, which it builds on; or, for a fragment, completed by
     you first. A template ("IF <condition> THEN") gets nothing. */
  const KEYWORD = /^(DECLARE|CONSTANT|IF|ELSE|ENDIF|CASE|OTHERWISE|ENDCASE|FOR|NEXT|WHILE|ENDWHILE|REPEAT|UNTIL|PROCEDURE|ENDPROCEDURE|FUNCTION|ENDFUNCTION|RETURN|CALL|OUTPUT|INPUT|OPENFILE|READFILE|WRITEFILE|CLOSEFILE|TYPE|ENDTYPE|CLASS|ENDCLASS|PUBLIC|PRIVATE|SEEK|GETRECORD|PUTRECORD)\b/i;
  const withOutput = (src) => String(src).split('\n').map((l) => {
    const t = l.replace(/\/\/.*$/, '').trim();
    return !t || KEYWORD.test(t) || /<-|←|^[A-Za-z]\w*\s*:/.test(t) ? l : l.replace(t, 'OUTPUT ' + t);
  }).join('\n');
  function tryPlans(srcs, attempt) {
    const fine = (r) => r.state !== 'error';
    const before = [];
    return srcs.map((src) => {
      if (!src) return null;
      let plan = null;
      if (fine(attempt(src))) plan = { mode: 'run', src };
      else if (withOutput(src) !== src && fine(attempt(withOutput(src)))) plan = { mode: 'wrapped', src: withOutput(src) };
      else if (before.length && fine(attempt(before.join('\n') + '\n' + src))) plan = { mode: 'after', src, setup: before.join('\n') };
      else if (!/<[a-z][a-z ]*>/i.test(src)) plan = { mode: 'fragment', src };
      if (plan && plan.mode !== 'fragment' && plan.mode !== 'wrapped') before.push(src);
      return plan;
    });
  }
  const plainText = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();

  const core = { lev, isPrompt, sameOutput, runInteractive, transcript, checkFill, checkPredict, checkWrite, checkMcq, blanks, filled, lessonExercises, plainText,
    withOutput, tryPlans };
  root.ArrowLab = core;
  if (typeof document === 'undefined' || typeof root.PseudoRun !== 'function') return;

  /* ------------------------------------------------ in the page */
  const run = (src, opts) => root.PseudoRun(src, opts);
  // Assignment Arrow's own pieces, shared by its scripts (not all are on window)
  const level = () => { try { return STATE.level; } catch { return 'as'; } };        // eslint-disable-line no-undef
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const code = (src) => (typeof root.codeBlock === 'function' ? root.codeBlock(src) : `<pre>${escape(src)}</pre>`);
  const LS = {
    get() { try { return JSON.parse(localStorage.getItem('aaLab.v1')) || { ex: {} }; } catch { return { ex: {} }; } },
    set(v) { try { localStorage.setItem('aaLab.v1', JSON.stringify(v)); } catch { /* kept for this visit */ } },
  };
  let uid = 0;

  const css = document.createElement('style');
  css.textContent = `
.aa-term .console-body{max-height:380px}
.aa-term .aa-line{display:block;min-height:1.62em;white-space:pre-wrap}
.aa-term .aa-ans{color:var(--pen);font-weight:600}
.aa-term .aa-ask{display:inline-flex;align-items:baseline;gap:6px;min-width:12ch}
.aa-term .aa-ask::before{content:"\\203A";color:var(--pen);font-weight:700}
.aa-term input.aa-in{font:inherit;color:var(--pen);font-weight:600;background:transparent;border:0;border-bottom:1.5px solid var(--pen);outline:none;padding:0 2px;min-width:10ch;width:auto}
.aa-term .aa-tbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.aa-term .aa-state{font-family:var(--display);font-size:.74rem;color:var(--ink-3);letter-spacing:.02em}
.aa-lab{margin:10px 0 18px;padding:12px;border:1px dashed var(--rule);border-radius:6px;background:var(--surface)}
.aa-try-row{display:flex;justify-content:flex-end;margin:-6px 0 14px}
.aa-turn{margin-top:30px}
.aa-turn h3{font-family:var(--display);font-size:1.08rem;font-weight:700;margin:0 0 4px;letter-spacing:-.01em}
.aa-ex{border:1px solid var(--rule);border-radius:8px;padding:14px 14px 12px;margin:14px 0;background:var(--surface)}
.aa-ex.is-right{border-color:var(--ok);box-shadow:inset 3px 0 0 var(--ok)}
.aa-ex.is-wrong{box-shadow:inset 3px 0 0 var(--pen)}
.aa-ex .aa-q{font-family:var(--prose);font-size:1rem;margin:4px 0 10px;line-height:1.5}
.aa-ex .aa-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.aa-ex .aa-fb{font-family:var(--prose);font-size:.95rem;margin-top:8px}
.aa-ex .aa-fb.ok{color:var(--ok)} .aa-ex .aa-fb.bad{color:var(--pen)}
.aa-ex textarea.aa-guess{width:100%;box-sizing:border-box;min-height:5.2em;font-family:var(--mono);font-size:.85rem;line-height:1.55;padding:8px 10px;border:1px solid var(--rule);border-radius:5px;background:var(--code-bg);color:var(--ink)}
.aa-ex .aa-fill{font-family:var(--mono);font-size:.86rem;line-height:2.1;white-space:pre-wrap;background:var(--code-bg);border:1px solid var(--rule);border-radius:5px;padding:10px 12px;overflow-x:auto;color:var(--ink)}
.aa-ex .aa-fill input{font:inherit;width:9ch;border:0;border-bottom:1.5px solid var(--pen);background:var(--surface);color:var(--pen);font-weight:600;text-align:center;padding:0 3px;outline:none}
.aa-ex .aa-fill input.ok{border-color:var(--ok);color:var(--ok)} .aa-ex .aa-fill input.bad{background:var(--pen-soft)}
.aa-ex label.aa-opt{display:flex;gap:9px;align-items:flex-start;padding:7px 9px;border:1px solid var(--rule-soft);border-radius:6px;margin:6px 0;cursor:pointer;font-family:var(--prose)}
.aa-ex label.aa-opt.ok{border-color:var(--ok);background:var(--ok-soft)} .aa-ex label.aa-opt.bad{border-color:var(--pen);background:var(--pen-soft)}
.aa-progress{display:flex;align-items:center;gap:10px;margin:6px 0 0;font-family:var(--display);font-size:.8rem;color:var(--ink-2)}
.aa-progress .aa-bar{flex:1;height:6px;border-radius:3px;background:var(--rule-soft);overflow:hidden}
.aa-progress .aa-bar i{display:block;height:100%;background:var(--ok)}
.aa-cases{margin-top:8px;font-family:var(--mono);font-size:.8rem}
.aa-cases pre{margin:4px 0;padding:6px 8px;background:var(--code-bg);border-radius:4px;white-space:pre-wrap}
.mark-loose{margin-top:10px;font-family:var(--prose);font-size:.93rem;color:var(--ink-2);border-left:3px solid var(--ok);padding:4px 10px}`;
  document.head.appendChild(css);

  /* ---- the terminal ---- */
  function terminal(host, program /* () => {src, offset, files} */) {
    const box = document.createElement('div');
    box.className = 'aa-term';
    host.innerHTML = '';
    host.appendChild(box);
    let inputs = [], asks = [], seed = 0, last = null;
    const start = () => { inputs = []; asks = []; seed = (Math.random() * 2 ** 31) | 0; step(); };
    function step() {
      const p = program();
      if (!p.src.trim()) { box.innerHTML = '<div class="console"><div class="console-head bad"><span class="dot"></span>Nothing to run</div><pre class="console-body"><span class="muted">Write some pseudocode first.</span></pre></div>'; return; }
      last = runInteractive(run, p.src, inputs, { seed, files: p.files, offset: p.offset, level: level() });
      if (last.state === 'input') asks[inputs.length] = last.output.length;
      paint();
    }
    function paint() {
      const r = last, lines = transcript(r.output, inputs, asks);
      const waiting = r.state === 'input' && inputs.length < 200;
      const head = r.state === 'done' ? ['ok', 'Finished'] : r.state === 'input' ? ['', 'Waiting for your input']
        : r.state === 'stopped' ? ['', 'Stopped'] : ['bad', 'It stopped with an error'];
      let body = lines.map((l) => `<span class="aa-line">${escape(l.text)}${l.answered ? `<span class="aa-ans">${l.text ? (/\s$/.test(l.text) ? '' : ' ') : '\u203a '}${escape(l.answer)}</span>` : ''}</span>`);
      if (waiting) {
        const lastLine = lines[lines.length - 1];
        const ask = '<span class="aa-ask"><input class="aa-in" aria-label="Your input" autocomplete="off" spellcheck="false"></span>';
        if (lastLine && !lastLine.answered && !lastLine.input && isPrompt(lastLine.text)) body[body.length - 1] = body[body.length - 1].replace(/<\/span>$/, ' ' + ask + '</span>');
        else body.push(`<span class="aa-line">${ask}</span>`);
      }
      if (!lines.length && !waiting) body = ['<span class="muted">It ran, but nothing was output.</span>'];
      let h = `<div class="console"><div class="console-head ${head[0]}"><span class="dot"></span>Terminal \u00b7 ${head[1]}</div><pre class="console-body">${body.join('')}</pre>`;
      if (r.state === 'error') h += `<div class="run-problem"><span class="rp-line">${r.error.line ? 'Line ' + r.error.line : 'Problem'}</span><span class="rp-msg">${escape(r.error.msg)}</span>${r.error.hint ? `<span class="rp-hint">${escape(r.error.hint)}</span>` : ''}</div>`;
      if (r.warnings?.length) h += `<div class="run-note"><b>Worth fixing</b>${r.warnings.map(escape).join('<br>')}</div>`;
      h += `</div><div class="aa-tbar"><button type="button" class="btn btn-sm" data-t="again">Run again</button>${waiting ? '<button type="button" class="btn btn-sm" data-t="stop">Stop</button><span class="aa-state">Type your answer and press Enter</span>' : ''}</div>`;
      box.innerHTML = h;
      box.querySelector('[data-t="again"]').onclick = start;
      const stop = box.querySelector('[data-t="stop"]');
      if (stop) stop.onclick = () => { last = { ...last, state: 'stopped' }; paint(); };
      const inp = box.querySelector('input.aa-in');
      if (inp) {
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inputs.push(inp.value); step(); } });
        inp.focus({ preventScroll: true });
        const bodyEl = box.querySelector('.console-body');
        bodyEl.scrollTop = bodyEl.scrollHeight;
      }
    }
    start();
  }

  // An editor like Assignment Arrow's own, for lessons and exercises
  function editor(src, rows = 8) {
    const id = 'aalab' + (++uid);
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="editor-wrap"><div class="editor-bar"><span class="hint">Tab completes \u00b7 type &lt;- for the arrow</span></div>
      <div class="editor-stack"><pre class="editor-hl" aria-hidden="true" id="hl_${id}"><code></code></pre>
      <textarea class="editor" id="ta_${id}" spellcheck="false" autocapitalize="off" autocorrect="off" rows="${rows}"></textarea></div></div>`;
    const ta = wrap.querySelector('textarea');
    ta.value = String(src || '').replace(/<-/g, '\u2190');
    queueMicrotask(() => {
      if (typeof root.wireEditor === 'function') root.wireEditor(ta);
      if (typeof root.refreshEditor === 'function') root.refreshEditor(ta);
    });
    return { el: wrap.firstElementChild, ta };
  }
  // an editor with a Run button and a terminal under it
  function lab(host, src, { setup = '', harness = '', files, rows } = {}) {
    const box = document.createElement('div');
    box.className = 'aa-lab';
    const ed = editor(src, rows);
    const bar = document.createElement('div');
    bar.className = 'runbar';
    bar.innerHTML = '<button type="button" class="btn btn-primary btn-sm">Run it</button><span class="runinfo">It runs in the terminal below; it asks you when it needs INPUT.</span>';
    const out = document.createElement('div');
    box.append(ed.el, bar, out);
    host.appendChild(box);
    bar.querySelector('button').onclick = () => terminal(out, () => ({ src: (setup ? setup + '\n' : '') + ed.ta.value + (harness ? '\n' + harness : ''),
      offset: setup ? setup.split('\n').length : 0, files }));
    return { box, ta: ed.ta, out };
  }

  /* ---- practice: Run it is a terminal ---- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-run]');
    if (!b) return;
    const card = b.closest('.q-card[data-qid]');
    const qs = (() => { try { return allQuestions(); } catch { return []; } })();   // eslint-disable-line no-undef
    const q = card && qs.find((x) => x.id === card.dataset.qid);
    const idp = b.dataset.run, host = document.getElementById('con_' + idp), ta = document.getElementById('ta_' + idp);
    if (!q || !host || !ta || typeof root.buildProgram !== 'function') return;          // leave it to Assignment Arrow
    e.stopImmediatePropagation();
    e.preventDefault();
    terminal(host, () => { const p = root.buildProgram(q, ta.value); return { src: p.src, offset: p.offset, files: p.files }; });
  }, true);
  // the terminal asks for input itself, so the separate Input box goes
  const tidy = (node) => node.querySelectorAll?.('.q-card .inputs-wrap').forEach((d) => { d.hidden = true; });

  /* ---- marking that doesn't count spelling ---- */
  if (typeof root.autoMark === 'function') {
    root.autoMark = function (q, answer) {
      const spec = root.TESTS[q.id], base = q.run || {};
      const split = root.markSplit(q);
      const cases = spec.tests.map((t) => {
        const setup = t.setup ?? base.setup, harness = t.harness ?? base.harness;
        const src = (setup ? setup + '\n' : '') + answer + (harness ? '\n' + harness : '');
        const lines = String(t.inputs || '').replace(/\r/g, '').split('\n');
        while (lines.length && lines[lines.length - 1] === '') lines.pop();
        const r = run(src, { inputs: lines, files: t.files !== undefined ? t.files : base.files, level: level(), offset: setup ? setup.split('\n').length - 1 : 0 });
        const got = r.ok ? r.output.join('\n') : null;
        const same = r.ok ? sameOutput(got, t.out) : { ok: false, loose: false };
        return { ok: same.ok, loose: same.loose, ran: r.ok, error: r.error, inputs: t.inputs, want: t.out, got };
      });
      const passed = cases.filter((c) => c.ok).length;
      const bMarks = cases.length ? Math.round(split.behaviour * passed / cases.length) : 0;
      const src = root.stripComments(answer);
      const reqs = (spec.require || []).map((rq) => ({ t: rq.t, ok: new RegExp(rq.re).test(src) }));
      const met = reqs.filter((r) => r.ok).length;
      const sMarks = reqs.length ? Math.round(split.structure * met / reqs.length) : split.structure;
      const anyRan = cases.some((c) => c.ran);
      return { awarded: anyRan ? Math.min(q.marks, bMarks + sMarks) : 0, max: q.marks, cases, passed, reqs, split,
        bMarks: anyRan ? bMarks : 0, sMarks: anyRan ? sMarks : 0, anyRan, loose: cases.filter((c) => c.loose).length };
    };
    const report = root.markReportHtml;
    if (typeof report === 'function') root.markReportHtml = (res) => report(res).replace(/<\/div>$/, '')
      + (res.loose ? `<div class="mark-loose">\u2713 ${res.loose} case${res.loose === 1 ? '' : 's'} passed with different wording or spelling \u2014 the values were right, and words are not marked.</div>` : '') + '</div>';
  }

  /* ---- lessons ---- */
  const PLUS = () => root.LESSONS_PLUS || {};
  const currentLesson = () => { try { return activeLessons()[lessonPos()]; } catch { return null; } };   // eslint-disable-line no-undef
  function saveEx(L, id, ok, extra = {}) {
    const st = LS.get();
    const was = st.ex[id];
    st.ex[id] = { ok: Boolean(was?.ok || ok), tries: (was?.tries || 0) + 1, at: Date.now(), ...extra };
    LS.set(st);
    progress(L);
    root.dispatchEvent(new CustomEvent('arrowlab:exercise', { detail: { lesson: L.id, id, ok: Boolean(ok) } }));
  }
  function progress(L) {
    const el = document.querySelector('#lessonBody .aa-progress');
    if (!el) return;
    const list = lessonExercises(L, PLUS()), st = LS.get().ex;
    const done = list.filter((x) => st[x.id]).length, right = list.filter((x) => st[x.id]?.ok).length;
    el.innerHTML = `<span>Your turn: ${done} of ${list.length} done${done ? ` \u00b7 ${right} right` : ''}</span><span class="aa-bar"><i style="width:${list.length ? Math.round(done / list.length * 100) : 0}%"></i></span>`;
  }
  function mark(box, ok, text) {
    box.classList.toggle('is-right', ok);
    box.classList.toggle('is-wrong', !ok);
    const fb = box.querySelector('.aa-fb');
    fb.className = 'aa-fb ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = text;
  }

  function exerciseEl(L, ex) {
    const box = document.createElement('div');
    box.className = 'aa-ex';
    box.dataset.ex = ex.id;
    box.id = 'ex-' + ex.id.replace('.', '-');
    const prior = LS.get().ex[ex.id];
    const kind = { predict: 'Predict the output', fill: 'Fill the gaps', write: 'Write it', mcq: 'Quick check', check: 'Check' }[ex.type];
    box.innerHTML = `<div class="q-head"><span class="qnum">${escape(ex.id)}</span><span class="q-title">${escape(kind)}</span>${prior ? `<span class="tag ${prior.ok ? 'tag-done' : ''}">${prior.ok ? '\u2713 done' : 'tried'}</span>` : ''}</div>`
      + `<div class="aa-q">${ex.q || ''}</div>`;
    const row = document.createElement('div');
    row.className = 'aa-row';
    const fb = document.createElement('div');
    fb.className = 'aa-fb';
    const btn = (label, primary = true) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm' + (primary ? ' btn-primary' : ''); b.textContent = label; row.appendChild(b); return b; };

    if (ex.type === 'predict') {
      box.insertAdjacentHTML('beforeend', code(ex.code) + (ex.inputs?.length ? `<div class="runinfo" style="margin-top:6px">It reads: ${ex.inputs.map(escape).join(', ')}</div>` : ''));
      const ta = document.createElement('textarea');
      ta.className = 'aa-guess';
      ta.placeholder = 'What does it output? One line per OUTPUT.';
      ta.spellcheck = false;
      box.appendChild(ta);
      btn('Check').onclick = () => {
        const r = checkPredict(ex, ta.value, run);
        mark(box, r.ok, r.ok ? '\u2713 Right.' + (ex.why ? ' ' + ex.why : '') : `\u2717 Not quite. It prints:<pre>${escape(r.want ?? '(an error)')}</pre>${ex.why || ''}`);
        saveEx(L, ex.id, r.ok);
      };
    } else if (ex.type === 'fill') {
      const gaps = blanks(ex.code);
      let i = 0;
      const html = escape(ex.code).replace(/\{\{([^}]*)\}\}/g, () => `<input data-gap="${i++}" aria-label="gap ${i}" autocomplete="off" spellcheck="false">`);
      box.insertAdjacentHTML('beforeend', `<div class="aa-fill">${html}</div>`);
      box.querySelectorAll('.aa-fill input').forEach((inp, k) => { inp.style.width = Math.max(4, ...gaps[k].map((a) => a.length)) + 2 + 'ch'; inp.addEventListener('input', () => { inp.value = inp.value.replace(/<-/g, '\u2190'); }); });
      const out = document.createElement('div');
      btn('Check').onclick = () => {
        const typed = [...box.querySelectorAll('.aa-fill input')].map((x) => x.value);
        const r = checkFill(ex, typed);
        box.querySelectorAll('.aa-fill input').forEach((inp, k) => { inp.classList.toggle('ok', r.each[k]); inp.classList.toggle('bad', !r.each[k]); });
        mark(box, r.ok, r.ok ? '\u2713 All gaps right.' + (ex.why ? ' ' + ex.why : '') : `\u2717 ${r.each.filter((x) => !x).length} gap${r.each.filter((x) => !x).length === 1 ? '' : 's'} still wrong (marked in red).`);
        saveEx(L, ex.id, r.ok);
        if (r.ok && ex.run !== false) terminal(out, () => ({ src: filled(ex.code, typed), files: ex.files }));
      };
      box.append(row, fb, out);
      return box;
    } else if (ex.type === 'write') {
      const l = lab(box, ex.starter || '', { setup: ex.setup, harness: ex.harness, files: ex.files, rows: ex.rows || 7 });
      l.box.style.border = '0'; l.box.style.padding = '0'; l.box.style.margin = '6px 0 0';
      const cases = document.createElement('div');
      cases.className = 'aa-cases';
      btn('Check my answer').onclick = () => {
        const r = checkWrite(ex, l.ta.value, run);
        const bad = r.cases.find((c) => !c.ok);
        let h = r.cases.map((c, k) => `${c.ok ? '\u2713' : '\u2717'} case ${k + 1}${c.inputs.length ? ' \u00b7 input ' + c.inputs.map(escape).join(', ') : ''}${c.loose ? ' (wording differs \u2014 fine)' : ''}`).join('<br>');
        if (bad) h += bad.ran ? `<div>Expected<pre>${escape(bad.want)}</pre>Yours gave<pre>${escape(bad.got || '(nothing)')}</pre></div>` : `<pre>${escape(bad.error?.msg || 'It did not run')}</pre>`;
        for (const q of r.reqs) h += `<br>${q.ok ? '\u2713' : '\u2717'} ${escape(q.t)}`;
        cases.innerHTML = h;
        mark(box, r.ok, r.ok ? '\u2713 It works.' + (ex.why ? ' ' + ex.why : '') : '\u2717 Not yet \u2014 see which case failed.');
        saveEx(L, ex.id, r.ok);
      };
      const model = btn('Show a model answer', false);
      model.onclick = () => { model.replaceWith(Object.assign(document.createElement('div'), { innerHTML: code(ex.model) })); };
      box.append(row, fb, cases);
      return box;
    } else if (ex.type === 'mcq') {
      box.insertAdjacentHTML('beforeend', (ex.code ? code(ex.code) : '') + ex.options.map((o, k) =>
        `<label class="aa-opt"><input type="radio" name="mcq-${escape(ex.id)}" value="${k}"><span>${o}</span></label>`).join(''));
      btn('Check').onclick = () => {
        const pick = box.querySelector('input[type=radio]:checked');
        if (!pick) return mark(box, false, 'Pick one first.');
        const r = checkMcq(ex, pick.value);
        box.querySelectorAll('label.aa-opt').forEach((lab, k) => { lab.classList.toggle('ok', k === ex.answer); lab.classList.toggle('bad', k === Number(pick.value) && !r.ok); });
        mark(box, r.ok, (r.ok ? '\u2713 Right. ' : '\u2717 Not that one. ') + (ex.why || ''));
        saveEx(L, ex.id, r.ok);
      };
    } else if (ex.type === 'check') {
      const b = ex.check;
      box.querySelector('.q-title').textContent = 'Check \u00b7 ' + b.marks + ' mark' + (b.marks === 1 ? '' : 's');
      const l = lab(box, b.code || '', { setup: b.run?.setup || '', rows: 7 });
      l.box.style.border = '0'; l.box.style.padding = '0'; l.box.style.margin = '6px 0 0';
      const ans = document.createElement('details');
      ans.className = 'disclose';
      ans.innerHTML = `<summary>Show the answer</summary><div class="disclose-body"><div class="prose">${b.a}</div>${b.acode ? code(b.acode) : ''}</div>`;
      const self = document.createElement('div');
      self.className = 'aa-row';
      self.innerHTML = '<span class="runinfo">Compare it with yours, honestly:</span>';
      const yes = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn-primary btn-sm', textContent: 'I had it right' });
      const no = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn-sm', textContent: 'Not yet' });
      self.append(yes, no);
      self.hidden = true;
      ans.addEventListener('toggle', () => { if (ans.open) self.hidden = false; });
      yes.onclick = () => { mark(box, true, '\u2713 Logged as right.'); saveEx(L, ex.id, true); };
      no.onclick = () => { mark(box, false, 'Logged \u2014 have another go later.'); saveEx(L, ex.id, false); };
      box.append(ans, self, fb);
      return box;
    }
    box.append(row, fb);
    return box;
  }

  function enhanceLesson() {
    const L = currentLesson();
    const body = document.getElementById('lessonBody');
    if (!L || !body || body.querySelector('.aa-lesson')) return;
    const panels = body.querySelectorAll(':scope > .panel');
    const [top, main] = [panels[0], panels[1]];
    if (!main) return;
    // for the bridge: this lesson's timer and Complete go here
    const holder = document.createElement('div');
    holder.className = 'aa-lesson';
    holder.dataset.lesson = L.id;
    holder.innerHTML = '<div class="aa-progress"></div>';
    top.appendChild(holder);

    // every example you can try: edit it and run it (a fragment: complete it first)
    const srcs = (L.blocks || []).filter((b) => b.t === 'code' || (b.t === 'check' && b.code)).map((b) => (b.t === 'code' ? b.src : null));
    const plans = tryPlans(srcs, (src) => runInteractive(run, src, [], { level: level() }));
    [...main.querySelectorAll(':scope > .code')].forEach((el, k) => {
      const plan = plans[k];
      if (!plan) return;
      const row = document.createElement('div');
      row.className = 'aa-try-row';
      row.innerHTML = `<button type="button" class="btn btn-sm">${plan.mode === 'fragment' ? 'Complete it' : 'Try it'} \u25b8</button>`;
      el.after(row);
      row.querySelector('button').onclick = () => {
        const holder2 = document.createElement('div');
        row.replaceWith(holder2);
        const note = { wrapped: 'OUTPUT has been put in front of each line, so you can see what it gives.',
          after: 'It uses the code in the examples above, which runs first (you don\u2019t see it here).',
          fragment: 'This is only part of a program: declare what it uses and give it values, then run it.' }[plan.mode];
        if (note) holder2.insertAdjacentHTML('beforeend', `<p class="runinfo" style="margin:4px 0 0">${note}</p>`);
        const l = lab(holder2, plan.src, { setup: plan.setup, rows: Math.min(14, plan.src.split('\n').length + 2) });
        if (plan.mode !== 'fragment') l.box.querySelector('.runbar button').click();
      };
    });

    // Your turn, then the lesson's check with a box for your answer
    const list = lessonExercises(L, PLUS());
    const turn = document.createElement('div');
    turn.className = 'aa-turn';
    const own = list.filter((x) => x.type !== 'check');
    if (own.length) turn.innerHTML = `<hr class="divider"><h3>Your turn</h3><p class="runinfo" style="margin:0 0 4px">${own.length} exercise${own.length === 1 ? '' : 's'}, checked as you go. They count on your dashboard as this lesson's questions.</p>`;
    for (const ex of own) turn.appendChild(exerciseEl(L, ex));
    const checkEx = list.find((x) => x.type === 'check');
    const divider = main.querySelector(':scope > hr.divider');
    if (divider) {
      // Assignment Arrow's own check: replaced by the same question with a place to answer
      let n = divider;
      const old = [];
      while (n) { old.push(n); n = n.nextElementSibling; }
      old.forEach((x) => x.remove());
    }
    if (checkEx) { turn.insertAdjacentHTML('beforeend', '<hr class="divider">'); turn.appendChild(exerciseEl(L, checkEx)); }
    main.appendChild(turn);
    progress(L);
  }
  // an exercise asked for by a link (#L6.2): scrolled to once the lesson is drawn
  root.ArrowLabShow = (id) => { const el = document.querySelector(`[data-ex="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: 'center' }); };

  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.target.id === 'lessonBody') enhanceLesson();
      for (const n of m.addedNodes) if (n.nodeType === 1) tidy(n.matches?.('.q-card') ? n.parentNode : n);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  enhanceLesson();
  tidy(document);
})(typeof window !== 'undefined' ? window : globalThis);
