/* Assignment Arrow → your A Level dashboard.

   Loaded only into your own private copy of Assignment Arrow (see
   arrow/build.mjs), never into the site the school uses. Each chapter of
   practice questions is a worksheet on the dashboard. Each question gets a
   timer that starts when you open it, which you can pause, and a Complete
   button: the question and its time go into the study period you are in —
   or a study session of its own — as that chapter's worksheet, one entry
   per chapter naming its questions, growing as you do more of it.

   Assignment Arrow is left as it is: every mark it gives goes through its
   recordResult(qid, marks, max), which this wraps, and the timer is added
   to its question cards from outside.

   It runs in two places: inside Claude as an artifact, where it reaches the
   dashboard through the A Level Dashboard connector, and on the dashboard's
   own site at /arrow/ (an app for your Dock or Home Screen), where it uses
   the site's API with your dashboard login. */
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

  // Minutes for questions that had no timer of their own: exam mode marks a
  // whole paper at once (within 5 seconds), and those marks share the time
  // from when the paper started (1–60). Timed questions keep their minutes.
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
      if (it.minutes != null) { settle(); continue; }
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
    // the connector's summary says time: "08:55–10:50", chosen: title; the site's payload start, end, chosen: {title}
    const spans = (periods || []).map((p) => {
      const [s, e] = p.time ? String(p.time).split(/[\u2013-]/) : [p.start, p.end];
      return { key: p.key, s: toMins(s), e: toMins(e), chosen: (typeof p.chosen === 'string' ? p.chosen : p.chosen?.title) || null };
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

  /* A question's own timer. It runs while the question is open and the app is
     in front, and stops while you pause it; `acc` is the time up to the last
     stop, `on` when it last started. Times in ms. */
  const timerMs = (t, now) => (t?.acc || 0) + (t?.on != null ? Math.max(0, now - t.on) : 0);
  const timerStop = (t, now) => (t.on == null ? t : { ...t, acc: timerMs(t, now), on: null, lastAt: now });
  const timerRun = (t, now) => (t.on != null ? t : { ...t, on: now, lastAt: now });
  const timerMinutes = (ms) => Math.max(1, Math.round(ms / 60e3));
  const clock = (ms) => {
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
    return (h ? h + ':' + pad(Math.floor(s / 60) % 60) : pad(Math.floor(s / 60))) + ':' + pad(s % 60);
  };
  // What Complete sends: the timer's minutes, and the marks unless they went
  // already. A question done again the same day adds its time, not a question.
  function completeItem(t, at, diff, { again = false, withMarks = true } = {}) {
    const ms = timerMs(t, at);
    return { date: isoOf(at), time: hmOf(at), at, start: at - ms, qid: t.qid, minutes: timerMinutes(ms), diff,
      ...(again ? { repeat: true } : {}), ...(withMarks && t.max > 0 ? { marks: t.marks, max: t.max } : {}) };
  }

  // The questions of one entry, as they are called in Assignment Arrow.
  const namesOf = (ids) => ids.slice(0, 5).join(', ') + (ids.length > 5 ? ` +${ids.length - 5}` : '');

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
      if (!byChapter.has(sh.id)) byChapter.set(sh.id, { sh, n: 0, minutes: 0, marks: 0, max: 0, dm: 0, ids: [] });
      const g = byChapter.get(sh.id);
      if (!it.repeat) g.n++;                             // done again: its time counts, not another question
      if (!g.ids.includes(it.qid)) g.ids.push(it.qid);
      g.minutes += Number(it.minutes) || 0;
      if (it.max > 0) {
        g.marks += it.marks; g.max += it.max;
        g.dm += (it.diff || 3) * it.max;                 // how hard, weighted by marks
      }
    }
    for (const { sh, ...add } of byChapter.values()) {
      const k = `${date}|${target.key}|${sh.id}`;
      const rec = next[k];
      const tot = rec ? { n: rec.n + add.n, minutes: rec.minutes + add.minutes, marks: rec.marks + add.marks, max: rec.max + add.max,
        dm: (rec.dm ?? 3 * rec.max) + add.dm,
        // logged before entries named their questions: those only have a count
        ids: rec.ids ? [...rec.ids, ...add.ids.filter((q) => !rec.ids.includes(q))] : null } : add;
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
      const what = tot.ids ? namesOf(tot.ids) : `${tot.n} question${tot.n === 1 ? '' : 's'}`;
      ops.push({ id: `${base}-d${seq}`, type: 'study.done', date, key: target.key, ...(slot === 'main' ? {} : { item: slot }),
        minutes: Math.max(1, tot.minutes), confidence: tot.max ? Math.round(5 * tot.marks / tot.max) : undefined,
        // the marks and how hard the questions were: they count towards the topic's level on the dashboard
        ...(tot.max ? { evidence: { marks: tot.marks, max: tot.max, difficulty: +(tot.dm / tot.max).toFixed(1) } } : {}),
        note: what + (tot.max ? ` · ${tot.marks}/${tot.max} marks` : '') });
      next[k] = { slot, seq, ...tot };
    }
    return { ops, logs: next };
  }

  // How many of each chapter's questions you have done in Assignment Arrow, ever.
  function doneCounts(sheets, doneIds) {
    const done = new Set(doneIds || []);
    return sheets.map((s) => ({ id: s.id, n: s.questions.filter((q) => done.has(q.q)).length }));
  }
  // Which of each chapter's questions you have done, with your best marks:
  // marked in Assignment Arrow, or completed here without a mark.
  function doneByChapter(sheets, arrowDone, completed) {
    return sheets.map((s) => {
      const done = {};
      for (const { q } of s.questions) {
        const d = arrowDone?.[q];
        if (d && Number(d.max) > 0) done[q] = { marks: Number(d.marks) || 0, max: Number(d.max) };
        else if (completed?.[q]) done[q] = {};
      }
      return { id: s.id, done };
    });
  }
  // A link into Assignment Arrow: #Q10 opens that question, #arrays that chapter.
  function hashTarget(hash, questions) {
    const h = String(hash || '').replace(/^#/, '').trim().toLowerCase();
    if (!h) return null;
    const q = (questions || []).find((x) => String(x.id).toLowerCase() === h);
    if (q) return { qid: q.id, topic: q.topic };
    const t = (questions || []).find((x) => x.topic && (slug(x.topic) === h || sheetId(x.topic) === h));
    return t ? { topic: t.topic } : null;
  }
  // Short, stable fingerprints: of the chapters, to notice a changed question bank.
  const hashOf = (txt) => {
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
    return h.toString(36);
  };
  const signature = (course, sheets) => hashOf(course + '|' + sheets.map((s) => s.id + ':' + s.questions.map((q) => q.q).join(',')).join(';'));

  const core = { CHAPTER_TOPIC, chapters, minutesFor, pickPeriod, buildOps, doneCounts, doneByChapter, hashTarget, signature, sheetId, topicName,
    hmOf, isoOf, timerMs, timerStop, timerRun, timerMinutes, completeItem, clock };
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
  const inChapter = (qid) => sheetsNow().some((s) => s.questions.some((q) => q.q === qid));
  const diffOf = (qid) => Number(allQuestions().find((q) => q.id === qid)?.diff) || 3;   // Assignment Arrow's own 1–5
  // this copy's own link, when the build was given it: the companion's "Open Assignment Arrow"
  // On the dashboard's site this copy talks to its API, and its own address is its link.
  const SITE = !root.claude?.use && /^\/arrow(\/|$)/.test(location.pathname);
  const SELF = SITE ? location.origin + '/arrow/'
    : typeof root.ARROW_URL === 'string' && /^https:\/\//.test(root.ARROW_URL) ? root.ARROW_URL : null;

  let queue = LS.get('queue', []);
  let mcp = null, DASH = 'A Level Dashboard', flushing = false, timer = null, live = false;
  // qid → { qid, date, acc, on, paused, lastAt, marks, max, markedAt, logged, loggedMin, sentMarks }
  const timers = LS.get('timers', {});
  let current = null;                                    // the question open now
  const saveTimers = () => LS.set('timers', timers);

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
  const showQueue = () => { if (queue.length) say(`${queue.length} question${queue.length === 1 ? '' : 's'} waiting for your dashboard — tap to send`); };
  const enqueue = (item, wait = 800) => {
    queue.push(item);
    LS.set('queue', queue);
    showQueue();
    clearTimeout(timer);
    timer = setTimeout(flush, wait);
  };

  /* ---- the timer bar on each question ---- */
  const css = document.createElement('style');
  css.textContent = '.aa-timer{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:12px 0 4px;padding:8px 10px;'
    + 'border:1px solid var(--rule,#ccd5df);border-radius:8px;background:var(--surface-2,#f1f4f7);color:var(--ink-2,#4e5a69);'
    + 'font:500 .8rem/1.3 var(--display,system-ui,sans-serif)}'
    + '.aa-timer .aa-clock b{font:600 1rem/1 var(--mono,ui-monospace,monospace);color:var(--ink,#141c27);font-variant-numeric:tabular-nums;margin-left:3px}'
    + '.aa-timer .aa-note{flex:1 1 180px}'
    + '.aa-timer.is-paused .aa-clock b{color:var(--ink-3,#7a8695)}'
    + '.aa-timer.is-logged{border-color:var(--ok,#256b4e);background:var(--ok-soft,#dcede4)}'
    + '.aa-timer.is-logged .aa-note{color:var(--ok,#256b4e);font-weight:600}';
  document.head.appendChild(css);

  function bar(qid) {
    const el = document.createElement('div');
    el.className = 'aa-timer';
    el.dataset.qid = qid;
    el.innerHTML = '<span class="aa-clock" title="Time on this question">⏱<b>00:00</b></span>'
      + '<button type="button" class="btn btn-sm" data-aa="pause">Pause</button>'
      + '<button type="button" class="btn btn-primary btn-sm" data-aa="complete">Complete</button>'
      + '<button type="button" class="btn btn-sm" data-aa="again" hidden>Time it again</button>'
      + '<span class="aa-note"></span>';
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-aa]'); if (b) act(qid, b.dataset.aa); });
    return el;
  }
  function paint() {
    const now = Date.now();
    for (const el of document.querySelectorAll('.aa-timer')) {
      const t = timers[el.dataset.qid];
      if (!t) continue;
      el.classList.toggle('is-logged', Boolean(t.logged));
      el.classList.toggle('is-paused', !t.logged && t.on == null);
      el.querySelector('b').textContent = clock(t.logged ? (t.loggedMin || 0) * 60e3 : timerMs(t, now));
      const [pause, done, again] = ['pause', 'complete', 'again'].map((a) => el.querySelector(`[data-aa="${a}"]`));
      pause.hidden = done.hidden = Boolean(t.logged);
      again.hidden = !t.logged;
      pause.textContent = t.paused ? 'Resume' : 'Pause';
      el.querySelector('.aa-note').textContent = t.logged ? `✓ Logged · ${t.loggedMin} min today`
        : t.paused ? 'Paused'
        : t.markedAt ? `Marked ${t.marks}/${t.max} — press Complete when you are done`
        : 'Press Complete when you are done: it goes into your study log';
    }
  }

  // a question opened (its editor on screen): its timer starts, the one before stops
  function timerFor(qid, now) {
    let t = timers[qid];
    const today = isoOf(now);
    if (!t || (t.date !== today && !(t.markedAt && !t.logged))) {
      t = timers[qid] = { qid, date: today, acc: 0, on: null, paused: false, lastAt: now };
    }
    return t;
  }
  function newRound(qid, now) {
    const t = timers[qid];
    timers[qid] = { qid, date: isoOf(now), acc: 0, on: null, paused: false, lastAt: now,
      ...(t && t.date === isoOf(now) ? { marks: t.marks, max: t.max, loggedMin: t.loggedMin, sentMarks: t.sentMarks } : {}) };
  }
  function focus(qid) {
    const now = Date.now();
    if (current && current !== qid && timers[current]) timers[current] = timerStop(timers[current], now);
    // marked but never completed: moving on completes it
    for (const t of Object.values(timers)) if (t.qid !== qid && t.markedAt && !t.logged) complete(t.qid, t.on != null ? now : t.lastAt, true);
    current = qid;
    if (!qid) return saveTimers();
    let t = timerFor(qid, now);
    if (t.logged) { newRound(qid, now); t = timers[qid]; }
    if (!t.paused && !document.hidden) timers[qid] = timerRun(t, now);
    saveTimers();
  }
  function opened(card) {
    const qid = card.dataset.qid;
    if (!qid || card.closest('#view-exam') || !inChapter(qid)) {
      if (current && qid !== current) focus(null);      // an exam, or a generated question: the timer stops
      return;
    }
    if (!card.querySelector('.aa-timer')) card.querySelector('.q-head')?.insertAdjacentElement('afterend', bar(qid));
    if (current !== qid) focus(qid);
    paint();
  }
  function act(qid, what) {
    const now = Date.now();
    const t = timers[qid];
    if (what === 'again') { newRound(qid, now); focus(qid); }
    else if (!t) return;
    else if (what === 'pause') timers[qid] = t.paused ? { ...timerRun(t, now), paused: false } : { ...timerStop(t, now), paused: true };
    else if (what === 'complete') complete(qid, now);
    saveTimers();
    paint();
  }

  // Complete: the timer stops and the question goes to your dashboard
  function complete(qid, at = Date.now(), auto = false) {
    let t = timers[qid];
    if (!t || t.logged) return;
    t = timerStop(t, at);
    const date = isoOf(at);
    const seen = LS.get('seen', {});
    if (seen.date !== date) { seen.date = date; seen.ids = []; }
    const again = seen.ids.includes(qid);
    if (!again) { seen.ids.push(qid); LS.set('seen', seen); }
    const withMarks = t.max > 0 && !t.sentMarks;
    const item = completeItem(t, at, diffOf(qid), { again, withMarks });
    timers[qid] = { ...t, logged: true, markedAt: null, loggedMin: (t.loggedMin || 0) + item.minutes, sentMarks: t.sentMarks || withMarks };
    const completed = LS.get('completed', {});
    completed[qid] = date;
    LS.set('completed', completed);
    saveTimers();
    enqueue(item, auto ? 6000 : 800);
  }
  // a question marked and then left alone for half an hour counts as completed
  function sweep(now = Date.now()) {
    for (const t of Object.values(timers)) {
      if (t.markedAt && !t.logged && (t.qid !== current || t.on == null) && now - (t.lastAt || 0) > 30 * 60e3) complete(t.qid, t.lastAt, true);
      if (now - (t.lastAt || 0) > 7 * 864e5) delete timers[t.qid];
    }
    saveTimers();
  }

  // every mark Assignment Arrow gives comes through here
  const orig = root.recordResult;
  if (typeof orig !== 'function') { say("Couldn't find Assignment Arrow's marking — nothing is logged.", true); return; }
  root.recordResult = function (qid, marks, max) {
    const out = orig.apply(this, arguments);
    try { marked(String(qid), Number(marks) || 0, Number(max) || 0); } catch { /* the practice itself never breaks */ }
    return out;
  };
  const examOn = () => Boolean(document.getElementById('view-exam')?.classList.contains('is-active'));
  function marked(qid, marks, max) {
    if (!inChapter(qid)) return;                         // a generated question: no chapter
    const now = Date.now();
    if (examOn()) {
      // exam mode marks the whole paper at once, logged straight away; the paper's time runs from Start
      const seen = LS.get('seen', {});
      if (seen.date !== isoOf(now)) { seen.date = isoOf(now); seen.ids = []; }
      if (seen.ids.includes(qid)) return;                // once a day per question
      seen.ids.push(qid);
      LS.set('seen', seen);
      const began = LS.get('examStart', null);
      enqueue({ date: isoOf(now), time: hmOf(now), at: now, start: began && now - began < 4 * 3600e3 ? began : now, qid, marks, max, diff: diffOf(qid) }, 6000);
      return;
    }
    const t = timerFor(qid, now);
    if (!(t.max > 0) || marks >= t.marks) Object.assign(t, { marks, max });   // your best, as Assignment Arrow keeps it
    t.lastAt = now;
    if (!t.logged) t.markedAt = now;
    else if (!t.sentMarks) {                             // completed first, marked after: the marks follow
      t.sentMarks = true;
      enqueue({ date: isoOf(now), time: hmOf(now), at: now, start: now, qid, minutes: 0, repeat: true, marks: t.marks, max: t.max, diff: diffOf(qid) });
    }
    saveTimers();
    paint();
  }

  // a link from the companion: #Q10 opens that question, #arrays that chapter
  let wantLink = false;
  function go() {
    const target = hashTarget(location.hash, allQuestions());
    if (!target) return;
    if (!picked()) { wantLink = true; return; }
    wantLink = false;
    document.querySelector('.nav-btn[data-view="practice"]')?.click();
    const chip = [...document.querySelectorAll('#topicChips [data-topic]')].find((b) => b.dataset.topic === target.topic);
    if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
    if (target.qid && typeof root.openPractice === 'function') root.openPractice(target.qid);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#exStart')) LS.set('examStart', Date.now());
    // a course picked or switched: its chapters go onto the dashboard straight away
    if (e.target.closest?.('[data-setlevel]')) { setTimeout(flush, 1500); if (wantLink) setTimeout(go, 300); }
  }, true);
  document.addEventListener('visibilitychange', () => {
    const now = Date.now(), t = current && timers[current];
    if (document.hidden) { if (t) timers[current] = timerStop(t, now); }
    else { sweep(now); const u = current && timers[current]; if (u && !u.logged && !u.paused) timers[current] = timerRun(u, now); }
    saveTimers();
    paint();
    if (document.hidden && queue.length) flush();
  });
  root.addEventListener('pagehide', () => { if (current && timers[current]) timers[current] = timerStop(timers[current], Date.now()); saveTimers(); });
  root.addEventListener('hashchange', go);

  // closed while a timer ran: it counts up to its last tick
  for (const t of Object.values(timers)) if (t.on != null) timers[t.qid] = { ...t, acc: (t.acc || 0) + Math.max(0, (t.lastAt || t.on) - t.on), on: null };
  sweep();
  let ticks = 0;
  setInterval(() => {
    const t = current && timers[current];
    if (t && t.on != null) { t.lastAt = Date.now(); if (++ticks % 10 === 0) saveTimers(); }
    if (ticks % 60 === 0) sweep();
    paint();
  }, 1000);
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches('.q-card[data-qid]')) opened(n);
      else n.querySelectorAll?.('.q-card[data-qid]').forEach(opened);
    }
  }).observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll('.q-card[data-qid]').forEach(opened);
  go();

  /* ---- sending it to the dashboard ---- */
  async function dash(tool, input) {
    if (SITE) return site(tool, input);
    const r = await mcp.callTool(DASH, tool, input, { cache: false });
    const p = r?.payload;
    return p && typeof p === 'object' ? p : r?.structuredContent;
  }
  // the same two calls through the site's own API (your login cookie goes with them)
  async function site(tool, input = {}) {
    const now = Date.now();
    const r = tool === 'apply_changes'
      ? await fetch('/api/app/ops', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops: input.ops, date: input.date, time: input.time }) })
      : await fetch('/api/app/today?' + new URLSearchParams({ date: input.date || isoOf(now), time: input.time || hmOf(now) }), { credentials: 'same-origin' });
    if (r.status === 401) throw { code: 'signin', message: 'Sign in to your dashboard' };
    if (!r.ok) throw { code: 'http', message: `the dashboard answered ${r.status}` };
    return r.json();
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
  // every chapter as a worksheet on the dashboard, with which of its questions you have done
  async function ensureSheets(sheets, topics) {
    if (!picked()) return;                               // wait until you have chosen your course
    const sig = signature('2|' + course() + (SELF || ''), sheets);
    const done = doneByChapter(sheets, arrowState().done || {}, LS.get('completed', {}));
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
    const sent = LS.get('sentDone', {});
    for (const c of done) {
      const n = Object.keys(c.done).length, fp = JSON.stringify(c.done);
      if (n && sent[c.id] !== fp) ops.push({ id: `aa-dq-${c.id}-${hashOf(fp)}`, type: 'worksheet.update', worksheetId: c.id,
        patch: { doneQuestions: c.done, doneAtLeast: n } });
    }
    if (!ops.length) return;
    const bad = (await apply(ops, isoOf(Date.now()), hmOf(Date.now()))).filter((r) => !r.ok);
    if (!bad.length) {
      LS.set('sheets', sig);
      LS.set('sheetIds', sheets.map((s) => s.id));
      LS.set('sentDone', Object.fromEntries(done.map((c) => [c.id, JSON.stringify(c.done)])));
    }
  }

  async function flush() {
    if (flushing || !live) return;
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
        const target = pickPeriod(today?.studyPeriods, last.time, reuse, hmOf(Math.min(...items.map((i) => i.start ?? i.at))));
        const { ops, logs } = buildOps({ date, target, items, sheets, topics, logs: LS.get('logs', {}), stamp: Date.now().toString(36) });
        const bad = (await apply(ops, date, last.time)).filter((r) => !r.ok);
        // keep a week of what was logged where
        const cutoff = isoOf(Date.now() - 7 * 864e5);
        LS.set('logs', Object.fromEntries(Object.entries(logs).filter(([k]) => k.slice(0, 10) >= cutoff)));
        LS.set('session', { date, key: target.key, own: target.own, lastAt: last.at });
        queue = queue.filter((i) => i.date !== date);
        LS.set('queue', queue);
        const mins = items.reduce((a, i) => a + (Number(i.minutes) || 0), 0);
        const names = namesOf([...new Set(items.map((i) => i.qid))]);
        if (bad.length) say(`Logged, but the dashboard said: ${bad[0].error}`, true);
        else say(`✓ ${names} · ${mins} min logged to your ${target.own ? 'study session' : 'study period'}`);
      }
      await ensureSheets(sheets, topics);                  // which questions are done, now including these
    } catch (e) {
      const code = e?.code || '';
      say(code === 'signin' ? 'Sign in to your dashboard (open it in this browser) to log your practice.'
        : /not_connected|not_found|not_in_manifest|not_granted/.test(code)
        ? 'Connect the A Level Dashboard connector to log your practice.'
        : `Not logged yet — ${e?.message || 'the dashboard did not answer'}. Tap to try again.`, true);
      showQueue();
    } finally {
      flushing = false;
    }
  }

  const start = () => {
    live = true;
    showQueue();
    flush();
    setInterval(() => { if (queue.length) flush(); }, 60e3);
  };
  (async () => {
    if (SITE) return start();                            // on the dashboard's site: its API, no connector
    if (!root.claude?.use) return;                       // anywhere else (the school's site): nothing to log to
    mcp = await root.claude.use('mcp').catch(() => null);
    if (!mcp) { say('Connectors are off in this view — practice is not logged.', true); return; }
    try {
      const { servers = [] } = await mcp.listTools();
      const mine = servers.find((s) => String(s.server).toLowerCase().replace(/\s+/g, ' ').trim() === 'a level dashboard');
      if (mine) DASH = mine.server;
    } catch { /* the listing is advisory */ }
    start();
  })();
})(typeof window !== 'undefined' ? window : globalThis);
