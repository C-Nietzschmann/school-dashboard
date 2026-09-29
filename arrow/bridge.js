/* Assignment Arrow → your A Level dashboard.

   Loaded only into your own private copy of Assignment Arrow (see
   arrow/build.mjs), never into the site the school uses. Each chapter of
   practice questions is a worksheet on the dashboard; a question you finish
   here moves that worksheet on, and the time you spent goes into the study
   period you are in — or a study session of its own — as that worksheet,
   one entry per chapter, growing as you do more of it.

   Assignment Arrow is left as it is: every mark it gives goes through its
   recordResult(qid, marks, max), and this wraps that function. */
(function (root) {
  'use strict';

  /* ------------------------------------------------ the pure part (tested) */
  // Assignment Arrow chapter → the dashboard's Computer Science topic (9618 syllabus names).
  const CHAPTER_TOPIC = {
    Arrays: 'Arrays', Algorithms: 'Algorithms', Files: 'Files',
    Iteration: 'Constructs', Selection: 'Constructs', Subroutines: 'Structured programming',
    Records: 'Data types and records', OOP: 'Programming paradigms',
    Tracing: 'Testing and maintenance', Debugging: 'Testing and maintenance',
  };
  const DEFAULT_TOPIC = 'Programming basics';
  const LEVEL_SEES = { igcse: ['igcse'], as: ['as'], a2: ['as', 'a2'] };
  const pad = (n) => String(n).padStart(2, '0');
  const toMins = (hm) => { const [h, m] = String(hm || '').split(':').map(Number); return h * 60 + m; };
  const hmOf = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const isoOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // one worksheet per chapter, whichever course: switching course updates its questions
  const sheetId = (topic) => `aa-${slug(topic)}`.slice(0, 40);
  const topicName = (chapter) => CHAPTER_TOPIC[chapter] || DEFAULT_TOPIC;

  // The chapters of the course you picked in Assignment Arrow, each with its questions.
  function chapters(questions, course) {
    const sees = LEVEL_SEES[course] || LEVEL_SEES.as;
    const out = new Map();
    for (const q of questions || []) {
      if (!q?.id || !q.topic || sees.indexOf(q.level || 'as') === -1) continue;
      const id = sheetId(q.topic);
      if (!out.has(id)) out.set(id, { id, topic: q.topic, title: `Assignment Arrow \u00b7 ${q.topic}`, questions: [] });
      out.get(id).questions.push({ q: q.id, text: String(q.title || q.id).slice(0, 200), maxMarks: Number(q.marks) || 1 });
    }
    return [...out.values()];
  }

  // Minutes each question took: from your first tap or keypress after the last
  // one you finished, up to its mark (1–60). Marks that land within 5 seconds
  // of each other — exam mode marking a whole paper — share that time.
  function minutesFor(items) {
    let group = [];
    const settle = () => {
      if (!group.length) return;
      const first = group[0];
      const total = Math.min(60, Math.max(1, Math.round((first.at - first.start) / 60e3)));
      const each = Math.max(1, Math.round(total / group.length));
      for (const it of group) it.minutes = each;
      group = [];
    };
    for (const it of items) {
      if (group.length && it.at - group[group.length - 1].at > 5000) settle();
      group.push(it);
    }
    settle();
    return items;
  }

  // Where the time goes: the study period on now (up to 10 minutes after it
  // ends), else the session this made earlier (reuseKey), else a new session
  // starting when you started.
  function pickPeriod(periods, nowHM, reuseKey, startHM) {
    const now = toMins(nowHM);
    const spans = (periods || []).map((p) => {
      const [s, e] = String(p.time || '').split(/[\u2013-]/);
      return { key: p.key, s: toMins(s), e: toMins(e), chosen: p.chosen || null };
    }).filter((x) => !Number.isNaN(x.s) && !Number.isNaN(x.e));
    const on = spans.find((x) => now >= x.s - 5 && now <= x.e + 10);
    if (on) return { key: on.key, chosen: on.chosen, own: false };
    let start;
    if (reuseKey) start = reuseKey.replace(/^x/, '');
    else { const m = Math.min(now, toMins(startHM || nowHM)), r = m - m % 5; start = pad(Math.floor(r / 60)) + ':' + pad(r % 60); }
    const key = 'x' + start;
    return { key, chosen: spans.find((x) => x.key === key)?.chosen || null, own: true, start,
      minutes: Math.max(15, Math.ceil((now - toMins(start) + 5) / 5) * 5) };
  }

  /* The dashboard changes for one day's finished questions, in one batch:
     the session (when it is ours), then per chapter either its first entry in
     this period — the period's task if it has none, ticked off if you planned
     this very worksheet into it, otherwise a further task — or, when it is
     already there, the same entry logged again with the new totals. Op ids
     come from the date, period and chapter, so a resend changes nothing. */
  function buildOps({ date, target, items, sheets, topics, logs, stamp }) {
    const ops = [];
    const next = { ...logs };
    if (target.own) ops.push({ id: `aa-${date}-${target.key}-slot-${stamp}`, type: 'study.slot.add', date,
      start: target.start, minutes: target.minutes, title: 'Pseudocode practice' });
    let chosen = target.chosen;
    const byChapter = new Map();
    for (const it of items) {
      const sh = sheets.find((s) => s.questions.some((q) => q.q === it.qid));
      if (!sh) continue;
      if (!byChapter.has(sh.id)) byChapter.set(sh.id, { sh, n: 0, minutes: 0, marks: 0, max: 0 });
      const g = byChapter.get(sh.id);
      g.n++; g.minutes += it.minutes || 1; g.marks += it.marks; g.max += it.max;
    }
    for (const { sh, ...add } of byChapter.values()) {
      const k = `${date}|${target.key}|${sh.id}`;
      const rec = next[k];
      const tot = rec ? { n: rec.n + add.n, minutes: rec.minutes + add.minutes, marks: rec.marks + add.marks, max: rec.max + add.max } : add;
      const topicId = topics[topicName(sh.topic)] || null;
      const option = { id: 'ws:' + sh.id, kind: 'worksheet', title: 'Worksheet: ' + sh.title, why: 'Assignment Arrow',
        subjectId: 'cs', topicId, worksheetId: sh.id, mins: tot.minutes };
      const base = `aa-${date}-${target.key}-${sh.id}`;
      let slot, seq;
      if (!rec) {
        seq = 0;
        if (!chosen) { ops.push({ id: base + '-c', type: 'study.choose', date, key: target.key, option }); slot = 'main'; chosen = option.title; }
        else if (chosen === option.title) slot = 'main';
        else { slot = sh.id; ops.push({ id: base + '-a', type: 'study.choose', date, key: target.key, add: true, item: slot, option }); }
      } else {
        ({ slot } = rec);
        seq = rec.seq + 1;
        ops.push({ id: `${base}-u${seq}`, type: 'study.undo', date, key: target.key, ...(slot === 'main' ? {} : { item: slot }) });
      }
      ops.push({ id: `${base}-d${seq}`, type: 'study.done', date, key: target.key, ...(slot === 'main' ? {} : { item: slot }),
        minutes: tot.minutes, confidence: tot.max ? Math.round(5 * tot.marks / tot.max) : undefined,
        note: `${tot.n} question${tot.n === 1 ? '' : 's'} \u00b7 ${tot.marks}/${tot.max} marks` });
      next[k] = { slot, seq, ...tot };
    }
    return { ops, logs: next };
  }

  // How many of each chapter's questions you have done in Assignment Arrow, ever.
  function doneCounts(sheets, doneIds) {
    const done = new Set(doneIds || []);
    return sheets.map((s) => ({ id: s.id, n: s.questions.filter((q) => done.has(q.q)).length }));
  }
  // Short, stable fingerprint of the chapters, to notice a changed question bank.
  function signature(course, sheets) {
    const txt = course + '|' + sheets.map((s) => s.id + ':' + s.questions.map((q) => q.q).join(',')).join(';');
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  const core = { CHAPTER_TOPIC, chapters, minutesFor, pickPeriod, buildOps, doneCounts, signature, sheetId, topicName, hmOf, isoOf };
  root.ArrowBridge = core;
  if (typeof document === 'undefined' || !root.localStorage) return;

  /* ------------------------------------------------ in the page */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('aaBridge.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('aaBridge.' + k, JSON.stringify(v)); } catch { /* storage blocked: kept for this visit only */ } },
  };
  const arrowState = () => { try { return JSON.parse(localStorage.getItem('assignmentArrow.v1')) || {}; } catch { return {}; } };
  const allQuestions = () => [].concat(root.QUESTIONS_ALEVEL || [], root.QUESTIONS_IGCSE || [], root.QUESTIONS_EXTRA || []);
  // null until you pick a course: its "Which course?" screen saves a provisional one while it is open
  const picked = () => (document.getElementById('levelGate')?.hidden === false ? null
    : LEVEL_SEES[arrowState().level] ? arrowState().level : null);
  const course = () => picked() || 'a2';
  const sheetsNow = () => chapters(allQuestions(), course());
  // this copy's own link, when the build was given it: the companion's "Open Assignment Arrow"
  const SELF = typeof root.ARROW_URL === 'string' && /^https:\/\//.test(root.ARROW_URL) ? root.ARROW_URL : null;

  let queue = LS.get('queue', []);
  let actStart = null, mcp = null, DASH = 'A Level Dashboard', flushing = false, timer = null;

  // the pill in the corner: what happened to your last question
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.setAttribute('aria-live', 'polite');
  pill.style.cssText = 'position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom, 0px));z-index:9999;max-width:min(80vw,360px);'
    + 'font:500 12px/1.3 system-ui,sans-serif;padding:6px 11px;border-radius:999px;cursor:pointer;'
    + 'background:var(--surface,#fff);color:var(--ink-2,#444);border:1px solid var(--ink-3,#999);box-shadow:0 1px 4px rgba(0,0,0,.12)';
  pill.hidden = true;
  pill.addEventListener('click', () => flush());
  (document.body || document.documentElement).appendChild(pill);
  const say = (text, bad = false) => {
    pill.textContent = text;
    pill.style.borderColor = bad ? 'var(--pen,#be3a2b)' : 'var(--ink-3,#999)';
    pill.hidden = false;
  };
  const showQueue = () => { if (queue.length) say(`${queue.length} question${queue.length === 1 ? '' : 's'} waiting for your dashboard \u2014 tap to send`); };

  // the time a question takes starts with your first tap or keypress after the last one
  const touch = () => { if (actStart == null) actStart = Date.now(); };
  document.addEventListener('keydown', touch, true);
  document.addEventListener('pointerdown', touch, true);
  // a course picked or switched: its chapters go onto the dashboard straight away
  document.addEventListener('click', (e) => { if (e.target.closest?.('[data-setlevel]')) setTimeout(flush, 1500); }, true);

  const orig = root.recordResult;
  if (typeof orig !== 'function') { say("Couldn't find Assignment Arrow's marking \u2014 nothing is logged.", true); return; }
  root.recordResult = function (qid, marks, max) {
    const out = orig.apply(this, arguments);
    try { noted(String(qid), Number(marks) || 0, Number(max) || 0); } catch { /* the practice itself never breaks */ }
    return out;
  };

  function noted(qid, marks, max) {
    if (!sheetsNow().some((s) => s.questions.some((q) => q.q === qid))) return;   // a generated question: no chapter
    const now = Date.now(), date = isoOf(now);
    const seen = LS.get('seen', {});
    if (seen.date !== date) { seen.date = date; seen.ids = []; }
    if (seen.ids.includes(qid)) return;                   // once a day per question
    seen.ids.push(qid);
    LS.set('seen', seen);
    queue.push({ date, time: hmOf(now), at: now, start: actStart ?? now, qid, marks, max });
    actStart = null;
    LS.set('queue', queue);
    showQueue();
    clearTimeout(timer);
    timer = setTimeout(flush, 6000);
  }

  async function dash(tool, input) {
    const r = await mcp.callTool(DASH, tool, input, { cache: false });
    const p = r?.payload;
    return p && typeof p === 'object' ? p : r?.structuredContent;
  }
  async function apply(ops, date, time) {
    const results = [];
    for (let i = 0; i < ops.length; i += 50) {
      const res = await dash('apply_changes', { ops: ops.slice(i, i + 50), date, time });
      results.push(...(res?.results || []));
    }
    return results;
  }
  // your dashboard's Computer Science topics by name, looked up once a week
  async function topicIds() {
    const c = LS.get('topics', null);
    if (c && Date.now() - c.at < 7 * 864e5) return c.map;
    const full = await dash('get_today', { detail: 'full' });
    const map = {};
    for (const t of full?.topics || []) if (t.subjectId === 'cs' && !map[t.name]) map[t.name] = t.id;
    LS.set('topics', { at: Date.now(), map });
    return map;
  }
  // every chapter as a worksheet on the dashboard, with how much of it you have done
  async function ensureSheets(sheets, topics) {
    if (!picked()) return;                               // wait until you have chosen your course
    const sig = signature(course() + (SELF || ''), sheets);
    const counts = doneCounts(sheets, Object.keys(arrowState().done || {}));
    const ops = [];
    if (LS.get('sheets', null) !== sig) {
      // chapters your course no longer has go (their marked work stays in your history)
      for (const id of LS.get('sheetIds', [])) if (!sheets.some((s) => s.id === id)) ops.push({ id: `aa-del-${id}-${sig}`, type: 'worksheet.delete', worksheetId: id });
      for (const s of sheets) {
        const tid = topics[topicName(s.topic)] || null;
        const questions = s.questions.map((q) => ({ ...q, topicId: tid }));
        ops.push({ id: `aa-sheet-${s.id}`, type: 'worksheet.add', questions,
          worksheet: { id: s.id, title: s.title, subjectId: 'cs', topicIds: tid ? [tid] : [], source: 'arrow', pages: 1, ...(SELF ? { fileUrl: SELF } : {}) } });
        ops.push({ id: `aa-sheetq-${s.id}-${sig}`, type: 'worksheet.update', worksheetId: s.id, questions, ...(SELF ? { patch: { fileUrl: SELF } } : {}) });
      }
    }
    const sent = LS.get('counts', {});
    for (const c of counts) if (c.n && sent[c.id] !== c.n) ops.push({ id: `aa-dc-${c.id}-${c.n}`, type: 'worksheet.update', worksheetId: c.id, patch: { doneCount: c.n } });
    if (!ops.length) return;
    const bad = (await apply(ops, isoOf(Date.now()), hmOf(Date.now()))).filter((r) => !r.ok);
    if (!bad.length) { LS.set('sheets', sig); LS.set('sheetIds', sheets.map((s) => s.id)); LS.set('counts', Object.fromEntries(counts.map((c) => [c.id, c.n]))); }
  }

  async function flush() {
    if (flushing || !mcp) return;
    flushing = true;
    try {
      const sheets = sheetsNow();
      const topics = await topicIds();
      await ensureSheets(sheets, topics);
      for (const date of [...new Set(queue.map((i) => i.date))]) {
        const items = minutesFor(queue.filter((i) => i.date === date));
        const last = items[items.length - 1];
        const today = await dash('get_today', { date, time: last.time });
        const s = LS.get('session', null);
        const reuse = s && s.date === date && s.own && items[0].at - s.lastAt < 45 * 60e3 ? s.key : null;
        const target = pickPeriod(today?.studyPeriods, last.time, reuse, hmOf(items[0].start));
        const { ops, logs } = buildOps({ date, target, items, sheets, topics, logs: LS.get('logs', {}), stamp: Date.now().toString(36) });
        const bad = (await apply(ops, date, last.time)).filter((r) => !r.ok);
        // keep a week of what was logged where
        const cutoff = isoOf(Date.now() - 7 * 864e5);
        LS.set('logs', Object.fromEntries(Object.entries(logs).filter(([k]) => k.slice(0, 10) >= cutoff)));
        LS.set('session', { date, key: target.key, own: target.own, lastAt: last.at });
        queue = queue.filter((i) => i.date !== date);
        LS.set('queue', queue);
        const mins = items.reduce((a, i) => a + (i.minutes || 0), 0);
        if (bad.length) say(`Logged, but the dashboard said: ${bad[0].error}`, true);
        else say(`\u2713 ${items.length} question${items.length === 1 ? '' : 's'} \u00b7 ${mins} min logged to your ${target.own ? 'study session' : 'study period'}`);
      }
      await ensureSheets(sheets, topics);                  // the worksheets' done counts, now including these
    } catch (e) {
      const code = e?.code || '';
      say(/not_connected|not_found|not_in_manifest|not_granted/.test(code)
        ? 'Connect the A Level Dashboard connector to log your practice.'
        : `Not logged yet \u2014 ${e?.message || 'the dashboard did not answer'}. Tap to try again.`, true);
      showQueue();
    } finally {
      flushing = false;
    }
  }

  (async () => {
    if (!root.claude?.use) return;                       // not inside Claude: nothing to log to
    mcp = await root.claude.use('mcp').catch(() => null);
    if (!mcp) { say('Connectors are off in this view \u2014 practice is not logged.', true); return; }
    try {
      const { servers = [] } = await mcp.listTools();
      const mine = servers.find((s) => String(s.server).toLowerCase().replace(/\s+/g, ' ').trim() === 'a level dashboard');
      if (mine) DASH = mine.server;
    } catch { /* the listing is advisory */ }
    showQueue();
    flush();
    setInterval(() => { if (queue.length) flush(); }, 60e3);
    document.addEventListener('visibilitychange', () => { if (document.hidden && queue.length) flush(); });
  })();
})(typeof window !== 'undefined' ? window : globalThis);
